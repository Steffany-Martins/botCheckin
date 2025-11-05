/**
 * Migration script: SQLite -> Supabase PostgreSQL
 * Exports all data from SQLite and imports to Supabase
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// SQLite connection
const sqliteDbPath = path.join(__dirname, '..', 'data', 'botcheckin.db');
let sqliteDb;
try {
  sqliteDb = new Database(sqliteDbPath);
  console.log('✅ Connected to SQLite database:', sqliteDbPath);
} catch (error) {
  console.log('⚠️  SQLite database not found. Will create empty Supabase schema.');
  sqliteDb = null;
}

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('✅ Connected to Supabase:', process.env.SUPABASE_URL);

/**
 * Create tables in Supabase
 * NOTE: Tables should be created manually via Supabase Dashboard SQL Editor
 * This function will skip if tables already exist
 */
async function createTables() {
  console.log('\n📋 Checking Supabase tables...');

  // Check if users table exists by trying to query it
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (usersError && usersError.code === '42P01') {
    console.log('\n⚠️  Tables not found in Supabase!');
    console.log('\n📝 Please create tables manually in Supabase SQL Editor:');
    console.log('\n');
    console.log(`
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
    console.log('\nThen run this script again.');
    process.exit(1);
  }

  console.log('  ✅ Tables exist in Supabase');
}

/**
 * Migrate users from SQLite to Supabase
 */
async function migrateUsers() {
  if (!sqliteDb) {
    console.log('⏭️  No SQLite data to migrate for users');
    return {};
  }

  console.log('\n👥 Migrating users...');

  const users = sqliteDb.prepare('SELECT * FROM users').all();

  if (users.length === 0) {
    console.log('  ⏭️  No users to migrate');
    return {};
  }

  console.log(`  Found ${users.length} users`);

  const idMap = {}; // Map old SQLite IDs to new Supabase IDs

  for (const user of users) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: user.name,
        phone: user.phone,
        role: user.role,
        supervisor_id: user.supervisor_id,
        active: user.active,
        password: user.password,
        categories: user.categories,
        expected_weekly_hours: user.expected_weekly_hours || 40.0,
        created_at: user.created_at
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Error migrating user ${user.name}:`, error);
    } else {
      idMap[user.id] = data.id;
      console.log(`  ✅ Migrated: ${user.name} (${user.role}) - Old ID: ${user.id} -> New ID: ${data.id}`);
    }
  }

  return idMap;
}

/**
 * Update supervisor_id references after all users are migrated
 */
async function updateSupervisorReferences(idMap) {
  console.log('\n🔗 Updating supervisor references...');

  const { data: users, error } = await supabase
    .from('users')
    .select('id, phone')
    .not('supervisor_id', 'is', null);

  if (error) {
    console.error('  ❌ Error fetching users:', error);
    return;
  }

  for (const user of users || []) {
    // Find the original supervisor_id from SQLite
    if (!sqliteDb) continue;

    const originalUser = sqliteDb.prepare('SELECT supervisor_id FROM users WHERE phone = ?').get(user.phone);
    if (!originalUser || !originalUser.supervisor_id) continue;

    const newSupervisorId = idMap[originalUser.supervisor_id];
    if (!newSupervisorId) continue;

    const { error: updateError } = await supabase
      .from('users')
      .update({ supervisor_id: newSupervisorId })
      .eq('id', user.id);

    if (updateError) {
      console.error(`  ❌ Error updating supervisor for user ${user.id}:`, updateError);
    } else {
      console.log(`  ✅ Updated supervisor_id for user ${user.id}`);
    }
  }
}

/**
 * Migrate checkins from SQLite to Supabase
 */
