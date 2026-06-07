const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("limpar")
    .setDescription("Limpa uma quantidade informada de mensagens do canal atual.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) => option
      .setName("quantidade")
      .setDescription("Quantidade de mensagens para apagar. Ex: 99")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)),

  async execute(interaction) {
    if (!interaction.channel?.isTextBased() || !interaction.channel.bulkDelete) {
      return interaction.reply({
        content: "Este comando só pode ser usado em canais de texto do servidor.",
        ephemeral: true
      });
    }

    if (!interaction.appPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "Não consigo limpar mensagens neste canal porque meu cargo não tem permissão de Gerenciar mensagens.",
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger("quantidade", true);
    const deleted = await interaction.channel.bulkDelete(amount, true);

    return interaction.reply({
      content: `Limpeza concluída: ${deleted.size} mensagem(ns) apagada(s). Mensagens com mais de 14 dias não podem ser apagadas em massa pelo Discord.`,
      ephemeral: true
    });
  }
};
