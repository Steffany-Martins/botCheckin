/**
 * Conversation Templates
 * Multi-step conversation flows (search user, edit hours, etc.)
 */

const ConversationTemplates = {
  // ============= Search User =============
  searchUserStart() {
    return `🔍 *Buscar Usuário*\n\nDigite o *nome* (ou parte do nome) da pessoa que você procura:\n\n💡 _Exemplo: João_ ou _Maria_\n\n0️⃣ Voltar | 9️⃣ Menu`;
  },

  searchUserResults(results, searchTerm) {
    const lines = [`🔍 *Resultados para "${searchTerm}":*\n`];
    results.forEach((user, index) => {
      const roleEmoji = user.role === 'manager' ? '💫' : user.role === 'supervisor' ? '🔎' : '👤';
      const categories = user.categories ? ` | ${user.categories}` : '';
      lines.push(`${index + 1}️⃣ ${roleEmoji} *${user.name}*`);
      lines.push(`   📱 ${user.phone}${categories}`);
      if (user.expected_weekly_hours) {
        lines.push(`   ⏰ ${user.expected_weekly_hours}h/semana`);
      }
      lines.push(''); // Espaço entre usuários
    });

    lines.push(`💬 *Responda apenas com o número*`);
    lines.push(`📝 Digite: ${results.length === 1 ? '1' : `1 a ${results.length}`}`);
    lines.push(`\n0️⃣ Voltar | 9️⃣ Menu`);

    return lines.join('\n');
  },

  searchUserSelected(user) {
    const roleText = user.role === 'manager' ? 'Gerente' : user.role === 'supervisor' ? 'Supervisor' : 'Funcionário';
    const roleEmoji = user.role === 'manager' ? '👔' : user.role === 'supervisor' ? '👨‍💼' : '👤';
    const categories = user.categories ? `\n🎯 Categorias: ${user.categories}` : '';
    const hours = user.expected_weekly_hours ? `\n⏰ Horas esperadas: ${user.expected_weekly_hours}h/semana` : '';

    return `${roleEmoji} *${user.name}*\n\n📋 ${roleText}\n📱 ${user.phone}${categories}${hours}`;
  },

  searchUserNoResults(searchTerm) {
    return `🔍 *Nenhum resultado*\n\nNão encontrei ninguém com "${searchTerm}".\n\nTente novamente com outro nome.\n\n0️⃣ Voltar | 9️⃣ Menu`;
  },

  // ============= Set Hours =============
  setHoursStart() {
    return `⏰ *Definir Horas Semanais*\n\nPrimeiro, vamos encontrar o funcionário.\n\nDigite o *nome* da pessoa:\n\n💡 _Exemplo: João_\n\n0️⃣ Voltar | 9️⃣ Menu`;
  },

  setHoursAskHours(userName) {
    return `⏰ *Definir Horas para ${userName}*\n\nQuantas horas por semana são esperadas?\n\n💡 _Exemplos:_\n• 40 (tempo integral)\n• 20 (meio período)\n• 44 (com horas extras)\n\nDigite o número de horas:\n\n0️⃣ Voltar | 9️⃣ Menu`;
  },

  setHoursSuccess(userName, hours) {
    return `✅ *Horas definidas!*\n\n${userName} agora tem *${hours} horas/semana* esperadas.\n\n⏰ O sistema poderá calcular cumprimento de horas.`;
  },

  // ============= Edit Category =============
  editCategoryStart() {
    return `🎯 *Editar Categorias*\n\nPrimeiro, vamos encontrar o usuário.\n\nDigite o *nome* da pessoa:\n\n💡 _Exemplo: Maria_\n\n0️⃣ Voltar | 9️⃣ Menu`;
  },

  editCategoryAskCategories(userName, currentCategories) {
    const current = currentCategories && currentCategories.length > 0
      ? `\n📋 Categorias atuais: ${currentCategories.join(', ')}`
      : '';

    return `🎯 *Editar Categorias de ${userName}*${current}\n\nEscolha as novas categorias:\n\n1️⃣ Bar 🍺\n2️⃣ Restaurante 🍽️\n3️⃣ Padaria 🥖\n4️⃣ Café ☕\n5️⃣ Lanchonete 🍔\n6️⃣ Outro\n\n💡 _Pode escolher várias:_ "1,2" ou "1 3 5"\n\n0️⃣ Voltar | 9️⃣ Menu`;
  },

  editCategorySuccess(userName, categories) {
    const catEmojis = {
      'bar': '🍺',
      'restaurante': '🍽️',
      'padaria': '🥖',
      'outro': '📋'
    };
    const catList = categories.map(c => `${catEmojis[c] || '📋'} ${c.charAt(0).toUpperCase() + c.slice(1)}`).join(', ');

    return `✅ *Categorias atualizadas!*\n\n${userName} agora está em:\n${catList}`;
  },

  // ============= Edit Hours (Timestamps) =============
  editHoursStart() {
    return `✏️ *Editar Horários*\n\nPrimeiro, vamos encontrar o funcionário.\n\nDigite o *nome* da pessoa:\n\n💡 _Exemplo: João_\n\n0️⃣ Voltar | 9️⃣ Menu`;
  },

  editHoursShowCheckins(userName, checkins) {
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
    lines.push(`\n0️⃣ Voltar | 9️⃣ Menu`);

    return lines.join('\n');
  },

  editHoursAskNewTime(userName, checkin) {
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

    return `✏️ *Editar ${typeText} de ${userName}*\n\n⏰ Horário atual: *${currentTime}*\n\nEnvie o novo horário no formato HH:MM\n\n💡 _Exemplos:_\n• 08:00\n• 14:30\n• 18:15\n\n0️⃣ Voltar | 9️⃣ Menu`;
  },

  editHoursSuccess(userName, checkinType, oldTime, newTime, editorName) {
    const typeText = {
      checkin: 'Check-in',
      checkout: 'Check-out',
      break: 'Pausa',
      return: 'Retorno'
    }[checkinType] || checkinType;

    return `✅ *Horário atualizado!*\n\n👤 ${userName} - ${typeText}\n\nAntes: ${oldTime}\nDepois: ${newTime}\n\n✏️ Alterado por: ${editorName}`;
  },

  // ============= General =============
  cancelled() {
    return `❌ *Operação cancelada*\n\nVoltando ao menu principal.`;
  }
};

module.exports = ConversationTemplates;
