# BotCheckin - WhatsApp Check-in System

Sistema de controle de ponto via WhatsApp usando Twilio, Node.js, Express e SQLite. Sistema completo com 3 níveis de acesso: Staff, Supervisor e Manager.

## Funcionalidades

### 1️⃣ Staff (Funcionário)
- ✅ Check-in
- ☕ Iniciar pausa
- 🔄 Voltar da pausa
- 🏁 Fechar serviço (check-out)
- 📊 Ver status pessoal

### 2️⃣ Supervisor
- 👥 Ver equipe ativa em tempo real
- 📜 Consultar histórico da equipe
- 🔔 **Receber notificações automáticas** quando colaboradores fazem check-in/check-out

### 3️⃣ Manager (Gerente)
- 📋 Ver todos os horários de todos os funcionários
- 🔍 Pesquisar usuários
- ✏️ **Corrigir horários** (editar/deletar/adicionar)
- ✅ Fazer próprio check-in
- 📊 Status geral

## Segurança

- 🔒 **Login com senha obrigatório** para Manager e Supervisor
- 🔑 Staff tem acesso simplificado (apenas registro)
- ⏰ Sessões expiram após 24 horas
- 🛡️ Senha do admin configurável via variável de ambiente

## Como Rodar Localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
PORT=3000
ADMIN_PASSWORD=sua_senha_segura_aqui
DATABASE_FILE=./data/botcheckin.db

# Configuração Twilio (obtenha em https://console.twilio.com/)
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

ou em produção:

```bash
npm start
```

### 4. Expor webhook para o Twilio (desenvolvimento)

Use ngrok ou similar para expor seu localhost:

```bash
ngrok http 3000
```

Depois configure a URL do webhook no Twilio Console:
`https://seu-ngrok-url.ngrok.io/webhook`

## Deploy no Heroku via GitHub

