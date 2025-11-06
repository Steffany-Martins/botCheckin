/**
 * Supabase Database Service - PostgreSQL via Supabase API
 * Fully replaces pg Pool with Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Initialize database tables
 * Note: This is generally managed directly in the Supabase SQL editor.
 */
async function initDatabase() {
  console.log('⚠️ Skipping initDatabase() — manage tables via Supabase SQL Editor.');
}

/**
 * User database operations
 */
const UserDB = {
  async findByPhone(phone) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
    return data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
    return data;
  },

  async create(name, phone, role, password = null, categories = null, expectedWeeklyHours = 40.0) {
    try {
      const categoriesStr = Array.isArray(categories) ? categories.join(',') : categories;
      console.log('🔍 Creating user with:', { name, phone, role, password: password ? '***' : null, categories: categoriesStr });

      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            name,
            phone,
            role,
            password,
            categories: categoriesStr,
            expected_weekly_hours: expectedWeeklyHours
          }
        ])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ User created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error creating user:', error.message);
      return null;
    }
  },

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
  async create(userId, type, location = null) {
    const { data, error } = await supabase
      .from('checkins')
      .insert([{ user_id: userId, type, location }])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating checkin:', error);
      return null;
    }

    return data ? data.id : null;
  },

  async createWithGPS(userId, type, location = null, latitude = null, longitude = null, locationVerified = 1, distanceMeters = null) {
    const { data, error } = await supabase
      .from('checkins')
      .insert([
        { user_id: userId, type, location, latitude, longitude, location_verified: locationVerified, distance_meters: distanceMeters }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating checkin with GPS:', error);
      return null;
    }

    return data ? data.id : null;
  },

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

  async createManual(userId, type, timestamp, location = null) {
    const { data, error } = await supabase
      .from('checkins')
      .insert([{ user_id: userId, type, timestamp, location }])
      .select();

    if (error) {
      console.error('Error creating manual checkin:', error);
      return { changes: 0 };
    }

    return { changes: data ? data.length : 0 };
  },

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

  async editTimestamp(checkinId, newTimestamp, editorUserId) {
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

    const { error } = await supabase
      .from('checkins')
      .update({
        timestamp: newTimestamp,
        edited_by: editorUserId,
        edited_at: now,
        original_timestamp: originalTimestamp
      })
      .eq('id', checkinId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }
};

/**
 * Session database operations
 */
const SessionDB = {
  async isActive(phone) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('phone', phone)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking session:', error);
      return false;
    }

    return !!data;
  },

  async create(userId, phone) {
    const expiresAt = new Date(Date.now() + config.session.expiryHours * 60 * 60 * 1000).toISOString();

    await supabase.from('sessions').delete().eq('phone', phone);

    const { error } = await supabase
      .from('sessions')
      .insert([{ user_id: userId, phone, expires_at: expiresAt }]);

    if (error) {
      console.error('Error creating session:', error);
      return { success: false };
    }

    return { success: true };
  },

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
  initDatabase,
  UserDB,
  CheckinDB,
  SessionDB
};
