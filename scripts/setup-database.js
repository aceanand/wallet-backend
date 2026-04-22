const pool = require('../config/database');

async function setupDatabase() {
  // First connect to default postgres database to create our database
  const { Pool } = require('pg');
  require('dotenv').config();
  
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    // Check if database exists
    const dbCheck = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'expense_wallet_db']
    );

    if (dbCheck.rows.length === 0) {
      // Create database
      await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME || 'expense_wallet_db'}`);
      console.log(`✓ Database '${process.env.DB_NAME || 'expense_wallet_db'}' created`);
    } else {
      console.log(`✓ Database '${process.env.DB_NAME || 'expense_wallet_db'}' already exists`);
    }
  } catch (error) {
    console.error('Error creating database:', error.message);
  } finally {
    await adminPool.end();
  }

  // Now connect to our database and create tables
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

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
    console.log('\n✅ Database setup completed successfully!');
    console.log('\nYou can now run:');
    console.log('  npm start    (to start the server)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database setup failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase().catch(err => {
  console.error('Setup error:', err);
  process.exit(1);
});
