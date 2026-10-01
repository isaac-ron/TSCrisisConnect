import { ALLOWED_ORIGINS, IS_PRODUCTION } from './config.js';
import { prisma } from './db.js';
import { logger } from './logger.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import incidentRoutes from './routes/incidents.js';
import alertRoutes from './routes/alerts.js';
import debugRoutes from './routes/debug.js';
import { refreshOfficialAlerts } from './services/official-feeds.js';
import { attachUnlinkedReports, matchRecentIncidentsToOfficialAlerts } from './services/incidents.js';

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
app.use('/incidents', incidentRoutes);
app.use('/alerts', alertRoutes);

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

  // Background startup work: group reports created before incidents existed, then load official alerts
  attachUnlinkedReports()
    .then(() => refreshOfficialAlerts({ force: true }))
    .then(() => matchRecentIncidentsToOfficialAlerts())
    .catch((err) => logger.error({ err }, 'startup tasks failed'));
});

// Keeps official alerts current while the instance is awake (requests also refresh them when stale)
setInterval(() => {
  refreshOfficialAlerts().then((stored) => stored && matchRecentIncidentsToOfficialAlerts())
    .catch((err) => logger.error({ err }, 'official alert refresh failed'));
}, 15 * 60 * 1000).unref();

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
