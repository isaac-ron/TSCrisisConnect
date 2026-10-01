import pino from 'pino';

// JSON logs; set LOG_LEVEL=debug to see per-request NLP details.
// Never log request bodies: they contain personal data and base64 images.
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
