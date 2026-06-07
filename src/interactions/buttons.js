const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const config = require("../config");
const { closePatrol, getRegistration, updatePatrolParticipants, updateRegistrationStatus } = require("../database");
const { findOpenPatrolByParticipant, pendingRegistrations, patrols } = require("../state");
const { registrationDecisionPayload } = require("../utils/announcements");
const { closedPatrolComponentsV2Payload, finalizedReviewComponentsV2Payload, patrolCapacityWarningPayload, patrolComponentsV2Payload, patrolConflictPayload } = require("../utils/embeds");
const { bannerFiles } = require("../utils/banner");
const { applyRegistrationToMember, hasAnnouncementRole, hasAuthorizerRole } = require("../utils/roles");
const { registrationKey } = require("./selects");

function registrationRows(type) {
  const unitOptions = config.units.map((unit) => ({
    label: unit.label,
    value: unit.value,
    default: unit.value === "RP"
  }));

  const rankOptions = config.ranks.map((rank) => ({
    label: rank.label,
    value: rank.value,
    default: rank.value === "Recruta"
  }));

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("registration:unit")
        .setPlaceholder("Selecione a unidade")
        .addOptions(unitOptions)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("registration:rank")
        .setPlaceholder("Selecione a patente")
        .addOptions(rankOptions)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`registration:modal:${type}`)
        .setLabel("Continuar")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function registrationSelectionPayload(type) {
  const unitOptions = config.units.map((unit) => ({
    label: unit.label,
    value: unit.value,
    default: unit.value === "RP"
  }));

  const rankOptions = config.ranks.map((rank) => ({
    label: rank.label,
    value: rank.value,
    default: rank.value === "Recruta"
  }));

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: type === "new" ? 0x1f6feb : 0xf0b429,
        components: [
          {
            type: 10,
            content: [
              type === "new" ? "## Fazer Registro" : "## Atualizar Registro",
              "Selecione a unidade e a patente. Depois clique em **Continuar** para informar ID/Passaporte e Nome."
            ].join("\n")
          },
          {
            type: 14,
            divider: true,
            spacing: 1
          },
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: "registration:unit",
                placeholder: "Selecione a unidade",
                options: unitOptions
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: "registration:rank",
                placeholder: "Selecione a patente",
                options: rankOptions
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                custom_id: `registration:modal:${type}`,
                label: "Continuar",
                style: ButtonStyle.Primary
              }
            ]
          }
        ]
      }
    ]
  };
}

function registrationModal(type) {
  return new ModalBuilder()
    .setCustomId(`registration:submit:${type}`)
    .setTitle(type === "new" ? "Fazer Registro" : "Atualizar Registro")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("passaporte")
          .setLabel("ID ou Passaporte")
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nome")
          .setLabel("Nome")
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      )
    );
}

function refuseModal(rowId) {
  return new ModalBuilder()
    .setCustomId(`registration:refuse-modal:${rowId}`)
    .setTitle("Recusar Registro")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("Motivo da recusa")
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
      )
    );
}

function dmNotificationModal() {
  return new ModalBuilder()
    .setCustomId("announcement:dm-modal")
    .setTitle("Enviar Notificação Privada")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("userId")
          .setLabel("ID do Usuário")
          .setPlaceholder("Ex: 349906057507635201")
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Título da Notificação")
          .setPlaceholder("Ex: Convocação Importante")
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Mensagem")
          .setPlaceholder("Digite o conteúdo da notificação...")
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("signature")
          .setLabel("Assinatura")
          .setPlaceholder("Ex: Comando RPS")
          .setRequired(false)
          .setStyle(TextInputStyle.Short)
      )
    );
}

function serverAnnouncementModal() {
  return new ModalBuilder()
    .setCustomId("announcement:server-modal")
    .setTitle("Criar Anúncio no Servidor")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("channelId")
          .setLabel("ID do Canal")
          .setPlaceholder("Deixe vazio para canal padrão de anúncios")
          .setRequired(false)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Título do Anúncio")
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Conteúdo do Anúncio")
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("color")
          .setLabel("Cor Hex")
          .setPlaceholder("Padrão: Azul")
          .setRequired(false)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bannerUrl")
          .setLabel("URL do Banner")
          .setRequired(false)
          .setStyle(TextInputStyle.Short)
      )
    );
}

function patrolObservationModal(messageId, patrol) {
  return new ModalBuilder()
    .setCustomId(`patrol:observation-modal:${messageId}`)
    .setTitle("Editar Observação")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("observation")
          .setLabel("Observação do patrulhamento")
          .setPlaceholder("Adicione uma informação pertinente")
          .setRequired(false)
          .setStyle(TextInputStyle.Paragraph)
          .setValue((patrol.observation || "").slice(0, 4000))
      )
    );
}

function patrolVehicleRows() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("patrol:vehicle")
        .setPlaceholder("Selecione a viatura")
        .addOptions(config.patrolVehicles.map((vehicle) => ({
          label: vehicle.name || vehicle,
          description: `${vehicle.seats || 4} lugares`,
          value: vehicle.name || vehicle
        })))
    )
  ];
}

