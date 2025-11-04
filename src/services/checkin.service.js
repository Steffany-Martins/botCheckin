const { CheckinDB, UserDB } = require('./database.service');
const { sendWhatsAppMessage, MessageTemplates } = require('./whatsapp.service');

/**
 * Record a checkin and notify supervisor if applicable
 */
async function recordCheckin(user, type, location = null) {
  // Create checkin record
  const checkinId = CheckinDB.create(user.id, type, location);

  // Notify supervisor if exists
  if (user.supervisor_id) {
    const supervisor = UserDB.findById(user.supervisor_id);
    if (supervisor) {
      const timestamp = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
      });

      const message = MessageTemplates.supervisorNotification(
        user.name,
        type,
        timestamp,
        location
      );

      await sendWhatsAppMessage(supervisor.phone, message);
      console.log(`Notified supervisor ${supervisor.name} (${supervisor.phone}): ${user.name} fez ${type}`);
    }
  }

  return checkinId;
}

/**
 * Get user's checkin history
 */
function getUserHistory(userId, limit = 10) {
  return CheckinDB.getUserHistory(userId, limit);
}

/**
 * Get all users with their schedules
 */
function getAllSchedules() {
  return UserDB.getAllWithCheckins();
}

/**
 * Search users by query
 */
function searchUsers(query, limit = 15) {
  return UserDB.search(query, limit);
}

/**
 * Get team members status for supervisor
 */
function getTeamStatus(supervisorId) {
  return UserDB.getTeamMembers(supervisorId);
}

/**
 * Get team history for supervisor
 */
function getTeamHistory(supervisorId, limit = 20) {
  return UserDB.getTeamHistory(supervisorId, limit);
}

/**
 * Update checkin timestamp (manager only)
 */
function updateCheckinTime(checkinId, newTimestamp) {
  try {
    const result = CheckinDB.updateTimestamp(checkinId, newTimestamp);
    return {
      success: result.changes > 0,
      changes: result.changes
    };
  } catch (err) {
    return {
      success: false,
      error: 'INVALID_FORMAT'
    };
  }
}

/**
 * Delete checkin (manager only)
 */
function deleteCheckin(checkinId) {
  const result = CheckinDB.delete(checkinId);
  return {
    success: result.changes > 0,
    changes: result.changes
  };
}

/**
 * Add manual checkin (manager only)
 */
function addManualCheckin(userId, type, timestamp, location = null) {
  try {
    CheckinDB.createManual(userId, type.toLowerCase(), timestamp, location);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: 'INVALID_DATA'
    };
  }
}

module.exports = {
  recordCheckin,
  getUserHistory,
  getAllSchedules,
  searchUsers,
  getTeamStatus,
  getTeamHistory,
  updateCheckinTime,
  deleteCheckin,
  addManualCheckin
};
