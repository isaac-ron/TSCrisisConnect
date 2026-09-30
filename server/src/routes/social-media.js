// server/src/routes/social-media.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { mockTwitterFeed } from '../services/twitter-mock.js';
import { analyzeTweetWithDisasterPulse } from '../nlp/disaster-pulse.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();
const router = express.Router();

// This endpoint simulates fetching tweets, processing them, and saving them as SocialAlerts.
// Admin-only: each call writes to the database and runs the NLP models.
router.post('/ingest-tweets', authenticate, authorize('admin'), async (req, res) => {
  console.log('🐦 [Ingest] Received request to ingest tweets');
  const tweets = mockTwitterFeed();
  console.log(`🐦 [Ingest] Fetched ${tweets.length} new mock tweets.`);
  
  const processedAlerts = [];
  for (const tweet of tweets) {
    try {
      console.log(`Processing tweet: "${tweet.text}"`);
      const nlpData = await analyzeTweetWithDisasterPulse(tweet.text);

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
        console.log(`✅ Saved alert ${newAlert.id} (${nlpData.crisisType}) for tweet.`);
      } else {
        console.log('⏭️  Tweet not crisis-related. Skipping.');
      }
    } catch (error) {
      console.error(`❌ Failed to process tweet: ${error.message}`);
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
    console.error('Failed to fetch social alerts:', error);
    res.status(500).json({ error: 'Failed to fetch social alerts' });
  }
});

export default router;
