/**
 * Conversation Service - Gerencia conversações interativas guiadas
 * Sem comandos complexos - apenas números e respostas simples
 */

const { UserDB, CheckinDB } = require('./database.service');

// Armazena estados de conversação ativas
const conversationStates = new Map();

// Timeout de 5 minutos para conversas
const CONVERSATION_TIMEOUT = 5 * 60 * 1000;

/**
 * Tipos de conversação disponíveis
 */
const ConversationType = {
  SEARCH_USER: 'search_user',
  SET_HOURS: 'set_hours',
  EDIT_CATEGORY: 'edit_category',
  EDIT_HOURS: 'edit_hours',
  REPLACE_CHECKIN: 'replace_checkin'
};

/**
 * Limpa conversações expiradas
 */
function cleanExpiredConversations() {
  const now = Date.now();
  for (const [phone, state] of conversationStates.entries()) {
    if (now - state.startedAt > CONVERSATION_TIMEOUT) {
      conversationStates.delete(phone);
    }
  }
}

setInterval(cleanExpiredConversations, 2 * 60 * 1000);

/**
 * Verifica se usuário está em uma conversação ativa
 */
function isInConversation(phone) {
  return conversationStates.has(phone);
}

/**
 * Obtém estado da conversação
 */
function getConversationState(phone) {
  return conversationStates.get(phone);
}

/**
 * Inicia conversação de busca de usuário
 */
function startSearchUser(phone, userRole) {
  conversationStates.set(phone, {
    type: ConversationType.SEARCH_USER,
    step: 1, // 1=pedir nome, 2=mostrar resultados e pedir seleção
    role: userRole,
    searchResults: [],
    startedAt: Date.now()
  });
  return { success: true };
}

/**
 * Processa busca de usuário - Step 1: Receber nome para buscar
 */
async function processSearchUser_Step1(phone, input) {
  const state = conversationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const searchTerm = input.trim();

  if (searchTerm.length < 2) {
    return {
      error: 'SEARCH_TOO_SHORT',
      message: 'Digite pelo menos 2 caracteres para buscar.'
    };
  }

  // Buscar usuários
  const results = await UserDB.searchByName(searchTerm, 10);

  if (results.length === 0) {
    return {
      error: 'NO_RESULTS',
      message: `Nenhum usuário encontrado com "${searchTerm}".`,
      searchTerm
    };
  }

  // Salvar resultados e avançar para step 2
  state.searchResults = results;
  state.searchTerm = searchTerm;
  state.step = 2;
  conversationStates.set(phone, state);

  return { success: true, results, searchTerm };
}

/**
 * Processa busca de usuário - Step 2: Usuário seleciona da lista
 */
function processSearchUser_Step2(phone, input) {
  const state = conversationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const selection = parseInt(input.trim());

  if (isNaN(selection) || selection < 1 || selection > state.searchResults.length) {
    return {
      error: 'INVALID_SELECTION',
      message: `Digite um número de 1 a ${state.searchResults.length}`
    };
  }

  const selectedUser = state.searchResults[selection - 1];

  // Limpar conversação
  conversationStates.delete(phone);

  return { success: true, user: selectedUser };
}

/**
 * Inicia conversação para definir horas esperadas
 */
function startSetHours(phone) {
  conversationStates.set(phone, {
    type: ConversationType.SET_HOURS,
    step: 1, // 1=buscar usuário, 2=selecionar, 3=definir horas
    searchResults: [],
    selectedUser: null,
    startedAt: Date.now()
  });
  return { success: true };
}

/**
 * Processa definição de horas - Step 1: Buscar usuário
 */
