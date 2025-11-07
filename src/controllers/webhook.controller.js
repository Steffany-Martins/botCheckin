const { normalizePhone, twimlMessage } = require('../utils/helpers');
const { UserDB } = require('../services/database.service');
const authService = require('../services/auth.service');
const checkinService = require('../services/checkin.service');
const registrationService = require('../services/registration.service');
const conversationService = require('../services/conversation.service');
const { MessageTemplates, getMenuForRole, getNavigationFooter } = require('../services/whatsapp.service');
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
    '9': 'MENU',
    '0': 'LOGOUT'
  },
  manager: {
    '1': 'CHECKIN',
    '2': 'BREAK',
    '3': 'RETURN',
    '4': 'CHECKOUT',
    '5': 'STAT',
    '6': 'ALL_SCHEDULES',
    '7': 'SEARCH_USER',
    '8': 'SET_HOURS',
    '9': 'EDIT_CATEGORY',
    '10': 'EDIT_HOURS',
    '0': 'LOGOUT'
  },
  supervisor: {
    '1': 'CHECKIN',
    '2': 'BREAK',
    '3': 'RETURN',
    '4': 'CHECKOUT',
    '5': 'TEAM_ACTIVE',
    '6': 'TEAM_HISTORY',
    '7': 'EDIT_HOURS',
    '8': 'STAT',
    '9': 'MENU',
    '0': 'LOGOUT'
  }
};

/**
 * Parse incoming message and determine action
 */
