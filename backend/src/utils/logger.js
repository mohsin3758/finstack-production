'use strict';
const winston = require('winston');
const path    = require('path');
const fs      = require('fs');

const logsDir = path.join(process.cwd(), 'logs');
if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack }) =>
  `[${timestamp}] ${level}: ${stack || message}`
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), consoleFormat),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize:  10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize:  50 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// Add http level (between verbose and debug)
logger.http = (msg) => logger.log('http', msg);

module.exports = logger;
