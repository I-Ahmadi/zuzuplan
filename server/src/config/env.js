import path from 'path';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const PORT = process.env.PORT || 3000;
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

function splitEnvList(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAllowedOrigins() {
  return Array.from(new Set([
    process.env.CLIENT_URL,
    ...splitEnvList(process.env.CORS_ORIGINS),
  ].filter(Boolean)));
}

export function isOriginAllowed(origin) {
  if (!origin) return true;

  if (getAllowedOrigins().includes(origin)) {
    return true;
  }

  if (!IS_PRODUCTION) {
    return /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
  }

  return false;
}

export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_MS',
  ];

  if (IS_PRODUCTION) {
    required.push('CLIENT_URL');
  }

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_REFRESH_EXPIRES_MS && Number.isNaN(Number(process.env.JWT_REFRESH_EXPIRES_MS))) {
    throw new Error('JWT_REFRESH_EXPIRES_MS must be a number of milliseconds.');
  }

  const emailDevMode = process.env.EMAIL_DEV_MODE === 'true';
  const hasSmtp = process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM;

  if (IS_PRODUCTION && !emailDevMode && !hasSmtp) {
    throw new Error('Production email requires SMTP env vars or EMAIL_DEV_MODE=true.');
  }
}
