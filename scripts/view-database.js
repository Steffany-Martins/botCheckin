/**
 * View Database Contents
 *
 * This script displays all users and recent check-ins from the database.
 * Run with: node scripts/view-database.js
 */

// Set up database path
process.env.DATABASE_FILE = process.env.DATABASE_FILE || './data/botcheckin.db';

const { UserDB, CheckinDB } = require('../src/services/database.service');

/**
 * Display all users
 */
function displayUsers() {
  console.log('\n' + '='.repeat(60));
  console.log('👥 USERS IN DATABASE');
  console.log('='.repeat(60) + '\n');

  const allUsers = UserDB.all();

  if (allUsers.length === 0) {
    console.log('📭 No users found in database.\n');
    return;
  }

  allUsers.forEach((user, index) => {
    const roleEmoji = user.role === 'manager' ? '👔' : user.role === 'supervisor' ? '👨‍💼' : '👤';
    const statusEmoji = user.active ? '🟢' : '🔴';
    const categoriesStr = user.categories || 'None';

    console.log(`${index + 1}. ${roleEmoji} ${statusEmoji} ${user.name}`);
    console.log(`   📱 Phone: ${user.phone}`);
    console.log(`   👔 Role: ${user.role}`);
    console.log(`   🏪 Categories: ${categoriesStr}`);
    console.log(`   ⏰ Expected Hours: ${user.expected_weekly_hours || 40}h/week`);
    console.log(`   🆔 ID: ${user.id}`);

    if (user.supervisor_id) {
      console.log(`   👨‍💼 Supervisor ID: ${user.supervisor_id}`);
    }

    console.log('');
  });

  console.log(`📊 Total: ${allUsers.length} users\n`);
}

/**
 * Display recent check-ins
 */
function displayRecentCheckins() {
  console.log('='.repeat(60));
  console.log('🕐 RECENT CHECK-INS (Last 20)');
  console.log('='.repeat(60) + '\n');

  try {
    const recentCheckins = CheckinDB.getRecent(20);

    if (recentCheckins.length === 0) {
      console.log('📭 No check-ins found.\n');
      return;
    }

    recentCheckins.forEach((checkin, index) => {
      const typeEmoji = {
        checkin: '🟢',
        checkout: '🔴',
        break: '🟡',
        return: '🔵'
      }[checkin.type] || '⚪';

      console.log(`${index + 1}. ${typeEmoji} ${checkin.type.toUpperCase()}`);
      console.log(`   ⏰ ${checkin.timestamp}`);

      if (checkin.location) {
        console.log(`   📍 Location: ${checkin.location}`);
      }

      if (checkin.latitude && checkin.longitude) {
        console.log(`   🗺️  GPS: ${checkin.latitude}, ${checkin.longitude}`);

        if (checkin.location_verified !== undefined) {
          const verified = checkin.location_verified ? '✅ Verified' : '⚠️  Out of range';
          console.log(`   ${verified} (${checkin.distance_meters || 0}m)`);
        }
      }

      console.log('');
    });

    console.log(`📊 Total: ${recentCheckins.length} check-ins shown\n`);
  } catch (error) {
    console.log('ℹ️  Check-ins table may not exist yet or is empty.\n');
  }
}

/**
 * Display database statistics
 */
function displayStatistics() {
  console.log('='.repeat(60));
  console.log('📈 STATISTICS');
  console.log('='.repeat(60) + '\n');

  const allUsers = UserDB.all();

  // Count by role
  const roleCount = {
    staff: 0,
    supervisor: 0,
    manager: 0
  };

  allUsers.forEach(user => {
    if (roleCount[user.role] !== undefined) {
      roleCount[user.role]++;
    }
  });

  console.log('👥 Users by Role:');
  console.log(`   👤 Staff: ${roleCount.staff}`);
  console.log(`   👨‍💼 Supervisors: ${roleCount.supervisor}`);
  console.log(`   👔 Managers: ${roleCount.manager}`);
  console.log('');

  // Count by categories
  const categoryCount = {};
  allUsers.forEach(user => {
    if (user.categories) {
      const cats = user.categories.split(',');
      cats.forEach(cat => {
        const trimmed = cat.trim();
        categoryCount[trimmed] = (categoryCount[trimmed] || 0) + 1;
      });
    }
  });

  if (Object.keys(categoryCount).length > 0) {
    console.log('🏪 Users by Category:');
    Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        const emoji = {
          bar: '🍺',
          restaurante: '🍽️',
          padaria: '🥖',
          cafe: '☕',
          lanchonete: '🍔',
          outro: '📋'
        }[cat] || '📋';
        console.log(`   ${emoji} ${cat}: ${count}`);
      });
    console.log('');
  }

  // Active vs Inactive
  const activeCount = allUsers.filter(u => u.active).length;
  const inactiveCount = allUsers.length - activeCount;

  console.log('📊 User Status:');
  console.log(`   🟢 Active: ${activeCount}`);
  console.log(`   🔴 Inactive: ${inactiveCount}`);
  console.log('');
}

// Main execution
console.log('\n' + '🗄️  BOT CHECKIN DATABASE VIEWER'.padStart(40));

try {
  displayUsers();
  displayRecentCheckins();
  displayStatistics();

  console.log('='.repeat(60));
  console.log('✅ Database view completed successfully!');
  console.log('='.repeat(60) + '\n');
} catch (error) {
  console.error('❌ Error viewing database:', error);
  process.exit(1);
}
