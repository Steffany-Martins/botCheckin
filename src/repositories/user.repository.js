/**
 * User Repository
 * Optimized database queries for user-related operations
 * Uses PostgreSQL with proper indexing and prepared statements
 */

const pool = require('../services/database.service').pool;

class UserRepository {
  /**
   * Find user by phone number (optimized with index on phone column)
   * @param {string} phone - Phone number
   * @returns {Promise<Object|null>} User object or null
   */
  async findByPhone(phone) {
    try {
      const result = await pool.query(
        'SELECT id, name, phone, role, categories, password_hash, active, expected_weekly_hours, created_at FROM users WHERE phone = $1 LIMIT 1',
        [phone]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Error finding user by phone:', error);
      return null;
    }
  }

  /**
   * Find user by ID (optimized with primary key)
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(userId) {
    try {
      const result = await pool.query(
        'SELECT id, name, phone, role, categories, active, expected_weekly_hours, created_at FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      return null;
    }
  }

  /**
   * Search users by name (optimized with ILIKE and index on name)
   * @param {string} searchTerm - Search term
   * @param {number} limit - Max results (default 10)
   * @returns {Promise<Array>} Array of users
   */
  async searchByName(searchTerm, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT id, name, phone, role, categories, expected_weekly_hours, active
         FROM users
         WHERE name ILIKE $1
         ORDER BY name ASC
         LIMIT $2`,
        [`%${searchTerm}%`, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error searching users by name:', error);
      return [];
    }
  }

  /**
   * Create new user
   * @param {string} name - User name
   * @param {string} phone - Phone number
   * @param {string} role - User role
   * @param {string|null} passwordHash - Hashed password (for admin roles)
   * @param {Array<string>} categories - Categories
   * @returns {Promise<Object|null>} Created user or null
   */
  async create(name, phone, role, passwordHash = null, categories = []) {
    try {
      const categoriesStr = Array.isArray(categories) ? categories.join(',') : categories;

      const result = await pool.query(
        `INSERT INTO users (name, phone, role, password_hash, categories, active, created_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id, name, phone, role, categories, active, created_at`,
        [name, phone, role, passwordHash, categoriesStr]
      );

      console.log('✅ User created:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating user:', error);
      return null;
    }
  }

  /**
   * Update user's expected weekly hours
   * @param {number} userId - User ID
   * @param {number} hours - Expected weekly hours
   * @returns {Promise<boolean>} Success status
   */
  async updateExpectedHours(userId, hours) {
    try {
      const result = await pool.query(
        'UPDATE users SET expected_weekly_hours = $1 WHERE id = $2',
        [hours, userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error updating expected hours:', error);
      return false;
    }
  }

  /**
   * Update user's categories
   * @param {number} userId - User ID
   * @param {Array<string>} categories - Categories
   * @returns {Promise<boolean>} Success status
   */
  async updateCategories(userId, categories) {
    try {
      const categoriesStr = Array.isArray(categories) ? categories.join(',') : categories;

      const result = await pool.query(
        'UPDATE users SET categories = $1 WHERE id = $2',
        [categoriesStr, userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error updating categories:', error);
      return false;
    }
  }

  /**
   * Get all active users (optimized query)
   * @returns {Promise<Array>} Array of active users
   */
  async getAllActive() {
    try {
      const result = await pool.query(
        'SELECT id, name, phone, role, categories FROM users WHERE active = true ORDER BY name ASC'
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all active users:', error);
      return [];
    }
  }

  /**
   * Deactivate user
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deactivate(userId) {
    try {
      const result = await pool.query(
        'UPDATE users SET active = false WHERE id = $1',
        [userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error deactivating user:', error);
      return false;
    }
  }
}

module.exports = new UserRepository();
