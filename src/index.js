require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const { handleButton } = require("./interactions/buttons");
const { handleModal } = require("./interactions/modals");
const { handleSelect } = require("./interactions/selects");
const { loadConfigFromSupabase } = require("./services/config-store");
const { loadOpenPatrolsIntoMemory, startPatrolExpirationWatcher } = require("./services/patrol-expiration");
const { welcomeDmPayload } = require("./utils/announcements");
const { bannerFiles } = require("./utils/banner");
const { memberJoinLogPayload, memberLeaveLogPayload, sendMemberLog } = require("./utils/member-logs");
const { startWebServer } = require("./web/server");
require("./database");

const memberLogsEnabled = process.env.MEMBER_LOGS_ENABLED === "true";
const welcomeDmEnabled = process.env.WELCOME_DM_ENABLED !== "false";
const intents = [GatewayIntentBits.Guilds];

if (memberLogsEnabled || welcomeDmEnabled) {
  intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({
  intents,
  partials: [Partials.Channel]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsPath).filter((item) => item.endsWith(".js"))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once("clientReady", () => {
  console.log(`Bot online como ${client.user.tag}`);
  if (!memberLogsEnabled && !welcomeDmEnabled) {
    console.warn("Eventos de entrada/saida desativados. Para ativar, habilite Server Members Intent no portal do Discord e ajuste MEMBER_LOGS_ENABLED ou WELCOME_DM_ENABLED no .env.");
  }
  loadOpenPatrolsIntoMemory().then(() => {
    startPatrolExpirationWatcher(client);
  });
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (error) {
    console.error(error);

    const payload = {
      content: "Ocorreu um erro ao processar esta interação. Verifique o console do bot.",
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  } finally {
    scheduleEphemeralCleanup(interaction);
  }
});

function scheduleEphemeralCleanup(interaction) {
  if (!interaction.ephemeral || !interaction.deleteReply) return;

  setTimeout(async () => {
    const message = await interaction.fetchReply().catch(() => null);
    if (!message || message.components?.length) return;
    await interaction.deleteReply().catch(() => null);
  }, Number(process.env.EPHEMERAL_DELETE_AFTER_MS || 8000));
}

client.on("guildMemberAdd", async (member) => {
  if (welcomeDmEnabled) {
    await member.send({
      ...welcomeDmPayload(member),
      files: bannerFiles()
    }).catch((error) => {
      console.warn(`Nao foi possivel enviar DM de boas-vindas para ${member.user.tag}: ${error.message}`);
    });
  }

  if (memberLogsEnabled) {
    await sendMemberLog(member.guild, memberJoinLogPayload(member));
  }
});

client.on("guildMemberRemove", async (member) => {
  if (!memberLogsEnabled) return;

  if (member.partial) {
    member = await member.fetch().catch(() => member);
  }

  await sendMemberLog(member.guild, memberLeaveLogPayload(member));
});

if (!process.env.DISCORD_TOKEN) {
  throw new Error("Preencha DISCORD_TOKEN no arquivo .env.");
}

async function main() {
  await loadConfigFromSupabase();
  startWebServer(client);
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
