const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");
const config = require("../config");

const buttonEmojis = {
  sign: { id: "1268187557292933130", name: "sign" },
  update: { id: "1268185268817625171", name: "update" },
  police: { id: "1268185274740113542", name: "police" },
  vtr: { id: "1459962985953890456", name: "VTR" },
  join: { id: "1512669392025157813", name: "join" },
  leave: { id: "1512669426271649892", name: "leave" },
  rem: { id: "1512669351692603522", name: "rem" },
  chat: { id: "1408430173467971687", name: "chat" },
  end: { id: "1512670184748613682", name: "end" }
};

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function setupEmbed() {
  const embed = new EmbedBuilder()
    .setColor(0x1f6feb)
    .setTitle("Rádio Patrulha")
    .setDescription([
      "**Realize e atualize seu registro**",
      "",
      "Atualize seu registro sempre que houver mudança de nome, patente ou unidade.",
      "",
      "**Informações Úteis**",
      "Use os botões abaixo para registrar, atualizar seus dados ou abrir patrulhamento."
    ].join("\n"))
    .setImage(config.bannerUrl)
    .setFooter({ text: "Rádio Patrulha" });

  if (config.logoUrl) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

function setupButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("registration:start:new")
      .setEmoji(buttonEmojis.sign)
      .setLabel("Registro")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("registration:start:update")
      .setEmoji(buttonEmojis.update)
      .setLabel("Atualizar Registro")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("patrol:start")
      .setEmoji(buttonEmojis.vtr)
      .setLabel("Abrir Patrulhamento")
      .setStyle(ButtonStyle.Success)
  );
}

function setupComponentsV2Payload() {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0x1d1e1d,
        components: [
          {
            type: 10,
            content: [
              "# Rádio Patrulha",
              "**Realize e atualize seu registro**",
              "",
              "Atualize seu registro sempre que houver mudança de nome, patente ou unidade.",
              "",
              "**Informações Úteis**"
            ].join("\n")
          },
          {
            type: 14,
            divider: true,
            spacing: 1
          },
          {
            type: 10,
            content: "Use os botões abaixo para registrar, atualizar seus dados ou abrir patrulhamento."
          },
          {
            type: 12,
            items: [
              {
                media: {
                  url: config.bannerUrl
                },
                description: "Banner da Rádio Patrulha"
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                custom_id: "registration:start:new",
                label: "Registro",
                emoji: buttonEmojis.sign,
                style: ButtonStyle.Secondary
              },
              {
                type: 2,
                custom_id: "registration:start:update",
                label: "Atualizar Registro",
                emoji: buttonEmojis.update,
                style: ButtonStyle.Secondary
              },
              {
                type: 2,
                custom_id: "patrol:start",
                label: "Abrir Patrulhamento",
                emoji: buttonEmojis.vtr,
                style: ButtonStyle.Success
              }
            ]
          }
        ]
      }
    ]
  };
}

function reviewEmbed({ type, user, passaporte, nome, unidade, patente, createdAt }) {
  const embed = new EmbedBuilder()
    .setColor(type === "new" ? 0x2f81f7 : 0xf0b429)
    .setTitle(type === "new" ? "Novo Registro" : "Atualização de Registro")
    .addFields(
      { name: "Usuario Discord", value: `${user} (${user.id})`, inline: false },
      { name: "ID/Passaporte", value: passaporte, inline: true },
      { name: "Nome informado", value: nome, inline: true },
      { name: "Unidade selecionada", value: unidade, inline: true },
      { name: "Patente selecionada", value: patente, inline: true },
      { name: "Data/hora da solicitação", value: formatDate(createdAt), inline: false },
      { name: "Status", value: "PENDENTE", inline: true }
    )
    .setImage(config.bannerUrl);

  if (config.logoUrl) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

function reviewButtons(rowId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`registration:approve:${rowId}`)
      .setEmoji({ id: "1219999541076430960", name: "yes", animated: true })
      .setLabel("Autorizar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`registration:refuse:${rowId}`)
      .setEmoji({ id: "1219999539545767976", name: "no", animated: true })
      .setLabel("Negar")
      .setStyle(ButtonStyle.Danger)
  );
}

function reviewComponentsV2Payload({ rowId, type, user, passaporte, nome, unidade, patente, createdAt, previousRegistration = null }) {
  return registrationReviewComponents({
    rowId,
    type,
    discordId: user.id,
    discordMention: `${user}`,
    passaporte,
    nome,
    unidade,
    patente,
    createdAt,
    previousRegistration,
    status: "PENDENTE"
  });
}

