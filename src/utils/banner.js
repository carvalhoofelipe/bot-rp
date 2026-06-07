const fs = require("node:fs");
const path = require("node:path");
const { AttachmentBuilder } = require("discord.js");
const config = require("../config");

function bannerFiles() {
  if (!config.bannerUrl.startsWith("attachment://")) {
    return [];
  }

  const bannerPath = path.join(__dirname, "..", "..", config.localBannerPath);
  if (!fs.existsSync(bannerPath)) {
    return [];
  }

  return [new AttachmentBuilder(bannerPath, { name: path.basename(config.localBannerPath) })];
}

module.exports = {
  bannerFiles
};
