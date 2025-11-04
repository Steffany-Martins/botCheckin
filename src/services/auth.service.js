const config = require('../config/env');
const { UserDB, SessionDB } = require('./database.service');

/**
 * Validate admin password
 */
function validateAdminPassword(password) {
  return password === config.adminPassword;
}

/**
 * Check if user is logged in
 */
function isUserLoggedIn(phone) {
  return SessionDB.isActive(phone);
}

/**
 * Login user
 */
function loginUser(user, phone, password = null) {
  // Check password for admin roles
  if ((user.role === 'manager' || user.role === 'supervisor') && !validateAdminPassword(password)) {
    return { success: false, error: 'WRONG_PASSWORD' };
  }

  SessionDB.create(user.id, phone);
  return { success: true };
}

/**
 * Logout user
 */
function logoutUser(phone) {
  SessionDB.delete(phone);
}

/**
 * Register new user
 */
function registerUser(name, phone, role, password = null) {
  // Validate role
  if (!['staff', 'manager', 'supervisor'].includes(role)) {
    return { success: false, error: 'INVALID_ROLE' };
  }

  // Check admin password for privileged roles
  if ((role === 'manager' || role === 'supervisor') && !validateAdminPassword(password)) {
    return { success: false, error: 'ADMIN_PASSWORD_REQUIRED' };
  }

  // Create user
  const user = UserDB.create(name, phone, role, password);
  if (!user) {
    return { success: false, error: 'USER_EXISTS' };
  }

  // Auto-login
  SessionDB.create(user.id, phone);

  return { success: true, user };
}

/**
 * Auto-login staff users (they don't need password)
 */
function autoLoginStaff(user, phone) {
  if (user.role === 'staff' && !isUserLoggedIn(phone)) {
    SessionDB.create(user.id, phone);
  }
}

module.exports = {
  validateAdminPassword,
  isUserLoggedIn,
  loginUser,
  logoutUser,
  registerUser,
  autoLoginStaff
};