function finalizedReviewComponentsV2Payload(registration, status, moderator, reason = null, warnings = []) {
  return registrationReviewComponents({
    rowId: registration.id,
    type: registration.status === "PENDENTE_ATUALIZACAO" ? "update" : "new",
    discordId: registration.discord_id,
    discordMention: `<@${registration.discord_id}>`,
    passaporte: registration.passaporte,
    nome: registration.nome,
    unidade: registration.unidade,
    patente: registration.patente,
    createdAt: registration.criado_em || registration.created_at || new Date(),
    previousRegistration: {
      passaporte: registration.anterior_passaporte,
      nome: registration.anterior_nome,
      unidade: registration.anterior_unidade,
      patente: registration.anterior_patente
    },
    status,
    moderator,
    reason,
    warnings,
    disabled: true
  });
}

function registrationReviewComponents({
  rowId,
  type,
  discordId,
  discordMention,
  passaporte,
  nome,
  unidade,
  patente,
  createdAt,
  previousRegistration = null,
  status,
  moderator = null,
  reason = null,
  warnings = [],
  disabled = false
}) {
  const title = type === "new" ? "Novo Registro" : "Atualização de Registro";
  const titleEmoji = type === "new"
    ? "<:join:1512669392025157813>"
    : "<:update:1268185268817625171>";
  const accentColor = status === "APROVADO"
    ? 0x238636
    : status === "RECUSADO"
      ? 0xda3633
      : type === "new"
        ? 0x2f81f7
        : 0xffffff;

  const details = [
    `**Tipo:** ${title}`,
    `**Usuário Discord:** ${discordMention} (${discordId})`,
    `**ID/Passaporte:** ${passaporte}`,
    `**Nome informado:** ${nome}`,
    `**Unidade selecionada:** ${unidade}`,
    `**Patente selecionada:** ${patente}`,
    `**Data/hora da solicitação:** ${formatDate(new Date(createdAt))}`,
    `**Status:** ${status}`
  ];

  if (moderator) {
    details.push(`**Responsável:** ${moderator} (${moderator.id})`);
  }

  if (reason) {
    details.push(`**Motivo:** ${reason}`);
  }

  if (warnings.length) {
    details.push(`**Avisos:**\n${warnings.join("\n")}`);
  }

  const changes = registrationChangeLines({
    type,
    previousRegistration,
    current: { passaporte, nome, unidade, patente }
  });

  if (type !== "update" && changes.length) {
    details.push(`**Alterações solicitadas:**\n${changes.join("\n")}`);
  }

  const components = type === "update"
    ? updateRegistrationReviewComponents({
        titleEmoji,
        title,
        discordMention,
        discordId,
        passaporte,
        nome,
        unidade,
        patente,
        createdAt,
        status,
        moderator,
        reason,
        warnings,
        changes
      })
    : newRegistrationReviewComponents({
        titleEmoji,
        title,
        discordMention,
        discordId,
        passaporte,
        nome,
        unidade,
        patente,
        createdAt,
        status,
        moderator,
        reason,
        warnings
      });

  if (!disabled) {
    components.push(reviewButtonsRaw(rowId));
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: accentColor,
        components
      }
    ]
  };
}

function registrationFooterLines({ createdAt, status, moderator, reason, warnings }) {
  const footerLines = [
    `**Data/hora da solicitação:** ${formatDate(new Date(createdAt))}`,
    `**Status:** ${status}`
  ];

  if (moderator) {
    footerLines.push(`**Responsável:** ${moderator} (${moderator.id})`);
  }

  if (reason) {
    footerLines.push(`**Motivo:** ${reason}`);
  }

  if (warnings.length) {
    footerLines.push(`**Avisos:**\n${warnings.join("\n")}`);
  }

  return footerLines;
}

function newRegistrationReviewComponents({
  titleEmoji,
  title,
  discordMention,
  discordId,
  passaporte,
  nome,
  unidade,
  patente,
  createdAt,
  status,
  moderator,
  reason,
  warnings
}) {
  return [
    {
      type: 10,
      content: [
        `## ${titleEmoji} ${title}`,
        "Solicitação enviada para análise da Rádio Patrulha."
      ].join("\n")
    },
    {
      type: 14,
      divider: true,
      spacing: 1
    },
    {
      type: 10,
      content: [
        "**Identificação**",
        `Usuário ${discordMention} (${discordId})`
      ].join("\n")
    },
    {
      type: 14,
      divider: true,
      spacing: 1
    },
    {
      type: 10,
      content: [
        "**Novo Registro**",
        `ID: ${passaporte}`,
        `Nome: ${nome}`,
        `Patente: ${patente} | Unidade: ${unidade}`
      ].join("\n")
    },
    {
      type: 14,
      divider: true,
      spacing: 1
    },
    {
      type: 10,
      content: registrationFooterLines({ createdAt, status, moderator, reason, warnings }).join("\n")
    },
    {
      type: 12,
      items: [
        {
          media: { url: config.bannerUrl },
          description: "Banner da Rádio Patrulha"
        }
      ]
    }
  ];
}

