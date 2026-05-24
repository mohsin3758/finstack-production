'use strict';
/**
 * FinStack DB Migration Runner
 * Runs schema.sql against the configured PostgreSQL database.
 * Usage: node src/utils/migrate.js
 */
require('dotenv').config();
const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');

async function migrate() {
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

    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    console.log('✓ Schema applied successfully');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
