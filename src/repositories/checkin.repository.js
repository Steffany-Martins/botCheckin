/**
 * Checkin Repository
 * Optimized database queries for checkin operations
 * Uses proper indexing on user_id and timestamp for fast queries
 */

const pool = require('../services/database.service').pool;

class CheckinRepository {
  /**
   * Create check-in record with GPS data
   * @param {number} userId - User ID
   * @param {string} type - Checkin type (checkin, break, return, checkout)
   * @param {string|null} location - Location name
   * @param {number|null} latitude - GPS latitude
   * @param {number|null} longitude - GPS longitude
   * @param {number} locationVerified - 1 if within range, 0 otherwise
   * @param {number|null} distanceMeters - Distance from target location
   * @returns {Promise<number|null>} Created checkin ID or null
   */
  async create(userId, type, location = null, latitude = null, longitude = null, locationVerified = 1, distanceMeters = null) {
    try {
      console.log('📍 Creating checkin with GPS:', { userId, type, location, latitude, longitude, locationVerified, distanceMeters });

      const result = await pool.query(
        `INSERT INTO checkins (user_id, type, location, latitude, longitude, location_verified, distance_meters, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id`,
        [userId, type, location, latitude, longitude, locationVerified, distanceMeters]
      );

      console.log('✅ Checkin created, ID:', result.rows[0].id);
      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Error creating checkin:', error);
      return null;
    }
  }

  /**
   * Get user's recent check-ins (optimized with index on user_id, timestamp)
   * @param {number} userId - User ID
   * @param {number} limit - Max results (default 10)
   * @returns {Promise<Array>} Array of checkin records
   */
  async getRecentByUser(userId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT id, user_id, type, timestamp, location, latitude, longitude, location_verified, distance_meters, edited_by, edited_at
         FROM checkins
         WHERE user_id = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting recent checkins:', error);
      return [];
    }
  }

  /**
   * Get user's check-ins for a specific date range
   * @param {number} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of checkin records
   */
  async getByUserAndDateRange(userId, startDate, endDate) {
    try {
      const result = await pool.query(
        `SELECT id, user_id, type, timestamp, location, latitude, longitude, location_verified, distance_meters, edited_by, edited_at
         FROM checkins
         WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3
         ORDER BY timestamp ASC`,
        [userId, startDate, endDate]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting checkins by date range:', error);
      return [];
    }
  }

  /**
   * Edit checkin timestamp (for managers)
   * @param {number} checkinId - Checkin ID
   * @param {string} newTimestamp - New timestamp (ISO format)
   * @param {number} editorUserId - ID of user making the edit
   * @returns {Promise<boolean>} Success status
   */
  async editTimestamp(checkinId, newTimestamp, editorUserId) {
    try {
      const result = await pool.query(
        `UPDATE checkins
         SET timestamp = $1, edited_by = $2, edited_at = NOW()
         WHERE id = $3`,
        [newTimestamp, editorUserId, checkinId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error editing checkin timestamp:', error);
      return false;
    }
  }

  /**
   * Delete checkin record
   * @param {number} checkinId - Checkin ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(checkinId) {
    try {
      const result = await pool.query(
        'DELETE FROM checkins WHERE id = $1',
        [checkinId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error deleting checkin:', error);
      return false;
    }
  }

  /**
   * Get all schedules grouped by user (optimized for manager view)
   * Uses JOIN to get user data with checkins in single query
   * @param {number} limit - Max users to return
   * @returns {Promise<Array>} Array of user schedules
   */
  async getAllSchedulesGrouped(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT
           u.id as user_id,
           u.name as user_name,
           u.role as user_role,
           u.categories as user_categories,
           json_agg(
             json_build_object(
               'id', c.id,
               'type', c.type,
               'timestamp', c.timestamp,
               'location', c.location
             ) ORDER BY c.timestamp DESC
           ) FILTER (WHERE c.id IS NOT NULL) as checkins
         FROM users u
         LEFT JOIN LATERAL (
           SELECT id, type, timestamp, location
           FROM checkins
           WHERE user_id = u.id
           ORDER BY timestamp DESC
           LIMIT 2
         ) c ON true
         WHERE u.active = true
         GROUP BY u.id, u.name, u.role, u.categories
         ORDER BY u.name ASC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all schedules:', error);
      return [];
    }
  }

  /**
   * Get team's recent checkins (for supervisor)
   * @param {Array<number>} userIds - Array of user IDs in team
   * @param {number} limit - Max results per user
   * @returns {Promise<Array>} Array of checkin records with user names
   */
  async getTeamRecent(userIds, limit = 20) {
    try {
      const result = await pool.query(
        `SELECT
           c.id, c.user_id, c.type, c.timestamp, c.location,
           u.name as user_name
         FROM checkins c
         INNER JOIN users u ON c.user_id = u.id
         WHERE c.user_id = ANY($1)
         ORDER BY c.timestamp DESC
         LIMIT $2`,
        [userIds, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting team checkins:', error);
      return [];
    }
  }

  /**
   * Get last action for each user in team (for team status)
   * Optimized with DISTINCT ON for fast last-action lookup
   * @param {Array<number>} userIds - Array of user IDs
   * @returns {Promise<Array>} Array with last action per user
   */
  async getTeamLastActions(userIds) {
    try {
      const result = await pool.query(
        `SELECT DISTINCT ON (c.user_id)
           c.user_id,
           c.type,
           c.timestamp as last_action,
           u.name as user_name
         FROM checkins c
         INNER JOIN users u ON c.user_id = u.id
         WHERE c.user_id = ANY($1)
         ORDER BY c.user_id, c.timestamp DESC`,
        [userIds]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting team last actions:', error);
      return [];
    }
  }

  /**
   * Get checkin by ID
   * @param {number} checkinId - Checkin ID
   * @returns {Promise<Object|null>} Checkin object or null
   */
  async findById(checkinId) {
    try {
      const result = await pool.query(
        `SELECT id, user_id, type, timestamp, location, latitude, longitude, location_verified, distance_meters, edited_by, edited_at
         FROM checkins
         WHERE id = $1
         LIMIT 1`,
        [checkinId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Error finding checkin by ID:', error);
      return null;
    }
  }
}

module.exports = new CheckinRepository();
