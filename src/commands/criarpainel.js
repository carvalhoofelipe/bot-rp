const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { announcementPanelPayload } = require("../utils/announcements");
const { bannerFiles } = require("../utils/banner");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("criarpainel")
    .setDescription("Envia o painel de anúncios da Rádio Patrulha.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "Apenas administradores podem usar este comando.",
        ephemeral: true
      });
    }

    await interaction.channel.send({
      ...announcementPanelPayload(),
      files: bannerFiles()
    });

    return interaction.reply({
      content: "Painel de anúncios enviado neste canal.",
      ephemeral: true
    });
  }
};
