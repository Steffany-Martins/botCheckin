/**
 * Conversation Service - Gerencia conversações interativas guiadas
 * Sem comandos complexos - apenas números e respostas simples
 */

const { UserDB } = require('./database.service');

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
  EDIT_CATEGORY: 'edit_category'
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
function processSearchUser_Step1(phone, input) {
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
  const results = UserDB.searchByName(searchTerm, 10);

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
 * Processa definição de horas - Steps compartilham busca com searchUser
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
    '4': 'cafe',
    '5': 'lanchonete',
    '6': 'outro'
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

module.exports = {
  ConversationType,
  isInConversation,
  getConversationState,
  startSearchUser,
  processSearchUser_Step1,
  processSearchUser_Step2,
  startSetHours,
  processSetHours_Step3,
  startEditCategory,
  processEditCategory_Step3,
  cancelConversation,
  clearAllConversations
};
