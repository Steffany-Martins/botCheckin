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
async function isUserLoggedIn(phone) {
  return await SessionDB.isActive(phone);
}

/**
 * Login user
 */
async function loginUser(user, phone, password = null) {
  // Check password for admin roles
  if ((user.role === 'manager' || user.role === 'supervisor') && !validateAdminPassword(password)) {
    return { success: false, error: 'WRONG_PASSWORD' };
  }

  await SessionDB.create(user.id, phone);
  return { success: true };
}

/**
 * Logout user
 */
async function logoutUser(phone) {
  await SessionDB.delete(phone);
}

/**
 * Register new user
 */
async function registerUser(name, phone, role, password = null) {
  // Validate role
  if (!['staff', 'manager', 'supervisor'].includes(role)) {
    return { success: false, error: 'INVALID_ROLE' };
  }

  // Check admin password for privileged roles
  if ((role === 'manager' || role === 'supervisor') && !validateAdminPassword(password)) {
    return { success: false, error: 'ADMIN_PASSWORD_REQUIRED' };
  }

  // Create user
  const user = await UserDB.create(name, phone, role, password);
  if (!user) {
    return { success: false, error: 'USER_EXISTS' };
  }

  // Auto-login
  await SessionDB.create(user.id, phone);

  return { success: true, user };
}

/**
 * Auto-login staff users (they don't need password)
 */
async function autoLoginStaff(user, phone) {
  if (user.role === 'staff' && !(await isUserLoggedIn(phone))) {
    await SessionDB.create(user.id, phone);
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
