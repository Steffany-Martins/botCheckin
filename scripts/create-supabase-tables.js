/**
 * Create Supabase tables using SQL via Supabase REST API
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function createTables() {
  console.log('🚀 Creating Supabase tables...\n');

  // Read the SQL schema file
  const sqlPath = path.join(__dirname, 'supabase-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('📋 SQL Schema loaded from supabase-schema.sql\n');
  console.log('⚠️  NOTE: This script uses the Supabase JS client which cannot execute raw SQL.');
  console.log('You need to:');
  console.log('  1. Go to your Supabase Dashboard');
  console.log('  2. Navigate to SQL Editor');
  console.log('  3. Copy the contents from scripts/supabase-schema.sql');
  console.log('  4. Paste and run it\n');

  console.log('OR use the Supabase CLI:');
  console.log('  npx supabase db push\n');

  console.log('Once tables are created, run the migration script:');
  console.log('  node scripts/migrate-to-supabase.js\n');

  // Test connection
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase
    .from('users')
    .select('count')
    .limit(1);

  if (error) {
    if (error.message.includes('relation "public.users" does not exist')) {
      console.log('❌ Users table does not exist yet. Please create tables first.\n');
    } else {
      console.error('❌ Error testing connection:', error.message);
    }
  } else {
    console.log('✅ Connection successful! Tables exist.\n');
  }
}

createTables();
