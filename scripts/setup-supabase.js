const { Pool } = require('pg');
require('dotenv').config();

async function setupSupabase() {
  console.log('🚀 Setting up Supabase database...\n');

  // Connect using DATABASE_URL or individual variables
  const pool = process.env.DATABASE_URL 
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      })
    : new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 6543,
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: {
          rejectUnauthorized: false
        }
      });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('📋 Creating tables...');

    // Create departments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT positive_balance CHECK (balance >= 0)
      )
    `);
    console.log('✓ Table "departments" created');

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        department_id INTEGER NOT NULL REFERENCES departments(id),
        amount DECIMAL(12, 2) NOT NULL,
        description VARCHAR(255),
        user_name VARCHAR(100),
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table "transactions" created');

    // Check if departments already exist
    const deptCheck = await client.query('SELECT COUNT(*) FROM departments');
    
    if (parseInt(deptCheck.rows[0].count) === 0) {
      // Insert sample departments
      await client.query(`
        INSERT INTO departments (name, balance) VALUES
          ('Engineering', 50000.00),
          ('Marketing', 50000.00),
          ('Sales', 50000.00),
          ('Operations', 50000.00)
      `);
      console.log('✓ Sample departments inserted');
    } else {
      console.log('✓ Departments already exist');
    }

    await client.query('COMMIT');
    console.log('\n✅ Supabase database setup completed successfully!');
    console.log('\nYou can now deploy to Railway with this DATABASE_URL');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database setup failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupSupabase().catch(err => {
  console.error('Setup error:', err);
  process.exit(1);
});
