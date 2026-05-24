'use strict';
const { Sequelize } = require('sequelize');
const logger        = require('../utils/logger');

const sequelize = new Sequelize({
  dialect:  'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'finstack',
  username: process.env.DB_USER     || 'finstack',
  password: process.env.DB_PASSWORD || 'finstack_secret_2026',
  logging:  process.env.DB_LOG === 'true' ? (sql) => logger.debug(sql) : false,
  pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true'
      ? { require: true, rejectUnauthorized: false }
      : false,
    statement_timeout:                   30000,
    idle_in_transaction_session_timeout: 60000,
  },
  define: {
    underscored:  true,
    timestamps:   true,
    createdAt:    'created_at',
    updatedAt:    'updated_at',
    deletedAt:    'deleted_at',
    paranoid:     true,
  },
});

module.exports = { sequelize, Sequelize };
