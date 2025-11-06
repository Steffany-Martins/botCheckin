# WhatsApp Message Templates

## Overview

The refactored BotCheckin system includes completely redesigned WhatsApp message templates with:
- ✅ Emoji icons for visual clarity
- 📱 Bold text for emphasis using *asterisks*
- 💡 Italic text for hints using _underscores_
- 🎯 Consistent formatting across all messages
- 🌍 Portuguese language (pt-BR)

## Message Categories

### 1. Welcome & Registration

#### Staff Registration
```
👤 Bem-vindo(a), João!

✅ Seu cadastro foi realizado com sucesso como *staff*.

Você já está logado e pronto para começar!

👤 *Ola, João!*

📋 Selecione uma opção:

1️⃣ Check-in
2️⃣ Iniciar Pausa
3️⃣ Voltar da Pausa
4️⃣ Fechar Expediente
5️⃣ Ver Meu Histórico
6️⃣ Sair

💡 _Envie o número ou comando_
```

#### Manager Registration
```
👔 Bem-vindo(a), Ana!

✅ Seu cadastro foi realizado com sucesso como *manager*.

Você já está logado e pronto para começar!

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:

1️⃣ Ver Todos os Horários
2️⃣ Pesquisar Usuário
3️⃣ Corrigir Horário
4️⃣ Meu Check-in
5️⃣ Status Geral
6️⃣ Sair

💡 _Envie o número ou comando_
```

#### Supervisor Registration
```
👨‍💼 Bem-vindo(a), Carlos!

✅ Seu cadastro foi realizado com sucesso como *supervisor*.

Você já está logado e pronto para começar!

👨‍💼 *Ola, Supervisor Carlos!*

📋 Gestão de Equipe:

1️⃣ Ver Equipe Ativa
2️⃣ Histórico da Equipe
3️⃣ Sair

💡 _Envie o número ou comando_
```

### 2. Login & Logout

#### Login Success
```
👋 Ola novamente, Ana!

✅ Login realizado com sucesso!

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

#### Logout
```
👋 *Até logo!*

Você foi desconectado com sucesso.

💡 Para fazer login novamente:
• Staff: envie *MENU*
• Admin: envie *LOGIN SENHA*
```

### 3. Check-in Actions

#### Check-in Confirmation
```
🟢 *Check-in registrado!*
📍 Local: Escritório

⏰ Horário: 04/11/2025 08:30:15
```

#### Break Started
```
🟡 *Pausa iniciada!*

⏰ Horário: 04/11/2025 10:15:30
```

#### Return from Break
```
🔵 *Retorno registrado!*

⏰ Horário: 04/11/2025 10:45:20
```

#### Check-out
```
🔴 *Check-out realizado!*
📍 Local: Escritório

⏰ Horário: 04/11/2025 17:00:45
```

### 4. Supervisor Notifications

#### Employee Check-in Notification
```
🟢 *Notificação da Equipe*

👤 João fez check-in
⏰ 04/11/2025 08:30:15
📍 Escritório
```

#### Employee Break Notification
```
🟡 *Notificação da Equipe*

👤 Maria iniciou pausa
⏰ 04/11/2025 10:15:30
```

#### Employee Return Notification
```
🔵 *Notificação da Equipe*

👤 Pedro retornou da pausa
⏰ 04/11/2025 10:45:20
```

#### Employee Check-out Notification
```
🔴 *Notificação da Equipe*

👤 Ana finalizou expediente
⏰ 04/11/2025 17:00:45
📍 Shopping Center
```

### 5. History & Status

#### Personal History
```
📊 *Seu Histórico Recente:*

🟢 checkin - 08:30 04/11 📍 Escritório
🟡 break - 10:15 04/11
🔵 return - 10:45 04/11
🟡 break - 14:00 04/11
🔵 return - 14:30 04/11
🔴 checkout - 17:00 04/11 📍 Escritório

👤 *Ola, João!*

📋 Selecione uma opção:
...
```

#### Empty History
```
📊 *Seu Histórico*

_Nenhum registro encontrado._

👤 *Ola, João!*

📋 Selecione uma opção:
...
```

### 6. Manager Functions

#### All Schedules View
```
📋 *Resumo Geral de Horários:*

👤 *Alice Manager* (manager)
   🟢 checkin - 08:00 04/11 📍 Matriz
   🔴 checkout - 17:30 04/11 📍 Matriz

👤 *Bob Staff* (staff)
   🟢 checkin - 08:15 04/11
   🔴 checkout - 17:00 04/11

👨‍💼 *Carol Supervisor* (supervisor)
   🟢 checkin - 07:45 04/11
   🔴 checkout - 18:00 04/11

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

#### Search Results
```
🔍 *Resultados da Busca:*

✅ *1.* João Silva
   👤 staff | 📱 +15551234567

✅ *2.* João Pedro
   👤 manager | 📱 +15559876543

❌ *3.* João Inativo
   👤 staff | 📱 +15555555555

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

#### No Search Results
```
🔍 *Busca de Usuários*

_Nenhum usuário encontrado._

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

### 7. Supervisor Functions

