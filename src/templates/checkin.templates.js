/**
 * Check-in/out Action Templates
 * Messages for user actions
 */

const CheckinTemplates = {
  /**
   * Checkin confirmation - Personalized and motivating messages
   */
  confirmation(type, location = null, userName = '') {
    const now = new Date();
    const hour = now.getHours();
    const timeStr = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const locationText = location ? `\n📍 ${location}` : '';

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
   * User history display with pagination indicator
   */
  userHistory(records, hasMore = false) {
    if (records.length === 0) {
      return '📊 *Seu Histórico*\n\n_Nenhum registro encontrado._';
    }

    const lines = [];

    // Mostrar check-in mais recente no topo
    const mostRecent = records[0];
    const recentIcon = {
      checkin: '🟢',
      break: '🟡',
      return: '🔵',
      checkout: '🔴'
    }[mostRecent.type] || '•';

    const recentTime = new Date(mostRecent.timestamp).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });

    const recentLocation = mostRecent.location ? ` 📍 ${mostRecent.location}` : '';

    lines.push(`📍 *MAIS RECENTE:*`);
    lines.push(`${recentIcon} ${mostRecent.type} - ${recentTime}${recentLocation}`);
    lines.push('');
    lines.push(`📊 *HISTÓRICO (${records.length} registros):*\n`);

    // Mostrar todos os registros
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

    // Indicar se há mais registros
    if (hasMore) {
      lines.push('');
      lines.push('📄 _Há mais registros disponíveis no banco de dados_');
    }

    return lines.join('\n');
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
  }
};

module.exports = CheckinTemplates;
