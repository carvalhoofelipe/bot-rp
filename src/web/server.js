const express = require("express");
const crypto = require("node:crypto");
const path = require("node:path");
const { currentConfig, getPatchNotes, saveConfigToSupabase } = require("../services/config-store");
const { authenticatePanelUser, deletePanelUser, listPanelUsers, savePanelUser } = require("../services/panel-users");
const { isSupabaseConfigured, requireSupabase } = require("../services/supabase");
const { notificationPayload } = require("../utils/announcements");

function startWebServer(client = null) {
  const app = express();
  const port = Number(process.env.PORT || process.env.WEB_PORT || 8080);
  const host = process.env.HOST || "0.0.0.0";
  const sessions = new Map();

  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(path.join(__dirname, "public")));

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body || {};
    const user = await authenticatePanelUser(username, password);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Usuário ou senha inválidos." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, user);
    res.setHeader("Set-Cookie", `bot_rp_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
    return res.json({ ok: true, user });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = getSessionToken(req);
    if (token) sessions.delete(token);
    res.setHeader("Set-Cookie", "bot_rp_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    return res.json({ ok: true });
  });

  app.get("/api/auth/status", (req, res) => {
    const user = sessions.get(getSessionToken(req));
    res.json({ authenticated: Boolean(user), user: user || null });
  });

  app.use("/api", (req, res, next) => {
    const user = sessions.get(getSessionToken(req));
    if (user) {
      req.panelUser = user;
      return next();
    }
    return res.status(401).json({ ok: false, error: "Login necessário." });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      ...currentConfig(),
      supabaseConfigured: isSupabaseConfigured()
    });
  });

  app.get("/api/health", async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.json({
        ok: false,
        status: "offline",
        message: "SUPABASE_SERVICE_ROLE_KEY não foi preenchida."
      });
    }

    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("bot_rp_settings").select("id").eq("id", 1).single();
      if (error) throw error;

      return res.json({
        ok: true,
        status: "online",
        message: "Conexão com Supabase ativa."
      });
    } catch (error) {
      return res.json({
        ok: false,
        status: "offline",
        message: error.message
      });
    }
  });

  app.get("/api/patch-notes", async (req, res) => {
    try {
      res.json(await getPatchNotes());
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/discord/channels", async (req, res) => {
    try {
      if (!client?.isReady?.()) {
        return res.json([]);
      }

      const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
      if (!guild) return res.json([]);

      const channels = await guild.channels.fetch();
      const textChannels = [...channels.values()]
        .filter((channel) => channel && channel.isTextBased?.() && !channel.isThread?.())
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return res.json(textChannels);
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/discord/members", async (req, res) => {
    try {
      requirePanelPermission(req, "supervisao");
      if (!client?.isReady?.()) {
        return res.status(503).json({ ok: false, error: "Bot não está conectado ao Discord." });
      }

      const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
      if (!guild) return res.json([]);

      const members = await guild.members.fetch();
      const botId = client.user?.id;
      const mapped = [...members.values()]
        .filter((member) => !member.user.bot && member.id !== botId)
        .map((member) => ({
          id: member.id,
          displayName: member.displayName,
          tag: member.user.tag,
          username: member.user.username,
          kickable: member.kickable
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      return res.json(mapped);
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/exonerar", async (req, res) => {
    try {
      requirePanelPermission(req, "supervisao");
      if (!client?.isReady?.()) {
        return res.status(503).json({ ok: false, error: "Bot não está conectado ao Discord." });
      }

      const { discordId } = req.body || {};
      if (!/^\d{17,20}$/.test(String(discordId || ""))) {
        return res.status(400).json({ ok: false, error: "Selecione um usuário válido." });
      }

      const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
      const member = guild ? await guild.members.fetch(discordId).catch(() => null) : null;
      if (!member) {
        return res.status(404).json({ ok: false, error: "Não encontrei essa pessoa no servidor." });
      }

      if (!member.kickable) {
        return res.status(403).json({
          ok: false,
          error: "Não consigo expulsar essa pessoa. Verifique se meu cargo está acima do cargo dela e se tenho permissão de expulsar membros."
        });
      }

      const label = `${member.displayName} (${member.id})`;
      await member.kick(`Exonerado via painel web por ${req.panelUser.username}`);
      return res.json({ ok: true, message: `${label} foi exonerado do servidor.` });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/config", async (req, res) => {
    try {
      requirePanelPermission(req, "supervisao");
      const previous = { ...currentConfig() };
      const saved = await saveConfigToSupabase(req.body);
      const profile = await syncBotProfile(client, previous, saved);
      res.json({ ok: true, config: saved, profile });
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/panel-users", async (req, res) => {
    try {
      requirePanelPermission(req, "supervisao");
      res.json(await listPanelUsers());
    } catch (error) {
      res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/panel-users", async (req, res) => {
    try {
      requirePanelPermission(req, "supervisao");
      const user = await savePanelUser(req.body || {});
      const roleResult = await syncPanelUserRole(client, user);
      res.json({ ok: true, user, roleResult });
    } catch (error) {
      res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  app.delete("/api/panel-users/:id", async (req, res) => {
    try {
      requirePanelPermission(req, "supervisao");
      if (req.params.id === "default") {
        return res.status(400).json({ ok: false, error: "O usuário padrão não pode ser excluído." });
      }

      await deletePanelUser(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/announcement/dm", async (req, res) => {
    try {
      requirePanelPermission(req, "rh");
      if (!client?.isReady?.()) {
        return res.status(503).json({ ok: false, error: "Bot não está conectado ao Discord." });
      }

      const { userId, title, message, signature } = req.body || {};
      if (!userId || !title || !message) {
        return res.status(400).json({ ok: false, error: "Preencha usuário, título e mensagem." });
      }

      const payload = notificationPayload({ title, message, signature });
      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) {
        return res.status(404).json({ ok: false, error: "Usuário não encontrado." });
      }

      await user.send(payload);

      const config = currentConfig();
      const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
      const logChannel = guild
        ? await guild.channels.fetch(config.dmLogChannelId).catch(() => null)
        : null;

      if (logChannel?.isTextBased()) {
        await logChannel.send(notificationPayload({
          title: `Cópia de DM: ${title}`,
          message: [
            `**Destinatário:** <@${userId}> (${userId})`,
            "**Origem:** Painel web",
            "",
            message
          ].join("\n"),
          signature
        }));
      }

      return res.json({ ok: true });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/announcement/server", async (req, res) => {
    try {
      requirePanelPermission(req, "rh");
      if (!client?.isReady?.()) {
        return res.status(503).json({ ok: false, error: "Bot não está conectado ao Discord." });
      }

      const { channelId, title, message, color, bannerUrl } = req.body || {};
      if (!title || !message) {
        return res.status(400).json({ ok: false, error: "Preencha título e mensagem." });
      }

      const config = currentConfig();
      const targetChannelId = channelId || config.announcementChannelId;
      const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
      const channel = guild
        ? await guild.channels.fetch(targetChannelId).catch(() => null)
        : null;

      if (!channel?.isTextBased()) {
        return res.status(404).json({ ok: false, error: "Canal de anúncio não encontrado." });
      }

      await channel.send(notificationPayload({
        title,
        message,
        color: parseHexColor(color),
        bannerUrl: bannerUrl || config.bannerUrl
      }));

      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "bot-rp", panel: true });
  });

  app.listen(port, host, () => {
    console.log(`Painel web disponivel em http://${host}:${port}`);
  });
}

