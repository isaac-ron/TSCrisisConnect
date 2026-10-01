import { ALLOWED_ORIGINS, IS_PRODUCTION } from './config.js';
import { prisma } from './db.js';
import { logger } from './logger.js';
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
  logger.info({
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
    corsOrigins: ALLOWED_ORIGINS,
    imageAnalysis: Boolean(process.env.GEMINI_API_KEY),
  }, 'CrisisConnect API listening');
});

server.on('error', (error) => {
  logger.fatal({ err: error }, 'server error');
  process.exit(1);
});

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
