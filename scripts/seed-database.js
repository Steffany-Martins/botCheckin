/**
 * Seed Database with Fake Test Employees
 *
 * This script creates fake employees for testing purposes.
 * Run with: node scripts/seed-database.js
 */

const path = require('path');

// Set up database path
process.env.DATABASE_FILE = process.env.DATABASE_FILE || './data/botcheckin.db';

const { UserDB } = require('../src/services/database.service');

// Fake employees data
const fakeEmployees = [
  {
    name: 'João Silva',
    phone: '+5521900000001',
    role: 'staff',
    password: null,
    categories: ['bar', 'restaurante'],
    expectedWeeklyHours: 40
  },
  {
    name: 'Maria Santos',
    phone: '+5521900000002',
    role: 'staff',
    password: null,
    categories: ['restaurante'],
    expectedWeeklyHours: 40
  },
  {
    name: 'Pedro Costa',
    phone: '+5521900000003',
    role: 'staff',
    password: null,
    categories: ['padaria', 'cafe'],
    expectedWeeklyHours: 30
  },
  {
    name: 'Ana Oliveira',
    phone: '+5521900000004',
    role: 'staff',
    password: null,
    categories: ['bar'],
    expectedWeeklyHours: 40
  },
  {
    name: 'Carlos Mendes',
    phone: '+5521900000005',
    role: 'staff',
    password: null,
    categories: ['lanchonete'],
    expectedWeeklyHours: 35
  },
  {
    name: 'Juliana Lima',
    phone: '+5521900000006',
    role: 'staff',
    password: null,
    categories: ['restaurante', 'bar'],
    expectedWeeklyHours: 44
  },
  {
    name: 'Roberto Alves',
    phone: '+5521900000007',
    role: 'staff',
    password: null,
    categories: ['padaria'],
    expectedWeeklyHours: 40
  },
  {
    name: 'Fernanda Rocha',
    phone: '+5521900000008',
    role: 'staff',
    password: null,
    categories: ['cafe', 'lanchonete'],
    expectedWeeklyHours: 32
  },
  {
    name: 'Lucas Ferreira',
    phone: '+5521900000009',
    role: 'supervisor',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    categories: ['restaurante', 'bar'],
    expectedWeeklyHours: 44
  },
  {
    name: 'Patricia Gomes',
    phone: '+5521900000010',
    role: 'supervisor',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    categories: ['padaria', 'cafe'],
    expectedWeeklyHours: 44
  }
];

/**
 * Seed the database
 */
function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  let created = 0;
  let skipped = 0;

  fakeEmployees.forEach((employee) => {
    try {
      // Check if user already exists
      const existing = UserDB.findByPhone(employee.phone);

      if (existing) {
        console.log(`⏭️  Skipping ${employee.name} (${employee.phone}) - already exists`);
        skipped++;
        return;
      }

      // Create user
      const user = UserDB.create(
        employee.name,
        employee.phone,
        employee.role,
        employee.password,
        employee.categories,
        employee.expectedWeeklyHours
      );

      if (user) {
        const roleEmoji = employee.role === 'supervisor' ? '👨‍💼' : '👤';
        const categoriesStr = Array.isArray(employee.categories)
          ? employee.categories.join(', ')
          : employee.categories;

        console.log(`✅ ${roleEmoji} Created: ${employee.name}`);
        console.log(`   📱 Phone: ${employee.phone}`);
        console.log(`   👔 Role: ${employee.role}`);
        console.log(`   🏪 Categories: ${categoriesStr}`);
        console.log(`   ⏰ Hours: ${employee.expectedWeeklyHours}h/week\n`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error creating ${employee.name}:`, error.message);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Seeding complete!`);
  console.log(`   Created: ${created} users`);
  console.log(`   Skipped: ${skipped} users (already exist)`);
  console.log(`   Total: ${created + skipped} users processed`);
  console.log('='.repeat(50) + '\n');

  // Show all users
  console.log('📋 Current users in database:\n');
  const allUsers = UserDB.all();
  allUsers.forEach((user, index) => {
    const roleEmoji = user.role === 'manager' ? '👔' : user.role === 'supervisor' ? '👨‍💼' : '👤';
    const categoriesStr = user.categories || 'None';
    console.log(`${index + 1}. ${roleEmoji} ${user.name} (${user.phone})`);
    console.log(`   Role: ${user.role} | Categories: ${categoriesStr} | Hours: ${user.expected_weekly_hours || 40}h`);
  });

  console.log(`\n📊 Total users in database: ${allUsers.length}\n`);
}

// Run seeding
try {
  seedDatabase();
  console.log('✅ Database seeding completed successfully!\n');
} catch (error) {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
}
