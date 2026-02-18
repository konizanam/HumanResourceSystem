// test-db.ts
import { pool } from './src/config/database';

async function testDatabase() {
  console.log('🔍 Testing Database Connection...');
  console.log('===============================');
  
  try {
    // Test 1: Basic connection
    console.log('\n1️⃣ Testing basic connection...');
    const result = await pool.query('SELECT NOW() as time');
    console.log('✅ Connected! Server time:', result.rows[0].time);
    
    // Test 2: Check if tables exist
    console.log('\n2️⃣ Checking database tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('⚠️ No tables found. You need to run the schema creation script.');
    } else {
      console.log('✅ Found tables:');
      tables.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }
    
    // Test 3: Check if roles are seeded
    console.log('\n3️⃣ Checking seeded roles...');
    const roles = await pool.query('SELECT name FROM roles');
    if (roles.rows.length > 0) {
      console.log('✅ Roles found:');
      roles.rows.forEach(role => {
        console.log(`   - ${role.name}`);
      });
    } else {
      console.log('⚠️ No roles found. Seed data may not be inserted.');
    }
    
    console.log('\n✅✅✅ Database tests passed! ✅✅✅');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();