function updateRegistrationReviewComponents({
  titleEmoji,
  title,
  discordMention,
  discordId,
  passaporte,
  nome,
  unidade,
  patente,
  createdAt,
  status,
  moderator,
  reason,
  warnings,
  changes
}) {
  const footerLines = registrationFooterLines({ createdAt, status, moderator, reason, warnings });

  return [
    {
      type: 10,
      content: [
        `## ${titleEmoji} ${title}`,
        "Solicitação enviada para análise da Rádio Patrulha."
      ].join("\n")
    },
    {
      type: 14,
      divider: true,
      spacing: 1
    },
    {
      type: 10,
      content: [
        "**Identificação**",
        `Usuário ${discordMention} (${discordId})`,
        `${passaporte} - ${nome}`,
        `${patente} | ${unidade}`
      ].join("\n")
    },
    {
      type: 14,
      divider: true,
      spacing: 1
    },
    {
      type: 10,
      content: [
        "**Alterações Solicitadas**",
        changes.length ? changes.join("\n") : "Nenhuma alteração detectada."
      ].join("\n")
    },
    {
      type: 14,
      divider: true,
      spacing: 1
    },
    {
      type: 10,
      content: footerLines.join("\n")
    },
    {
      type: 12,
      items: [
        {
          media: { url: config.bannerUrl },
          description: "Banner da Rádio Patrulha"
        }
      ]
    }
  ];
}

function registrationChangeLines({ type, previousRegistration, current }) {
  if (type !== "update") return [];
  if (!previousRegistration?.passaporte && !previousRegistration?.nome && !previousRegistration?.unidade && !previousRegistration?.patente) {
    return ["Registro anterior aprovado não encontrado."];
  }

  return [
    ["ID/Passaporte", previousRegistration.passaporte, current.passaporte],
    ["Nome", previousRegistration.nome, current.nome],
    ["Unidade", previousRegistration.unidade, current.unidade],
    ["Patente", previousRegistration.patente, current.patente]
  ]
    .filter(([, before, after]) => String(before || "") !== String(after || ""))
    .map(([label, before, after]) => `${label}: ${before || "—"} → ${after || "—"}`);
}

function reviewButtonsRaw(rowId, disabled = false) {
  return {
    type: 1,
    components: [
      {
        type: 2,
        custom_id: `registration:approve:${rowId}`,
        label: "Autorizar",
        style: ButtonStyle.Success,
        emoji: {
          id: "1219999541076430960",
          name: "yes",
          animated: true
        },
        disabled
      },
      {
        type: 2,
        custom_id: `registration:refuse:${rowId}`,
        label: "Negar",
        style: ButtonStyle.Danger,
        emoji: {
          id: "1219999539545767976",
          name: "no",
          animated: true
        },
        disabled
      }
    ]
  };
}

function finalizedReviewEmbed(existingEmbed, status, moderator, reason = null, warnings = []) {
  const embed = EmbedBuilder.from(existingEmbed)
    .setColor(status === "APROVADO" ? 0x238636 : 0xda3633)
    .setFields(
      ...existingEmbed.fields.filter((field) => field.name !== "Status" && field.name !== "Responsavel" && field.name !== "Motivo" && field.name !== "Avisos"),
      { name: "Status", value: status, inline: true },
      { name: "Responsavel", value: `${moderator} (${moderator.id})`, inline: false }
    );

  if (reason) {
    embed.addFields({ name: "Motivo", value: reason, inline: false });
  }

  if (warnings.length) {
    embed.addFields({ name: "Avisos", value: warnings.join("\n"), inline: false });
  }

  return embed;
}

