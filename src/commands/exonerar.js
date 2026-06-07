const {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("exonerar")
    .setDescription("Expulsa um membro exonerado pelo ID do Discord."),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("exonerar:modal")
      .setTitle("Exonerar membro")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("discordId")
            .setLabel("ID Discord da pessoa")
            .setPlaceholder("Ex: 729763008645169182")
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        )
      );

    return interaction.showModal(modal);
  }
};
