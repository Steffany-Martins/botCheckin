/**
 * Menu Templates
 * Different menus for different user roles
 */

const MenuTemplates = {
  /**
   * Staff menu - Basic check-in/out options
   */
  staff(name) {
    return (
      `👤 *Ola,* ${name}!\n\n` +
      `📋 *Selecione uma opção:*\n\n` +
      `1️⃣ Check-in\n` +
      `2️⃣ Iniciar Pausa\n` +
      `3️⃣ Voltar da Pausa\n` +
      `4️⃣ Fechar Expediente\n` +
      `5️⃣ Ver Meu Histórico\n\n` +
      `0️⃣ Sair\n` +
      `9️⃣ Atualizar menu`
    );
  },

  /**
   * Manager menu - Full check-in + management
   */
  manager(name) {
    return (
      `👔 *Ola, Gerente* ${name}!\n\n` +
      `📋 *Painel de Gestão:*\n\n` +
      `*Check-in Pessoal:*\n` +
      `1️⃣ Check-in\n` +
      `2️⃣ Iniciar Pausa\n` +
      `3️⃣ Voltar da Pausa\n` +
      `4️⃣ Fechar Expediente\n` +
      `5️⃣ Ver Meu Histórico\n\n` +
      `*Gestão de Equipe:*\n` +
      `6️⃣ Ver Todos os Horários\n` +
      `7️⃣ Buscar Usuário\n` +
      `8️⃣ Definir Horas Semanais\n` +
      `9️⃣ Editar Categorias\n` +
      `🔟 Editar Horários\n\n` +
      `0️⃣ Sair`
    );
  },

  /**
   * Supervisor menu - Full check-in + team management
   */
  supervisor(name) {
    return (
      `👨‍💼 *Ola, Supervisor* ${name}!\n\n` +
      `📋 *Gestão de Equipe:*\n\n` +
      `*Check-in Pessoal:*\n` +
      `1️⃣ Check-in\n` +
      `2️⃣ Iniciar Pausa\n` +
      `3️⃣ Voltar da Pausa\n` +
      `4️⃣ Fechar Expediente\n\n` +
      `*Equipe:*\n` +
      `5️⃣ Ver Equipe Ativa\n` +
      `6️⃣ Histórico da Equipe\n` +
      `7️⃣ Editar Horários\n` +
      `8️⃣ Ver Meu Histórico\n\n` +
      `0️⃣ Sair\n` +
      `9️⃣ Atualizar menu`
    );
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
    return `👋 Ola novamente, ${name}!\n\n✅ Login realizado com sucesso!`;
  },

  /**
   * Logout message
   */
  logout() {
    return `👋 *Até logo!*\n\nVocê foi desconectado com sucesso.\n\n💡 Para fazer login novamente:\n• Staff: envie *MENU*\n• Admin: envie *LOGIN SENHA*`;
  }
};

/**
 * Get menu for user role
 */
function getMenuForRole(role, userName) {
  if (role === 'manager') {
    return MenuTemplates.manager(userName);
  }
  if (role === 'supervisor') {
    return MenuTemplates.supervisor(userName);
  }
  return MenuTemplates.staff(userName);
}

/**
 * Get simple navigation footer (without full menu)
 */
function getNavigationFooter() {
  return '\n\n0️⃣ Voltar | 9️⃣ Menu';
}

module.exports = {
  MenuTemplates,
  getMenuForRole,
  getNavigationFooter
};
