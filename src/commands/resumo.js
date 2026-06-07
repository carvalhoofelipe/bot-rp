const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { patrols } = require("../state");
const { patrolSummaryPayload } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resumo")
    .setDescription("Mostra a contagem atual de barcas ativas e oficiais embarcados."),

  async execute(interaction) {
    const activePatrols = [...patrols.values()].filter((patrol) => patrol.status === "Aberto");
    const embarkedCount = activePatrols.reduce((total, patrol) => total + (patrol.participants?.size || 0), 0);
    const payload = patrolSummaryPayload({
      activeCount: activePatrols.length,
      embarkedCount
    });

    return interaction.reply({
      ...payload,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }
};