### Pré-requisitos
- Conta no [Heroku](https://heroku.com)
- Conta no [GitHub](https://github.com)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) instalado (opcional)

### Passo 1: Criar repositório no GitHub

```bash
git init
git add .
git commit -m "Initial commit - BotCheckin WhatsApp system"
git branch -M main
git remote add origin https://github.com/seu-usuario/botcheckin.git
git push -u origin main
```

### Passo 2: Criar aplicação no Heroku

#### Via Heroku Dashboard (Recomendado):

1. Acesse [dashboard.heroku.com](https://dashboard.heroku.com)
2. Clique em **"New"** → **"Create new app"**
3. Escolha um nome (ex: `meu-botcheckin`)
4. Região: United States ou Europe
5. Clique em **"Create app"**

#### Via Heroku CLI (Alternativa):

```bash
heroku login
heroku create meu-botcheckin
```

### Passo 3: Conectar GitHub ao Heroku

1. No Dashboard do Heroku, vá em **"Deploy"**
2. Em **"Deployment method"**, escolha **"GitHub"**
3. Clique em **"Connect to GitHub"**
4. Autorize o Heroku a acessar seus repositórios
5. Busque pelo repositório `botcheckin`
6. Clique em **"Connect"**

### Passo 4: Configurar variáveis de ambiente

No Dashboard do Heroku, vá em **"Settings"** → **"Config Vars"** e adicione:

| KEY | VALUE |
|-----|-------|
| `ADMIN_PASSWORD` | `sua_senha_segura` |
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | `seu_token` |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` |

**Nota:** `DATABASE_FILE` não precisa ser configurado no Heroku. O SQLite criará automaticamente.

### Passo 5: Deploy automático

1. Na aba **"Deploy"**, vá até **"Automatic deploys"**
2. Escolha a branch `main`
3. Clique em **"Enable Automatic Deploys"**
4. Clique em **"Deploy Branch"** para fazer o primeiro deploy

### Passo 6: Configurar Webhook no Twilio

1. Acesse [console.twilio.com](https://console.twilio.com)
2. Vá em **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Configure o **Sandbox** (se ainda não fez)
4. Em **Webhook URL**, adicione:
   ```
   https://meu-botcheckin.herokuapp.com/webhook
   ```
5. Método: **POST**
6. Salve

### Passo 7: Testar

Envie uma mensagem WhatsApp para o número do Twilio Sandbox:

```
REGISTER João staff
```

Você deve receber o menu de opções!

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/webhook` | Recebe mensagens do Twilio WhatsApp |
| `GET` | `/health` | Health check (retorna `{"ok": true}`) |

## Comandos WhatsApp

### Registro

```
REGISTER Nome staff
REGISTER Nome manager SENHA_ADMIN
REGISTER Nome supervisor SENHA_ADMIN
```

### Login (Manager/Supervisor)

```
LOGIN SENHA_ADMIN
```

### Menus Numéricos

#### Staff:
1. Check-in
2. Pausa
3. Voltei
4. Fechar serviço
5. Stat (ver histórico)
6. Logout

#### Supervisor:
1. Ver equipe ativa
2. Consultar histórico da equipe
3. Logout

#### Manager:
1. Ver todos os horários
2. Pesquisar usuário
3. Corrigir horário
4. Meu check-in
5. Status geral
6. Logout

### Comandos Avançados (Manager)

**Editar horário:**
```
3 CHECKIN_ID 2024-01-15T08:30:00
```

**Deletar checkin:**
```
DEL CHECKIN_ID
```

**Adicionar checkin manual:**
```
ADD USER_ID checkin 2024-01-15T08:30:00 Escritorio
```

**Pesquisar usuário:**
```
2 João
ou
SEARCH João
```

## Estrutura do Banco de Dados

### Tabela: `users`
- `id` - ID único
- `name` - Nome do usuário
- `phone` - Número de telefone (único)
- `role` - staff | manager | supervisor
- `supervisor_id` - ID do supervisor (para staff)
- `password` - Senha (apenas para admin)
- `active` - Status ativo/inativo

### Tabela: `checkins`
- `id` - ID único
- `user_id` - ID do usuário
- `type` - checkin | break | return | checkout
- `timestamp` - Data/hora do registro
- `location` - Localização (opcional)

### Tabela: `sessions`
- `id` - ID único
- `user_id` - ID do usuário
- `phone` - Telefone da sessão
- `logged_in_at` - Data/hora do login
- `expires_at` - Expiração (24h)

## Notificações Automáticas

Quando um **Staff** faz check-in, check-out, pausa ou retorno, seu **Supervisor** recebe automaticamente uma notificação via WhatsApp:

```
🔔 Seu colaborador João fez check-in as 08:58.
```

## Segurança e Boas Práticas

- ✅ Sempre altere `ADMIN_PASSWORD` em produção
- ✅ Use senhas fortes (mínimo 12 caracteres)
- ✅ Não commite o arquivo `.env` no Git
- ✅ Configure as Config Vars no Heroku
- ✅ Use HTTPS (Heroku fornece automaticamente)
- ✅ Monitore os logs: `heroku logs --tail`

## Troubleshooting

### Heroku não está respondendo
```bash
heroku ps
heroku logs --tail
```

### Webhook não recebe mensagens do Twilio
- Verifique se a URL está correta no Twilio Console
- Teste o endpoint: `curl https://seu-app.herokuapp.com/health`
- Veja os logs: `heroku logs --tail`

### Banco de dados não persiste
- Heroku usa filesystem efêmero. Para persistência, considere usar:
  - Heroku Postgres (recomendado)
  - Supabase
  - MongoDB Atlas

## Tecnologias

- **Node.js** + **Express**
- **SQLite3** (better-sqlite3)
- **Twilio API** (WhatsApp Business)
- **Heroku** (deploy)
- **GitHub** (versionamento)

## Licença

MIT
