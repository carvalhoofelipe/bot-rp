const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  plugins: [react()],
  root: "src/web/client",
  build: {
    outDir: "../public",
    emptyOutDir: true
  }
});
