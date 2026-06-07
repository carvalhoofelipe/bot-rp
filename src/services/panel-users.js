const crypto = require("node:crypto");
const { isSupabaseConfigured, requireSupabase } = require("./supabase");

const DEFAULT_USER = {
  id: "default",
  username: process.env.PANEL_USER || "tiaozadas",
  discordId: "",
  permission: "supervisao",
  active: true
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), candidate);
}

function dbUserToPanelUser(user) {
  return {
    id: user.id,
    username: user.username,
    discordId: user.discord_id || "",
    permission: user.permission || "rh",
    active: Boolean(user.active)
  };
}

async function authenticatePanelUser(username, password) {
  if (username === DEFAULT_USER.username && password === (process.env.PANEL_PASSWORD || "Tiaozadas@2026")) {
    return DEFAULT_USER;
  }

  if (!isSupabaseConfigured()) return null;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("bot_rp_panel_users")
    .select("*")
    .eq("username", username)
    .eq("active", true)
    .maybeSingle();

  if (error || !data || !verifyPassword(password, data.password_hash)) return null;
  return dbUserToPanelUser(data);
}

async function listPanelUsers() {
  if (!isSupabaseConfigured()) return [DEFAULT_USER];

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("bot_rp_panel_users")
    .select("id, username, discord_id, permission, active")
    .order("username", { ascending: true });

  if (error) throw error;
  return [DEFAULT_USER, ...(data || []).map(dbUserToPanelUser)];
}

async function savePanelUser(user) {
  const supabase = requireSupabase();
  const payload = {
    username: user.username,
    discord_id: user.discordId || "",
    permission: user.permission === "supervisao" ? "supervisao" : "rh",
    active: user.active !== false,
    updated_at: new Date().toISOString()
  };

  if (user.password) {
    payload.password_hash = hashPassword(user.password);
  }

  if (user.id && user.id !== "new") {
    const { data, error } = await supabase
      .from("bot_rp_panel_users")
      .update(payload)
      .eq("id", user.id)
      .select("id, username, discord_id, permission, active")
      .single();

    if (error) throw error;
    return dbUserToPanelUser(data);
  }

  if (!payload.password_hash) {
    throw new Error("Informe uma senha para criar o usuário.");
  }

  const { data, error } = await supabase
    .from("bot_rp_panel_users")
    .insert(payload)
    .select("id, username, discord_id, permission, active")
    .single();

  if (error) throw error;
  return dbUserToPanelUser(data);
}

async function deletePanelUser(id) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("bot_rp_panel_users").delete().eq("id", id);
  if (error) throw error;
}

module.exports = {
  authenticatePanelUser,
  deletePanelUser,
  listPanelUsers,
  savePanelUser
};
