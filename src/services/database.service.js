const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config/env');

const DB_FILE = config.database.file;

// Ensure directory exists
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_FILE);

/**
 * Initialize database tables and seed data
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      supervisor_id INTEGER,
      active INTEGER DEFAULT 1,
      password TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      location TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      phone TEXT NOT NULL,
      logged_in_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone);
  `);

  // Seed minimal users if none exist
  const result = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (result.c === 0) {
    const insert = db.prepare('INSERT INTO users (name, phone, role, supervisor_id, active) VALUES (?, ?, ?, ?, 1)');
    insert.run('Alice Manager', '+15550000001', 'manager', null);
    insert.run('Bob Staff', '+15550000002', 'staff', 1);
    insert.run('Carol Supervisor', '+15550000003', 'supervisor', null);
    insert.run('Dave Staff', '+15550000004', 'staff', 3);
  }
}

/**
 * User database operations
 */
const UserDB = {
  /**
   * Find user by phone number
   */
  findByPhone(phone) {
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  },

  /**
   * Find user by ID
   */
  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  /**
   * Create a new user
   */
  create(name, phone, role, password = null) {
    const stmt = db.prepare('INSERT OR IGNORE INTO users (name, phone, role, password) VALUES (?, ?, ?, ?)');
    stmt.run(name, phone, role, password);
    return this.findByPhone(phone);
  },

  /**
   * Search users by name or phone
   */
  search(query, limit = 15) {
    return db.prepare(`
      SELECT id, name, phone, role, active
      FROM users
      WHERE name LIKE '%' || ? || '%' OR phone LIKE '%' || ? || '%'
      LIMIT ?
    `).all(query, query, limit);
  },

  /**
   * Get all users with their recent checkins
   */
  getAllWithCheckins() {
    const rows = db.prepare(`
      SELECT u.id as user_id, u.name, u.phone, u.role,
             c.id as checkin_id, c.type, c.timestamp, c.location
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id
      ORDER BY u.id, c.timestamp DESC
    `).all();

    const map = new Map();
    for (const r of rows) {
      const arr = map.get(r.user_id) || {
        user: { id: r.user_id, name: r.name, phone: r.phone, role: r.role },
        checkins: []
      };
      if (r.checkin_id) {
        arr.checkins.push({
          id: r.checkin_id,
          type: r.type,
          timestamp: r.timestamp,
          location: r.location
        });
      }
      map.set(r.user_id, arr);
    }
    return Array.from(map.values());
  },

  /**
   * Get team members for a supervisor
   */
  getTeamMembers(supervisorId) {
    return db.prepare(`
      SELECT u.name, MAX(c.timestamp) as last_action, c.type
      FROM users u
      LEFT JOIN checkins c ON u.id = c.user_id
      WHERE u.supervisor_id = ? AND u.active = 1
      GROUP BY u.id
      ORDER BY last_action DESC
    `).all(supervisorId);
  },

  /**
   * Get team history for a supervisor
   */
  getTeamHistory(supervisorId, limit = 20) {
    return db.prepare(`
      SELECT u.name, c.type, c.timestamp, c.location
      FROM users u
      JOIN checkins c ON u.id = c.user_id
      WHERE u.supervisor_id = ?
      ORDER BY c.timestamp DESC
      LIMIT ?
    `).all(supervisorId, limit);
  }
};

/**
 * Checkin database operations
 */
const CheckinDB = {
  /**
   * Create a new checkin
   */
  create(userId, type, location = null) {
    const stmt = db.prepare('INSERT INTO checkins (user_id, type, location) VALUES (?, ?, ?)');
    const info = stmt.run(userId, type, location);
    return info.lastInsertRowid;
  },

  /**
   * Get user's recent checkins
   */
  getUserHistory(userId, limit = 10) {
    return db.prepare(`
      SELECT id, type, timestamp, location
      FROM checkins
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(userId, limit);
  },

  /**
   * Update checkin timestamp
   */
  updateTimestamp(checkinId, newTimestamp) {
    const stmt = db.prepare('UPDATE checkins SET timestamp = ? WHERE id = ?');
    return stmt.run(newTimestamp, checkinId);
  },

  /**
   * Delete a checkin
   */
  delete(checkinId) {
    const stmt = db.prepare('DELETE FROM checkins WHERE id = ?');
    return stmt.run(checkinId);
  },

  /**
   * Create manual checkin with custom timestamp
   */
  createManual(userId, type, timestamp, location = null) {
    const stmt = db.prepare('INSERT INTO checkins (user_id, type, timestamp, location) VALUES (?, ?, ?, ?)');
    return stmt.run(userId, type, timestamp, location);
  }
};

/**
 * Session database operations
 */
const SessionDB = {
  /**
   * Check if user has active session
   */
  isActive(phone) {
    const session = db.prepare(`
      SELECT * FROM sessions
      WHERE phone = ? AND datetime(expires_at) > datetime("now")
    `).get(phone);
    return !!session;
  },

  /**
   * Create new session
   */
  create(userId, phone) {
    const expiresAt = new Date(Date.now() + config.session.expiryHours * 60 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM sessions WHERE phone = ?').run(phone);
    db.prepare('INSERT INTO sessions (user_id, phone, expires_at) VALUES (?, ?, ?)').run(userId, phone, expiresAt);
  },

  /**
   * Delete session
   */
  delete(phone) {
    db.prepare('DELETE FROM sessions WHERE phone = ?').run(phone);
  }
};

// Initialize database on module load
initDatabase();

module.exports = {
  db,
  UserDB,
  CheckinDB,
  SessionDB
};
