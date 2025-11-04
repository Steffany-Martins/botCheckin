const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'data', 'botcheckin.db');

// ensure directory
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_FILE);

function init() {
  // users: id, name, phone (unique), role (staff|manager|supervisor), supervisor_id, active, password
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

  // seed minimal users if none exist
  const r = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (r.c === 0) {
    const insert = db.prepare('INSERT INTO users (name, phone, role, supervisor_id, active) VALUES (?, ?, ?, ?, 1)');
    // manager
    insert.run('Alice Manager', '+15550000001', 'manager', null);
    // staff member with manager as supervisor
    insert.run('Bob Staff', '+15550000002', 'staff', 1);
    // supervisor role
    insert.run('Carol Supervisor', '+15550000003', 'supervisor', null);
    // another staff under Carol
    insert.run('Dave Staff', '+15550000004', 'staff', 3);
  }
}

init();

module.exports = db;
