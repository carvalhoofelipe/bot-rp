const pendingRegistrations = new Map();
const patrols = new Map();

function findOpenPatrolByParticipant(userId, ignoredMessageId = null) {
  for (const [messageId, patrol] of patrols) {
    if (messageId === ignoredMessageId) continue;
    if (patrol.status === "Aberto" && patrol.participants?.has(userId)) {
      return { messageId, patrol };
    }
  }

  return null;
}

module.exports = {
  pendingRegistrations,
  patrols,
  findOpenPatrolByParticipant
};