#### Team Active Status
```
👥 *Status da Equipe:*

🟢 Ativo *João Silva*
   ⏰ Última ação: 08:30

🟡 Em Pausa *Maria Santos*
   ⏰ Última ação: 10:15

🔴 Encerrado *Pedro Costa*
   ⏰ Última ação: 17:00

⚪ Sem registro *Ana Lima*

👨‍💼 *Ola, Supervisor Carlos!*

📋 Gestão de Equipe:
...
```

#### Team History
```
📜 *Histórico da Equipe:*

🔴 *Pedro Costa*: checkout - 17:00 04/11
🟡 *Maria Santos*: break - 10:15 04/11
🟢 *João Silva*: checkin - 08:30 04/11 📍 Escritório
🟢 *Ana Lima*: checkin - 08:15 04/11

👨‍💼 *Ola, Supervisor Carlos!*

📋 Gestão de Equipe:
...
```

### 8. Manager Admin Functions

#### Time Edit Success
```
✅ *Horário Atualizado!*

Checkin #123 foi corrigido com sucesso.

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

#### Time Edit Failed
```
❌ *Checkin Não Encontrado*

Verifique o ID e tente novamente.

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

#### Delete Success
```
✅ *Checkin Deletado!*

Checkin #123 foi removido com sucesso.

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

#### Manual Checkin Added
```
✅ *Checkin Manual Adicionado!*

Registro criado para usuário #2.

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

### 9. Error Messages

#### No Phone Number
```
❌ *Erro*

Não foi possível identificar seu número.
Por favor, envie através do WhatsApp.
```

#### Not Registered
```
📝 *Como se registrar:*

*Para funcionários:*
REGISTER Seu_Nome staff

*Para administradores:*
REGISTER Seu_Nome manager SENHA
REGISTER Seu_Nome supervisor SENHA

💡 _Exemplo:_ REGISTER João staff
```

#### Invalid Role
```
❌ *Role Inválido*

Use: staff, manager ou supervisor

💡 _Exemplo:_ REGISTER João staff
```

#### Wrong Password
```
🔒 *Senha Incorreta*

Para cargos administrativos é necessária a senha.

💡 _Tente:_ LOGIN SENHA
```

#### Admin Password Required
```
🔒 *Senha de Admin Necessária*

Para registrar como manager ou supervisor, você precisa da senha administrativa.

💡 _Formato:_ REGISTER Nome manager SENHA
```

#### Unknown Command
```
❓ *Comando Não Reconhecido*

Envie *MENU* para ver as opções disponíveis.
```

#### Edit Time Format Error
```
⚙️ *Como Corrigir Horário:*

*Editar:*
3 ID_CHECKIN NOVA_DATA
_Exemplo:_ 3 123 2024-01-15T08:30:00

*Deletar:*
DEL ID_CHECKIN
_Exemplo:_ DEL 123

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

#### Search Format Help
```
🔍 *Como Pesquisar:*

2 nome_ou_telefone

OU

SEARCH nome_ou_telefone

👔 *Ola, Gerente Ana!*

📋 Painel de Gestão:
...
```

## Emoji Legend

### Status Icons
- 🟢 Active / Check-in
- 🟡 On Break
- 🔵 Returned from Break
- 🔴 Checked Out / Closed
- ⚪ No Record

### Role Icons
- 👤 Staff
- 👨‍💼 Supervisor
- 👔 Manager

### Action Icons
- ✅ Success / Active
- ❌ Error / Inactive
- 📱 Phone
- 📍 Location
- ⏰ Time
- 📋 Menu / List
- 🔍 Search
- 📊 Statistics
- 📜 History
- 👥 Team
- 🔔 Notification
- 🔒 Security / Password
- 💡 Tip / Example
- 👋 Greeting / Goodbye
- ❓ Question / Help

## WhatsApp Formatting

### Bold Text
Use asterisks: `*texto em negrito*`

Example: `*Ola, Gerente Ana!*`

### Italic Text
Use underscores: `_texto em itálico_`

Example: `_Envie o número ou comando_`

### Combined
Use both: `*_texto em negrito e itálico_*`

### Monospace (not used in templates)
Use triple backticks: ` ```código``` `

## Template Implementation

All templates are implemented in `src/services/whatsapp.service.js` in the `MessageTemplates` object:

```javascript
const MessageTemplates = {
  welcome(name, role),
  loginSuccess(name),
  logout(),
  registrationHelp(),
  checkinConfirmation(type, location),
  supervisorNotification(employeeName, action, timestamp, location),
  staffMenu(name),
  managerMenu(name),
  supervisorMenu(name),
  userHistory(records),
  searchResults(users),
  allSchedules(groups),
  teamActive(members),
  teamHistory(records),
  errors: { ... }
};
```

## Customization

To customize messages, edit `src/services/whatsapp.service.js` and modify the `MessageTemplates` object. All changes will automatically apply to the webhook responses.

## Multi-language Support (Future)

To add multi-language support:

1. Create language files in `src/locales/`
2. Add language detection logic
3. Replace `MessageTemplates` with function that loads correct language
4. Update `getMenuForRole()` to use language parameter

Example structure:
```
src/locales/
├── pt-BR.js  # Portuguese (default)
├── en-US.js  # English
└── es-ES.js  # Spanish
```
