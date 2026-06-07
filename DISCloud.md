# Deploy na Discloud

## Arquivos importantes

- `discloud.config`: configuração do app para a Discloud.
- `.env`: precisa ficar na raiz junto do `discloud.config`.
- `.discloudignore`: evita subir arquivos locais desnecessários.

## Antes de compactar

1. Confirme se o `.env` da raiz está preenchido:

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=8080
HOST=0.0.0.0
WEB_PORT=8080
MEMBER_LOGS_ENABLED=true
WELCOME_DM_ENABLED=true
EPHEMERAL_DELETE_AFTER_MS=8000
```

2. Gere os comandos no Discord uma vez, localmente ou pela hospedagem:

```powershell
npm run deploy
```

3. Compacte o conteúdo da pasta `bot-rp`, não a pasta acima dela.

## Upload

Na Discloud, envie o `.zip` contendo `package.json`, `src`, `assets`, `.env`, `discloud.config`, `.discloudignore` e `package-lock.json`.

Como o app está configurado como `TYPE=site`, o painel web ficará disponível no subdomínio definido em `ID`:

```text
https://bot-rp.discloud.app
```

O mesmo processo continua iniciando o bot do Discord, porque o `MAIN=src/index.js` sobe o bot e o painel juntos.

Na Discloud, mantenha:

```env
PORT=8080
HOST=0.0.0.0
```

Sites da Discloud precisam escutar na porta `8080` e no host `0.0.0.0`.

O build configurado executa:

```bash
npm install && npm run build:web
```

O start configurado executa:

```bash
npm start
```
