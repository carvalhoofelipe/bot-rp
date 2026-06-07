module.exports = {
  // Canal que recebera os pedidos de registro e atualizacao.
  analysisChannelId: "COLOQUE_O_ID_DO_CANAL_DE_ANALISE",

  // Cargo que pode aprovar, recusar e encerrar patrulhamentos de terceiros.
  authorizerRoleId: "COLOQUE_O_ID_DO_CARGO_AUTORIZADOR",

  // Canal ou link do painel policial. Se usar canal, preencha panelChannelId.
  panelChannelId: "COLOQUE_O_ID_DO_CANAL_DO_PAINEL",
  panelUrl: "",

  // Imagens do bot e dos embeds. Use URL publica para sincronizar com o perfil do Discord.
  botDisplayName: "",
  botProfileDescription: "",
  bannerUrl: "attachment://banner.png",
  botBannerUrl: "",
  logoUrl: "",
  localBannerPath: "assets/banner.png",
  manualUrl: "https://radiopatrulha.gitbook.io/",

  // Canal que receberá os logs de patrulhamento.
  patrolLogChannelId: "COLOQUE_O_ID_DO_CANAL_DE_LOGS_DE_PATRULHAMENTO",

  // Canal onde o menu /setup sera enviado e canal de barcas/patrulhas ativas.
  menuChannelId: "",
  activePatrolsChannelId: "",
  announcementChannelId: "",
  dmLogChannelId: "",
  memberLogChannelId: "",
  supervisionRoleId: "",
  rhRoleId: "",

  // Modelos usados pelos botões de mensagem pronta na aba DM do painel web.
  dmTemplates: {
    absence: {
      title: "Aviso de Ausência",
      message: "Identificamos ausência nas atividades da Rádio Patrulha. Procure o comando responsável para justificar sua situação e evitar medidas administrativas.",
      signature: "Comando RPS"
    },
    basicCourses: {
      title: "Pendência de Cursos Básicos",
      message: "Consta pendência nos cursos básicos obrigatórios. Regularize sua formação com a instrução responsável para manter sua situação em dia.",
      signature: "Comando RPS"
    }
  },

  // Edite as unidades e cargos conforme seu servidor.
  units: [
    { label: "P2", value: "P2", roleId: "" },
    { label: "DPJM", value: "DPJM", roleId: "" },
    { label: "COE", value: "COE", roleId: "" },
    { label: "GAM", value: "GAM", roleId: "" },
    { label: "BOPE", value: "BOPE", roleId: "" },
    { label: "RECOM", value: "RECOM", roleId: "" },
    { label: "GTM", value: "GTM", roleId: "" },
    { label: "GAR", value: "GAR", roleId: "" },
    { label: "RP", value: "RP", roleId: "" },
    { label: "BPE", value: "BPE", roleId: "" },
    { label: "PENAL", value: "PENAL", roleId: "" }
  ],

  // Edite as patentes e cargos conforme seu servidor.
  ranks: [
    { label: "Coronel", value: "Coronel", roleId: "" },
    { label: "T.Coronel", value: "T.Coronel", roleId: "" },
    { label: "Major", value: "Major", roleId: "" },
    { label: "Capitão", value: "Capitão", roleId: "" },
    { label: "1° Tenente", value: "1° Tenente", roleId: "" },
    { label: "2° Tenente", value: "2° Tenente", roleId: "" },
    { label: "Subtenente", value: "Subtenente", roleId: "" },
    { label: "1° Sargento", value: "1° Sargento", roleId: "" },
    { label: "2° Sargento", value: "2° Sargento", roleId: "" },
    { label: "3° Sargento", value: "3° Sargento", roleId: "" },
    { label: "Cabo", value: "Cabo", roleId: "" },
    { label: "Soldado", value: "Soldado", roleId: "" },
    { label: "Recruta", value: "Recruta", roleId: "" }
  ],

  // Viaturas disponíveis no fluxo de patrulhamento.
  patrolVehicles: [
    { name: "Moto", seats: 2, imageUrl: "" },
    { name: "SUV", seats: 4, imageUrl: "" },
    { name: "Camionete", seats: 4, imageUrl: "" },
    { name: "Corolla", seats: 4, imageUrl: "" },
    { name: "Helicóptero", seats: 6, imageUrl: "" },
    { name: "Barco", seats: 6, imageUrl: "" },
    { name: "Blindado", seats: 8, imageUrl: "" },
    { name: "Outra", seats: 4, imageUrl: "" }
  ]
};
