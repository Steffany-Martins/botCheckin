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
   * Welcome message after registration
   */
  welcome(name, role) {
    const emoji = role === 'manager' ? '👔' : role === 'supervisor' ? '👨‍💼' : '👤';
    return `${emoji} Bem-vindo(a), ${name}!\n\n✅ Seu cadastro foi realizado com sucesso como *${role}*.\n\nVocê já está logado e pronto para começar!`;
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
   * Checkin confirmation
   */
  checkinConfirmation(type, location = null) {
    const icons = {
      checkin: '🟢',
      break: '🟡',
      return: '🔵',
      checkout: '🔴'
    };

    const texts = {
      checkin: 'Check-in registrado',
      break: 'Pausa iniciada',
      return: 'Retorno registrado',
      checkout: 'Check-out realizado'
    };

    const icon = icons[type] || '✅';
    const text = texts[type] || 'Ação registrada';
    const locationText = location ? `\n📍 Local: ${location}` : '';

    return `${icon} *${text}!*${locationText}\n\n⏰ Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
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
    return `👤 *Olá, ${name}!*\n\n📋 Selecione uma opção:\n\n1️⃣ Check-in\n2️⃣ Iniciar Pausa\n3️⃣ Voltar da Pausa\n4️⃣ Fechar Expediente\n5️⃣ Ver Meu Histórico\n6️⃣ Sair\n\n💡 _Envie o número ou comando_`;
  },

  /**
   * Manager menu
   */
  managerMenu(name) {
    return `👔 *Olá, Gerente ${name}!*\n\n📋 Painel de Gestão:\n\n1️⃣ Ver Todos os Horários\n2️⃣ Pesquisar Usuário\n3️⃣ Corrigir Horário\n4️⃣ Meu Check-in\n5️⃣ Status Geral\n6️⃣ Sair\n\n💡 _Envie o número ou comando_`;
  },

  /**
   * Supervisor menu
   */
  supervisorMenu(name) {
    return `👨‍💼 *Olá, Supervisor ${name}!*\n\n📋 Gestão de Equipe:\n\n1️⃣ Ver Equipe Ativa\n2️⃣ Histórico da Equipe\n3️⃣ Sair\n\n💡 _Envie o número ou comando_`;
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
