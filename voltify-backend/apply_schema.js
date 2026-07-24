require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Connecting to database...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'src/config/schema.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(__dirname, 'src/config/seed.sql'), 'utf8');
    
    console.log('Running schema.sql...');
    await pool.query(schemaSql);
    console.log('Schema created successfully.');
    
    // Uncomment if we want to run seed.sql
    // console.log('Running seed.sql...');
    // await pool.query(seedSql);
    // console.log('Seed executed successfully.');
    
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await pool.end();
  }
}

run();
