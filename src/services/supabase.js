const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

function isSupabaseConfigured() {
  return Boolean(supabase);
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env.");
  }

  return supabase;
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  requireSupabase
};
