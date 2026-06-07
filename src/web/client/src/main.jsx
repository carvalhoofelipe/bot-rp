import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const emptyItem = { label: "", value: "", roleId: "" };

const roomFields = [
  ["menuChannelId", "Sala do menu", "ID do canal onde ficará o menu"],
  ["analysisChannelId", "Canal de registros", "ID do canal de análise de registros"],
  ["patrolLogChannelId", "Canal de logs", "ID do canal de logs de patrulhamento"],
  ["announcementChannelId", "Sala de anúncios", "ID do canal padrão para anúncios"],
  ["dmLogChannelId", "Sala de logs de DM", "ID do canal que receberá cópia das DMs"],
  ["memberLogChannelId", "Sala de entrada e saída", "ID do canal de logs de entrada e saída do servidor"],
  ["authorizerRoleId", "Cargo autorizador", "ID do cargo que aprova registros"],
  ["panelChannelId", "Canal do painel policial", "ID do canal do painel policial"],
  ["panelUrl", "Link do painel policial", "https://..."]
];

const personalizationFields = [
  ["logoUrl", "Logo do bot", "URL pública para alterar o avatar do bot no Discord"],
  ["botBannerUrl", "Banner do bot", "URL pública para alterar o banner do perfil do bot"],
  ["bannerUrl", "Banner das embeds", "URL ou attachment://banner.png usado nas mensagens"]
];

const dmTemplates = {
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
};

