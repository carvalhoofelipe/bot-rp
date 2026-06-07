const { ActionRowBuilder, ButtonBuilder, MessageFlags } = require("discord.js");
const config = require("../config");
const { createPatrol, createRegistration, getLatestApprovedRegistration, getRegistration, updatePatrolObservation, updateRegistrationStatus } = require("../database");
const { findOpenPatrolByParticipant, pendingRegistrations, patrols } = require("../state");
const { finalizedReviewComponentsV2Payload, patrolComponentsV2Payload, patrolConflictPayload, reviewComponentsV2Payload } = require("../utils/embeds");
const { notificationPayload, registrationDecisionPayload } = require("../utils/announcements");
const { bannerFiles } = require("../utils/banner");
const { hasAnnouncementRole, hasAuthorizerRole, updateMemberRegistrationNickname } = require("../utils/roles");
const { registrationKey } = require("./selects");

function disableMessageButtons(message) {
  return message.components.map((row) => (
    new ActionRowBuilder().addComponents(
      row.components.map((component) => ButtonBuilder.from(component).setDisabled(true))
    )
  ));
}

async function handleRegistrationSubmit(interaction, type) {
  const state = pendingRegistrations.get(registrationKey(interaction)) || {};
  const passaporte = interaction.fields.getTextInputValue("passaporte").trim();
  const nome = interaction.fields.getTextInputValue("nome").trim();
  const unidade = state.unidade || "RP";
  const patente = state.patente || "Recruta";
  const createdAt = new Date();
  const previousRegistration = type === "update"
    ? await getLatestApprovedRegistration(interaction.user.id)
    : null;
  const targetMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const nicknameWarning = targetMember
    ? await updateMemberRegistrationNickname(
        targetMember,
        { passaporte, nome },
        type === "new" ? "Registro enviado Rádio Patrulha" : "Atualização de registro enviada Rádio Patrulha"
      )
    : "Não consegui localizar seu membro no servidor para alterar o apelido automaticamente.";

  const rowId = await createRegistration({
    discordId: interaction.user.id,
    passaporte,
    nome,
    unidade,
    patente,
    status: type === "new" ? "PENDENTE_NOVO_REGISTRO" : "PENDENTE_ATUALIZACAO",
    previous: previousRegistration
  });

  const channel = interaction.guild.channels.cache.get(config.analysisChannelId)
    || await interaction.guild.channels.fetch(config.analysisChannelId).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    return interaction.reply({
      content: "Não consegui enviar a solicitação porque o canal de análise não foi configurado corretamente.",
      ephemeral: true
    });
  }

  await channel.send({
    ...reviewComponentsV2Payload({
      rowId,
      type,
      user: interaction.user,
      passaporte,
      nome,
      unidade,
      patente,
      createdAt,
      previousRegistration
    }),
    files: bannerFiles()
  });

  pendingRegistrations.delete(registrationKey(interaction));

  return interaction.reply({
    content: [
      type === "new" ? "Seu registro foi enviado para análise." : "Sua atualização foi enviada para análise.",
      nicknameWarning || "Seu apelido foi atualizado automaticamente."
    ].join("\n"),
    ephemeral: true
  });
}

async function handleRefuseSubmit(interaction, rowId) {
  const reason = interaction.fields.getTextInputValue("reason").trim();
  const registration = await getRegistration(rowId);

  if (!registration) {
    return interaction.reply({ content: "Registro não encontrado no banco de dados.", ephemeral: true });
  }

  await updateRegistrationStatus(rowId, "RECUSADO", interaction.user.id);

  if (interaction.message) {
    await interaction.message.edit(finalizedReviewComponentsV2Payload(registration, "RECUSADO", interaction.user, reason));
  }

  const targetUser = await interaction.client.users.fetch(registration.discord_id).catch(() => null);
  if (targetUser) {
    await targetUser.send({
      ...registrationDecisionPayload({ approved: false, reason }),
      files: bannerFiles()
    }).catch(() => null);
  }

  return interaction.reply({ content: "Registro recusado e usuário notificado por mensagem privada, se possível.", ephemeral: true });
}

