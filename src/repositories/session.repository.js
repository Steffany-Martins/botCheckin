/**
 * Session Repository
 * Optimized session management queries
 * Uses index on phone and expires_at for fast lookups
 */

const pool = require('../services/database.service').pool;
const config = require('../config/env');

class SessionRepository {
  /**
   * Check if session is active (optimized with index on phone + expires_at)
   * @param {string} phone - Phone number
   * @returns {Promise<boolean>} True if active session exists
   */
  async isActive(phone) {
    try {
      const result = await pool.query(
        'SELECT 1 FROM sessions WHERE phone = $1 AND expires_at > NOW() LIMIT 1',
        [phone]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Error checking session:', error);
      return false;
    }
  }

  /**
   * Create new session (replaces existing)
   * @param {number} userId - User ID
   * @param {string} phone - Phone number
   * @returns {Promise<boolean>} Success status
   */
  async create(userId, phone) {
    try {
      const expiresAt = new Date(Date.now() + config.session.expiryHours * 60 * 60 * 1000);

      // Delete existing session first
      await pool.query('DELETE FROM sessions WHERE phone = $1', [phone]);

      // Create new session
      await pool.query(
        'INSERT INTO sessions (user_id, phone, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
        [userId, phone, expiresAt]
      );

      console.log('✅ Session created for:', phone);
      return true;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      return false;
    }
  }

  /**
   * Delete session by phone
   * @param {string} phone - Phone number
   * @returns {Promise<boolean>} Success status
   */
  async delete(phone) {
    try {
      const result = await pool.query(
        'DELETE FROM sessions WHERE phone = $1',
        [phone]
      );
      console.log('✅ Session deleted for:', phone);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      return false;
    }
  }

  /**
   * Get session by phone
   * @param {string} phone - Phone number
   * @returns {Promise<Object|null>} Session object or null
   */
  async findByPhone(phone) {
    try {
      const result = await pool.query(
        'SELECT user_id, phone, expires_at, created_at FROM sessions WHERE phone = $1 AND expires_at > NOW() LIMIT 1',
        [phone]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Error finding session:', error);
      return null;
    }
  }

  /**
   * Cleanup expired sessions (scheduled task)
   * Optimized with index on expires_at
   * @returns {Promise<number>} Number of sessions deleted
   */
  async cleanupExpired() {
    try {
      const result = await pool.query(
        'DELETE FROM sessions WHERE expires_at < NOW()'
      );
      if (result.rowCount > 0) {
        console.log('🧹 Cleaned up', result.rowCount, 'expired sessions');
      }
      return result.rowCount || 0;
    } catch (error) {
      console.error('❌ Error cleaning up sessions:', error);
      return 0;
    }
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of sessions deleted
   */
  async deleteAllForUser(userId) {
    try {
      const result = await pool.query(
        'DELETE FROM sessions WHERE user_id = $1',
        [userId]
      );
      return result.rowCount || 0;
    } catch (error) {
      console.error('❌ Error deleting user sessions:', error);
      return 0;
    }
  }

  /**
   * Extend session expiry
   * @param {string} phone - Phone number
   * @param {number} hoursToAdd - Hours to add to expiry
   * @returns {Promise<boolean>} Success status
   */
  async extend(phone, hoursToAdd = 24) {
    try {
      const newExpiry = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
      const result = await pool.query(
        'UPDATE sessions SET expires_at = $1 WHERE phone = $2 AND expires_at > NOW()',
        [newExpiry, phone]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error extending session:', error);
      return false;
    }
  }
}

// Start periodic cleanup (every 2 minutes)
const sessionRepository = new SessionRepository();
setInterval(() => {
  sessionRepository.cleanupExpired();
}, 2 * 60 * 1000);

module.exports = sessionRepository;