function normalizeDmTemplates(templates = {}) {
  return {
    ...dmTemplates,
    ...templates
  };
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("registro");
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState({ ok: false, message: "Verificando banco..." });
  const [patchNotes, setPatchNotes] = useState([]);
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [panelUsers, setPanelUsers] = useState([]);
  const [status, setStatus] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [exonerationStatus, setExonerationStatus] = useState("");
  const [announcementStatus, setAnnouncementStatus] = useState("");
  const [patchModalOpen, setPatchModalOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;

    loadAll();
    const timer = setInterval(loadHealth, 15000);
    return () => clearInterval(timer);
  }, [authenticated, currentUser?.permission]);

  useEffect(() => {
    if (authenticated && currentUser?.permission === "rh" && !["dm", "anuncio"].includes(activeTab)) {
      setActiveTab("dm");
    }
  }, [authenticated, currentUser?.permission, activeTab]);

  async function checkAuth() {
    const response = await fetch("/api/auth/status");
    const data = await response.json();
    setAuthenticated(Boolean(data.authenticated));
    setCurrentUser(data.user || null);
    setCheckingAuth(false);
  }

  async function login(username, password) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Login inválido.");
    setCurrentUser(data.user || null);
    setAuthenticated(true);
  }

  async function loadAll() {
    const requests = [
      fetch("/api/config"),
      fetch("/api/patch-notes"),
      fetch("/api/discord/channels")
    ];

    if (currentUser?.permission === "supervisao") {
      requests.push(fetch("/api/panel-users"));
      requests.push(fetch("/api/discord/members"));
    }

    const [configResponse, patchResponse, channelsResponse, usersResponse, membersResponse] = await Promise.all(requests);
    setConfig(await configResponse.json());
    setPatchNotes(await patchResponse.json());
    setChannels(await channelsResponse.json());
    if (usersResponse) setPanelUsers(await usersResponse.json());
    if (membersResponse) setMembers(await membersResponse.json());
    await loadHealth();
  }

  async function loadHealth() {
    const response = await fetch("/api/health");
    setHealth(await response.json());
  }

  function updateField(field, value) {
    setConfig((current) => ({ ...current, [field]: value }));
  }

  function updateList(kind, index, field, value) {
    setConfig((current) => {
      const next = [...current[kind]];
      next[index] = { ...next[index], [field]: value };
      return { ...current, [kind]: next };
    });
  }

  function addListItem(kind, item = emptyItem) {
    setConfig((current) => ({ ...current, [kind]: [...(current[kind] || []), { ...item }] }));
  }

  function removeListItem(kind, index) {
    setConfig((current) => ({ ...current, [kind]: current[kind].filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function saveConfig() {
    setStatus("Gravando...");
    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    const result = await response.json();
    if (!result.ok) {
      setStatus(result.error || "Não foi possível gravar.");
      await loadHealth();
      return;
    }

    setConfig(result.config);
    const warnings = result.profile?.warnings || [];
    const updated = result.profile?.updated || [];
    const profileText = updated.length ? ` Perfil atualizado: ${updated.join(", ")}.` : "";
    const warningText = warnings.length ? ` ${warnings.join(" ")}` : "";
    setStatus(`Configurações gravadas no Supabase.${profileText}${warningText}`);
    await loadHealth();
  }

  async function sendWebAnnouncement(kind, payload) {
    setAnnouncementStatus("Enviando...");
    const response = await fetch(`/api/announcement/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setAnnouncementStatus(result.ok ? "Enviado com sucesso." : result.error || "Não foi possível enviar.");
  }

  async function savePanelUser(user) {
    setAdminStatus("Gravando usuário...");
    const response = await fetch("/api/panel-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });
    const result = await response.json();
    if (!result.ok) {
      setAdminStatus(result.error || "Não foi possível gravar o usuário.");
      return;
    }

    const warnings = result.roleResult?.warnings || [];
    setAdminStatus(warnings.length ? `Usuário gravado. ${warnings.join(" ")}` : "Usuário gravado e cargo aplicado, se informado.");
    const usersResponse = await fetch("/api/panel-users");
    setPanelUsers(await usersResponse.json());
  }

  async function deletePanelUser(id) {
    setAdminStatus("Excluindo usuário...");
    const response = await fetch(`/api/panel-users/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!result.ok) {
      setAdminStatus(result.error || "Não foi possível excluir o usuário.");
      return;
    }

    setAdminStatus("Usuário excluído.");
    setPanelUsers((current) => current.filter((user) => String(user.id) !== String(id)));
  }

  async function exonerateMember(discordId) {
    setExonerationStatus("Exonerando...");
    const response = await fetch("/api/exonerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId })
    });
    const result = await response.json();
    if (!result.ok) {
      setExonerationStatus(result.error || "Não foi possível exonerar.");
      return;
    }

    setExonerationStatus(result.message || "Usuário exonerado.");
    const membersResponse = await fetch("/api/discord/members");
    setMembers(await membersResponse.json());
  }

  const logoPreview = useMemo(() => config?.logoUrl?.trim(), [config]);
  const isSupervisor = currentUser?.permission === "supervisao";

  if (checkingAuth) {
    return <main className="shell"><p>Carregando painel...</p></main>;
  }

  if (!authenticated) {
    return <LoginScreen onLogin={login} />;
  }

  if (!config) {
    return <main className="shell"><p>Carregando painel...</p></main>;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <LogoPreview logoUrl={logoPreview} />
          <div>
            <h1>Bot Rádio Patrulha</h1>
            <p>Configuração do bot e persistência no Supabase</p>
          </div>
        </div>
        <div className="saveCard">
          <DatabaseStatus health={health} />
          <PatchNoteMini notes={patchNotes} onOpen={() => setPatchModalOpen(true)} />
          {isSupervisor && <button className="primary" onClick={saveConfig}>Gravar</button>}
          {status && <p className="saveStatus">{status}</p>}
        </div>
      </header>
      {patchModalOpen && <PatchNotesModal notes={patchNotes} onClose={() => setPatchModalOpen(false)} />}

      <nav className="tabs" aria-label="Abas do painel">
        {(isSupervisor ? [
          ["registro", "Registro"],
          ["salas", "Salas"],
          ["patrulhamento", "Patrulhamento"],
          ["dm", "DM"],
          ["anuncio", "Anúncio"],
          ["exoneracao", "Exoneração"],
          ["personalizacao", "Personalização"],
          ["administracao", "Administração"]
        ] : [
          ["dm", "DM"],
          ["anuncio", "Anúncio"]
        ]).map(([key, label]) => (
          <button key={key} className={`tab ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "registro" && (
        <section className="panel">
          <ListEditor
            title="Patentes"
            addLabel="Adicionar patente"
            items={config.ranks || []}
            onAdd={() => addListItem("ranks")}
            onRemove={(index) => removeListItem("ranks", index)}
            onChange={(index, field, value) => updateList("ranks", index, field, value)}
          />
          <ListEditor
            title="Unidades"
            addLabel="Adicionar unidade"
            items={config.units || []}
            onAdd={() => addListItem("units")}
            onRemove={(index) => removeListItem("units", index)}
            onChange={(index, field, value) => updateList("units", index, field, value)}
          />
        </section>
      )}

      {activeTab === "salas" && (
        <section className="panel grid">
          {roomFields.map(([field, label, placeholder]) => (
            <ChannelField
              key={field}
              label={label}
              placeholder={placeholder}
              value={config[field] || ""}
              channels={field.toLowerCase().includes("channel") ? channels : []}
              onChange={(value) => updateField(field, value)}
            />
          ))}
        </section>
      )}

      {activeTab === "personalizacao" && (
        <PersonalizationPanel config={config} onChange={updateField} />
      )}

      {activeTab === "patrulhamento" && (
        <section className="panel">
          <div className="grid singleGap">
            <ChannelField
              label="Sala de patrulhamentos ativos"
              placeholder="ID do canal onde ficarão as barcas/patrulhamentos ativos"
              value={config.activePatrolsChannelId || ""}
              channels={channels}
              onChange={(value) => updateField("activePatrolsChannelId", value)}
            />
          </div>
          <VehicleEditor
            vehicles={config.patrolVehicles || []}
            onAdd={() => updateField("patrolVehicles", [...(config.patrolVehicles || []), { name: "", seats: 4, imageUrl: "" }])}
            onChange={(index, field, value) => {
              const next = [...(config.patrolVehicles || [])];
              const current = typeof next[index] === "string" ? { name: next[index], seats: 4, imageUrl: "" } : next[index];
              next[index] = { ...current, [field]: value };
              updateField("patrolVehicles", next);
            }}
            onRemove={(index) => updateField("patrolVehicles", config.patrolVehicles.filter((_, itemIndex) => itemIndex !== index))}
          />
        </section>
      )}

      {activeTab === "anuncio" && (
        <ServerAnnouncementPanel
          channels={channels}
          defaultChannelId={config.announcementChannelId || ""}
          defaultBannerUrl={config.bannerUrl || ""}
          status={announcementStatus}
          onSend={sendWebAnnouncement}
        />
      )}

      {activeTab === "dm" && (
        <DmPanel
          templates={normalizeDmTemplates(config.dmTemplates)}
          onTemplatesChange={(templates) => updateField("dmTemplates", templates)}
          status={announcementStatus}
          onSend={sendWebAnnouncement}
        />
      )}

      {activeTab === "administracao" && isSupervisor && (
        <AdminPanel
          config={config}
          onConfigChange={updateField}
          users={panelUsers}
          onSaveUser={savePanelUser}
          onDeleteUser={deletePanelUser}
          status={adminStatus}
        />
      )}

      {activeTab === "exoneracao" && isSupervisor && (
        <ExonerationPanel
          members={members}
          status={exonerationStatus}
          onExonerate={exonerateMember}
          onRefresh={async () => {
            setExonerationStatus("Atualizando lista...");
            const membersResponse = await fetch("/api/discord/members");
            setMembers(await membersResponse.json());
            setExonerationStatus("Lista atualizada.");
          }}
        />
      )}
    </main>
  );
}

function PatchNoteMini({ notes, onOpen }) {
  const latest = notes?.[0];
  return (
    <button className="patchMini" type="button" onClick={onOpen}>
      <strong>Patch Notes</strong>
      <small>{latest ? `${latest.version} - ${latest.title} (${formatPatchDate(latest.created_at)})` : "Sem registros"}</small>
    </button>
  );
}

function PatchNotesModal({ notes, onClose }) {
  return (
    <div className="modalBackdrop" role="presentation" onClick={onClose}>
      <section className="patchModal" role="dialog" aria-modal="true" aria-label="Patch notes" onClick={(event) => event.stopPropagation()}>
        <div className="sectionHead">
          <h2>Patch Notes</h2>
          <button className="secondary" type="button" onClick={onClose}>Fechar</button>
        </div>
        <div className="notes">
          {notes?.length ? notes.map((note) => (
            <article className="note" key={`${note.version}-${note.created_at}`}>
              <span>{note.version} • {formatPatchDate(note.created_at)}</span>
              <h2>{note.title}</h2>
              <p>{note.body}</p>
            </article>
          )) : <p>Sem patch notes cadastrados.</p>}
        </div>
      </section>
    </div>
  );
}

function formatPatchDate(value) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("tiaozadas");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onLogin(username, password);
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <main className="loginShell">
      <form className="loginBox" onSubmit={submit}>
        <div className="badge">RPS</div>
        <h1>Bot Rádio Patrulha</h1>
        <p>Acesso ao painel administrativo</p>
        <label>
          Usuário
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <strong className="loginError">{error}</strong>}
        <button className="primary" type="submit">Entrar</button>
      </form>
    </main>
  );
}

function LogoPreview({ logoUrl }) {
  return (
    <div className="logoBox">
      {logoUrl ? <img src={logoUrl} alt="Logo do bot" /> : <span>Logo</span>}
    </div>
  );
}

function DatabaseStatus({ health }) {
  return (
    <div className={`dbStatus ${health.ok ? "online" : "offline"}`}>
      <span />
      <strong>{health.ok ? "Banco conectado" : "Banco sem conexão"}</strong>
      <small>{health.message}</small>
    </div>
  );
}

function TextField({ label, placeholder = "", type = "text", value, onChange }) {
  return (
    <label>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ImageField({ label, placeholder = "", value, onChange }) {
  const canPreview = value && !value.startsWith("attachment://");

  return (
    <div className="imageField">
      <TextField label={label} placeholder={placeholder} value={value} onChange={onChange} />
      <div className="imagePreview">
        {canPreview ? <img src={value} alt={`Miniatura de ${label}`} /> : <span>Miniatura</span>}
      </div>
    </div>
  );
}

function PersonalizationPanel({ config, onChange }) {
  return (
    <section className="panel">
      <div className="profileGrid">
        <TextField
          label="🤖 Nome amigável do bot"
          placeholder="Ex: Rádio Patrulha"
          value={config.botDisplayName || ""}
          onChange={(value) => onChange("botDisplayName", value)}
        />
        <label>
          🪪 Descrição do perfil
          <textarea
            value={config.botProfileDescription || ""}
            placeholder="Texto exibido no perfil do bot, quando permitido pelo Discord."
            onChange={(event) => onChange("botProfileDescription", event.target.value)}
          />
        </label>
      </div>
      <div className="personalizationGrid">
        {personalizationFields.map(([field, label, placeholder]) => (
          <ImageField
            key={field}
            label={label}
            placeholder={placeholder}
            value={config[field] || ""}
            onChange={(value) => onChange(field, value)}
          />
        ))}
      </div>
    </section>
  );
}

function ExonerationPanel({ members, status, onExonerate, onRefresh }) {
  const [selectedId, setSelectedId] = useState("");
  const selectedMember = members.find((member) => member.id === selectedId);

  return (
    <section className="panel announcementGrid">
      <form className="announceCard" onSubmit={(event) => {
        event.preventDefault();
        if (!selectedId) return;

        const label = selectedMember
          ? `${selectedMember.displayName} (${selectedMember.id})`
          : selectedId;

        if (window.confirm(`Confirmar exoneração de ${label}?`)) {
          onExonerate(selectedId);
          setSelectedId("");
        }
      }}>
        <div className="sectionHead compactHead">
          <h2>Exoneração</h2>
          <button className="secondary" type="button" onClick={onRefresh}>Atualizar lista</button>
        </div>
        <label>
          Usuário do servidor
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            <option value="">Selecione um usuário</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName} — {member.tag}
              </option>
            ))}
          </select>
        </label>
        {selectedMember && (
          <div className={`memberPreview ${selectedMember.kickable ? "" : "blocked"}`}>
            <strong>{selectedMember.displayName}</strong>
            <span>{selectedMember.tag}</span>
            <small>ID: {selectedMember.id}</small>
            {!selectedMember.kickable && <small>O bot talvez não consiga expulsar este membro por hierarquia de cargos.</small>}
          </div>
        )}
        <button className="danger" type="submit" disabled={!selectedId}>Exonerar usuário</button>
      </form>
      {status && <p className="announceStatus">{status}</p>}
    </section>
  );
}

function AdminPanel({ config, onConfigChange, users, onSaveUser, onDeleteUser, status }) {
  const blankUser = { id: "new", username: "", password: "", discordId: "", permission: "rh", active: true };
  const [draft, setDraft] = useState(blankUser);

  function editUser(user) {
    setDraft({ ...user, password: "" });
  }

  return (
    <section className="panel">
      <div className="grid singleGap">
        <TextField
          label="🛡️ Cargo Supervisão"
          placeholder="ID do cargo de Supervisão"
          value={config.supervisionRoleId || ""}
          onChange={(value) => onConfigChange("supervisionRoleId", value)}
        />
        <TextField
          label="📋 Cargo RH"
          placeholder="ID do cargo de RH"
          value={config.rhRoleId || ""}
          onChange={(value) => onConfigChange("rhRoleId", value)}
        />
      </div>

      <div className="adminGrid">
        <form className="announceCard" onSubmit={(event) => {
          event.preventDefault();
          onSaveUser(draft);
          setDraft(blankUser);
        }}>
          <h2>{draft.id === "new" ? "Criar usuário do site" : "Editar usuário do site"}</h2>
          <TextField label="Usuário" value={draft.username} onChange={(value) => setDraft({ ...draft, username: value })} />
          <TextField label="Senha" type="password" placeholder={draft.id === "new" ? "Obrigatória" : "Deixe vazio para manter"} value={draft.password || ""} onChange={(value) => setDraft({ ...draft, password: value })} />
          <TextField label="ID Discord" value={draft.discordId || ""} onChange={(value) => setDraft({ ...draft, discordId: value })} />
          <label>
            Permissão
            <select value={draft.permission} onChange={(event) => setDraft({ ...draft, permission: event.target.value })}>
              <option value="supervisao">Supervisão</option>
              <option value="rh">RH</option>
            </select>
          </label>
          <label className="inlineCheck">
            <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
            Ativo
          </label>
          <div className="modalActions">
            <button className="secondary" type="button" onClick={() => setDraft(blankUser)}>Limpar</button>
            <button className="primary" type="submit">Salvar usuário</button>
          </div>
          {status && <p className="announceStatus">{status}</p>}
        </form>

        <div className="tableEditor">
          <div className="adminHeader">
            <span>Usuário</span>
            <span>Permissão</span>
            <span>ID Discord</span>
            <span></span>
          </div>
          {users.map((user) => (
            <div className="adminRow" key={user.id}>
              <span>{user.username}{!user.active ? " (inativo)" : ""}</span>
              <span>{user.permission}</span>
              <span>{user.discordId || "—"}</span>
              <div className="rowActions">
                <button className="secondary" type="button" disabled={user.id === "default"} onClick={() => editUser(user)}>Editar</button>
                <button className="danger" type="button" disabled={user.id === "default"} onClick={() => onDeleteUser(user.id)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChannelField({ label, placeholder = "", value, channels, onChange }) {
  if (!channels?.length) {
    return <TextField label={label} placeholder={placeholder} value={value} onChange={onChange} />;
  }

  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione um canal</option>
        {channels.map((channel) => (
          <option key={channel.id} value={channel.id}>#{channel.name}</option>
        ))}
      </select>
      <input value={value} placeholder="ID manual do canal" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DmPanel({ templates, onTemplatesChange, status, onSend }) {
  const [dm, setDm] = useState({ userId: "", title: "", message: "", signature: "" });
  const [editingTemplates, setEditingTemplates] = useState(false);

  function applyTemplate(template) {
    setDm((current) => ({ ...current, ...templates[template] }));
  }

  return (
    <section className="panel announcementGrid">
      {editingTemplates && (
        <DmTemplateModal
          templates={templates}
          onClose={() => setEditingTemplates(false)}
          onSave={(nextTemplates) => {
            onTemplatesChange(nextTemplates);
            setEditingTemplates(false);
          }}
        />
      )}
      <form className="announceCard" onSubmit={(event) => {
        event.preventDefault();
        onSend("dm", dm);
      }}>
        <div className="sectionHead compactHead">
          <h2>Enviar Notificação Privada</h2>
        </div>
        <div className="templateBox">
          <span>Mensagens prontas</span>
          <div className="templateButtons">
            <button className="secondary" type="button" onClick={() => applyTemplate("absence")}>Ausência</button>
            <button className="secondary" type="button" onClick={() => applyTemplate("basicCourses")}>Falta de cursos básicos</button>
            <button className="secondary" type="button" onClick={() => setEditingTemplates(true)}>Editar mensagens</button>
          </div>
        </div>
        <TextField label="ID do Usuário" value={dm.userId} placeholder="Ex: 349906057507635201" onChange={(value) => setDm({ ...dm, userId: value })} />
        <TextField label="Título da Notificação" value={dm.title} placeholder="Ex: Convocação Importante" onChange={(value) => setDm({ ...dm, title: value })} />
        <label>
          Mensagem
          <textarea value={dm.message} placeholder="Digite o conteúdo da notificação..." onChange={(event) => setDm({ ...dm, message: event.target.value })} />
        </label>
        <TextField label="Assinatura" value={dm.signature} placeholder="Ex: Comando RPS" onChange={(value) => setDm({ ...dm, signature: value })} />
        <button className="primary" type="submit">Enviar DM</button>
      </form>
      {status && <p className="announceStatus">{status}</p>}
    </section>
  );
}

function DmTemplateModal({ templates, onClose, onSave }) {
  const [draft, setDraft] = useState(normalizeDmTemplates(templates));

  function updateTemplate(template, field, value) {
    setDraft((current) => ({
      ...current,
      [template]: {
        ...current[template],
        [field]: value
      }
    }));
  }

  return (
    <div className="modalBackdrop" role="presentation" onClick={onClose}>
      <section className="patchModal" role="dialog" aria-modal="true" aria-label="Editar mensagens padrão" onClick={(event) => event.stopPropagation()}>
        <div className="sectionHead">
          <h2>Mensagens padrão da DM</h2>
          <button className="secondary" type="button" onClick={onClose}>Fechar</button>
        </div>
        <div className="templateEditorGrid">
          <TemplateEditorCard title="Ausência" template={draft.absence} onChange={(field, value) => updateTemplate("absence", field, value)} />
          <TemplateEditorCard title="Falta de cursos básicos" template={draft.basicCourses} onChange={(field, value) => updateTemplate("basicCourses", field, value)} />
        </div>
        <div className="modalActions">
          <button className="secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary" type="button" onClick={() => onSave(draft)}>Salvar modelos</button>
        </div>
      </section>
    </div>
  );
}

function TemplateEditorCard({ title, template, onChange }) {
  return (
    <div className="announceCard">
      <h2>{title}</h2>
      <TextField label="Título" value={template.title || ""} onChange={(value) => onChange("title", value)} />
      <label>
        Mensagem
        <textarea value={template.message || ""} onChange={(event) => onChange("message", event.target.value)} />
      </label>
      <TextField label="Assinatura" value={template.signature || ""} onChange={(value) => onChange("signature", value)} />
    </div>
  );
}

function ServerAnnouncementPanel({ channels, defaultChannelId, defaultBannerUrl, status, onSend }) {
  const [server, setServer] = useState({
    channelId: defaultChannelId,
    title: "",
    message: "",
    color: "#1f6feb",
    bannerUrl: defaultBannerUrl
  });

  useEffect(() => {
    setServer((current) => ({
      ...current,
      channelId: current.channelId || defaultChannelId,
      bannerUrl: current.bannerUrl || defaultBannerUrl
    }));
  }, [defaultChannelId, defaultBannerUrl]);

  return (
    <section className="panel announcementGrid">
      <form className="announceCard" onSubmit={(event) => {
        event.preventDefault();
        onSend("server", server);
      }}>
        <h2>Criar Anúncio no Servidor</h2>
        <ChannelField label="Canal" value={server.channelId} channels={channels} placeholder="Canal padrão de anúncios" onChange={(value) => setServer({ ...server, channelId: value })} />
        <TextField label="Título do Anúncio" value={server.title} onChange={(value) => setServer({ ...server, title: value })} />
        <label>
          Conteúdo do Anúncio
          <textarea value={server.message} onChange={(event) => setServer({ ...server, message: event.target.value })} />
        </label>
        <label>
          Cor da barra
          <input type="color" value={server.color} onChange={(event) => setServer({ ...server, color: event.target.value })} />
        </label>
        <TextField label="URL do Banner" value={server.bannerUrl} onChange={(value) => setServer({ ...server, bannerUrl: value })} />
        <button className="primary" type="submit">Enviar Anúncio</button>
      </form>
      {status && <p className="announceStatus">{status}</p>}
    </section>
  );
}

function ListEditor({ title, addLabel, items, onAdd, onRemove, onChange }) {
  return (
    <div className="editorBlock">
      <div className="sectionHead">
        <h2>{title}</h2>
        <button className="secondary" onClick={onAdd}>{addLabel}</button>
      </div>
      <div className="tableEditor">
        <div className="tableHeader">
          <span>Nome</span>
          <span>Valor interno</span>
          <span>ID do cargo</span>
          <span></span>
        </div>
        {items.map((item, index) => (
          <div className="tableRow" key={`${title}-${index}`}>
            <input value={item.label || ""} onChange={(event) => onChange(index, "label", event.target.value)} />
            <input value={item.value || ""} onChange={(event) => onChange(index, "value", event.target.value)} />
            <input value={item.roleId || ""} onChange={(event) => onChange(index, "roleId", event.target.value)} />
            <button className="danger" onClick={() => onRemove(index)}>Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VehicleEditor({ vehicles, onAdd, onChange, onRemove }) {
  return (
    <div className="editorBlock">
      <div className="sectionHead">
        <h2>Viaturas</h2>
        <button className="secondary" onClick={onAdd}>Adicionar viatura</button>
      </div>
      <div className="vehicleList">
        {vehicles.map((vehicle, index) => (
          <div className="vehicleRow" key={`vehicle-${index}`}>
            <label>
              Viatura
              <input
                value={typeof vehicle === "string" ? vehicle : vehicle.name || ""}
                placeholder="Nome da viatura"
                onChange={(event) => onChange(index, "name", event.target.value)}
              />
            </label>
            <label>
              Assentos
              <input
                min="1"
                type="number"
                value={typeof vehicle === "string" ? 4 : vehicle.seats || 4}
                onChange={(event) => onChange(index, "seats", Number(event.target.value))}
              />
            </label>
            <label>
              Foto da viatura
              <input
                value={typeof vehicle === "string" ? "" : vehicle.imageUrl || ""}
                placeholder="URL pública da imagem"
                onChange={(event) => onChange(index, "imageUrl", event.target.value)}
              />
            </label>
            <div className="vehicleThumb">
              {typeof vehicle !== "string" && vehicle.imageUrl ? <img src={vehicle.imageUrl} alt={`Viatura ${vehicle.name || index + 1}`} /> : <span>Foto</span>}
            </div>
            <button className="danger" onClick={() => onRemove(index)}>Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
