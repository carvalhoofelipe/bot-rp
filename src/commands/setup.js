const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setupComponentsV2Payload } = require("../utils/embeds");
const { bannerFiles } = require("../utils/banner");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Envia o painel fixo de registro da Rádio Patrulha.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "Apenas administradores podem usar este comando.",
        ephemeral: true
      });
    }

    await interaction.channel.send({
      ...setupComponentsV2Payload(),
      files: bannerFiles()
    });

    return interaction.reply({
      content: "Painel da Rádio Patrulha enviado neste canal.",
      ephemeral: true
    });
  }
};