function patrolVehiclePayload() {
  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0x1f6feb,
        components: [
          {
            type: 10,
            content: [
              "## Abrir Patrulhamento",
              "Selecione a viatura disponível. A observação poderá ser adicionada depois no card da barca ativa."
            ].join("\n")
          },
          {
            type: 14,
            divider: true,
            spacing: 1
          },
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: "patrol:vehicle",
                placeholder: "Selecione a viatura",
                options: config.patrolVehicles.map((vehicle) => ({
                  label: vehicle.name || vehicle,
                  description: `${vehicle.seats || 4} lugares`,
                  value: vehicle.name || vehicle
                }))
              }
            ]
          }
        ]
      }
    ]
  };
}

async function patrolRemoveRows(interaction, messageId, patrol) {
  const options = await Promise.all([...patrol.participants].map(async (id) => {
    const member = await interaction.guild.members.fetch(id).catch(() => null);
    const label = member?.displayName || `Policial ${id}`;

    return {
      label: label.slice(0, 100),
      value: id
    };
  }));

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`patrol:remove-select:${messageId}`)
        .setPlaceholder("Selecione o policial para remover")
        .addOptions(options)
    )
  ];
}

function disabledComponents(message) {
  return message.components.map((row) => (
    new ActionRowBuilder().addComponents(
      row.components.map((component) => ButtonBuilder.from(component).setDisabled(true))
    )
  ));
}

async function handleRegistrationStart(interaction, type) {
  pendingRegistrations.set(registrationKey(interaction), {
    type,
    unidade: "RP",
    patente: "Recruta"
  });

  return interaction.reply({
    ...registrationSelectionPayload(type)
  });
}

async function handlePanel(interaction) {
  if (config.panelUrl) {
    return interaction.reply({ content: `Painel Policial: ${config.panelUrl}`, ephemeral: true });
  }

  const channel = interaction.guild.channels.cache.get(config.panelChannelId);
  if (!channel || channel.type === ChannelType.GuildCategory) {
    return interaction.reply({ content: "O canal do painel policial ainda não foi configurado corretamente.", ephemeral: true });
  }

  return interaction.reply({ content: `Painel Policial: <#${channel.id}>`, ephemeral: true });
}

async function handleApprove(interaction, rowId) {
  if (!hasAuthorizerRole(interaction.member)) {
    return interaction.reply({ content: "Você não tem permissão para autorizar registros.", ephemeral: true });
  }

  const registration = await getRegistration(rowId);
  if (!registration) {
    return interaction.reply({ content: "Registro não encontrado no banco de dados.", ephemeral: true });
  }

  const targetMember = await interaction.guild.members.fetch(registration.discord_id).catch(() => null);
  if (!targetMember) {
    return interaction.reply({ content: "Não consegui localizar esse usuário no servidor.", ephemeral: true });
  }

  const warnings = await applyRegistrationToMember(targetMember, registration);
  await updateRegistrationStatus(rowId, "APROVADO", interaction.user.id);

  await interaction.message.edit(finalizedReviewComponentsV2Payload(registration, "APROVADO", interaction.user, null, warnings));

  await targetMember.send({
    ...registrationDecisionPayload({ approved: true }),
    files: bannerFiles()
  }).catch(() => null);

  return interaction.reply({
    content: warnings.length ? `Registro aprovado com avisos:\n${warnings.join("\n")}` : "Registro aprovado com sucesso.",
    ephemeral: true
  });
}

