const { normalizePhone, twimlMessage } = require('../utils/helpers');
const { UserDB } = require('../services/database.service');
const authService = require('../services/auth.service');
const checkinService = require('../services/checkin.service');
const registrationService = require('../services/registration.service');
const conversationService = require('../services/conversation.service');
const { MessageTemplates, getMenuForRole } = require('../services/whatsapp.service');
const config = require('../config/env');

/**
 * Command mapping for numeric menu options
 */
const COMMAND_MAP = {
  staff: {
    '1': 'CHECKIN',
    '2': 'BREAK',
    '3': 'RETURN',
    '4': 'CHECKOUT',
    '5': 'STAT',
    '6': 'LOGOUT'
  },
  manager: {
    '1': 'ALL_SCHEDULES',
    '2': 'SEARCH_USER',
    '3': 'SET_HOURS',
    '4': 'EDIT_CATEGORY',
    '5': 'MY_CHECKIN',
    '6': 'STATUS',
    '7': 'LOGOUT'
  },
  supervisor: {
    '1': 'TEAM_ACTIVE',
    '2': 'TEAM_HISTORY',
    '3': 'LOGOUT'
  }
};

/**
 * Parse incoming message and determine action
 */
function parseCommand(body, userRole) {
  const tokens = body.split(/\s+/);
  const cmd = tokens[0] ? tokens[0].toUpperCase() : '';

  // Check if it's a numeric menu option
  if (/^[1-9]$/.test(body) && body.length <= 2) {
    const commandMap = COMMAND_MAP[userRole] || COMMAND_MAP.staff;
    return {
      action: commandMap[body],
      cmd,
      tokens
    };
  }

  // Word command
  return {
    action: cmd,
    cmd,
    tokens
  };
}

/**
 * Handle registration
 */
async function handleRegister(req, res, from, tokens) {
  const name = tokens[1] || ('User' + Date.now());
  const role = (tokens[2] || 'staff').toLowerCase();
  const password = tokens[3] || null;

  const result = authService.registerUser(name, from, role, password);

  if (!result.success) {
    let message;
    if (result.error === 'INVALID_ROLE') {
      message = MessageTemplates.errors.invalidRole();
    } else if (result.error === 'ADMIN_PASSWORD_REQUIRED') {
      message = MessageTemplates.errors.adminPasswordRequired();
    } else {
      message = MessageTemplates.errors.unknownCommand();
    }
    return res.type('text/xml').send(twimlMessage(message));
  }

  const welcomeMsg = MessageTemplates.welcome(result.user.name, result.user.role);
  const menu = getMenuForRole(result.user.role, result.user.name);
  res.type('text/xml').send(twimlMessage(welcomeMsg + '\n\n' + menu));
}

/**
 * Handle login
 */
async function handleLogin(req, res, user, from, tokens) {
  const password = tokens[1];
  const result = authService.loginUser(user, from, password);

  if (!result.success) {
    const message = MessageTemplates.errors.wrongPassword();
    return res.type('text/xml').send(twimlMessage(message));
  }

  const welcomeMsg = MessageTemplates.loginSuccess(user.name);
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(welcomeMsg + '\n\n' + menu));
}

/**
 * Handle checkin actions (CHECKIN, BREAK, RETURN, CHECKOUT)
 */
async function handleCheckinAction(req, res, user, action, tokens) {
  const location = tokens.slice(1).join(' ') || null;
  await checkinService.recordCheckin(user, action.toLowerCase(), location);

  const confirmMsg = MessageTemplates.checkinConfirmation(action.toLowerCase(), location, user.name);
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(confirmMsg + '\n\n' + menu));
}

/**
 * Handle stat/history request
 */
async function handleStat(req, res, user) {
  const records = checkinService.getUserHistory(user.id);
  const historyMsg = MessageTemplates.userHistory(records);
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(historyMsg + '\n\n' + menu));
}

/**
 * Handle all schedules request (manager)
 */
async function handleAllSchedules(req, res, user) {
  const groups = checkinService.getAllSchedules();
  const scheduleMsg = MessageTemplates.allSchedules(groups);
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(scheduleMsg + '\n\n' + menu));
}

/**
 * Handle search request (manager)
 */
async function handleSearch(req, res, user, tokens) {
  const query = tokens.slice(1).join(' ');

  if (!query) {
    const errorMsg = MessageTemplates.errors.searchFormat();
    const menu = getMenuForRole(user.role, user.name);
    return res.type('text/xml').send(twimlMessage(errorMsg + '\n\n' + menu));
  }

  const users = checkinService.searchUsers(query);
  const searchMsg = MessageTemplates.searchResults(users);
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(searchMsg + '\n\n' + menu));
}

