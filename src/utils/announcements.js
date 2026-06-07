const { ButtonStyle, MessageFlags } = require("discord.js");
const config = require("../config");

const buttonEmojis = {
  nav: { id: "1268185271791255582", name: "nav" },
  loudspeaker: { id: "1268185265311318128", name: "loudspeaker" }
};

function announcementPanelPayload() {
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
              "# 📢 Painel de Anúncios",
              "Selecione uma opção abaixo para enviar uma notificação privada ou um anúncio global."
            ].join("\n")
          },
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
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                custom_id: "announcement:dm",
                label: "Enviar DM (Privado)",
                emoji: buttonEmojis.nav,
                style: ButtonStyle.Primary
              },
              {
                type: 2,
                custom_id: "announcement:server",
                label: "Fazer Anúncio (Servidor)",
                emoji: buttonEmojis.loudspeaker,
                style: ButtonStyle.Danger
              }
            ]
          }
        ]
      }
    ]
  };
}

function notificationPayload({ title, message, signature, color = 0x1f6feb, bannerUrl }) {
  const body = [
    `# ${title}`,
    message,
    signature ? `\n**Assinatura:** ${signature}` : ""
  ].filter(Boolean).join("\n\n");

  const components = [
    {
      type: 10,
      content: body
    }
  ];

  if (bannerUrl) {
    components.push({
      type: 12,
      items: [
        {
          media: { url: bannerUrl },
          description: "Banner do anúncio"
        }
      ]
    });
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: color,
        components
      }
    ]
  };
}

function registrationDecisionPayload({ approved, reason = "" }) {
  const title = approved ? "Registro aprovado" : "Registro recusado";
  const message = approved
    ? "Seu registro na Rádio Patrulha foi aprovado. Os cargos autorizados foram aplicados no servidor."
    : `Seu registro na Rádio Patrulha foi recusado.\n\n**Motivo:** ${reason || "Não informado."}`;

  return notificationPayload({
    title,
    message,
    signature: "Rádio Patrulha",
    color: approved ? 0x238636 : 0xda3633,
    bannerUrl: config.bannerUrl
  });
}

function welcomeDmPayload(member) {
  const menuUrl = config.menuChannelId
    ? `https://discord.com/channels/${member.guild.id}/${config.menuChannelId}`
    : "";

  const components = [
    {
      type: 10,
      content: [
        `# Bem-vindo à Rádio Patrulha, ${member.user.username}!`,
        "Seja bem-vindo ao servidor. Leia o manual e acesse o menu para realizar seu registro inicial.",
        "",
        `**Manual:** ${config.manualUrl}`,
        menuUrl ? `**Menu de registro:** ${menuUrl}` : "**Menu de registro:** ainda não configurado."
      ].join("\n")
    },
    {
      type: 12,
      items: [
        {
          media: { url: config.bannerUrl },
          description: "Banner Rádio Patrulha"
        }
      ]
    },
    {
      type: 1,
      components: [
        {
          type: 2,
          label: "Abrir Manual",
          style: ButtonStyle.Link,
          url: config.manualUrl
        },
        ...(menuUrl
          ? [{
              type: 2,
              label: "Ir para o Menu",
              style: ButtonStyle.Link,
              url: menuUrl
            }]
          : [])
      ]
    }
  ];

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0x1f6feb,
        components
      }
    ]
  };
}

function infoBarcasPayload(guildId) {
  const menuText = config.menuChannelId ? `<#${config.menuChannelId}>` : "#menu";
  const menuUrl = config.menuChannelId
    ? `https://discord.com/channels/${guildId}/${config.menuChannelId}`
    : "";
  const components = [
    {
      type: 10,
      content: [
        "# <:VTR:1459962985953890456> Informações de Barcas",
        `Para abrir uma barca, acesse ${menuText} e clique em **Abrir Patrulhamento**.`,
        "Depois de aberta, a barca ficará disponível na sala de barcas ativas para embarque, desembarque e observações."
      ].join("\n")
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
  ];

  if (menuUrl) {
    components.push({
      type: 1,
      components: [
        {
          type: 2,
          label: "Ir para o Menu",
          style: ButtonStyle.Link,
          url: menuUrl
        }
      ]
    });
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0x1f6feb,
        components
      }
    ]
  };
}

module.exports = {
  announcementPanelPayload,
  infoBarcasPayload,
  notificationPayload,
  registrationDecisionPayload,
  welcomeDmPayload
};