async function handlePatrolButton(interaction) {
  const patrol = patrols.get(interaction.message.id);
  if (!patrol) {
    return interaction.reply({ content: "Não encontrei os dados deste patrulhamento. Ele pode ter sido criado antes do último reinício do bot.", ephemeral: true });
  }

  if (interaction.customId === "patrol:join") {
    if (patrol.participants.has(interaction.user.id)) {
      return interaction.reply({ content: "Você já está embarcado neste patrulhamento.", ephemeral: true });
    }

    const existingPatrol = findOpenPatrolByParticipant(interaction.user.id, interaction.message.id);
    if (existingPatrol) {
      const payload = patrolConflictPayload(existingPatrol);
      return interaction.reply({
        ...payload,
        flags: payload.flags | MessageFlags.Ephemeral
      });
    }

    if (patrol.participants.size >= (patrol.seats || 4)) {
      return interaction.reply({ content: "Esta viatura já está sem lugares disponíveis.", ephemeral: true });
    }

    patrol.participants.add(interaction.user.id);
    await updatePatrolParticipants(interaction.message.id, patrol.participants);
    await interaction.message.edit(patrolComponentsV2Payload(patrol));
    await notifyPatrolCapacityWarning(interaction, patrol);
    return interaction.reply({ content: "Você embarcou no patrulhamento.", ephemeral: true });
  }

  if (interaction.customId === "patrol:leave") {
    if (!patrol.participants.has(interaction.user.id)) {
      return interaction.reply({ content: "Você só pode desembarcar se já estiver embarcado.", ephemeral: true });
    }

    patrol.participants.delete(interaction.user.id);
    await updatePatrolParticipants(interaction.message.id, patrol.participants);
    await interaction.message.edit(patrolComponentsV2Payload(patrol));
    return interaction.reply({ content: "Você desembarcou do patrulhamento.", ephemeral: true });
  }

  if (interaction.customId === "patrol:observation" && interaction.user.id !== patrol.creatorId) {
    return interaction.reply({ content: "Apenas quem abriu a barca pode editar a observação.", ephemeral: true });
  }

  if (interaction.customId === "patrol:observation" && interaction.user.id === patrol.creatorId) {
    return interaction.showModal(patrolObservationModal(interaction.message.id, patrol));
  }

  if (interaction.customId === "patrol:observation") {
    return interaction.reply({
      content: `Observação: ${patrol.observation?.trim() || "—"}`,
      ephemeral: true
    });
  }

  if (interaction.customId === "patrol:remove") {
    if (interaction.user.id !== patrol.creatorId) {
      return interaction.reply({ content: "Apenas quem abriu o patrulhamento pode remover policiais.", ephemeral: true });
    }

    if (!patrol.participants.size) {
      return interaction.reply({ content: "Não há policiais embarcados para remover.", ephemeral: true });
    }

    return interaction.reply({
      content: "Selecione quem deseja remover do patrulhamento.",
      components: await patrolRemoveRows(interaction, interaction.message.id, patrol),
      ephemeral: true
    });
  }

  if (interaction.customId === "patrol:close") {
    const canClose = interaction.user.id === patrol.creatorId
      || interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
    if (!canClose) {
      return interaction.reply({ content: "Apenas quem abriu o patrulhamento ou um administrador pode encerrar.", ephemeral: true });
    }

    patrol.status = "Encerrado";
    patrol.closedAt = new Date().toISOString();
    await closePatrol(interaction.message.id, patrol.participants);

    const logChannel = interaction.guild.channels.cache.get(config.patrolLogChannelId)
      || await interaction.guild.channels.fetch(config.patrolLogChannelId).catch(() => null);

    if (logChannel?.isTextBased()) {
      await logChannel.send({
        ...closedPatrolComponentsV2Payload(patrol),
        files: bannerFiles()
      });
    }

    await interaction.message.delete().catch(() => null);
    patrols.delete(interaction.message.id);
    return interaction.reply({ content: "Patrulhamento encerrado.", ephemeral: true });
  }

  return false;
}

async function notifyPatrolCapacityWarning(interaction, patrol) {
  if (patrol.capacityWarningSent || patrol.participants.size < 4) return;

  const owner = await interaction.client.users.fetch(patrol.creatorId).catch(() => null);
  if (!owner) return;

  patrol.capacityWarningSent = true;
  await owner.send({
    ...patrolCapacityWarningPayload(patrol),
    files: bannerFiles()
  }).catch((error) => {
    console.warn(`Nao foi possivel enviar aviso de lotacao da barca para ${patrol.creatorId}: ${error.message}`);
  });
}

async function handleButton(interaction) {
  if (interaction.customId === "registration:start:new") {
    return handleRegistrationStart(interaction, "new");
  }

  if (interaction.customId === "registration:start:update") {
    return handleRegistrationStart(interaction, "update");
  }

  if (interaction.customId.startsWith("registration:modal:")) {
    const type = interaction.customId.split(":")[2];
    return interaction.showModal(registrationModal(type));
  }

  if (interaction.customId === "panel:open") {
    return handlePanel(interaction);
  }

  if (interaction.customId.startsWith("registration:approve:")) {
    return handleApprove(interaction, interaction.customId.split(":")[2]);
  }

  if (interaction.customId.startsWith("registration:refuse:")) {
    if (!hasAuthorizerRole(interaction.member)) {
      return interaction.reply({ content: "Você não tem permissão para recusar registros.", ephemeral: true });
    }

    return interaction.showModal(refuseModal(interaction.customId.split(":")[2]));
  }

  if (interaction.customId === "announcement:dm") {
    if (!hasAnnouncementRole(interaction.member)) {
      return interaction.reply({ content: "Você não tem permissão para enviar DMs pelo painel.", ephemeral: true });
    }

    return interaction.showModal(dmNotificationModal());
  }

  if (interaction.customId === "announcement:server") {
    if (!hasAnnouncementRole(interaction.member)) {
      return interaction.reply({ content: "Você não tem permissão para enviar anúncios pelo painel.", ephemeral: true });
    }

    return interaction.showModal(serverAnnouncementModal());
  }

  if (interaction.customId === "patrol:start") {
    return interaction.reply({
      ...patrolVehiclePayload()
    });
  }

  if (interaction.customId.startsWith("patrol:")) {
    return handlePatrolButton(interaction);
  }

  return false;
}

module.exports = {
  handleButton
};