async function processSetHours_Step1(phone, input) {
  const state = conversationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const searchTerm = input.trim();

  if (searchTerm.length < 2) {
    return {
      error: 'SEARCH_TOO_SHORT',
      message: 'Digite pelo menos 2 caracteres para buscar.'
    };
  }

  // Buscar usuários
  const results = await UserDB.searchByName(searchTerm, 10);

  if (results.length === 0) {
    return {
      error: 'NO_RESULTS',
      message: `Nenhum usuário encontrado com "${searchTerm}".`,
      searchTerm
    };
  }

  // Salvar resultados e avançar para step 2
  state.searchResults = results;
  state.searchTerm = searchTerm;
  state.step = 2;
  conversationStates.set(phone, state);

  return { success: true, results, searchTerm };
}

/**
 * Processa definição de horas - Step 2: Selecionar usuário
 */
function processSetHours_Step2(phone, input) {
  const state = conversationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const selection = parseInt(input.trim());

  if (isNaN(selection) || selection < 1 || selection > state.searchResults.length) {
    return {
      error: 'INVALID_SELECTION',
      message: `Digite um número de 1 a ${state.searchResults.length}`
    };
  }

  const selectedUser = state.searchResults[selection - 1];

  // Salvar usuário selecionado e avançar para step 3
  state.selectedUser = selectedUser;
  state.step = 3;
  conversationStates.set(phone, state);

  return { success: true, user: selectedUser };
}

/**
 * Processa definição de horas - Step 3: Definir horas
 */
function processSetHours_Step3(phone, input) {
  const state = conversationStates.get(phone);
  if (!state || !state.selectedUser) return { error: 'NO_STATE' };

  const hours = parseFloat(input.trim().replace(',', '.'));

  if (isNaN(hours) || hours < 0 || hours > 168) {
    return {
      error: 'INVALID_HOURS',
      message: 'Digite um número válido entre 0 e 168 horas por semana.'
    };
  }

  const result = UserDB.updateExpectedHours(state.selectedUser.id, hours);

  // Limpar conversação
  conversationStates.delete(phone);

  return { success: true, user: state.selectedUser, hours, changes: result.changes };
}

/**
 * Inicia conversação para editar categorias
 */
function startEditCategory(phone) {
  conversationStates.set(phone, {
    type: ConversationType.EDIT_CATEGORY,
    step: 1, // 1=buscar usuário, 2=selecionar, 3=escolher categorias
    searchResults: [],
    selectedUser: null,
    startedAt: Date.now()
  });
  return { success: true };
}

/**
 * Processa edição de categorias - Step 1: Buscar usuário
 */
async function processEditCategory_Step1(phone, input) {
  const state = conversationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const searchTerm = input.trim();

  if (searchTerm.length < 2) {
    return {
      error: 'SEARCH_TOO_SHORT',
      message: 'Digite pelo menos 2 caracteres para buscar.'
    };
  }

  // Buscar usuários
  const results = await UserDB.searchByName(searchTerm, 10);

  if (results.length === 0) {
    return {
      error: 'NO_RESULTS',
      message: `Nenhum usuário encontrado com "${searchTerm}".`,
      searchTerm
    };
  }

  // Salvar resultados e avançar para step 2
  state.searchResults = results;
  state.searchTerm = searchTerm;
  state.step = 2;
  conversationStates.set(phone, state);

  return { success: true, results, searchTerm };
}

/**
 * Processa edição de categorias - Step 2: Selecionar usuário
 */
function processEditCategory_Step2(phone, input) {
  const state = conversationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const selection = parseInt(input.trim());

  if (isNaN(selection) || selection < 1 || selection > state.searchResults.length) {
    return {
      error: 'INVALID_SELECTION',
      message: `Digite um número de 1 a ${state.searchResults.length}`
    };
  }

  const selectedUser = state.searchResults[selection - 1];

  // Salvar usuário selecionado e avançar para step 3
  state.selectedUser = selectedUser;
  state.step = 3;
  conversationStates.set(phone, state);

  return { success: true, user: selectedUser };
}

/**
 * Processa edição de categorias - Step 3: Escolher novas categorias
 */