function parseCommand(body, userRole) {
  const tokens = body.split(/\s+/);
  const cmd = tokens[0] ? tokens[0].toUpperCase() : '';

  // Check if it's a numeric menu option (supports 0-10 and 9 for menu)
  const trimmedBody = body.trim();
  if (/^[0-9]+$/i.test(trimmedBody)) {
    const commandMap = COMMAND_MAP[userRole] || COMMAND_MAP.staff;
    const key = trimmedBody;
    return {
      action: commandMap[key],
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
  const result = await authService.loginUser(user, from, password);

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

  // Extract GPS coordinates from Twilio request (optional)
  const latitude = req.body.Latitude ? parseFloat(req.body.Latitude) : null;
  const longitude = req.body.Longitude ? parseFloat(req.body.Longitude) : null;

  // Record check-in with optional GPS verification
  const result = await checkinService.recordCheckin(user, action.toLowerCase(), location, latitude, longitude);

  // Build confirmation message with GPS info if available
  let confirmMsg = MessageTemplates.checkinConfirmation(action.toLowerCase(), location, user.name);

  if (latitude && longitude) {
    const gpsInfo = result.locationVerified
      ? `\n\n✅ *Local verificado* (${result.distance}m do restaurante)`
      : `\n\n⚠️ *Atenção:* Você está ${result.distance}m do restaurante (máx: 200m)`;

    confirmMsg = confirmMsg + gpsInfo;
  }

  // Buscar histórico recente atualizado (últimos 5 registros)
  const historyResult = await checkinService.getUserHistory(user.id, 5);
  const recentHistory = MessageTemplates.recentHistory(historyResult.records);

  res.type('text/xml').send(twimlMessage(confirmMsg + '\n\n' + recentHistory + getNavigationFooter()));
}

/**
 * Handle stat/history request
 */
async function handleStat(req, res, user) {
  const result = await checkinService.getUserHistory(user.id);
  const historyMsg = MessageTemplates.userHistory(result.records, result.hasMore);
  res.type('text/xml').send(twimlMessage(historyMsg + getNavigationFooter()));
}

/**
 * Handle all schedules request (manager)
 */
async function handleAllSchedules(req, res, user) {
  const groups = await checkinService.getAllSchedules();
  const scheduleMsg = MessageTemplates.allSchedules(groups);
  res.type('text/xml').send(twimlMessage(scheduleMsg + getNavigationFooter()));
}

/**
 * Handle search request (manager)
 */
async function handleSearch(req, res, user, tokens) {
  const query = tokens.slice(1).join(' ');

  if (!query) {
    const errorMsg = MessageTemplates.errors.searchFormat();
    return res.type('text/xml').send(twimlMessage(errorMsg + getNavigationFooter()));
  }

  const users = await checkinService.searchUsers(query);
  const searchMsg = MessageTemplates.searchResults(users);
  res.type('text/xml').send(twimlMessage(searchMsg + getNavigationFooter()));
}

/**
 * Handle team active status (supervisor)
 */
async function handleTeamActive(req, res, user) {
  const members = await checkinService.getTeamStatus(user.id);
  const teamMsg = MessageTemplates.teamActive(members);
  res.type('text/xml').send(twimlMessage(teamMsg + getNavigationFooter()));
}

/**
 * Handle team history (supervisor)
 */
async function handleTeamHistory(req, res, user) {
  const records = await checkinService.getTeamHistory(user.id);
  const historyMsg = MessageTemplates.teamHistory(records);
  res.type('text/xml').send(twimlMessage(historyMsg + getNavigationFooter()));
}

/**
 * Handle edit time request (manager)
 */
async function handleEditTime(req, res, user, tokens) {
  const checkinId = tokens[1];
  const newTime = tokens.slice(2).join(' ');

  if (!checkinId || !newTime) {
    const errorMsg = MessageTemplates.errors.editTimeFormat();
    return res.type('text/xml').send(twimlMessage(errorMsg + getNavigationFooter()));
  }

  const result = await checkinService.updateCheckinTime(checkinId, newTime);

  if (result.error === 'INVALID_FORMAT') {
    const errorMsg = MessageTemplates.errors.updateError();
    return res.type('text/xml').send(twimlMessage(errorMsg + getNavigationFooter()));
  }

  const message = result.success
    ? MessageTemplates.errors.updateSuccess(checkinId)
    : MessageTemplates.errors.updateFailed();

  res.type('text/xml').send(twimlMessage(message + getNavigationFooter()));
}

/**
 * Handle delete checkin (manager)
 */
async function handleDelete(req, res, user, tokens) {
  const checkinId = tokens[1];

  if (!checkinId) {
    const errorMsg = MessageTemplates.errors.deleteFormat();
    return res.type('text/xml').send(twimlMessage(errorMsg + getNavigationFooter()));
  }

  const result = await checkinService.deleteCheckin(checkinId);

  const message = result.success
    ? MessageTemplates.errors.deleteSuccess(checkinId)
    : MessageTemplates.errors.deleteFailed();

  res.type('text/xml').send(twimlMessage(message + getNavigationFooter()));
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
    return res.type('text/xml').send(twimlMessage(errorMsg + getNavigationFooter()));
  }

  const result = await checkinService.addManualCheckin(userId, type, timestamp, location);

  const message = result.success
    ? MessageTemplates.errors.addSuccess(userId)
    : MessageTemplates.errors.addError();

  res.type('text/xml').send(twimlMessage(message + getNavigationFooter()));
}

/**
 * Handle logout
 */
async function handleLogout(req, res, from) {
  await authService.logoutUser(from);
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
  console.log(`[CONVERSATION] From: ${from}, Body: "${body}", State:`, state);

  if (!state) {
    // Estado não encontrado, enviar menu
    console.log(`[CONVERSATION] No active state found`);
    const menu = getMenuForRole(user.role, user.name);
    return res.type('text/xml').send(twimlMessage(menu));
  }

  console.log(`[CONVERSATION] Type: ${state.type}, Step: ${state.step}`);

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

  if (state.type === 'edit_hours') {
    return handleEditHoursConversation(req, res, from, body, user, state);
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
    const result = await conversationService.processSearchUser_Step1(from, body);

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

    return res.type('text/xml').send(twimlMessage(message + getNavigationFooter()));
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
  console.log(`[SET_HOURS] Step ${state.step}, From: ${from}, Body: "${body}"`);

  if (state.step === 1) {
    // Step 1: Receber nome para busca
    const result = await conversationService.processSetHours_Step1(from, body);
    console.log(`[SET_HOURS] Step 1 result:`, result);

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
    const result = await conversationService.processSetHours_Step2(from, body);
    console.log(`[SET_HOURS] Step 2 result:`, result);

    if (result.error) {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Usuário selecionado - pedir horas
    const message = MessageTemplates.conversation.setHours_askHours(result.user.name);
    console.log(`[SET_HOURS] Step 2 - asking for hours for user: ${result.user.name}`);
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
    await UserDB.updateExpectedHours(result.user.id, result.hours);

    const message = `✅ *Horas Definidas com Sucesso!*\n\n` +
      `👤 *Usuário:* ${result.user.name}\n` +
      `⏰ *Horas Semanais:* ${result.hours}h`;

    return res.type('text/xml').send(twimlMessage(message + getNavigationFooter()));
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
  console.log(`[EDIT_CATEGORY] Step ${state.step}, From: ${from}, Body: "${body}"`);

  if (state.step === 1) {
    // Step 1: Receber nome para busca
    const result = await conversationService.processEditCategory_Step1(from, body);
    console.log(`[EDIT_CATEGORY] Step 1 result:`, result);

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
    const result = await conversationService.processEditCategory_Step2(from, body);
    console.log(`[EDIT_CATEGORY] Step 2 result:`, result);

    if (result.error) {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Usuário selecionado - pedir categorias
    const currentCategories = result.user.categories ? result.user.categories.split(',') : [];
    const message = MessageTemplates.conversation.editCategory_askCategories(result.user.name, currentCategories);
    console.log(`[EDIT_CATEGORY] Step 2 - asking for categories for user: ${result.user.name}`);
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
    await UserDB.updateCategories(result.user.id, result.categories);

    const categoriesText = result.categories.join(', ');
    const message = `✅ *Categorias Atualizadas!*\n\n` +
      `👤 *Usuário:* ${result.user.name}\n` +
      `🏪 *Novas Categorias:* ${categoriesText}`;

    return res.type('text/xml').send(twimlMessage(message + getNavigationFooter()));
  }

  // Step desconhecido
  conversationService.cancelConversation(from);
  return res.type('text/xml').send(twimlMessage(menu));
}

/**
 * Handle edit hours conversation
 */
async function handleEditHoursConversation(req, res, from, body, user, state) {
  const menu = getMenuForRole(user.role, user.name);

  // Steps 1 and 2: Compartilhados com search user (buscar e selecionar usuário)
  if (state.step === 1) {
    // Step 1: Receber nome para busca
    const result = await conversationService.processSearchUser_Step1(from, body);

    if (result.error === 'SEARCH_TOO_SHORT') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    if (result.error === 'NO_RESULTS') {
      const message = result.message + '\n\nTente novamente ou envie *9️⃣* para voltar ao menu.';
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

    // Usuário selecionado - buscar check-ins e avançar para step 3
    const convState = conversationService.getConversationState(from);
    convState.selectedUser = result.user;
    convState.step = 3;

    // Processar step 3 imediatamente (buscar check-ins)
    const step3Result = conversationService.processEditHours_Step3(from, '');

    if (step3Result.error === 'NO_CHECKINS') {
      const message = step3Result.message;
      return res.type('text/xml').send(twimlMessage(message + '\n\n' + menu));
    }

    // Mostrar check-ins para seleção
    const message = MessageTemplates.conversation.editHours_showCheckins(
      step3Result.user.name,
      step3Result.checkins
    );
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 4) {
    // Step 4: Selecionar check-in da lista
    const result = conversationService.processEditHours_Step4(from, body);

    if (result.error === 'INVALID_SELECTION') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    // Check-in selecionado - pedir novo horário
    const message = MessageTemplates.conversation.editHours_askNewTime(
      result.user.name,
      result.checkin
    );
    return res.type('text/xml').send(twimlMessage(message));
  }

  if (state.step === 5) {
    // Step 5: Processar novo horário
    const result = conversationService.processEditHours_Step5(from, body);

    if (result.error === 'INVALID_TIME_FORMAT' || result.error === 'INVALID_TIME') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message));
    }

    if (result.error === 'UPDATE_FAILED') {
      const message = result.message;
      return res.type('text/xml').send(twimlMessage(message + '\n\n' + menu));
    }

    // Sucesso!
    const message = MessageTemplates.conversation.editHours_success(
      result.user.name,
      result.checkin.type,
      result.oldTimestamp,
      result.newTimestamp,
      result.editorUser.name
    );
    return res.type('text/xml').send(twimlMessage(message + getNavigationFooter()));
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
    await registrationService.startRegistration(from);
    const message = MessageTemplates.registration.step1_welcome();
    return res.type('text/xml').send(twimlMessage(message));
  }

  // 0 = Cancelar (step 1) ou Voltar (steps 2-4)
  if (body === '0') {
    if (state.step === 1) {
      // Step 1: Cancel registration
      registrationService.cancelRegistration(from);
      const message = MessageTemplates.registration.cancelled();
      return res.type('text/xml').send(twimlMessage(message));
    } else {
      // Steps 2-4: Go back
      const result = registrationService.goBackStep(from);

      if (result.error === 'ALREADY_FIRST_STEP') {
        return res.type('text/xml').send(twimlMessage(result.message));
      }

      // Show previous step message
      const updatedState = result.state;
      let message;

      if (updatedState.step === 1) {
        message = MessageTemplates.registration.step1_welcome();
      } else if (updatedState.step === 2) {
        message = MessageTemplates.registration.step2_chooseRole(updatedState.name);
      } else if (updatedState.step === 3) {
        message = MessageTemplates.registration.step3_chooseCategories(updatedState.name, updatedState.role);
      }

      return res.type('text/xml').send(twimlMessage(message));
    }
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
      console.log('📝 Attempting to create staff user:', { name: state.name, phone: from, role: state.role, categories: result.categories });
      const user = await UserDB.create(state.name, from, state.role, null, result.categories);

      if (!user) {
        console.error('❌ Failed to create staff user - check logs above for details');
        const message = '❌ Erro ao criar usuário. O número pode já estar cadastrado ou houve um problema de conexão. Tente novamente ou use outro número.';
        return res.type('text/xml').send(twimlMessage(message));
      }

      console.log('✅ Staff user created successfully:', user.id);

      // Fazer login automaticamente
      await authService.loginUser(user, from);

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
    console.log('📝 Attempting to create user:', { name: state.name, phone: from, role: state.role, categories: state.categories });
    const user = await UserDB.create(state.name, from, state.role, config.adminPassword, state.categories);

    if (!user) {
      console.error('❌ Failed to create user - check logs above for details');
      const message = '❌ Erro ao criar usuário. O número pode já estar cadastrado ou houve um problema de conexão. Tente novamente ou use outro número.';
      return res.type('text/xml').send(twimlMessage(message));
    }

    console.log('✅ User created successfully:', user.id);

    // Fazer login automaticamente
    await authService.loginUser(user, from);

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
  await registrationService.startRegistration(from);
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

  // Handle global navigation with numbers (work from anywhere)
  // 9️⃣ = Menu Principal, 0️⃣ = Back/Cancel (context-dependent)

  // 9 = Menu Principal - return to main menu from anywhere
  if (body === '9') {
    registrationService.cancelRegistration(from);
    conversationService.cancelConversation(from);

    const user = await UserDB.findByPhone(from);
    if (user) {
      const menu = getMenuForRole(user.role, user.name);
      return res.type('text/xml').send(twimlMessage(`📋 *Menu Principal*\n\n${menu}`));
    } else {
      // User not registered yet
      const message = '👋 Ola! Para acessar o menu, você precisa se cadastrar primeiro.\n\nEnvie qualquer mensagem para começar o cadastro.';
      return res.type('text/xml').send(twimlMessage(message));
    }
  }

  // Check if user is in registration process
  if (registrationService.isInRegistrationProcess(from)) {
    return handleRegistrationSteps(req, res, from, body);
  }

  // Handle REGISTER command (old style - kept for compatibility)
  if (cmd === 'REGISTER') {
    return handleRegister(req, res, from, tokens);
  }

  // Check if user exists in Supabase
  let user = await UserDB.findByPhone(from);
  if (!user) {
    // Start new friendly registration process
    const startResult = await registrationService.startRegistration(from);

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
    // Allow "0" to exit conversation and return to menu
    if (body.trim() === '0') {
      conversationService.cancelConversation(from);
      const menu = getMenuForRole(user.role, user.name);
      return res.type('text/xml').send(twimlMessage('❌ Operação cancelada.\n\n' + menu));
    }
    return handleConversationSteps(req, res, from, body, user);
  }

  // Auto-login staff users
  await authService.autoLoginStaff(user, from);

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

  if (userAction === 'EDIT_HOURS') {
    // Start edit hours conversation (manager/supervisor only)
    conversationService.startEditHours(from, user);
    const message = MessageTemplates.conversation.editHours_start();
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

  if (userAction === 'MENU') {
    // Show menu
    const menu = getMenuForRole(user.role, user.name);
    return res.type('text/xml').send(twimlMessage(menu));
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
