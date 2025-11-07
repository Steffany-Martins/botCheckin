const { CheckinDB, UserDB } = require('./database.service');
const { sendWhatsAppMessage, MessageTemplates } = require('./whatsapp.service');
const { verifyLocation } = require('../utils/location');
const pdfService = require('./pdf.service');

/**
 * Record a checkin and notify supervisor if applicable
 * @param {object} user - User object
 * @param {string} type - Checkin type (checkin, checkout, break, return)
 * @param {string|null} location - Location text
 * @param {number|null} latitude - GPS latitude (optional)
 * @param {number|null} longitude - GPS longitude (optional)
 */
async function recordCheckin(user, type, location = null, latitude = null, longitude = null) {
  // Verify GPS location if provided
  let locationVerified = 1; // Default to verified if no GPS
  let distanceMeters = null;

  if (latitude && longitude) {
    const verification = verifyLocation(latitude, longitude);
    locationVerified = verification.verified ? 1 : 0;
    distanceMeters = verification.distance;
  }

  // Create checkin record with GPS data
  const checkinId = await CheckinDB.createWithGPS(
    user.id,
    type,
    location,
    latitude,
    longitude,
    locationVerified,
    distanceMeters
  );

  // Notify supervisor if exists
  if (user.supervisor_id) {
    const supervisor = await UserDB.findById(user.supervisor_id);
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

  return {
    checkinId,
    locationVerified: locationVerified === 1,
    distance: distanceMeters
  };
}

/**
 * Get user's checkin history
 */
async function getUserHistory(userId, limit = 50) {
  // Buscar 1 registro a mais para saber se há próxima página
  const records = await CheckinDB.getUserHistory(userId, limit + 1);

  const hasMore = records.length > limit;
  const displayRecords = hasMore ? records.slice(0, limit) : records;

  return {
    records: displayRecords,
    hasMore: hasMore
  };
}

/**
 * Get user's checkin history for today only
 */
async function getTodayHistory(userId) {
  const records = await CheckinDB.getTodayHistory(userId);

  return {
    records: records,
    hasMore: false
  };
}

/**
 * Get all users with their schedules
 */
async function getAllSchedules() {
  return await UserDB.getAllWithCheckins();
}

/**
 * Search users by query
 */
async function searchUsers(query, limit = 15) {
  return await UserDB.search(query, limit);
}

/**
 * Get team members status for supervisor
 */
async function getTeamStatus(supervisorId) {
  return await UserDB.getTeamMembers(supervisorId);
}

/**
 * Get team history for supervisor
 */
async function getTeamHistory(supervisorId, limit = 20) {
  return await UserDB.getTeamHistory(supervisorId, limit);
}

/**
 * Update checkin timestamp (manager only)
 */
async function updateCheckinTime(checkinId, newTimestamp) {
  try {
    const result = await CheckinDB.updateTimestamp(checkinId, newTimestamp);
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
async function deleteCheckin(checkinId) {
  const result = await CheckinDB.delete(checkinId);
  return {
    success: result.changes > 0,
    changes: result.changes
  };
}

/**
 * Add manual checkin (manager only)
 */
async function addManualCheckin(userId, type, timestamp, location = null) {
  try {
    await CheckinDB.createManual(userId, type.toLowerCase(), timestamp, location);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: 'INVALID_DATA'
    };
  }
}

/**
 * Export user's full history as PDF
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Object with filepath or error
 */
async function exportHistoryPDF(userId) {
  try {
    // Get user info
    const user = await UserDB.findById(userId);
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    // Get all history (no limit)
    const records = await CheckinDB.getUserHistory(userId, 1000);

    if (records.length === 0) {
      return { success: false, error: 'NO_RECORDS' };
    }

    // Generate PDF
    const filepath = await pdfService.generateHistoryPDF(user, records);

    return {
      success: true,
      filepath,
      recordCount: records.length
    };
  } catch (error) {
    console.error('❌ Error exporting history to PDF:', error);
    return {
      success: false,
      error: 'PDF_GENERATION_FAILED'
    };
  }
}

module.exports = {
  recordCheckin,
  getUserHistory,
  getTodayHistory,
  getAllSchedules,
  searchUsers,
  getTeamStatus,
  getTeamHistory,
  updateCheckinTime,
  deleteCheckin,
  addManualCheckin,
  exportHistoryPDF
};
