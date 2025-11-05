/**
 * Switch back to SQLite (rollback)
 * This script restores the SQLite database service
 */

const fs = require('fs');
const path = require('path');

const SERVICE_DIR = path.join(__dirname, '..', 'src', 'services');
const SQLITE_FILE = path.join(SERVICE_DIR, 'database.service.js');
const BACKUP_FILE = path.join(SERVICE_DIR, 'database.service.sqlite.backup.js');

console.log('🔄 Rolling back to SQLite database...\n');

try {
  // Check if backup exists
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('❌ SQLite backup file not found:', BACKUP_FILE);
    console.error('Cannot rollback without backup.');
    process.exit(1);
  }

  // Restore SQLite version
  fs.copyFileSync(BACKUP_FILE, SQLITE_FILE);
  console.log('✅ Restored SQLite version from backup');

  console.log('\n✅ Rollback completed successfully!');
  console.log('\nThe application is now using SQLite again.\n');

} catch (error) {
  console.error('❌ Error during rollback:', error.message);
  process.exit(1);
}