/**
 * Handle team active status (supervisor)
 */
async function handleTeamActive(req, res, user) {
  const members = checkinService.getTeamStatus(user.id);
  const teamMsg = MessageTemplates.teamActive(members);
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(teamMsg + '\n\n' + menu));
}

/**
 * Handle team history (supervisor)
 */
async function handleTeamHistory(req, res, user) {
  const records = checkinService.getTeamHistory(user.id);
  const historyMsg = MessageTemplates.teamHistory(records);
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(historyMsg + '\n\n' + menu));
}

/**
 * Handle edit time request (manager)
 */
async function handleEditTime(req, res, user, tokens) {
  const checkinId = tokens[1];
  const newTime = tokens.slice(2).join(' ');

  if (!checkinId || !newTime) {
    const errorMsg = MessageTemplates.errors.editTimeFormat();
    const menu = getMenuForRole(user.role, user.name);
    return res.type('text/xml').send(twimlMessage(errorMsg + '\n\n' + menu));
  }

  const result = checkinService.updateCheckinTime(checkinId, newTime);
  const menu = getMenuForRole(user.role, user.name);

  if (result.error === 'INVALID_FORMAT') {
    const errorMsg = MessageTemplates.errors.updateError();
    return res.type('text/xml').send(twimlMessage(errorMsg + '\n\n' + menu));
  }

  const message = result.success
    ? MessageTemplates.errors.updateSuccess(checkinId)
    : MessageTemplates.errors.updateFailed();

  res.type('text/xml').send(twimlMessage(message + '\n\n' + menu));
}

/**
 * Handle delete checkin (manager)
 */
async function handleDelete(req, res, user, tokens) {
  const checkinId = tokens[1];

  if (!checkinId) {
    const errorMsg = MessageTemplates.errors.deleteFormat();
    const menu = getMenuForRole(user.role, user.name);
    return res.type('text/xml').send(twimlMessage(errorMsg + '\n\n' + menu));
  }

  const result = checkinService.deleteCheckin(checkinId);
  const menu = getMenuForRole(user.role, user.name);

  const message = result.success
    ? MessageTemplates.errors.deleteSuccess(checkinId)
    : MessageTemplates.errors.deleteFailed();

  res.type('text/xml').send(twimlMessage(message + '\n\n' + menu));
}

/**
 * Handle add manual checkin (manager)
 */
async function handleAdd(req, res, user, tokens) {
  const userId = tokens[1];
  const type = tokens[2];
  const timestamp = tokens[3];
  const location = tokens.slice(4).join(' ') || null;

  if (!userId || !type || !timestamp) {
    const errorMsg = MessageTemplates.errors.addFormat();
    const menu = getMenuForRole(user.role, user.name);
    return res.type('text/xml').send(twimlMessage(errorMsg + '\n\n' + menu));
  }

  const result = checkinService.addManualCheckin(userId, type, timestamp, location);
  const menu = getMenuForRole(user.role, user.name);

  const message = result.success
    ? MessageTemplates.errors.addSuccess(userId)
    : MessageTemplates.errors.addError();

  res.type('text/xml').send(twimlMessage(message + '\n\n' + menu));
}

/**
 * Handle logout
 */
async function handleLogout(req, res, from) {
  authService.logoutUser(from);
  const message = MessageTemplates.logout();
  res.type('text/xml').send(twimlMessage(message));
}

/**
 * Handle menu/help request
 */
async function handleMenu(req, res, user) {
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(menu));
}

/**
 * Handle conversation steps process
 */
async function handleConversationSteps(req, res, from, body, user) {
  const state = conversationService.getConversationState(from);

  if (!state) {
    // Estado não encontrado, enviar menu
    const menu = getMenuForRole(user.role, user.name);
    return res.type('text/xml').send(twimlMessage(menu));
  }

  // Permitir cancelamento em qualquer step
  if (body.toUpperCase() === 'CANCELAR') {
    conversationService.cancelConversation(from);
    const message = '❌ Operação cancelada.\n\n';
    const menu = getMenuForRole(user.role, user.name);
    return res.type('text/xml').send(twimlMessage(message + menu));
  }

  // Processar de acordo com o tipo de conversa
  if (state.type === 'search_user') {
    return handleSearchUserConversation(req, res, from, body, user, state);
  }

  if (state.type === 'set_hours') {
    return handleSetHoursConversation(req, res, from, body, user, state);
  }

  if (state.type === 'edit_category') {
    return handleEditCategoryConversation(req, res, from, body, user, state);
  }

  // Tipo desconhecido, cancelar
  conversationService.cancelConversation(from);
  const menu = getMenuForRole(user.role, user.name);
  return res.type('text/xml').send(twimlMessage(menu));
}