function processEditCategory_Step3(phone, input) {
  const state = conversationStates.get(phone);
  if (!state || !state.selectedUser) return { error: 'NO_STATE' };

  const input_clean = input.trim();

  const categoryMap = {
    '1': 'bar',
    '2': 'restaurante',
    '3': 'padaria',
    '4': 'outro'
  };

  const selections = input_clean.split(/[,\s]+/).filter(s => s.length > 0);
  const categories = [];

  for (const sel of selections) {
    if (categoryMap[sel]) {
      categories.push(categoryMap[sel]);
    }
  }

  if (categories.length === 0) {
    return {
      error: 'INVALID_CATEGORY',
      message: 'Digite pelo menos um número de 1 a 6.'
    };
  }

  const uniqueCategories = [...new Set(categories)];
  const result = UserDB.updateCategories(state.selectedUser.id, uniqueCategories);

  // Limpar conversação
  conversationStates.delete(phone);

  return { success: true, user: state.selectedUser, categories: uniqueCategories, changes: result.changes };
}

/**
 * Inicia conversação para editar horários
 */
function startEditHours(phone, editorUser) {
  conversationStates.set(phone, {
    type: ConversationType.EDIT_HOURS,
    step: 1, // 1=buscar usuário, 2=selecionar, 3=mostrar checkins, 4=selecionar checkin, 5=digitar novo horário
    searchResults: [],
    selectedUser: null,
    checkins: [],
    selectedCheckin: null,
    editorUser: editorUser, // usuário que está editando (para audit trail)
    startedAt: Date.now()
  });
  return { success: true };
}

/**
 * Processa edição de horários - Step 3: Mostrar check-ins recentes
 */
function processEditHours_Step3(phone, input) {
  const state = conversationStates.get(phone);
  if (!state || !state.selectedUser) return { error: 'NO_STATE' };

  // Buscar últimos 10 check-ins do usuário
  const checkins = CheckinDB.getRecentByUser(state.selectedUser.id, 10);

  if (!checkins || checkins.length === 0) {
    conversationStates.delete(phone);
    return {
      error: 'NO_CHECKINS',
      message: `${state.selectedUser.name} ainda não tem registros de ponto.`
    };
  }

  // Salvar check-ins e avançar para step 4
  state.checkins = checkins;
  state.step = 4;
  conversationStates.set(phone, state);

  return { success: true, user: state.selectedUser, checkins };
}

/**
 * Processa edição de horários - Step 4: Selecionar check-in da lista
 */
function processEditHours_Step4(phone, input) {
  const state = conversationStates.get(phone);
  if (!state || !state.checkins) return { error: 'NO_STATE' };

  const selection = parseInt(input.trim());

  if (isNaN(selection) || selection < 1 || selection > state.checkins.length) {
    return {
      error: 'INVALID_SELECTION',
      message: `Digite um número de 1 a ${state.checkins.length}`
    };
  }

  const selectedCheckin = state.checkins[selection - 1];

  // Salvar check-in selecionado e avançar para step 5
  state.selectedCheckin = selectedCheckin;
  state.step = 5;
  conversationStates.set(phone, state);

  return { success: true, checkin: selectedCheckin, user: state.selectedUser };
}

/**
 * Processa edição de horários - Step 5: Receber novo horário em formato HH:MM
 */
