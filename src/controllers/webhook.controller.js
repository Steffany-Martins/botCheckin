const { normalizePhone, twimlMessage } = require('../utils/helpers');
const { UserDB } = require('../services/database.service');
const authService = require('../services/auth.service');
const checkinService = require('../services/checkin.service');
const { MessageTemplates, getMenuForRole } = require('../services/whatsapp.service');

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
    '2': 'SEARCH',
    '3': 'EDIT_TIME',
    '4': 'MY_CHECKIN',
    '5': 'STATUS',
    '6': 'LOGOUT'
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

  const confirmMsg = MessageTemplates.checkinConfirmation(action.toLowerCase(), location);
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

  // Handle REGISTER command
  if (cmd === 'REGISTER') {
    return handleRegister(req, res, from, tokens);
  }

  // Check if user exists
  let user = UserDB.findByPhone(from);
  if (!user) {
    const message = MessageTemplates.registrationHelp();
    return res.type('text/xml').send(twimlMessage(message));
  }

  // Handle LOGIN command
  if (cmd === 'LOGIN') {
    return handleLogin(req, res, user, from, tokens);
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