function parseHexColor(value) {
  const clean = String(value || "#1f6feb").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return 0x1f6feb;
  return Number.parseInt(clean, 16);
}

async function syncBotProfile(client, previous, next) {
  const changedName = (previous.botDisplayName || "") !== (next.botDisplayName || "");
  const changedDescription = (previous.botProfileDescription || "") !== (next.botProfileDescription || "");
  const changedLogo = (previous.logoUrl || "") !== (next.logoUrl || "");
  const changedBanner = (previous.botBannerUrl || "") !== (next.botBannerUrl || "");

  if (!changedName && !changedDescription && !changedLogo && !changedBanner) {
    return { updated: [], warnings: [] };
  }

  const result = { updated: [], warnings: [] };

  if (!client?.isReady?.() || !client.user) {
    result.warnings.push("Configuração salva, mas o bot não estava conectado para atualizar o perfil no Discord.");
    return result;
  }

  if (changedName && next.botDisplayName) {
    try {
      await client.user.setUsername(next.botDisplayName);
      result.updated.push("nome do bot");
    } catch (error) {
      result.warnings.push(`Não consegui atualizar o nome do bot no Discord: ${error.message}`);
    }
  }

  if (changedDescription) {
    try {
      await client.rest.patch("/users/@me", {
        body: { bio: next.botProfileDescription || "" }
      });
      result.updated.push("descrição do perfil");
    } catch (error) {
      result.warnings.push(`Não consegui atualizar a descrição do perfil no Discord: ${error.message}`);
    }
  }

  if (changedLogo && next.logoUrl) {
    await applyDiscordProfileImage({
      label: "logo",
      url: next.logoUrl,
      result,
      setter: (image) => client.user.setAvatar(image)
    });
  } else if (changedLogo && !next.logoUrl) {
    await applyDiscordProfileRemoval({
      label: "logo",
      result,
      setter: () => client.user.setAvatar(null)
    });
  }

  if (changedBanner && next.botBannerUrl) {
    if (typeof client.user.setBanner !== "function") {
      result.warnings.push("Esta versão do discord.js não expõe atualização de banner do bot.");
    } else {
      await applyDiscordProfileImage({
        label: "banner do bot",
        url: next.botBannerUrl,
        result,
        setter: (image) => client.user.setBanner(image)
      });
    }
  } else if (changedBanner && !next.botBannerUrl && typeof client.user.setBanner === "function") {
    await applyDiscordProfileRemoval({
      label: "banner do bot",
      result,
      setter: () => client.user.setBanner(null)
    });
  }

  return result;
}

