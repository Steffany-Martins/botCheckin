const config = require('../config/env');

/**
 * Send WhatsApp message via Twilio API
 * @param {string} toPhone - Recipient phone number
 * @param {string} message - Message text
 */
async function sendWhatsAppMessage(toPhone, message) {
  if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.whatsappNumber) {
    console.log(`[TWILIO NOT CONFIGURED] Would send to ${toPhone}: ${message}`);
    return;
  }

  try {
    const auth = Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: config.twilio.whatsappNumber,
        To: toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`,
        Body: message
      })
    });

    if (!response.ok) {
      console.error('Twilio error:', await response.text());
    }
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err);
  }
}

/**
 * Message templates for better user experience
 */
const MessageTemplates = {
  /**
   * Registration Step Messages - Sistema de cadastro amigável
   */
  registration: {
    /**
     * Step 1: Boas-vindas e pedir nome
     */
    step1_welcome() {
      return `👋 *Olá! Bem-vindo ao BotCheckin!*\n\nVejo que você ainda não está cadastrado.\nVamos fazer seu cadastro em *4 passos simples*! 😊\n\n📝 *PASSO 1 de 4*\nPor favor, me diga seu *nome completo*:\n\n💡 _Exemplo: João Silva_\n\n0️⃣ Cancelar cadastro`;
    },

    /**
     * Step 2: Escolher cargo
     */
    step2_chooseRole(name) {
      return `✅ Prazer em conhecê-lo(a), *${name}*!\n\n📝 *PASSO 2 de 4*\nAgora, selecione seu tipo de acesso:\n\n1️⃣ *Funcionário* - Fazer check-in/out\n2️⃣ *Gerente* - Gerenciar horários da equipe\n3️⃣ *Supervisor* - Acompanhar equipe\n\n💡 Envie o número (1, 2 ou 3)\n\n0️⃣ Voltar | 9️⃣ Cancelar cadastro`;
    },

    /**
     * Step 3: Escolher categorias
     */
    step3_chooseCategories(name, role) {
      const roleText = role === 'manager' ? 'Gerente' : role === 'supervisor' ? 'Supervisor' : 'Funcionário';
      return `🎯 *PASSO 3 de 4*\nÓtimo, ${name}! Agora me diga em qual(is) categoria(s) você trabalha:\n\n1️⃣ Bar 🍺\n2️⃣ Restaurante 🍽️\n3️⃣ Padaria 🥖\n4️⃣ Café ☕\n5️⃣ Lanchonete 🍔\n6️⃣ Outro\n\n💡 _Você pode escolher múltiplas categorias!_\n_Exemplos:_ "1" ou "1,2" ou "1 3 5"\n\n0️⃣ Voltar | 9️⃣ Cancelar cadastro`;
    },

    /**
     * Step 4: Pedir senha para admin
     */
    step4_askPassword(name, role) {
      const roleText = role === 'manager' ? 'Gerente' : 'Supervisor';
      return `🔐 *PASSO 4 de 4*\nPara cargos administrativos (${roleText}), é necessária uma senha de autorização.\n\nPor favor, *envie a senha* fornecida pela empresa:\n\n💡 _Se você não possui a senha, entre em contato com seu gerente_\n\n0️⃣ Voltar | 9️⃣ Cancelar cadastro`;
    },

    /**
     * Erro: Nome inválido
     */
    invalidName() {
      return `❌ *Nome inválido*\n\nPor favor, digite um nome válido com pelo menos 2 caracteres.\n\n💡 _Exemplo: Maria Santos_`;
    },

    /**
     * Erro: Opção de cargo inválida
     */
    invalidRole() {
      return `❌ *Opção inválida*\n\nPor favor, escolha uma das opções:\n\n1️⃣ Funcionário\n2️⃣ Gerente\n3️⃣ Supervisor\n\nEnvie apenas o *número* (1, 2 ou 3):`;
    },

    /**
     * Erro: Categoria inválida
     */
    invalidCategory() {
      return `❌ *Categoria inválida*\n\nPor favor, escolha pelo menos uma categoria válida:\n\n1️⃣ Bar\n2️⃣ Restaurante\n3️⃣ Padaria\n4️⃣ Café\n5️⃣ Lanchonete\n6️⃣ Outro\n\n💡 _Pode escolher várias:_ "1,2,3"`;
    },

    /**
     * Erro: Senha incorreta
     */
    wrongPassword() {
      return `🔒 *Senha incorreta*\n\nPor favor, tente novamente ou entre em contato com seu gerente para obter a senha correta.\n\n💡 _Digite a senha ou envie CANCELAR para desistir_`;
    },

    /**
     * Usuário já existe
     */
    userAlreadyExists(name, role) {
      const roleText = role === 'manager' ? 'Gerente' : role === 'supervisor' ? 'Supervisor' : 'Funcionário';
      return `👤 *Olá, ${name}!*\n\n✅ Você já está cadastrado como *${roleText}*!\n\n9️⃣ Ver menu principal`;
    },

    /**
     * Cadastro cancelado
     */
    cancelled() {
      return `❌ *Cadastro cancelado*\n\nTudo bem! Quando quiser se cadastrar, é só me enviar uma mensagem novamente! 😊`;
    },

    /**
     * Sessão de cadastro expirada
     */
    expired() {
      return `⏱️ *Tempo esgotado*\n\nO processo de cadastro expirou por inatividade.\n\nPara começar novamente, envie qualquer mensagem! 😊`;
    }
  },

  /**
   * Welcome message after registration
   */
  welcome(name, role, categories = []) {
    const emoji = role === 'manager' ? '💫' : role === 'supervisor' ? '🔎' : '👤';
    const roleText = role === 'manager' ? 'Gerente' : role === 'supervisor' ? 'Supervisor' : 'Funcionário';

    let categoryText = '';
    if (categories && categories.length > 0) {
      const catEmojis = {
        'bar': '🍺',
        'restaurante': '🍽️',
        'padaria': '🥖',
        'outro': '📋'
      };
      const catList = categories.map(c => `${catEmojis[c] || '📋'} ${c.charAt(0).toUpperCase() + c.slice(1)}`).join(', ');
      categoryText = `\n🎯 Categoria(s): ${catList}`;
    }

    return `${emoji} *Bem-vindo(a), ${name}!*\n\n✅ Seu cadastro foi realizado com sucesso como *${roleText}*!${categoryText}\n\nVocê já está logado e pronto para começar! 🎉`;
  },

  /**
   * Login success message
   */
  loginSuccess(name) {
    return `👋 Olá novamente, ${name}!\n\n✅ Login realizado com sucesso!`;
  },

  /**
   * Logout message
   */
  logout() {
    return `👋 *Até logo!*\n\nVocê foi desconectado com sucesso.\n\n💡 Para fazer login novamente:\n• Staff: envie *MENU*\n• Admin: envie *LOGIN SENHA*`;
  },

  /**
   * Registration instructions
   */
  registrationHelp() {
    return `📝 *Como se registrar:*\n\n*Para funcionários:*\nREGISTER Seu_Nome staff\n\n*Para administradores:*\nREGISTER Seu_Nome manager SENHA\nREGISTER Seu_Nome supervisor SENHA\n\n💡 _Exemplo:_ REGISTER João staff`;
  },

  /**
   * Checkin confirmation - Mensagens alegres e motivadoras
   */
  checkinConfirmation(type, location = null, userName = '') {
    const now = new Date();
    const hour = now.getHours();
    const timeStr = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const locationText = location ? `\n📍 ${location}` : '';

    // Mensagens personalizadas e alegres para cada tipo
    if (type === 'checkin') {
      const greetings = [
        `🟢 *Ótimo dia de trabalho, ${userName}!*\n\nSeu check-in foi registrado às ${timeStr}${locationText}\n\n💪 Vamos com tudo hoje! Sucesso! ✨`,
        `🟢 *Bem-vindo(a) de volta!*\n\nCheck-in registrado às ${timeStr}${locationText}\n\n☀️ Que seu dia seja produtivo e cheio de conquistas!`,
        `🟢 *Check-in confirmado!*\n\n⏰ ${timeStr}${locationText}\n\n🌟 Comece o dia com energia! Você é incrível!`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    if (type === 'break') {
      return `🟡 *Pausa iniciada!*\n\n⏰ ${timeStr}${locationText}\n\n😌 Aproveite para descansar! Você merece! ☕`;
    }

    if (type === 'return') {
      return `🔵 *Bem-vindo(a) de volta!*\n\n⏰ Retorno registrado às ${timeStr}${locationText}\n\n💪 Renovado(a) e pronto(a) para continuar! Vamos lá!`;
    }

    if (type === 'checkout') {
      const farewell = hour >= 18
        ? `🔴 *Ótimo trabalho hoje!*\n\n⏰ Check-out registrado às ${timeStr}${locationText}\n\n✨ Descanse bem! Você fez um excelente trabalho! 🎉\n💝 Até amanhã!`
        : `🔴 *Check-out registrado!*\n\n⏰ ${timeStr}${locationText}\n\n😊 Tenha um excelente resto de dia!\n🌟 Obrigado pelo seu trabalho!`;
      return farewell;
    }

    return `✅ *Ação registrada!*\n\n⏰ ${timeStr}${locationText}`;
  },

  /**
   * Supervisor notification when team member checks in
   */
  supervisorNotification(employeeName, action, timestamp, location = null) {
    const icons = {
      checkin: '🟢',
      break: '🟡',
      return: '🔵',
      checkout: '🔴'
    };

    const texts = {
      checkin: 'fez check-in',
      break: 'iniciou pausa',
      return: 'retornou da pausa',
      checkout: 'finalizou expediente'
    };

    const icon = icons[action] || '🔔';
    const actionText = texts[action] || action;
    const locationText = location ? `\n📍 ${location}` : '';

    return `${icon} *Notificação da Equipe*\n\n👤 ${employeeName} ${actionText}\n⏰ ${timestamp}${locationText}`;
  },

  /**
   * Staff menu
   */
  staffMenu(name) {
    return `👤 *Olá, ${name}!*\n\n📋 Selecione uma opção:\n\n1️⃣ Check-in\n2️⃣ Iniciar Pausa\n3️⃣ Voltar da Pausa\n4️⃣ Fechar Expediente\n5️⃣ Ver Meu Histórico\n\n0️⃣ Sair\n9️⃣ Atualizar menu`;
  },

  /**
   * Manager menu - Full check-in + management
   */
  managerMenu(name) {
    return `👔 *Olá, Gerente ${name}!*\n\n📋 Painel de Gestão:\n\n*Check-in Pessoal:*\n1️⃣ Check-in\n2️⃣ Iniciar Pausa\n3️⃣ Voltar da Pausa\n4️⃣ Fechar Expediente\n5️⃣ Ver Meu Histórico\n\n*Gestão de Equipe:*\n6️⃣ Ver Todos os Horários\n7️⃣ Buscar Usuário\n8️⃣ Definir Horas Semanais\n9️⃣ Editar Categorias\nA️⃣ Editar Horários\n\n0️⃣ Sair`;
  },

  /**
   * Supervisor menu - Full check-in + team management
   */
  supervisorMenu(name) {
    return `👨‍💼 *Olá, Supervisor ${name}!*\n\n📋 Gestão de Equipe:\n\n*Check-in Pessoal:*\n1️⃣ Check-in\n2️⃣ Iniciar Pausa\n3️⃣ Voltar da Pausa\n4️⃣ Fechar Expediente\n\n*Equipe:*\n5️⃣ Ver Equipe Ativa\n6️⃣ Histórico da Equipe\n7️⃣ Editar Horários\n8️⃣ Ver Meu Histórico\n\n0️⃣ Sair\n9️⃣ Atualizar menu`;
  },

  /**
   * History display
   */
  userHistory(records) {
    if (records.length === 0) {
      return '📊 *Seu Histórico*\n\n_Nenhum registro encontrado._';
    }

    const lines = ['📊 *Seu Histórico Recente:*\n'];

    records.forEach(r => {
      const icon = {
        checkin: '🟢',
        break: '🟡',
        return: '🔵',
        checkout: '🔴'
      }[r.type] || '•';

      const time = new Date(r.timestamp).toLocaleString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });

      const location = r.location ? ` 📍 ${r.location}` : '';
      lines.push(`${icon} ${r.type} - ${time}${location}`);
    });

    return lines.join('\n');
  },

  /**
   * Search results
   */
  searchResults(users) {
    if (users.length === 0) {
      return '🔍 *Busca de Usuários*\n\n_Nenhum usuário encontrado._';
    }

    const lines = ['🔍 *Resultados da Busca:*\n'];

    users.forEach(u => {
      const status = u.active ? '✅' : '❌';
      const roleEmoji = u.role === 'manager' ? '👔' : u.role === 'supervisor' ? '👨‍💼' : '👤';
      lines.push(`${status} *${u.id}.* ${u.name}`);
      lines.push(`   ${roleEmoji} ${u.role} | 📱 ${u.phone}`);
    });

    return lines.join('\n');
  },

  /**
   * All schedules display
   */
  allSchedules(groups) {
    if (groups.length === 0) {
      return '📋 *Todos os Horários*\n\n_Sem dados disponíveis._';
    }

    const lines = ['📋 *Resumo Geral de Horários:*\n'];

    groups.slice(0, 10).forEach(g => {
      const roleEmoji = g.user.role === 'manager' ? '👔' : g.user.role === 'supervisor' ? '👨‍💼' : '👤';
      lines.push(`\n${roleEmoji} *${g.user.name}* (${g.user.role})`);

      if (g.checkins.length === 0) {
        lines.push('   _Sem registros_');
      } else {
        g.checkins.slice(0, 2).forEach(c => {
          const icon = {
            checkin: '🟢',
            break: '🟡',
            return: '🔵',
            checkout: '🔴'
          }[c.type] || '•';

          const time = new Date(c.timestamp).toLocaleString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            timeZone: 'America/Sao_Paulo'
          });

          const location = c.location ? ` 📍 ${c.location}` : '';
          lines.push(`   ${icon} ${c.type} - ${time}${location}`);
        });
      }
    });

    return lines.join('\n');
  },

  /**
   * Team active status
   */
  teamActive(members) {
    if (members.length === 0) {
      return '👥 *Equipe Ativa*\n\n_Nenhum membro na equipe._';
    }

    const lines = ['👥 *Status da Equipe:*\n'];

    members.forEach(m => {
      const statusMap = {
        checkin: '🟢 Ativo',
        break: '🟡 Em Pausa',
        return: '🔵 Ativo',
        checkout: '🔴 Encerrado'
      };

      const status = statusMap[m.type] || '⚪ Sem registro';
      const lastAction = m.last_action ? new Date(m.last_action).toLocaleString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      }) : 'N/A';

      lines.push(`${status} *${m.name}*`);
      if (m.last_action) {
        lines.push(`   ⏰ Última ação: ${lastAction}`);
      }
    });

    return lines.join('\n');
  },

  /**
   * Team history
   */
  teamHistory(records) {
    if (records.length === 0) {
      return '📜 *Histórico da Equipe*\n\n_Nenhum registro disponível._';
    }

    const lines = ['📜 *Histórico da Equipe:*\n'];

    records.forEach(r => {
      const icon = {
        checkin: '🟢',
        break: '🟡',
        return: '🔵',
        checkout: '🔴'
      }[r.type] || '•';

      const time = new Date(r.timestamp).toLocaleString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });

      const location = r.location ? ` 📍 ${r.location}` : '';
      lines.push(`${icon} *${r.name}*: ${r.type} - ${time}${location}`);
    });

    return lines.join('\n');
  },

  /**
   * Error messages
   */
  errors: {
    noPhone() {
      return '❌ *Erro*\n\nNão foi possível identificar seu número.\nPor favor, envie através do WhatsApp.';
    },

    invalidRole() {
      return '❌ *Role Inválido*\n\nUse: staff, manager ou supervisor\n\n💡 _Exemplo:_ REGISTER João staff';
    },

    wrongPassword() {
      return '🔒 *Senha Incorreta*\n\nPara cargos administrativos é necessária a senha.\n\n💡 _Tente:_ LOGIN SENHA';
    },

    adminPasswordRequired() {
      return '🔒 *Senha de Admin Necessária*\n\nPara registrar como manager ou supervisor, você precisa da senha administrativa.\n\n💡 _Formato:_ REGISTER Nome manager SENHA';
    },

    unknownCommand() {
      return '❓ *Comando Não Reconhecido*\n\nEnvie *MENU* para ver as opções disponíveis.';
    },

    editTimeFormat() {
      return '⚙️ *Como Corrigir Horário:*\n\n*Editar:*\n3 ID_CHECKIN NOVA_DATA\n_Exemplo:_ 3 123 2024-01-15T08:30:00\n\n*Deletar:*\nDEL ID_CHECKIN\n_Exemplo:_ DEL 123';
    },

    deleteFormat() {
      return '🗑️ *Como Deletar:*\n\nDEL ID_CHECKIN\n\n💡 _Exemplo:_ DEL 123';
    },

    addFormat() {
      return '➕ *Como Adicionar Checkin Manual:*\n\nADD ID_USUARIO TIPO DATA LOCALIZACAO\n\n💡 _Exemplo:_\nADD 2 checkin 2024-01-15T08:30:00 Escritório';
    },

    searchFormat() {
      return '🔍 *Como Pesquisar:*\n\n2 nome_ou_telefone\n\nOU\n\nSEARCH nome_ou_telefone';
    },

    updateSuccess(checkinId) {
      return `✅ *Horário Atualizado!*\n\nCheckin #${checkinId} foi corrigido com sucesso.`;
    },

    updateFailed() {
      return '❌ *Checkin Não Encontrado*\n\nVerifique o ID e tente novamente.';
    },

    updateError() {
      return '❌ *Erro ao Atualizar*\n\nVerifique o formato da data.\n\n💡 _Formato:_ YYYY-MM-DDTHH:MM:SS';
    },

    deleteSuccess(checkinId) {
      return `✅ *Checkin Deletado!*\n\nCheckin #${checkinId} foi removido com sucesso.`;
    },

    deleteFailed() {
      return '❌ *Checkin Não Encontrado*\n\nVerifique o ID e tente novamente.';
    },

    addSuccess(userId) {
      return `✅ *Checkin Manual Adicionado!*\n\nRegistro criado para usuário #${userId}.`;
    },

    addError() {
      return '❌ *Erro ao Adicionar*\n\nVerifique os dados e tente novamente.';
    }
  },

  /**
   * Conversational templates - Busca de usuários
   */
  conversation: {
    // Busca de usuário
    searchUser_start() {
      return `🔍 *Buscar Usuário*\n\nDigite o *nome* (ou parte do nome) da pessoa que você procura:\n\n💡 _Exemplo: João_ ou _Maria_\n\n0️⃣ Voltar | 9️⃣ Menu Principal`;
    },

    searchUser_results(results, searchTerm) {
      const lines = [`🔍 *Resultados para "${searchTerm}":*\n`];

      results.forEach((user, index) => {
        const roleEmoji = user.role === 'manager' ? '👔' : user.role === 'supervisor' ? '👨‍💼' : '👤';
        const categories = user.categories ? ` | ${user.categories}` : '';
        lines.push(`${index + 1}️⃣ ${roleEmoji} *${user.name}*`);
        lines.push(`   📱 ${user.phone}${categories}`);
        if (user.expected_weekly_hours) {
          lines.push(`   ⏰ ${user.expected_weekly_hours}h/semana`);
        }
      });

      lines.push(`\n💡 _Digite o número (1-${results.length})_`);
      lines.push(`\n0️⃣ Voltar | 9️⃣ Menu Principal`);

      return lines.join('\n');
    },

    searchUser_selected(user) {
      const roleText = user.role === 'manager' ? 'Gerente' : user.role === 'supervisor' ? 'Supervisor' : 'Funcionário';
      const roleEmoji = user.role === 'manager' ? '👔' : user.role === 'supervisor' ? '👨‍💼' : '👤';
      const categories = user.categories ? `\n🎯 Categorias: ${user.categories}` : '';
      const hours = user.expected_weekly_hours ? `\n⏰ Horas esperadas: ${user.expected_weekly_hours}h/semana` : '';

      return `${roleEmoji} *${user.name}*\n\n📋 ${roleText}\n📱 ${user.phone}${categories}${hours}`;
    },

    searchUser_noResults(searchTerm) {
      return `🔍 *Nenhum resultado*\n\nNão encontrei ninguém com "${searchTerm}".\n\nTente novamente com outro nome.\n\n0️⃣ Voltar | 9️⃣ Menu Principal`;
    },

    // Definir horas esperadas
    setHours_start() {
      return `⏰ *Definir Horas Semanais*\n\nPrimeiro, vamos encontrar o funcionário.\n\nDigite o *nome* da pessoa:\n\n💡 _Exemplo: João_\n\n0️⃣ Voltar | 9️⃣ Menu Principal`;
    },

    setHours_askHours(userName) {
      return `⏰ *Definir Horas para ${userName}*\n\nQuantas horas por semana são esperadas?\n\n💡 _Exemplos:_\n• 40 (tempo integral)\n• 20 (meio período)\n• 44 (com horas extras)\n\nDigite o número de horas:`;
    },

    setHours_success(userName, hours) {
      return `✅ *Horas definidas!*\n\n${userName} agora tem *${hours} horas/semana* esperadas.\n\n⏰ O sistema poderá calcular cumprimento de horas.`;
    },

    // Editar categorias
    editCategory_start() {
      return `🎯 *Editar Categorias*\n\nPrimeiro, vamos encontrar o usuário.\n\nDigite o *nome* da pessoa:\n\n💡 _Exemplo: Maria_\n\n0️⃣ Voltar | 9️⃣ Menu Principal`;
    },

    editCategory_askCategories(userName, currentCategories) {
      const current = currentCategories && currentCategories.length > 0
        ? `\n📋 Categorias atuais: ${currentCategories.join(', ')}`
        : '';

      return `🎯 *Editar Categorias de ${userName}*${current}\n\nEscolha as novas categorias:\n\n1️⃣ Bar 🍺\n2️⃣ Restaurante 🍽️\n3️⃣ Padaria 🥖\n4️⃣ Café ☕\n5️⃣ Lanchonete 🍔\n6️⃣ Outro\n\n💡 _Pode escolher várias:_ "1,2" ou "1 3 5"`;
    },

    editCategory_success(userName, categories) {
      const catEmojis = {
        'bar': '🍺',
        'restaurante': '🍽️',
        'padaria': '🥖',
        'outro': '📋'
      };
      const catList = categories.map(c => `${catEmojis[c] || '📋'} ${c.charAt(0).toUpperCase() + c.slice(1)}`).join(', ');

      return `✅ *Categorias atualizadas!*\n\n${userName} agora está em:\n${catList}`;
    },

    // Editar horários (timestamps)
    editHours_start() {
      return `✏️ *Editar Horários*\n\nPrimeiro, vamos encontrar o funcionário.\n\nDigite o *nome* da pessoa:\n\n💡 _Exemplo: João_\n\n0️⃣ Voltar | 9️⃣ Menu Principal`;
    },

    editHours_showCheckins(userName, checkins) {
      const lines = [`📊 *Horários de ${userName}*\n`];

      checkins.forEach((checkin, index) => {
        const icon = {
          checkin: '🟢',
          checkout: '🔴',
          break: '🟡',
          return: '🔵'
        }[checkin.type] || '⚪';

        const date = new Date(checkin.timestamp);
        const dateStr = date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });

        const typeText = {
          checkin: 'Check-in',
          checkout: 'Check-out',
          break: 'Pausa',
          return: 'Retorno'
        }[checkin.type] || checkin.type;

        lines.push(`${index + 1}️⃣ ${icon} ${typeText} - ${dateStr}`);

        if (checkin.edited_by) {
          lines.push(`   ✏️ _Editado_`);
        }
      });

      lines.push(`\n💡 _Selecione o número (1-${checkins.length}) para editar_`);
      lines.push(`\n0️⃣ Voltar | 9️⃣ Menu Principal`);

      return lines.join('\n');
    },

    editHours_askNewTime(userName, checkin) {
      const date = new Date(checkin.timestamp);
      const currentTime = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });

      const typeText = {
        checkin: 'Check-in',
        checkout: 'Check-out',
        break: 'Pausa',
        return: 'Retorno'
      }[checkin.type] || checkin.type;

      return `✏️ *Editar ${typeText} de ${userName}*\n\n⏰ Horário atual: *${currentTime}*\n\nEnvie o novo horário no formato HH:MM\n\n💡 _Exemplos:_\n• 08:00\n• 14:30\n• 18:15\n\n0️⃣ Cancelar | 9️⃣ Menu Principal`;
    },

    editHours_success(userName, checkinType, oldTime, newTime, editorName) {
      const typeText = {
        checkin: 'Check-in',
        checkout: 'Check-out',
        break: 'Pausa',
        return: 'Retorno'
      }[checkinType] || checkinType;

      return `✅ *Horário atualizado!*\n\n👤 ${userName} - ${typeText}\n\nAntes: ${oldTime}\nDepois: ${newTime}\n\n✏️ Alterado por: ${editorName}`;
    },

    // Cancelamento
    cancelled() {
      return `❌ *Operação cancelada*\n\nVoltando ao menu principal.`;
    }
  }
};

/**
 * Get menu for user role
 */
function getMenuForRole(role, userName) {
  if (role === 'manager') {
    return MessageTemplates.managerMenu(userName);
  }
  if (role === 'supervisor') {
    return MessageTemplates.supervisorMenu(userName);
  }
  return MessageTemplates.staffMenu(userName);
}

module.exports = {
  sendWhatsAppMessage,
  MessageTemplates,
  getMenuForRole
};