function processEditHours_Step5(phone, input) {
  const state = conversationStates.get(phone);
  if (!state || !state.selectedCheckin) return { error: 'NO_STATE' };

  const timeMatch = input.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!timeMatch) {
    return {
      error: 'INVALID_TIME_FORMAT',
      message: 'Digite o horário no formato HH:MM\n\n💡 _Exemplo: 09:30 ou 14:45_'
    };
  }

  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return {
      error: 'INVALID_TIME',
      message: 'Horário inválido. Horas devem ser 0-23 e minutos 0-59.'
    };
  }

  // Criar novo timestamp mantendo a data original
  const oldTimestamp = new Date(state.selectedCheckin.timestamp);
  const newTimestamp = new Date(oldTimestamp);
  newTimestamp.setHours(hours, minutes, 0, 0);

  // Atualizar no banco de dados com audit trail
  const result = CheckinDB.editTimestamp(
    state.selectedCheckin.id,
    newTimestamp.toISOString(),
    state.editorUser.id
  );

  if (!result || !result.success) {
    conversationStates.delete(phone);
    return {
      error: 'UPDATE_FAILED',
      message: 'Erro ao atualizar horário. Tente novamente.'
    };
  }

  // Limpar conversação
  conversationStates.delete(phone);

  return {
    success: true,
    user: state.selectedUser,
    checkin: state.selectedCheckin,
    oldTimestamp: oldTimestamp,
    newTimestamp: newTimestamp,
    editorUser: state.editorUser
  };
}

/**
 * Cancela conversação ativa
 */
function cancelConversation(phone) {
  conversationStates.delete(phone);
}

/**
 * Limpa todas as conversações (para testes)
 */
function clearAllConversations() {
  conversationStates.clear();
}

/**
 * ================================================================
 * REPLACE CHECKIN CONVERSATION
 * ================================================================
 */

/**
 * Start replace checkin conversation
 * @param {string} phone - User phone number
 * @param {object} existingCheckin - The existing checkin that was found
 * @param {string} newType - The type user wants to create
 * @param {string} location - Location for new checkin
 */
function startReplaceCheckin(phone, existingCheckin, newType, location = null) {
  conversationStates.set(phone, {
    type: ConversationType.REPLACE_CHECKIN,
    step: 1,
    startedAt: Date.now(),
    existingCheckin,
    newType,
    location
  });

  const existingTime = new Date(existingCheckin.timestamp).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit'
  });

  const typeText = {
    checkin: 'check-in',
    checkout: 'check-out',
    break: 'pausa',
    return: 'retorno'
  };

  return {
    message: `⚠️ *Atenção!*\n\nVocê já tem um registro de *${typeText[existingCheckin.type]}* hoje às ${existingTime}.\n\nO que você deseja fazer?\n\n1️⃣ Substituir pelo novo horário\n2️⃣ Manter o registro atual\n\n💡 _Responda com 1 ou 2_`,
    waitingInput: true
  };
}

/**
 * Process replace checkin - Step 1: User chooses to replace or keep
 */
function processReplaceCheckin_Step1(phone, input) {
  const state = conversationStates.get(phone);
  if (!state) return { error: 'NO_STATE' };

  const choice = input.trim();

  if (choice === '1') {
    // User wants to replace
    conversationStates.delete(phone);
    return {
      replace: true,
      existingCheckinId: state.existingCheckin.id,
      newType: state.newType,
      location: state.location
    };
  } else if (choice === '2') {
    // User wants to keep existing
    conversationStates.delete(phone);
    const existingTime = new Date(state.existingCheckin.timestamp).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      replace: false,
      message: `✅ *Registro mantido*\n\nSeu registro de *${state.existingCheckin.type}* às ${existingTime} foi mantido.`
    };
  } else {
    return {
      error: 'INVALID_CHOICE',
      message: '❌ *Opção inválida*\n\nPor favor, responda:\n\n1️⃣ Substituir pelo novo horário\n2️⃣ Manter o registro atual'
    };
  }
}

module.exports = {
  ConversationType,
  isInConversation,
  getConversationState,
  startSearchUser,
  processSearchUser_Step1,
  processSearchUser_Step2,
  startSetHours,
  processSetHours_Step1,
  processSetHours_Step2,
  processSetHours_Step3,
  startEditCategory,
  processEditCategory_Step1,
  processEditCategory_Step2,
  processEditCategory_Step3,
  startEditHours,
  processEditHours_Step3,
  processEditHours_Step4,
  processEditHours_Step5,
  startReplaceCheckin,
  processReplaceCheckin_Step1,
  cancelConversation,
  clearAllConversations
};