async function applyDiscordProfileImage({ label, url, result, setter }) {
  if (!/^https?:\/\//i.test(url)) {
    result.warnings.push(`O ${label} precisa ser uma URL pública para atualizar o perfil no Discord.`);
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const image = Buffer.from(await response.arrayBuffer());
    await setter(image);
    result.updated.push(label);
  } catch (error) {
    result.warnings.push(`Não consegui atualizar o ${label} no Discord: ${error.message}`);
  }
}

async function applyDiscordProfileRemoval({ label, result, setter }) {
  try {
    await setter();
    result.updated.push(`${label} removido`);
  } catch (error) {
    result.warnings.push(`Não consegui remover o ${label} no Discord: ${error.message}`);
  }
}

async function syncPanelUserRole(client, user) {
  const result = { updated: false, warnings: [] };
  if (!user.discordId) return result;

  const config = currentConfig();
  const targetRoleId = user.permission === "supervisao" ? config.supervisionRoleId : config.rhRoleId;
  const otherRoleId = user.permission === "supervisao" ? config.rhRoleId : config.supervisionRoleId;

  if (!targetRoleId) {
    result.warnings.push("Usuário salvo, mas o cargo correspondente ainda não foi configurado.");
    return result;
  }

  if (!client?.isReady?.()) {
    result.warnings.push("Usuário salvo, mas o bot não estava conectado para aplicar cargo no Discord.");
    return result;
  }

  const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
  const member = guild ? await guild.members.fetch(user.discordId).catch(() => null) : null;
  if (!member) {
    result.warnings.push("Usuário salvo, mas não encontrei esse ID no servidor.");
    return result;
  }

  try {
    if (otherRoleId && member.roles.cache.has(otherRoleId)) {
      await member.roles.remove(otherRoleId, "Permissão do painel Bot RPS atualizada");
    }
    await member.roles.add(targetRoleId, "Permissão do painel Bot RPS atualizada");
    result.updated = true;
  } catch (error) {
    result.warnings.push(`Usuário salvo, mas não consegui aplicar o cargo no Discord: ${error.message}`);
  }

  return result;
}

function requirePanelPermission(req, permission) {
  const userPermission = req.panelUser?.permission;
  if (userPermission === "supervisao") return;
  if (permission === "rh" && userPermission === "rh") return;

  const error = new Error("Seu usuário não tem permissão para esta ação.");
  error.status = 403;
  throw error;
}

function getSessionToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)bot_rp_session=([^;]+)/);
  return match ? match[1] : "";
}

module.exports = {
  startWebServer
};
