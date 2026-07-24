import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  console.log('Applying database schema...');
  try {
    // Add logic to read config/schema.sql and execute here
    console.log('Schema applied successfully.');
  } catch (error) {
    console.error('Error applying schema:', error);
  } finally {
    await pool.end();
  }
}

run();
