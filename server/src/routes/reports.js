import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

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
  const body = req.body;
  // Accept either a single message or an array of messages
  const messages = Array.isArray(body) ? body : [body];
  const results = [];
  for (const msg of messages) {
    // Accept both offline and online message formats
    const { message, category, description, location, userId } = msg;
    // Prefer 'description' if present, else use 'message'
    const desc = description || message;
    try {
      const targetUserId = userId || (await getDefaultReporterUserId());
      const report = await prisma.report.create({
        data: {
          description: desc,
          location: location || '',
          status: category || undefined,
          userId: targetUserId,
        },
      });
      results.push(report);
    } catch (e) {
      console.error('Failed to save report', e);
      results.push({ error: e.message, data: msg });
    }
  }
  res.json(Array.isArray(body) ? results : results[0]);
});

// Get all reports
router.get("/", async (req, res) => {
  const reports = await prisma.report.findMany({ include: { user: true } });
  res.json(reports);
});

export default router;