import dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: string;
  API_PREFIX: string;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // CORS
  CORS_ORIGIN: string;
  ALLOWED_ORIGINS: string[];

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  REDIS_URL: string | undefined;
  RATE_LIMIT_WHITELIST: string | undefined;

  // Email
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  FROM_EMAIL: string;
  FROM_NAME: string;

  // File Upload
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;
  ALLOWED_FILE_TYPES: string[];

  // Security
  BCRYPT_ROUNDS: number;
  SESSION_SECRET: string;

  // Logging
  LOG_LEVEL: string;
  LOG_FILE: string;

  // API Documentation
  ENABLE_SWAGGER: boolean;
  SWAGGER_URL: string;
}

const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name] || defaultValue;
  if (!value) {
    logger.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
};

const getEnvNumber = (name: string, defaultValue?: number): number => {
  const value = process.env[name];
  if (value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      logger.error(`Environment variable ${name} must be a number`);
      process.exit(1);
    }
    return parsed;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  logger.error(`Missing required environment variable: ${name}`);
  process.exit(1);
};

const getEnvBoolean = (name: string, defaultValue?: boolean): boolean => {
  const value = process.env[name];
  if (value) {
    return value.toLowerCase() === 'true';
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  logger.error(`Missing required environment variable: ${name}`);
  process.exit(1);
};

const getEnvArray = (name: string, defaultValue?: string[]): string[] => {
  const value = process.env[name];
  if (value) {
    return value.split(',').map(item => item.trim());
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  return [];
};

export const env: EnvConfig = {
  // Server
  PORT: getEnvNumber('PORT', 3000),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  API_PREFIX: getEnvVar('API_PREFIX', '/api/v1'),

  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL'),

  // JWT
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_SECRET: getEnvVar('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: getEnvVar('JWT_REFRESH_EXPIRES_IN', '30d'),

  // CORS
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3001'),
  ALLOWED_ORIGINS: getEnvArray('ALLOWED_ORIGINS', ['http://localhost:3001']),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  REDIS_URL: process.env['REDIS_URL'],
  RATE_LIMIT_WHITELIST: process.env['RATE_LIMIT_WHITELIST'],

  // Email
  SMTP_HOST: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: getEnvNumber('SMTP_PORT', 587),
  SMTP_SECURE: getEnvBoolean('SMTP_SECURE', false),
  SMTP_USER: getEnvVar('SMTP_USER', ''),
  SMTP_PASS: getEnvVar('SMTP_PASS', ''),
  FROM_EMAIL: getEnvVar('FROM_EMAIL', 'noreply@clientsplus.com'),
  FROM_NAME: getEnvVar('FROM_NAME', 'Clients+ Team'),

  // File Upload
  MAX_FILE_SIZE: getEnvNumber('MAX_FILE_SIZE', 10485760), // 10MB
  UPLOAD_DIR: getEnvVar('UPLOAD_DIR', 'uploads/'),
  ALLOWED_FILE_TYPES: getEnvArray('ALLOWED_FILE_TYPES', ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']),

  // Security
  BCRYPT_ROUNDS: getEnvNumber('BCRYPT_ROUNDS', 12),
  SESSION_SECRET: getEnvVar('SESSION_SECRET'),

  // Logging
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
  LOG_FILE: getEnvVar('LOG_FILE', 'logs/app.log'),

  // API Documentation
  ENABLE_SWAGGER: getEnvBoolean('ENABLE_SWAGGER', true),
  SWAGGER_URL: getEnvVar('SWAGGER_URL', '/api-docs'),
};