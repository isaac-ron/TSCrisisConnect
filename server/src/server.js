import { ALLOWED_ORIGINS, IS_PRODUCTION } from './config.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import socialMediaRoutes from './routes/social-media.js';
import debugRoutes from './routes/debug.js';
import messagesRoutes from './routes/messages.js';
import firstRespondersRoutes from './routes/first-responders.js';

const app = express();

// Render terminates TLS at a proxy; trust it so req.ip (used for rate limiting) is the client IP
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

// Auth uses bearer tokens, not cookies, so credentials are not needed
app.use(cors({ origin: ALLOWED_ORIGINS }));

// Increase limit to handle base64 encoded images (10MB limit)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/', (req, res) => res.send('CrisisConnect API is running'));

app.use('/auth', authRoutes);
app.use('/reports', reportRoutes);
app.use('/social', socialMediaRoutes);
app.use('/messages', messagesRoutes);
app.use('/first-responders', firstRespondersRoutes);

if (!IS_PRODUCTION) {
  app.use('/debug', debugRoutes);
}

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