/**
 * Handle search user conversation
 */
async function handleSearchUserConversation(req, res, from, body, user, state) {
  const menu = getMenuForRole(user.role, user.name);

  if (state.step === 1) {
    // Step 1: Receber nome para busca
    const result = conversationService.processSearchUser_Step1(from, body);

    if (result.error === 'SEARCH_TOO_SHORT') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    if (result.error === 'NO_RESULTS') {
      const message = result.message + '\n\nTente novamente ou envie *CANCELAR*.';
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Mostrar resultados
    const message = MessageTemplates.conversation.searchUser_results(result.results, result.searchTerm);
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 2) {
    // Step 2: Selecionar usuário da lista
    const result = conversationService.processSearchUser_Step2(from, body);

    if (result.error) {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Usuário selecionado - mostrar informações
    const selectedUser = result.user;
    const categories = selectedUser.categories ? selectedUser.categories.split(',').join(', ') : 'Não definida';
    const hours = selectedUser.expected_weekly_hours || 40;

    const message = `✅ *Usuário Encontrado*\n\n` +
      `👤 *Nome:* ${selectedUser.name}\n` +
      `📱 *Telefone:* ${selectedUser.phone}\n` +
      `👔 *Cargo:* ${selectedUser.role === 'manager' ? 'Gerente' : selectedUser.role === 'supervisor' ? 'Supervisor' : 'Funcionário'}\n` +
      `🏪 *Categorias:* ${categories}\n` +
      `⏰ *Horas Semanais:* ${hours}h\n` +
      `${selectedUser.active ? '🟢 Ativo' : '🔴 Inativo'}`;

    return res.type('text/xml').send(twimlMessage(message + '\n\n' + menu));
  }

  // Step desconhecido
  conversationService.cancelConversation(from);
  return res.type('text/xml').send(twimlMessage(menu));
}

/**
 * Handle set hours conversation
 */
async function handleSetHoursConversation(req, res, from, body, user, state) {
  const menu = getMenuForRole(user.role, user.name);

  if (state.step === 1) {
    // Step 1: Receber nome para busca
    const result = conversationService.processSetHours_Step1(from, body);

    if (result.error === 'SEARCH_TOO_SHORT') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    if (result.error === 'NO_RESULTS') {
      const message = result.message + '\n\nTente novamente ou envie *CANCELAR*.';
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Mostrar resultados
    const message = MessageTemplates.conversation.searchUser_results(result.results, result.searchTerm);
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 2) {
    // Step 2: Selecionar usuário da lista
    const result = conversationService.processSetHours_Step2(from, body);

    if (result.error) {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Usuário selecionado - pedir horas
    const message = MessageTemplates.conversation.setHours_askHours(result.user.name);
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 3) {
    // Step 3: Processar horas
    const result = conversationService.processSetHours_Step3(from, body);

    if (result.error === 'INVALID_HOURS') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Atualizar no banco de dados
    const { UserDB } = require('../services/database.service');
    UserDB.updateExpectedHours(result.userId, result.hours);

    const message = `✅ *Horas Definidas com Sucesso!*\n\n` +
      `👤 *Usuário:* ${result.userName}\n` +
      `⏰ *Horas Semanais:* ${result.hours}h`;

    return res.type('text/xml').send(twimlMessage(message + '\n\n' + menu));
  }

  // Step desconhecido
  conversationService.cancelConversation(from);
  return res.type('text/xml').send(twimlMessage(menu));
}

/**
 * Handle edit category conversation
 */
async function handleEditCategoryConversation(req, res, from, body, user, state) {
  const menu = getMenuForRole(user.role, user.name);

  if (state.step === 1) {
    // Step 1: Receber nome para busca
    const result = conversationService.processEditCategory_Step1(from, body);

    if (result.error === 'SEARCH_TOO_SHORT') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    if (result.error === 'NO_RESULTS') {
      const message = result.message + '\n\nTente novamente ou envie *CANCELAR*.';
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Mostrar resultados
    const message = MessageTemplates.conversation.searchUser_results(result.results, result.searchTerm);
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 2) {
    // Step 2: Selecionar usuário da lista
    const result = conversationService.processEditCategory_Step2(from, body);

    if (result.error) {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Usuário selecionado - pedir categorias
    const message = MessageTemplates.conversation.editCategory_askCategories(result.user.name);
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 3) {
    // Step 3: Processar categorias
    const result = conversationService.processEditCategory_Step3(from, body);

    if (result.error === 'INVALID_CATEGORY') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Atualizar no banco de dados
    const { UserDB } = require('../services/database.service');
    UserDB.updateCategories(result.userId, result.categories);

    const categoriesText = result.categories.join(', ');
    const message = `✅ *Categorias Atualizadas!*\n\n` +
      `👤 *Usuário:* ${result.userName}\n` +
      `🏪 *Novas Categorias:* ${categoriesText}`;

    return res.type('text/xml').send(twimlMessage(message + '\n\n' + menu));
  }

  // Step desconhecido
  conversationService.cancelConversation(from);
  return res.type('text/xml').send(twimlMessage(menu));
}

/**
 * Handle registration steps process
 */
async function handleRegistrationSteps(req, res, from, body) {
  const state = registrationService.getRegistrationState(from);

  if (!state) {
    // Estado não encontrado, iniciar novo registro
    registrationService.startRegistration(from);
    const message = MessageTemplates.registration.step1_welcome();
    return res.type('text/xml').send(twimlMessage(message));
  }

  // Permitir cancelamento em qualquer step
  if (body.toUpperCase() === 'CANCELAR') {
    registrationService.cancelRegistration(from);
    const message = MessageTemplates.registration.cancelled();
    return res.type('text/xml').send(twimlMessage(message));
  }

  // Processar de acordo com o step atual
  if (state.step === 1) {
    // Step 1: Receber nome
    const result = registrationService.processStep1(from, body);

    if (result.error) {
      const message = result.message || MessageTemplates.registration.invalidName();
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Nome aceito, ir para step 2
    const message = MessageTemplates.registration.step2_chooseRole(result.name);
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 2) {
    // Step 2: Escolher cargo
    const result = registrationService.processStep2(from, body);

    if (result.error) {
      const message = result.message || MessageTemplates.registration.invalidRole();
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Cargo aceito, ir para step 3 (categorias)
    const message = MessageTemplates.registration.step3_chooseCategories(state.name, result.role);
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 3) {
    // Step 3: Escolher categorias
    const result = registrationService.processStep3(from, body);

    if (result.error) {
      const message = result.message || MessageTemplates.registration.invalidCategory();
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Se não precisa de senha (staff), completar registro
    if (!result.needsPassword) {
      // Criar usuário no banco
      const user = UserDB.create(state.name, from, state.role, null, result.categories);

      // Fazer login automaticamente
      authService.loginUser(user, from);

      // Limpar estado de registro
      registrationService.completeRegistration(from);

      // Enviar mensagem de boas-vindas
      const welcomeMsg = MessageTemplates.welcome(state.name, state.role, result.categories);
      const menu = getMenuForRole(state.role, state.name);
      return res.type('text/xml').send(twimlMessage(welcomeMsg + '\n\n' + menu));
    }

    // Precisa de senha (admin), ir para step 4
    const message = MessageTemplates.registration.step4_askPassword(state.name, state.role);
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 4) {
    // Step 4: Validar senha (apenas admin)
    const result = registrationService.processStep4(from, body, config.adminPassword);

    if (result.error) {
      const message = result.message || MessageTemplates.registration.wrongPassword();
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Senha correta, criar usuário
    const user = UserDB.create(state.name, from, state.role, config.adminPassword, state.categories);

    // Fazer login automaticamente
    authService.loginUser(user, from);

    // Limpar estado de registro
    registrationService.completeRegistration(from);

    // Enviar mensagem de boas-vindas
    const categoriesArray = Array.isArray(state.categories) ? state.categories : (state.categories ? state.categories.split(',') : []);
    const welcomeMsg = MessageTemplates.welcome(state.name, state.role, categoriesArray);
    const menu = getMenuForRole(state.role, state.name);
    return res.type('text/xml').send(twimlMessage(welcomeMsg + '\n\n' + menu));
  }

  // Step desconhecido, reiniciar processo
  registrationService.cancelRegistration(from);
  registrationService.startRegistration(from);
  const message = MessageTemplates.registration.step1_welcome();
  return res.type('text/xml').send(twimlMessage(message));
}

/**
 * Main webhook handler
 */
async function webhookHandler(req, res) {
  const body = (req.body.Body || '').trim();
  const from = normalizePhone(req.body.From || req.body.from || req.body.FromNumber || '');

  // Validate phone number
  if (!from) {
    const message = MessageTemplates.errors.noPhone();
    return res.type('text/xml').send(twimlMessage(message));
  }

  const { action, cmd, tokens } = parseCommand(body, 'staff');

  // Handle global navigation commands (work from anywhere)
  const upperBody = body.toUpperCase();

  // MENU command - return to main menu from anywhere
  if (upperBody === 'MENU') {
    registrationService.cancelRegistration(from);
    conversationService.cancelConversation(from);

    const user = UserDB.findByPhone(from);
    if (user) {
      const menu = getMenuForRole(user.role, user.name);
      return res.type('text/xml').send(twimlMessage(`📋 *Menu Principal*\n\n${menu}`));
    } else {
      // User not registered yet
      const message = '👋 Olá! Para acessar o menu, você precisa se cadastrar primeiro.\n\nEnvie qualquer mensagem para começar o cadastro.';
      return res.type('text/xml').send(twimlMessage(message));
    }
  }

  // Check if user is in registration process
  if (registrationService.isInRegistrationProcess(from)) {
    return handleRegistrationSteps(req, res, from, body);
  }

  // Handle CANCELAR at any time
  if (cmd === 'CANCELAR') {
    registrationService.cancelRegistration(from);
    conversationService.cancelConversation(from);
    const message = MessageTemplates.registration.cancelled();
    return res.type('text/xml').send(twimlMessage(message));
  }

  // Handle REGISTER command (old style - kept for compatibility)
  if (cmd === 'REGISTER') {
    return handleRegister(req, res, from, tokens);
  }

  // Check if user exists
  let user = UserDB.findByPhone(from);
  if (!user) {
    // Start new friendly registration process
    const startResult = registrationService.startRegistration(from);

    if (startResult.error === 'USER_EXISTS') {
      // Usuário já existe, enviar mensagem amigável
      const existingUser = startResult.user;
      const message = MessageTemplates.registration.userAlreadyExists(existingUser.name, existingUser.role);
      return res.type('text/xml').send(twimlMessage(message));
    }

    const message = MessageTemplates.registration.step1_welcome();
    return res.type('text/xml').send(twimlMessage(message));
  }

  // Handle LOGIN command
  if (cmd === 'LOGIN') {
    return handleLogin(req, res, user, from, tokens);
  }

  // Check if user is in conversation process
  if (conversationService.isInConversation(from)) {
    return handleConversationSteps(req, res, from, body, user);
  }

  // Auto-login staff users
  authService.autoLoginStaff(user, from);

  // Re-parse command with actual user role
  const { action: userAction, tokens: userTokens } = parseCommand(body, user.role);

  // Route to appropriate handler
  if (['CHECKIN', 'BREAK', 'RETURN', 'CHECKOUT'].includes(userAction)) {
    return handleCheckinAction(req, res, user, userAction, userTokens);
  }

  if (userAction === 'STAT' || userAction === 'MY_CHECKIN') {
    return handleStat(req, res, user);
  }

  if (userAction === 'ALL_SCHEDULES' || userAction === 'STATUS') {
    return handleAllSchedules(req, res, user);
  }

  if (userAction === 'SEARCH_USER') {
    // Start search user conversation
    conversationService.startSearchUser(from);
    const message = MessageTemplates.conversation.searchUser_start();
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (userAction === 'SET_HOURS') {
    // Start set hours conversation
    conversationService.startSetHours(from);
    const message = MessageTemplates.conversation.setHours_start();
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (userAction === 'EDIT_CATEGORY') {
    // Start edit category conversation
    conversationService.startEditCategory(from);
    const message = MessageTemplates.conversation.editCategory_start();
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (userAction === 'SEARCH') {
    return handleSearch(req, res, user, userTokens);
  }

  if (userAction === 'TEAM_ACTIVE') {
    return handleTeamActive(req, res, user);
  }

  if (userAction === 'TEAM_HISTORY') {
    return handleTeamHistory(req, res, user);
  }

  if (userAction === 'EDIT_TIME') {
    return handleEditTime(req, res, user, userTokens);
  }

  if (cmd === 'DEL' && user.role === 'manager') {
    return handleDelete(req, res, user, userTokens);
  }

  if (cmd === 'ADD' && user.role === 'manager') {
    return handleAdd(req, res, user, userTokens);
  }

  if (userAction === 'LOGOUT') {
    return handleLogout(req, res, from);
  }

  if (userAction === 'MENU' || userAction === 'HELP' || userAction === '') {
    return handleMenu(req, res, user);
  }

  // Unknown command
  const errorMsg = MessageTemplates.errors.unknownCommand();
  const menu = getMenuForRole(user.role, user.name);
  res.type('text/xml').send(twimlMessage(errorMsg + '\n\n' + menu));
}

module.exports = {
  webhookHandler
};