function patrolEmbed(patrol) {
  const participants = [...patrol.participants];
  const unitLabel = patrol.unit || "RP";
  const observation = patrol.observation?.trim() || "—";
  const seats = Number(patrol.seats || 4);
  const availableSeats = Math.max(0, seats - participants.length);
  const availabilityText = availableSeats === 0
    ? "Viatura sem vagas disponíveis para embarque"
    : "Viatura disponível para embarque";
  const embarked = participants.length
    ? participants.map((id) => `<@${id}>`).join("\n")
    : "—";

  const embed = new EmbedBuilder()
    .setColor(patrol.status === "Aberto" ? 0x1f6feb : 0x8b949e)
    .setTitle(patrol.vehicle)
    .setDescription([
      availabilityText,
      "",
      `**Unidade:** ${unitLabel}`,
      `**Criador:** <@${patrol.creatorId}>`,
      `**Criada em:** ${formatDate(new Date(patrol.startedAt))}`,
      "",
      `**Observação:** ${observation} | **Vagas disponíveis:** ${availableSeats}/${seats}`,
      "",
      `**Embarcados:**`,
      embarked
    ].join("\n"));

  if (config.logoUrl) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

function patrolComponentsV2Payload(patrol, disabled = false) {
  const participants = [...patrol.participants];
  const observation = patrol.observation?.trim() || "—";
  const seats = Number(patrol.seats || 4);
  const availableSeats = Math.max(0, seats - participants.length);
  const availabilityText = availableSeats === 0
    ? "Viatura sem vagas disponíveis para embarque"
    : "Viatura disponível para embarque";
  const embarked = participants.length
    ? participants.map((id) => `<@${id}>`).join("\n")
    : "—";
  const headerContent = [
    `## ${patrol.vehicle}`,
    availabilityText
  ].join("\n");
  const headerComponent = patrol.vehicleImageUrl
    ? {
        type: 9,
        components: [
          {
            type: 10,
            content: headerContent
          }
        ],
        accessory: {
          type: 11,
          media: { url: patrol.vehicleImageUrl },
          description: `Imagem da viatura ${patrol.vehicle}`
        }
      }
    : {
        type: 10,
        content: headerContent
      };
  const accentColor = patrol.status !== "Aberto"
    ? 0x8b949e
    : availableSeats === 0
      ? 0xda3633
      : participants.length >= 4
        ? 0xf59e0b
        : 0x238636;

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: accentColor,
        components: [
          headerComponent,
          {
            type: 14,
            divider: true,
            spacing: 1
          },
          {
            type: 10,
            content: [
              `**Unidade:** ${patrol.unit || "RP"}`,
              `**Criador:** <@${patrol.creatorId}>`,
              `**Criada em:** ${formatDate(new Date(patrol.startedAt))}`,
              "",
              `**Observação:** ${observation} | **Vagas disponíveis:** ${availableSeats}/${seats}`,
              "",
              "**Embarcados:**",
              embarked
            ].join("\n")
          },
          {
            type: 14,
            divider: false,
            spacing: 2
          },
          ...patrolButtonsRaw(disabled)
        ]
      }
    ]
  };
}

function closedPatrolComponentsV2Payload(patrol) {
  const totalMs = Date.now() - new Date(patrol.startedAt).getTime();
  const totalMinutes = Math.max(1, Math.round(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalText = hours ? `${hours}h ${minutes}min` : `${minutes}min`;
  const participants = patrol.participants.size
    ? [...patrol.participants].map((id) => `<@${id}>`).join("\n")
    : "Nenhum";
  const content = [
    "## <:VTR:1459962985953890456> Log de Patrulhamento Encerrado",
    `**Viatura:** ${patrol.vehicle}`,
    `**Criador:** <@${patrol.creatorId}>`,
    `**Tempo total:** ${totalText}`,
    "",
    "**Embarcados/Participantes:**",
    participants
  ].join("\n");
  const headerComponent = patrol.vehicleImageUrl
    ? {
        type: 9,
        components: [
          {
            type: 10,
            content
          }
        ],
        accessory: {
          type: 11,
          media: { url: patrol.vehicleImageUrl },
          description: `Foto da viatura ${patrol.vehicle}`
        }
      }
    : {
        type: 10,
        content
      };
  const components = [
    headerComponent
  ];

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xda3633,
        components
      }
    ]
  };
}

function patrolSummaryPayload({ activeCount, embarkedCount }) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: activeCount > 0 ? 0x238636 : 0x8b949e,
        components: [
          {
            type: 10,
            content: [
              "## <:VTR:1459962985953890456> Resumo de Barcas Ativas",
              `**Barcas Ativas:** ${String(activeCount).padStart(2, "0")}`,
              `**Oficiais Embarcados:** ${String(embarkedCount).padStart(2, "0")}`,
              "",
              "Contagem gerada no momento da consulta."
            ].join("\n")
          },
          {
            type: 12,
            items: [
              {
                media: { url: config.bannerUrl },
                description: "Banner da Rádio Patrulha"
              }
            ]
          }
        ]
      }
    ]
  };
}

