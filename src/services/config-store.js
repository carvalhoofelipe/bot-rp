const fallbackConfig = require("../config");
const { isSupabaseConfigured, requireSupabase } = require("./supabase");

function normalizeItem(item) {
  return {
    label: item.label,
    value: item.value || item.label,
    roleId: item.role_id || item.roleId || ""
  };
}

function normalizeDmTemplates(templates = {}) {
  return {
    ...fallbackConfig.dmTemplates,
    ...templates
  };
}

function dbSettingsToConfig(settings, units, ranks, vehicles) {
  return {
    analysisChannelId: settings.analysis_channel_id || "",
    authorizerRoleId: settings.authorizer_role_id || "",
    panelChannelId: settings.panel_channel_id || "",
    panelUrl: settings.panel_url || "",
    botDisplayName: settings.bot_display_name || "",
    botProfileDescription: settings.bot_profile_description || "",
    bannerUrl: settings.banner_url || "attachment://banner.png",
    botBannerUrl: settings.bot_banner_url || "",
    logoUrl: settings.logo_url || "",
    localBannerPath: settings.local_banner_path || "assets/banner.png",
    patrolLogChannelId: settings.patrol_log_channel_id || "",
    menuChannelId: settings.menu_channel_id || "",
    activePatrolsChannelId: settings.active_patrols_channel_id || "",
    announcementChannelId: settings.announcement_channel_id || "",
    dmLogChannelId: settings.dm_log_channel_id || "",
    memberLogChannelId: settings.member_log_channel_id || "",
    supervisionRoleId: settings.supervision_role_id || "",
    rhRoleId: settings.rh_role_id || "",
    dmTemplates: normalizeDmTemplates(settings.dm_templates || {}),
    units: units.map(normalizeItem),
    ranks: ranks.map(normalizeItem),
    patrolVehicles: vehicles.map((vehicle) => ({
      name: vehicle.name,
      seats: vehicle.seats || 4,
      imageUrl: vehicle.image_url || vehicle.imageUrl || ""
    }))
  };
}

function currentConfig() {
  return fallbackConfig;
}

async function loadConfigFromSupabase() {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase nao configurado. Usando src/config.js ate preencher SUPABASE_SERVICE_ROLE_KEY.");
    return currentConfig();
  }

  try {
    const supabase = requireSupabase();
    const [{ data: settings, error: settingsError }, { data: units, error: unitsError }, { data: ranks, error: ranksError }, { data: vehicles, error: vehiclesError }] = await Promise.all([
      supabase.from("bot_rp_settings").select("*").eq("id", 1).single(),
      supabase.from("bot_rp_units").select("*").order("sort_order", { ascending: true }),
      supabase.from("bot_rp_ranks").select("*").order("sort_order", { ascending: true }),
      supabase.from("bot_rp_patrol_vehicles").select("*").order("sort_order", { ascending: true })
    ]);

    const error = settingsError || unitsError || ranksError || vehiclesError;
    if (error) throw error;

    Object.assign(fallbackConfig, dbSettingsToConfig(settings, units || [], ranks || [], vehicles || []));
  } catch (error) {
    console.warn(`Nao foi possivel carregar o Supabase. Usando src/config.js. Motivo: ${error.message}`);
  }

  return currentConfig();
}

async function saveConfigToSupabase(config) {
  const supabase = requireSupabase();
  const settings = {
    id: 1,
    analysis_channel_id: config.analysisChannelId || "",
    authorizer_role_id: config.authorizerRoleId || "",
    panel_channel_id: config.panelChannelId || "",
    panel_url: config.panelUrl || "",
    bot_display_name: config.botDisplayName || "",
    bot_profile_description: config.botProfileDescription || "",
    banner_url: config.bannerUrl || "attachment://banner.png",
    bot_banner_url: config.botBannerUrl || "",
    logo_url: config.logoUrl || "",
    local_banner_path: config.localBannerPath || "assets/banner.png",
    patrol_log_channel_id: config.patrolLogChannelId || "",
    menu_channel_id: config.menuChannelId || "",
    active_patrols_channel_id: config.activePatrolsChannelId || "",
    announcement_channel_id: config.announcementChannelId || "",
    dm_log_channel_id: config.dmLogChannelId || "",
    member_log_channel_id: config.memberLogChannelId || "",
    supervision_role_id: config.supervisionRoleId || "",
    rh_role_id: config.rhRoleId || "",
    dm_templates: normalizeDmTemplates(config.dmTemplates),
    updated_at: new Date().toISOString()
  };

  const { error: settingsError } = await supabase.from("bot_rp_settings").upsert(settings);
  if (settingsError) throw settingsError;

  await replaceTable("bot_rp_units", (config.units || []).map((unit, index) => ({
    label: unit.label,
    value: unit.value || unit.label,
    role_id: unit.roleId || "",
    sort_order: index + 1
  })));

  await replaceTable("bot_rp_ranks", (config.ranks || []).map((rank, index) => ({
    label: rank.label,
    value: rank.value || rank.label,
    role_id: rank.roleId || "",
    sort_order: index + 1
  })));

  await replaceTable("bot_rp_patrol_vehicles", (config.patrolVehicles || []).map((vehicle, index) => ({
    name: typeof vehicle === "string" ? vehicle : vehicle.name,
    seats: Number(typeof vehicle === "string" ? 4 : vehicle.seats) || 4,
    image_url: typeof vehicle === "string" ? "" : vehicle.imageUrl || "",
    sort_order: index + 1
  })));

  await loadConfigFromSupabase();
  return currentConfig();
}

async function getPatchNotes() {
  if (!isSupabaseConfigured()) {
    return [
      {
        version: "0.3.0",
        title: "Painel React",
        body: "Adicionado painel em React com verificador de banco, logo, aba Patrulhamento e Patch Notes.",
        created_at: new Date().toISOString()
      },
      {
        version: "0.2.0",
        title: "Supabase e painel web",
        body: "Configurações, registros e patrulhamentos passaram a usar tabelas bot_rp_* no Supabase.",
        created_at: new Date().toISOString()
      },
      {
        version: "0.1.0",
        title: "Base do bot",
        body: "Criado bot Discord com registro, atualização, aprovação, recusa e patrulhamento.",
        created_at: new Date().toISOString()
      }
    ];
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("bot_rp_patch_notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function replaceTable(table, rows) {
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase.from(table).delete().neq("id", 0);
  if (deleteError) throw deleteError;

  if (!rows.length) return;

  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) throw insertError;
}

module.exports = {
  currentConfig,
  getPatchNotes,
  loadConfigFromSupabase,
  saveConfigToSupabase
};
