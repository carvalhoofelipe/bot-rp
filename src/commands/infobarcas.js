const { SlashCommandBuilder } = require("discord.js");
const { infoBarcasPayload } = require("../utils/announcements");
const { bannerFiles } = require("../utils/banner");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("infobarcas")
    .setDescription("Envia as informações de como abrir uma barca."),

  async execute(interaction) {
    return interaction.reply({
      ...infoBarcasPayload(interaction.guildId),
      files: bannerFiles()
    });
  }
};
