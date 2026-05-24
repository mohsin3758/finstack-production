'use strict';
/**
 * FinStack DB Seeder
 * Runs seed.sql with demo data for AVIIN JOBS SERVICES.
 * Usage: node src/utils/seed.js
 */
require('dotenv').config();
const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');

async function seed() {
  const client = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'finstack',
    user:     process.env.DB_USER     || 'finstack',
    password: process.env.DB_PASSWORD || 'finstack_secret_2026',
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    const seedPath = path.join(__dirname, '../../../database/seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.sql not found at ${seedPath}`);
    }

    const sql = fs.readFileSync(seedPath, 'utf8');
    await client.query(sql);
    console.log('✓ Seed data inserted successfully');
    console.log('  Login: admin@aviinjobs.com / Admin@2026');
  } catch (err) {
    if (err.message.includes('duplicate key')) {
      console.warn('⚠ Seed data already exists (duplicate key) — skipping');
    } else {
      console.error('✗ Seed failed:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

seed();