async function handlePatrolSubmit(interaction, vehicle) {
  const existingPatrol = findOpenPatrolByParticipant(interaction.user.id);
  if (existingPatrol) {
    const payload = patrolConflictPayload(existingPatrol);
    return interaction.reply({
      ...payload,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }

  const observation = interaction.fields.getTextInputValue("observation").trim();
  const vehicleConfig = config.patrolVehicles.find((item) => item.name === vehicle || item === vehicle);
  const seats = Number(vehicleConfig?.seats || 4);
  const patrol = {
    vehicle,
    seats,
    vehicleImageUrl: vehicleConfig?.imageUrl || "",
    observation,
    unit: "RP",
    creatorId: interaction.user.id,
    participants: new Set([interaction.user.id]),
    startedAt: new Date().toISOString(),
    status: "Aberto"
  };

  const patrolChannelId = config.activePatrolsChannelId || config.patrolLogChannelId;
  const channel = interaction.guild.channels.cache.get(patrolChannelId)
    || await interaction.guild.channels.fetch(patrolChannelId).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    return interaction.reply({
      content: "Não consegui abrir o patrulhamento porque o canal de logs não foi configurado corretamente.",
      ephemeral: true
    });
  }

  const message = await channel.send({
    ...patrolComponentsV2Payload(patrol),
    files: bannerFiles()
  });

  patrols.set(message.id, patrol);
  await createPatrol(patrol, message.id);

  return interaction.reply({ content: "Patrulhamento aberto com sucesso.", ephemeral: true });
}

function parseHexColor(value) {
  if (!value) return 0x1f6feb;
  const clean = value.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return 0x1f6feb;
  return Number.parseInt(clean, 16);
}

async function handleDmNotification(interaction) {
  if (!hasAnnouncementRole(interaction.member)) {
    return interaction.reply({ content: "Você não tem permissão para enviar DMs.", ephemeral: true });
  }

  const userId = interaction.fields.getTextInputValue("userId").trim();
  const title = interaction.fields.getTextInputValue("title").trim();
  const message = interaction.fields.getTextInputValue("message").trim();
  const signature = interaction.fields.getTextInputValue("signature").trim();
  const payload = notificationPayload({ title, message, signature });

  const user = await interaction.client.users.fetch(userId).catch(() => null);
  if (!user) {
    return interaction.reply({ content: "Não consegui encontrar esse usuário pelo ID informado.", ephemeral: true });
  }

  await user.send(payload);

  const logChannel = interaction.guild.channels.cache.get(config.dmLogChannelId)
    || await interaction.guild.channels.fetch(config.dmLogChannelId).catch(() => null);

  if (logChannel?.isTextBased()) {
    await logChannel.send({
      ...notificationPayload({
        title: `Cópia de DM: ${title}`,
        message: [
          `**Destinatário:** <@${userId}> (${userId})`,
          `**Enviado por:** ${interaction.user} (${interaction.user.id})`,
          "",
          message
        ].join("\n"),
        signature
      })
    });
  }

  return interaction.reply({ content: "Notificação privada enviada.", ephemeral: true });
}

async function handleServerAnnouncement(interaction) {
  if (!hasAnnouncementRole(interaction.member)) {
    return interaction.reply({ content: "Você não tem permissão para enviar anúncios.", ephemeral: true });
  }

  const channelId = interaction.fields.getTextInputValue("channelId").trim() || config.announcementChannelId;
  const title = interaction.fields.getTextInputValue("title").trim();
  const message = interaction.fields.getTextInputValue("message").trim();
  const color = parseHexColor(interaction.fields.getTextInputValue("color").trim());
  const bannerUrl = interaction.fields.getTextInputValue("bannerUrl").trim() || config.bannerUrl;

  const channel = interaction.guild.channels.cache.get(channelId)
    || await interaction.guild.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased()) {
    return interaction.reply({ content: "Não consegui encontrar o canal de anúncio.", ephemeral: true });
  }

  await channel.send(notificationPayload({
    title,
    message,
    color,
    bannerUrl
  }));

  return interaction.reply({ content: "Anúncio enviado no servidor.", ephemeral: true });
}

async function handlePatrolObservationSubmit(interaction, messageId) {
  const patrol = patrols.get(messageId);
  if (!patrol) {
    return interaction.reply({ content: "Não encontrei os dados deste patrulhamento.", ephemeral: true });
  }

  if (interaction.user.id !== patrol.creatorId) {
    return interaction.reply({ content: "Apenas quem abriu a barca pode editar a observação.", ephemeral: true });
  }

  patrol.observation = interaction.fields.getTextInputValue("observation").trim();
  await updatePatrolObservation(messageId, patrol.observation);

  const channelId = config.activePatrolsChannelId || config.patrolLogChannelId;
  const channel = interaction.guild.channels.cache.get(channelId)
    || await interaction.guild.channels.fetch(channelId).catch(() => null);
  const message = await channel?.messages.fetch(messageId).catch(() => null);

  if (message) {
    await message.edit(patrolComponentsV2Payload(patrol));
  }

  return interaction.reply({ content: "Observação atualizada.", ephemeral: true });
}

async function handleExonerarSubmit(interaction) {
  if (!hasAuthorizerRole(interaction.member)) {
    return interaction.reply({ content: "Você não tem permissão para exonerar membros pelo bot.", ephemeral: true });
  }

  const discordId = interaction.fields.getTextInputValue("discordId").trim();

  if (!/^\d{17,20}$/.test(discordId)) {
    return interaction.reply({ content: "Informe um ID Discord válido.", ephemeral: true });
  }

  const member = await interaction.guild.members.fetch(discordId).catch(() => null);
  if (!member) {
    return interaction.reply({ content: "Não encontrei essa pessoa no servidor.", ephemeral: true });
  }

  if (!member.kickable) {
    return interaction.reply({
      content: "Não consigo expulsar essa pessoa. Verifique se meu cargo está acima do cargo dela e se tenho permissão de expulsar membros.",
      ephemeral: true
    });
  }

  await member.kick(`Exonerado por ${interaction.user.tag} (${interaction.user.id})`);

  return interaction.reply({
    content: `Exoneração aplicada. ${member.user.tag} foi expulso do servidor pelo motivo: Exonerado.`,
    ephemeral: true
  });
}

async function handleModal(interaction) {
  if (interaction.customId.startsWith("registration:submit:")) {
    return handleRegistrationSubmit(interaction, interaction.customId.split(":")[2]);
  }

  if (interaction.customId.startsWith("registration:refuse-modal:")) {
    return handleRefuseSubmit(interaction, interaction.customId.split(":")[2]);
  }

  if (interaction.customId.startsWith("patrol:modal:")) {
    return handlePatrolSubmit(interaction, decodeURIComponent(interaction.customId.split(":")[2]));
  }

  if (interaction.customId.startsWith("patrol:observation-modal:")) {
    return handlePatrolObservationSubmit(interaction, interaction.customId.split(":")[2]);
  }

  if (interaction.customId === "announcement:dm-modal") {
    return handleDmNotification(interaction);
  }

  if (interaction.customId === "announcement:server-modal") {
    return handleServerAnnouncement(interaction);
  }

  if (interaction.customId === "exonerar:modal") {
    return handleExonerarSubmit(interaction);
  }

  return false;
}

module.exports = {
  handleModal
};
