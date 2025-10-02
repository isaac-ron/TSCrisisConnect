import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { processTextForCrisisInfo } from "../shared/nlp-module.js";

const router = express.Router();
const prisma = new PrismaClient();

const DEFAULT_REPORTER_EMAIL = process.env.DEFAULT_REPORT_EMAIL || "anonymous@crisisconnect.local";
const DEFAULT_REPORTER_NAME = process.env.DEFAULT_REPORT_NAME || "Offline Reporter";
const DEFAULT_REPORTER_PASSWORD_HASH = bcrypt.hashSync(process.env.DEFAULT_REPORT_PASSWORD || "offline-reporter", 10);
let cachedDefaultUserId = null;

async function getDefaultReporterUserId() {
  if (cachedDefaultUserId) {
    return cachedDefaultUserId;
  }

  const reporter = await prisma.user.upsert({
    where: { email: DEFAULT_REPORTER_EMAIL },
    update: {},
    create: {
      name: DEFAULT_REPORTER_NAME,
      email: DEFAULT_REPORTER_EMAIL,
      password: DEFAULT_REPORTER_PASSWORD_HASH,
      role: "user",
    },
  });

  cachedDefaultUserId = reporter.id;
  return cachedDefaultUserId;
}


// Accept single or batch offline-synced messages
router.post("/", async (req, res) => {
  console.log('🚀 [POST /reports] Request received');
  console.log('📦 [POST /reports] Request body:', JSON.stringify(req.body, null, 2));
  
  const body = req.body;
  // Accept either a single message or an array of messages
  const messages = Array.isArray(body) ? body : [body];
  console.log('📝 [POST /reports] Processing', messages.length, 'message(s)');
  
  const results = [];
  for (const msg of messages) {
    // Accept both offline and online message formats
    const { message, category, description, location, userId, content } = msg;
    // Prefer 'description' if present, else use 'message' or 'content'
    const desc = description || message || content;
    
    console.log('📄 [POST /reports] Processing message:', { desc, category, location, userId });
    
    if (!desc) {
      console.warn('⚠️ [POST /reports] Skipping message with no content');
      results.push({ error: 'No content provided', data: msg });
      continue;
    }
    
    try {
      console.log('🔍 [POST /reports] Calling NLP module...');
      const nlpData = await processTextForCrisisInfo(desc);
      console.log('✅ [POST /reports] NLP result:', nlpData);
      
      const targetUserId = userId || (await getDefaultReporterUserId());
      console.log('👤 [POST /reports] Target user ID:', targetUserId);
      
      console.log('💾 [POST /reports] Creating report in database...');
      const report = await prisma.report.create({
        data: {
          description: desc,
          location: nlpData.extractedLocation || location || '',
          status: category || undefined,
          userId: targetUserId,
          extractedLocation: nlpData.extractedLocation,
          severity: nlpData.severity,
        },
      });
      console.log('✅ [POST /reports] Report created with ID:', report.id);
      results.push(report);
    } catch (e) {
      console.error('❌ [POST /reports] Failed to save report:', e.message);
      console.error('❌ [POST /reports] Stack trace:', e.stack);
      results.push({ error: e.message, data: msg });
    }
  }
  
  console.log('📤 [POST /reports] Sending response with', results.length, 'result(s)');
  res.json(Array.isArray(body) ? results : results[0]);
});

// Get all reports
router.get("/", async (req, res) => {
  const reports = await prisma.report.findMany({ include: { user: true } });
  res.json(reports);
});

export default router;