async function migrateCheckins(userIdMap) {
  if (!sqliteDb) {
    console.log('⏭️  No SQLite data to migrate for checkins');
    return;
  }

  console.log('\n📊 Migrating checkins...');

  const checkins = sqliteDb.prepare('SELECT * FROM checkins ORDER BY timestamp ASC').all();

  if (checkins.length === 0) {
    console.log('  ⏭️  No checkins to migrate');
    return;
  }

  console.log(`  Found ${checkins.length} checkins`);

  let successCount = 0;
  let errorCount = 0;

  for (const checkin of checkins) {
    const newUserId = userIdMap[checkin.user_id];
    if (!newUserId) {
      console.error(`  ⚠️  Skipping checkin ${checkin.id} - user ${checkin.user_id} not found`);
      errorCount++;
      continue;
    }

    const { error } = await supabase
      .from('checkins')
      .insert({
        user_id: newUserId,
        type: checkin.type,
        timestamp: checkin.timestamp,
        location: checkin.location,
        edited_by: checkin.edited_by ? userIdMap[checkin.edited_by] : null,
        edited_at: checkin.edited_at,
        original_timestamp: checkin.original_timestamp,
        latitude: checkin.latitude,
        longitude: checkin.longitude,
        location_verified: checkin.location_verified !== undefined ? checkin.location_verified : 1,
        distance_meters: checkin.distance_meters
      });

    if (error) {
      console.error(`  ❌ Error migrating checkin ${checkin.id}:`, error);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`  ✅ Migrated ${successCount} checkins successfully`);
  if (errorCount > 0) {
    console.log(`  ⚠️  ${errorCount} checkins failed`);
  }
}

/**
 * Migrate sessions from SQLite to Supabase
 */
async function migrateSessions(userIdMap) {
  if (!sqliteDb) {
    console.log('⏭️  No SQLite data to migrate for sessions');
    return;
  }

  console.log('\n🔐 Migrating sessions...');

  const sessions = sqliteDb.prepare('SELECT * FROM sessions').all();

  if (sessions.length === 0) {
    console.log('  ⏭️  No sessions to migrate');
    return;
  }

  console.log(`  Found ${sessions.length} sessions`);

  let successCount = 0;

  for (const session of sessions) {
    const newUserId = userIdMap[session.user_id];
    if (!newUserId) {
      console.error(`  ⚠️  Skipping session ${session.id} - user ${session.user_id} not found`);
      continue;
    }

    // Only migrate sessions that haven't expired
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      continue; // Skip expired sessions
    }

    const { error } = await supabase
      .from('sessions')
      .insert({
        user_id: newUserId,
        phone: session.phone,
        logged_in_at: session.logged_in_at,
        expires_at: session.expires_at
      });

    if (error) {
      console.error(`  ❌ Error migrating session ${session.id}:`, error);
    } else {
      successCount++;
    }
  }

  console.log(`  ✅ Migrated ${successCount} active sessions`);
}

/**
 * Verify migration
 */
async function verifyMigration() {
  console.log('\n✅ Verifying migration...');

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  const { data: checkins, error: checkinsError } = await supabase
    .from('checkins')
    .select('id', { count: 'exact', head: true });

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true });

  if (!usersError) {
    console.log(`  👥 Users: ${users ? users.length : 0}`);
  }
  if (!checkinsError) {
    console.log(`  📊 Checkins: ${checkins ? checkins.length : 0}`);
  }
  if (!sessionsError) {
    console.log(`  🔐 Sessions: ${sessions ? sessions.length : 0}`);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    console.log('🚀 Starting migration from SQLite to Supabase...\n');

    // Step 1: Create tables
    await createTables();

    // Step 2: Migrate users
    const userIdMap = await migrateUsers();

    // Step 3: Update supervisor references
    await updateSupervisorReferences(userIdMap);

    // Step 4: Migrate checkins
    await migrateCheckins(userIdMap);

    // Step 5: Migrate sessions
    await migrateSessions(userIdMap);

    // Step 6: Verify
    await verifyMigration();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test the Supabase connection: npm run db:test-supabase');
    console.log('   2. Update database.service.js to use Supabase');
    console.log('   3. Backup your SQLite database if needed\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (sqliteDb) {
      sqliteDb.close();
    }
  }
}

// Run migration
migrate();
