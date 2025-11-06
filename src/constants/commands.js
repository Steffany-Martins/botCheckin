/**
 * Command Constants
 * Centralized command mappings for different user roles
 */

/**
 * Available commands for each role
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
 * Global commands that work regardless of context
 */
const GLOBAL_COMMANDS = {
  MENU: '9',
  BACK_CANCEL: '0',
  REGISTER: 'REGISTER',
  LOGIN: 'LOGIN'
};

/**
 * Conversation types
 */
const CONVERSATION_TYPE = {
  SEARCH_USER: 'search_user',
  SET_HOURS: 'set_hours',
  EDIT_CATEGORY: 'edit_category',
  EDIT_HOURS: 'edit_hours'
};

/**
 * Registration steps
 */
const REGISTRATION_STEP = {
  NAME: 1,
  ROLE: 2,
  CATEGORIES: 3,
  PASSWORD: 4
};

/**
 * User roles
 */
const USER_ROLE = {
  STAFF: 'staff',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor'
};

/**
 * Checkin types
 */
const CHECKIN_TYPE = {
  CHECKIN: 'checkin',
  BREAK: 'break',
  RETURN: 'return',
  CHECKOUT: 'checkout'
};

/**
 * Category mappings
 */
const CATEGORY_MAP = {
  '1': 'bar',
  '2': 'restaurante',
  '3': 'padaria',
  '4': 'outro'
};

/**
 * Role mappings for registration
 */
const ROLE_MAP = {
  '1': USER_ROLE.STAFF,
  '2': USER_ROLE.MANAGER,
  '3': USER_ROLE.SUPERVISOR
};

module.exports = {
  COMMAND_MAP,
  GLOBAL_COMMANDS,
  CONVERSATION_TYPE,
  REGISTRATION_STEP,
  USER_ROLE,
  CHECKIN_TYPE,
  CATEGORY_MAP,
  ROLE_MAP
};
