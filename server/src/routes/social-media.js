// server/src/routes/social-media.js
import express from 'express';
import { prisma } from '../db.js';
import { mockTwitterFeed } from '../services/twitter-mock.js';
import { analyzeText } from '../nlp/disaster-pulse.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'social-media' });
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// This endpoint simulates fetching tweets, processing them, and saving them as SocialAlerts.
// Admin-only: each call writes to the database and runs the NLP models.
router.post('/ingest-tweets', authenticate, authorize('admin'), async (req, res) => {
  const tweets = mockTwitterFeed();
  
  const processedAlerts = [];
  for (const tweet of tweets) {
    try {
      const nlpData = await analyzeText(tweet.text);

      // Only save the tweet if it's classified as a crisis
      if (nlpData.isCrisis) {
        const newAlert = await prisma.socialAlert.create({
          data: {
            description: tweet.text,
            source: 'twitter',
            sourceUrl: tweet.url,
            isVerified: false,
            crisisType: nlpData.crisisType,
            severity: nlpData.severity,
            extractedLocation: nlpData.extractedLocation,
            latitude: nlpData.latitude,
            longitude: nlpData.longitude,
          },
        });
        processedAlerts.push(newAlert);
      } else {
      }
    } catch (error) {
      log.error({ err: error }, 'failed to process tweet');
    }
  }

  res.status(201).json({
    message: `Successfully ingested and processed ${processedAlerts.length} tweets.`,
    alerts: processedAlerts,
  });
});

// This endpoint fetches only the alerts that came from social media
router.get('/social-alerts', async (req, res) => {
  try {
    const socialAlerts = await prisma.socialAlert.findMany({
      orderBy: { timestamp: 'desc' },
    });
    res.json(socialAlerts);
  } catch (error) {
    log.error({ err: error }, 'failed to fetch social alerts');
    res.status(500).json({ error: 'Failed to fetch social alerts' });
  }
});

export default router;
