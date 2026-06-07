const { MessageFlags } = require("discord.js");
const config = require("../config");
const { bannerFiles } = require("./banner");

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function formatDuration(ms) {
  const totalMinutes = Math.max(1, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function compactTags(tags) {
  return tags.length ? tags.join(" ") : "Sem cargos";
}

function memberJoinLogPayload(member) {
  return memberLogPayload({
    color: 0x00d084,
    title: "🟢 Entrada registrada",
    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 128 }),
    lines: [
      "Novo membro entrou no servidor.",
      "",
      `**Usuário:** ${member.user}`,
      `**Tag:** ${member.user.tag}`,
      `**ID:** ${member.id}`,
      `**Entrada:** ${formatDateTime(new Date())}`
    ]
  });
}

function memberLeaveLogPayload(member) {
  const joinedAt = member.joinedAt || new Date();
  const stayedFor = formatDuration(Date.now() - joinedAt.getTime());
  const roles = member.roles.cache
    .filter((role) => role.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((role) => `<@&${role.id}>`);

  return memberLogPayload({
    color: 0xff5c5c,
    title: "🔴 Membro saiu do servidor",
    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 128 }),
    lines: [
      "Um membro deixou o servidor.",
      "",
      `**Nome no servidor:** ${member.displayName}`,
      `**Usuário:** ${member.user}`,
      `**Tag:** ${member.user.tag}`,
      `**ID:** ${member.id}`,
      `**Permaneceu por:** ${stayedFor}`,
      `**Cargos na saída:** ${compactTags(roles)}`
    ]
  });
}

function memberLogPayload({ color, title, lines, avatarUrl }) {
  const headerComponent = avatarUrl
    ? {
        type: 9,
        components: [
          {
            type: 10,
            content: [`## ${title}`, ...lines].join("\n")
          }
        ],
        accessory: {
          type: 11,
          media: { url: avatarUrl },
          description: "Avatar do membro"
        }
      }
    : {
        type: 10,
        content: [`## ${title}`, ...lines].join("\n")
      };

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: color,
        components: [
          headerComponent,
          {
            type: 14,
            divider: true,
            spacing: 1
          },
          {
            type: 12,
            items: [
              {
                media: { url: config.bannerUrl },
                description: "Banner Rádio Patrulha"
              }
            ]
          }
        ]
      }
    ]
  };
}

async function sendMemberLog(guild, payload) {
  if (!config.memberLogChannelId) return;

  const channel = guild.channels.cache.get(config.memberLogChannelId)
    || await guild.channels.fetch(config.memberLogChannelId).catch(() => null);

  if (channel?.isTextBased()) {
    await channel.send({ ...payload, files: bannerFiles() }).catch((error) => {
      console.warn(`Nao foi possivel enviar log de membro: ${error.message}`);
    });
  }
}

module.exports = {
  memberJoinLogPayload,
  memberLeaveLogPayload,
  sendMemberLog
};
