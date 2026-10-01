// Loads environment variables. Imported first by server.js so every other module
// sees the values when it is evaluated.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Copy server/.env.example to server/.env and fill it in.');
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];

// FRONTEND_URL may be a comma-separated list of allowed origins.
export const ALLOWED_ORIGINS = [
  ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim()).filter(Boolean),
  ...(IS_PRODUCTION ? [] : DEV_ORIGINS),
];
