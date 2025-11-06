/**
 * Supabase Database Service - PostgreSQL
 * Replaces SQLite with cloud-based Supabase PostgreSQL
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// For direct PostgreSQL queries (when needed)
const { Pool } = require('pg');
const dns = require('dns');

// Force IPv4 resolution to avoid IPv6 connection issues
dns.setDefaultResultOrder('ipv4first');

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000, // Increased timeout for pooler
});

/**
 * Initialize database tables
 */
async function initDatabase() {
  try {
    const client = await pool.connect();

    // Create tables with PostgreSQL syntax
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        supervisor_id INTEGER,
        active INTEGER DEFAULT 1,
        password TEXT,
        categories TEXT,
        expected_weekly_hours REAL DEFAULT 40.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        location TEXT,
        edited_by INTEGER,
        edited_at TIMESTAMP,
        original_timestamp TIMESTAMP,
        latitude REAL,
        longitude REAL,
        location_verified INTEGER DEFAULT 1,
        distance_meters INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        phone TEXT NOT NULL,
        logged_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone);
    `);

    client.release();
    console.log('✅ Supabase tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Supabase tables:', error);
    throw error;
  }
}

/**
 * User database operations
 */
const UserDB = {
  /**
   * Find user by phone number
   */
  async findByPhone(phone) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE phone = $1',
        [phone]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  },

  /**
   * Create a new user
   */
  async create(name, phone, role, password = null, categories = null, expectedWeeklyHours = 40.0) {
    try {
      const categoriesStr = Array.isArray(categories) ? categories.join(',') : categories;

      console.log('🔍 Creating user with:', { name, phone, role, password: password ? '***' : null, categories: categoriesStr, expectedWeeklyHours });

      const result = await pool.query(
        `INSERT INTO users (name, phone, role, password, categories, expected_weekly_hours)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, phone, role, password, categoriesStr, expectedWeeklyHours]
      );

      console.log('✅ User created successfully:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating user:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   Detail:', error.detail);
      console.error('   Stack:', error.stack);
      console.error('   Parameters:', JSON.stringify({ name, phone, role, password: password ? '***' : null, categories, expectedWeeklyHours }));
      console.error('   Full error:', JSON.stringify(error, null, 2));
      return null;
    }
  },

  /**
   * Update user categories
   */
  async updateCategories(userId, categories) {
    const categoriesStr = Array.isArray(categories) ? categories.join(',') : categories;

    const { data, error } = await supabase
      .from('users')
      .update({ categories: categoriesStr })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating categories:', error);
      return { changes: 0 };
    }

    return { changes: data ? data.length : 0 };
  },

  /**
   * Update expected weekly hours
   */
  async updateExpectedHours(userId, hours) {
    const { data, error } = await supabase
      .from('users')
      .update({ expected_weekly_hours: hours })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating hours:', error);
      return { changes: 0 };
    }

    return { changes: data ? data.length : 0 };
  },

  /**
   * Search users by name or phone
   */
  async search(query, limit = 15) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role, active, categories, expected_weekly_hours')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Search users by name only (for managers/supervisors)
   */
  async searchByName(query, limit = 15) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role, active, categories, expected_weekly_hours')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching by name:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all users
   */
  async all() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error getting all users:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all users with their recent check-ins
   */
  async getAllWithCheckins() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        phone,
        role,
        expected_weekly_hours,
        checkins (
          id,
          type,
          timestamp,
          location
        )
      `)
      .order('timestamp', { foreignTable: 'checkins', ascending: false });

    if (error) {
      console.error('Error getting users with checkins:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get team members for supervisor
   */
  async getTeamMembers(supervisorId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .eq('active', 1);

    if (error) {
      console.error('Error getting team members:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get team history for supervisor
   */
  async getTeamHistory(supervisorId, limit = 20) {
    const { data: teamMembers, error: teamError } = await supabase
      .from('users')
      .select('id')
      .eq('supervisor_id', supervisorId);

    if (teamError || !teamMembers) {
      console.error('Error getting team members:', teamError);
      return [];
    }

    const memberIds = teamMembers.map(m => m.id);

    const { data, error } = await supabase
      .from('checkins')
      .select(`
        id,
        type,
        timestamp,
        location,
        user_id,
        users (name, phone)
      `)
      .in('user_id', memberIds)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting team history:', error);
      return [];
    }

    return data || [];
  }
};

/**
 * Checkin database operations
 */
const CheckinDB = {
  /**
   * Create a new checkin
   */
  async create(userId, type, location = null) {
    const { data, error } = await supabase
      .from('checkins')
      .insert({
        user_id: userId,
        type,
        location
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating checkin:', error);
      return null;
    }

    return data ? data.id : null;
  },

  /**
   * Create a new checkin with GPS data
   */
  async createWithGPS(userId, type, location = null, latitude = null, longitude = null, locationVerified = 1, distanceMeters = null) {
    try {
      const result = await pool.query(
        `INSERT INTO checkins (user_id, type, location, latitude, longitude, location_verified, distance_meters)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [userId, type, location, latitude, longitude, locationVerified, distanceMeters]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating checkin with GPS:', error);
      return null;
    }
  },

  /**
   * Get user's recent checkins
   */
  async getUserHistory(userId, limit = 10) {
    const { data, error } = await supabase
      .from('checkins')
      .select('id, type, timestamp, location')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting user history:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Update checkin timestamp
   */
  async updateTimestamp(checkinId, newTimestamp) {
    const { data, error } = await supabase
      .from('checkins')
      .update({ timestamp: newTimestamp })
      .eq('id', checkinId)
      .select();

    if (error) {
      console.error('Error updating timestamp:', error);
      return { changes: 0 };
    }

    return { changes: data ? data.length : 0 };
  },

  /**
   * Delete a checkin
   */
  async delete(checkinId) {
    const { data, error } = await supabase
      .from('checkins')
      .delete()
      .eq('id', checkinId)
      .select();

    if (error) {
      console.error('Error deleting checkin:', error);
      return { changes: 0 };
    }

    return { changes: data ? data.length : 0 };
  },

  /**
   * Create manual checkin with custom timestamp
   */
  async createManual(userId, type, timestamp, location = null) {
    const { data, error } = await supabase
      .from('checkins')
      .insert({
        user_id: userId,
        type,
        timestamp,
        location
      })
      .select();

    if (error) {
      console.error('Error creating manual checkin:', error);
      return { changes: 0 };
    }

    return { changes: data ? data.length : 0 };
  },

  /**
   * Get recent checkins across all users
   */
  async getRecent(limit = 20) {
    const { data, error } = await supabase
      .from('checkins')
      .select('id, user_id, type, timestamp, location, latitude, longitude, location_verified, distance_meters')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting recent checkins:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get recent checkins for a specific user
   */
  async getRecentByUser(userId, limit = 10) {
    const { data, error } = await supabase
      .from('checkins')
      .select('id, user_id, type, timestamp, location, latitude, longitude, location_verified, distance_meters, edited_by, edited_at, original_timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting user checkins:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Edit checkin timestamp with audit trail
   */
  async editTimestamp(checkinId, newTimestamp, editorUserId) {
    try {
      // Get original timestamp if not already saved
      const { data: checkin, error: fetchError } = await supabase
        .from('checkins')
        .select('timestamp, original_timestamp')
        .eq('id', checkinId)
        .single();

      if (fetchError || !checkin) {
        return { success: false, error: 'CHECKIN_NOT_FOUND' };
      }

      const originalTimestamp = checkin.original_timestamp || checkin.timestamp;
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('checkins')
        .update({
          timestamp: newTimestamp,
          edited_by: editorUserId,
          edited_at: now,
          original_timestamp: originalTimestamp
        })
        .eq('id', checkinId)
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

/**
 * Session database operations
 */
const SessionDB = {
  /**
   * Check if user has active session
   */
  async isActive(phone) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('phone', phone)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking session:', error);
      return false;
    }

    return !!data;
  },

  /**
   * Create new session
   */
  async create(userId, phone) {
    const expiresAt = new Date(Date.now() + config.session.expiryHours * 60 * 60 * 1000).toISOString();

    // Delete existing sessions first
    await supabase
      .from('sessions')
      .delete()
      .eq('phone', phone);

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        phone,
        expires_at: expiresAt
      })
      .select();

    if (error) {
      console.error('Error creating session:', error);
      return { success: false };
    }

    return { success: true };
  },

  /**
   * Delete session (logout)
   */
  async delete(phone) {
    const { data, error } = await supabase
      .from('sessions')
      .delete()
      .eq('phone', phone)
      .select();

    if (error) {
      console.error('Error deleting session:', error);
      return { changes: 0 };
    }

    return { changes: data ? data.length : 0 };
  },

  /**
   * Clean up expired sessions
   */
  async cleanup() {
    const { data, error } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      console.error('Error cleaning up sessions:', error);
      return { changes: 0 };
    }

    return { changes: data ? data.length : 0 };
  }
};

// Cleanup expired sessions every hour
setInterval(() => {
  SessionDB.cleanup().catch(console.error);
}, 60 * 60 * 1000);

module.exports = {
  supabase,
  pool,
  initDatabase,
  UserDB,
  CheckinDB,
  SessionDB
};
