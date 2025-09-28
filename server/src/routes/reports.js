import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();


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
      const report = await prisma.report.create({
        data: {
          description: desc,
          location: location || '',
          userId: userId || 1, // fallback userId if not provided
          // Optionally store category as status or in a new field
        },
      });
      results.push(report);
    } catch (e) {
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