const config = require("../config");
const { closePatrol, getOpenPatrols } = require("../database");
const { patrols } = require("../state");
const { closedPatrolComponentsV2Payload } = require("../utils/embeds");
const { bannerFiles } = require("../utils/banner");

const TWENTY_HOURS = 20 * 60 * 60 * 1000;
const CHECK_INTERVAL = 10 * 60 * 1000;

function rowToPatrol(row) {
  return {
    vehicle: row.vehicle,
    seats: row.vehicle_seats || 4,
    vehicleImageUrl: row.vehicle_image_url || "",
    observation: row.observation || "",
    unit: "RP",
    creatorId: row.creator_id,
    participants: new Set(row.participant_ids || []),
    startedAt: row.started_at,
    status: row.status,
    capacityWarningSent: (row.participant_ids || []).length >= 4
  };
}

async function loadOpenPatrolsIntoMemory() {
  try {
    const rows = await getOpenPatrols();
    rows.forEach((row) => {
      if (row.message_id) {
        patrols.set(row.message_id, rowToPatrol(row));
      }
    });

    console.log(`${rows.length} patrulhamento(s) aberto(s) carregado(s).`);
  } catch (error) {
    console.warn(`Não foi possível carregar patrulhamentos abertos: ${error.message}`);
  }
}

function startPatrolExpirationWatcher(client) {
  const run = () => closeExpiredPatrols(client).catch((error) => {
    console.error("Erro ao verificar patrulhamentos vencidos:", error);
  });

  setTimeout(run, 30_000);
  setInterval(run, CHECK_INTERVAL);
}

async function closeExpiredPatrols(client) {
  const now = Date.now();

  for (const [messageId, patrol] of patrols) {
    const age = now - new Date(patrol.startedAt).getTime();
    if (age < TWENTY_HOURS || patrol.status !== "Aberto") continue;

    patrol.status = "Encerrado";
    patrol.closedAt = new Date().toISOString();

    await closePatrol(messageId, patrol.participants);
    await sendClosedPatrolLog(client, patrol);
    await deleteActivePatrolMessage(client, messageId);
    patrols.delete(messageId);
  }
}

async function sendClosedPatrolLog(client, patrol) {
  const channel = await client.channels.fetch(config.patrolLogChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  await channel.send({
    ...closedPatrolComponentsV2Payload(patrol),
    files: bannerFiles()
  });
}

async function deleteActivePatrolMessage(client, messageId) {
  const channelId = config.activePatrolsChannelId || config.patrolLogChannelId;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) {
    await message.delete().catch(() => null);
  }
}

module.exports = {
  loadOpenPatrolsIntoMemory,
  startPatrolExpirationWatcher
};