function patrolConflictPayload({ patrol }) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xda3633,
        components: [
          {
            type: 10,
            content: [
              "## Não foi possível continuar",
              "Você já está embarcado em uma barca ativa.",
              "",
              `**Barca:** ${patrol.vehicle}`,
              `**Criada em:** ${formatDate(new Date(patrol.startedAt))}`,
              `**Criador:** <@${patrol.creatorId}>`,
              "",
              "Desembarque ou encerre a barca atual antes de abrir ou embarcar em outra."
            ].join("\n")
          }
        ]
      }
    ]
  };
}

function patrolCapacityWarningPayload(patrol) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xf59e0b,
        components: [
          {
            type: 10,
            content: [
              "## Atenção",
              "Na Rádio Patrulha o padrão máximo de Patrulhamento são 4 Oficiais por viatura!",
              "",
              `**Barca:** ${patrol.vehicle}`,
              `**Oficiais embarcados:** ${patrol.participants?.size || 0}`,
              `**Criada em:** ${formatDate(new Date(patrol.startedAt))}`
            ].join("\n")
          },
          {
            type: 12,
            items: [
              {
                media: { url: config.bannerUrl },
                description: "Banner da Rádio Patrulha"
              }
            ]
          }
        ]
      }
    ]
  };
}

function closedPatrolEmbed(patrol) {
  const totalMs = Date.now() - new Date(patrol.startedAt).getTime();
  const totalMinutes = Math.max(1, Math.round(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalText = hours ? `${hours}h ${minutes}min` : `${minutes}min`;

  const embed = new EmbedBuilder()
    .setColor(0xda3633)
    .setTitle("Log de Patrulhamento Encerrado")
    .addFields(
      { name: "Viatura", value: patrol.vehicle, inline: true },
      { name: "Criador", value: `<@${patrol.creatorId}>`, inline: true },
      { name: "Tempo total", value: totalText, inline: true },
      { name: "Embarcados/Participantes", value: patrol.participants.size ? [...patrol.participants].map((id) => `<@${id}>`).join("\n") : "Nenhum", inline: false }
    )
    .setImage(config.bannerUrl);

  if (config.logoUrl) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

function patrolButtons(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("patrol:join")
        .setEmoji(buttonEmojis.join)
        .setLabel("Embarcar")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("patrol:leave")
        .setEmoji(buttonEmojis.leave)
        .setLabel("Desembarcar")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("patrol:observation")
        .setLabel("Observação")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("patrol:remove")
        .setEmoji(buttonEmojis.rem)
        .setLabel("Remover Policial")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("patrol:close")
        .setEmoji(buttonEmojis.end)
        .setLabel("Finalizar Patrulhamento")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    )
  ];
}

function patrolButtonsRaw(disabled = false) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          custom_id: "patrol:join",
          label: "Embarcar",
          emoji: buttonEmojis.join,
          style: ButtonStyle.Secondary,
          disabled
        },
        {
          type: 2,
          custom_id: "patrol:leave",
          label: "Desembarcar",
          emoji: buttonEmojis.leave,
          style: ButtonStyle.Secondary,
          disabled
        },
        {
          type: 2,
          custom_id: "patrol:observation",
          label: "Observação",
          emoji: buttonEmojis.chat,
          style: ButtonStyle.Secondary,
          disabled
        }
      ]
    },
    {
      type: 1,
      components: [
        {
          type: 2,
          custom_id: "patrol:remove",
          label: "Remover Policial",
          emoji: buttonEmojis.rem,
          style: ButtonStyle.Primary,
          disabled
        },
        {
          type: 2,
          custom_id: "patrol:close",
          label: "Finalizar Patrulhamento",
          emoji: buttonEmojis.end,
          style: ButtonStyle.Danger,
          disabled
        }
      ]
    }
  ];
}

module.exports = {
  formatDate,
  setupEmbed,
  setupButtons,
  setupComponentsV2Payload,
  reviewEmbed,
  reviewComponentsV2Payload,
  reviewButtons,
  finalizedReviewComponentsV2Payload,
  finalizedReviewEmbed,
  patrolEmbed,
  patrolComponentsV2Payload,
  patrolSummaryPayload,
  patrolConflictPayload,
  patrolCapacityWarningPayload,
  closedPatrolEmbed,
  closedPatrolComponentsV2Payload,
  patrolButtons
};
