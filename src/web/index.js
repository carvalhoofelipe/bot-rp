require("dotenv").config();

const { loadConfigFromSupabase } = require("../services/config-store");
const { startWebServer } = require("./server");

async function main() {
  startWebServer();
  loadConfigFromSupabase().catch((error) => {
    console.warn(`Nao foi possivel carregar o Supabase em segundo plano: ${error.message}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
