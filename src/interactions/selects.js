const config = require("../config");
const { ButtonStyle, MessageFlags } = require("discord.js");
const { createPatrol } = require("../database");
const { findOpenPatrolByParticipant, pendingRegistrations, patrols } = require("../state");
const { bannerFiles } = require("../utils/banner");
const { patrolComponentsV2Payload, patrolConflictPayload } = require("../utils/embeds");

function registrationKey(interaction) {
  return `${interaction.user.id}:${interaction.guildId}`;
}

async function openPatrolFromVehicle(interaction, vehicle) {
  const existingPatrol = findOpenPatrolByParticipant(interaction.user.id);
  if (existingPatrol) {
    const payload = patrolConflictPayload(existingPatrol);
    return interaction.reply({
      ...payload,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }

  const vehicleConfig = config.patrolVehicles.find((item) => item.name === vehicle || item === vehicle);
  const seats = Number(vehicleConfig?.seats || 4);
  const patrol = {
    vehicle,
    seats,
    vehicleImageUrl: vehicleConfig?.imageUrl || "",
    observation: "",
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
      content: "Não consegui abrir o patrulhamento porque o canal de barcas/logs não foi configurado corretamente.",
      ephemeral: true
    });
  }

  const message = await channel.send({
    ...patrolComponentsV2Payload(patrol),
    files: bannerFiles()
  });

  patrols.set(message.id, patrol);
  await createPatrol(patrol, message.id);

  const channelUrl = `https://discord.com/channels/${interaction.guildId}/${channel.id}`;

  return interaction.reply({
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0x238636,
        components: [
          {
            type: 10,
            content: [
              "## Patrulhamento aberto com sucesso",
              `A barca foi enviada para <#${channel.id}>.`,
              "Use o botão **Observação** no card da barca para adicionar detalhes."
            ].join("\n")
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                label: "Ir para Barcas Ativas",
                style: ButtonStyle.Link,
                url: channelUrl
              }
            ]
          }
        ]
      }
    ]
  });
}

async function handleSelect(interaction) {
  if (interaction.customId === "registration:unit") {
    const current = pendingRegistrations.get(registrationKey(interaction)) || {};
    pendingRegistrations.set(registrationKey(interaction), { ...current, unidade: interaction.values[0] });
    return interaction.reply({ content: "Unidade selecionada.", ephemeral: true });
  }

  if (interaction.customId === "registration:rank") {
    const current = pendingRegistrations.get(registrationKey(interaction)) || {};
    pendingRegistrations.set(registrationKey(interaction), { ...current, patente: interaction.values[0] });
    return interaction.reply({ content: "Patente selecionada.", ephemeral: true });
  }

  if (interaction.customId === "patrol:vehicle") {
    return openPatrolFromVehicle(interaction, interaction.values[0]);
  }

  if (interaction.customId.startsWith("patrol:remove-select:")) {
    const messageId = interaction.customId.split(":")[2];
    const patrol = require("../state").patrols.get(messageId);

    if (!patrol) {
      return interaction.reply({ content: "Não encontrei os dados deste patrulhamento.", ephemeral: true });
    }

    if (interaction.user.id !== patrol.creatorId) {
      return interaction.reply({ content: "Apenas quem abriu o patrulhamento pode remover policiais.", ephemeral: true });
    }

    interaction.values.forEach((id) => patrol.participants.delete(id));

    const { updatePatrolParticipants } = require("../database");
    const { patrolComponentsV2Payload } = require("../utils/embeds");
    await updatePatrolParticipants(messageId, patrol.participants);

    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (message) {
      await message.edit(patrolComponentsV2Payload(patrol));
    }

    return interaction.reply({ content: "Policial removido do patrulhamento.", ephemeral: true });
  }

  return false;
}

module.exports = {
  handleSelect,
  registrationKey
};
