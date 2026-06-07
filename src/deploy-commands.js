require("dotenv").config();

const { REST, Routes } = require("discord.js");
const setupCommand = require("./commands/setup");
const criarPainelCommand = require("./commands/criarpainel");
const exonerarCommand = require("./commands/exonerar");
const infoBarcasCommand = require("./commands/infobarcas");
const limparCommand = require("./commands/limpar");
const resumoCommand = require("./commands/resumo");

const commands = [
  setupCommand.data.toJSON(),
  criarPainelCommand.data.toJSON(),
  exonerarCommand.data.toJSON(),
  infoBarcasCommand.data.toJSON(),
  limparCommand.data.toJSON(),
  resumoCommand.data.toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  if (!process.env.CLIENT_ID || !process.env.GUILD_ID || !process.env.DISCORD_TOKEN) {
    throw new Error("Preencha DISCORD_TOKEN, CLIENT_ID e GUILD_ID no arquivo .env.");
  }

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log("Comandos registrados com sucesso.");
}

deploy().catch((error) => {
  console.error(error);
  process.exit(1);
});
