/**
 * Switch from SQLite to Supabase
 * This script backs up and replaces the database service file
 */

const fs = require('fs');
const path = require('path');

const SERVICE_DIR = path.join(__dirname, '..', 'src', 'services');
const SQLITE_FILE = path.join(SERVICE_DIR, 'database.service.js');
const SUPABASE_FILE = path.join(SERVICE_DIR, 'database.supabase.js');
const BACKUP_FILE = path.join(SERVICE_DIR, 'database.service.sqlite.backup.js');

console.log('🔄 Switching to Supabase database...\n');

try {
  // Check if Supabase file exists
  if (!fs.existsSync(SUPABASE_FILE)) {
    console.error('❌ Supabase service file not found:', SUPABASE_FILE);
    process.exit(1);
  }

  // Backup current SQLite file
  if (fs.existsSync(SQLITE_FILE)) {
    fs.copyFileSync(SQLITE_FILE, BACKUP_FILE);
    console.log('✅ Backed up SQLite version to database.service.sqlite.backup.js');
  }

  // Replace with Supabase version
  fs.copyFileSync(SUPABASE_FILE, SQLITE_FILE);
  console.log('✅ Replaced database.service.js with Supabase version');

  console.log('\n✅ Switch completed successfully!');
  console.log('\nNext steps:');
  console.log('  1. Run tests: npm test');
  console.log('  2. Start server: npm start');
  console.log('\nTo rollback: node scripts/switch-to-sqlite.js\n');

} catch (error) {
  console.error('❌ Error during switch:', error.message);
  process.exit(1);
}
