import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import socialMediaRoutes from './routes/social-media.js';
import debugRoutes from './routes/debug.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const app = express();
const prisma = new PrismaClient();

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://crisisconnect-frontend.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Increase limit to handle base64 encoded images (10MB limit)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/', (req, res) => res.send('CrisisConnect API is running'));

app.use('/auth', authRoutes);
app.use('/reports', reportRoutes);
app.use('/social', socialMediaRoutes);
app.use('/debug', debugRoutes);

// Start servercd server
//npx prisma generate

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Environment variables loaded:', {
    DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ Missing',
    JWT_SECRET: process.env.JWT_SECRET ? '✓ Set' : '✗ Missing',
    FRONTEND_URL: process.env.FRONTEND_URL ? '✓ Set' : '✗ Missing'
  });
});

// Keep the server alive and handle errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});