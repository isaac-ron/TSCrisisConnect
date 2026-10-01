import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../db.js";
import { logger } from "../logger.js";
import { analyzeText } from "../nlp/disaster-pulse.js";
import { CATEGORIES } from "../nlp/categories.js";
import { analyzeCrisisImage } from "../services/image-crisis-detector.js";
import { attachReportToIncident } from "../services/incidents.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();
const log = logger.child({ module: "reports" });

const DEFAULT_REPORTER_EMAIL = process.env.DEFAULT_REPORT_EMAIL || "anonymous@crisisconnect.local";
const DEFAULT_REPORTER_NAME = process.env.DEFAULT_REPORT_NAME || "Offline Reporter";
const MAX_DESCRIPTION_LENGTH = 500;
// An image classified as a crisis with at least this confidence overrides the text analysis
const IMAGE_CONFIDENCE_THRESHOLD = 0.7;
const STAFF_ROLES = ["first-responder", "admin"];
let cachedDefaultUserId = null;

async function getDefaultReporterUserId() {
  if (cachedDefaultUserId) {
    return cachedDefaultUserId;
  }

  // The shared anonymous account must never be loggable-into, so its password is
  // a random value that is discarded (and rotated on every server start).
  const unusablePasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const reporter = await prisma.user.upsert({
    where: { email: DEFAULT_REPORTER_EMAIL },
    update: { password: unusablePasswordHash, role: "user" },
    create: {
      name: DEFAULT_REPORTER_NAME,
      email: DEFAULT_REPORTER_EMAIL,
      password: unusablePasswordHash,
      role: "user",
    },
  });

  cachedDefaultUserId = reporter.id;
  return cachedDefaultUserId;
}

// Gemini describes image crises in free text ("vehicle accident", "earthquake damage")
const categoryFromDescription = (text) =>
  CATEGORIES.find((c) => c.keywords?.test(text ?? ""))?.key ?? "other";

async function createReport({ text, category, location, attachment }, userId) {
  const nlp = await analyzeText(text, { category });
  const report = {
    isCrisis: nlp.isCrisis,
    imageVerified: false,
    crisisType: nlp.crisisType,
    severity: nlp.severity,
    confidence: nlp.confidence,
    extractedLocation: nlp.extractedLocation,
  };

  if (attachment) {
    const image = await analyzeCrisisImage(attachment);
    if (image.isCrisis && image.confidence > IMAGE_CONFIDENCE_THRESHOLD) {
      report.isCrisis = true;
      report.imageVerified = true;
      report.crisisType = category || categoryFromDescription(image.crisisType);
      report.severity = image.severity || report.severity;
      report.confidence = Math.max(image.confidence, report.confidence || 0);
      report.extractedLocation ||= image.location;
    } else if (image.isCrisis && nlp.isCrisis) {
      // Text and image agree on a crisis
      report.confidence = Math.min(1.0, (nlp.confidence || 0.5) * 1.2);
    }
  }

  const created = await prisma.report.create({
    data: {
      ...report,
      description: text,
      location: report.extractedLocation || location || "",
      category: category || null,
      userId,
      attachment,
      latitude: nlp.latitude,
      longitude: nlp.longitude,
    },
    omit: { attachment: true },
  });

  try {
    created.incidentId = await attachReportToIncident(created);
  } catch (error) {
    // The report is saved; attachUnlinkedReports() picks it up on the next server start
    log.error({ err: error, reportId: created.id }, "failed to attach report to an incident");
  }
  return created;
}

// Accepts one report, or an array of reports synced from offline storage
router.post("/", optionalAuth, async (req, res) => {
  const body = req.body;
  const items = Array.isArray(body) ? body : [body];

  const results = [];
  for (const item of items) {
    // Online and older offline clients name the text differently
    const { message, category, description, location, content, attachment } = item;
    const text = description || message || content;

    if (typeof text !== "string" || !text.trim()) {
      results.push({ error: "No content provided", status: 400 });
      continue;
    }
    if (text.length > MAX_DESCRIPTION_LENGTH) {
      results.push({ error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`, status: 400 });
      continue;
    }

    try {
      // Reports are attributed to the authenticated user, never to an ID supplied in the body
      const userId = req.user?.id || (await getDefaultReporterUserId());
      const report = await createReport({ text, category, location, attachment }, userId);
      log.info({ reportId: report.id, incidentId: report.incidentId, crisisType: report.crisisType, severity: report.severity,
        anonymous: !req.user, hasAttachment: Boolean(attachment) }, "report created");
      results.push(report);
    } catch (error) {
      log.error({ err: error }, "failed to save report");
      results.push({ error: "Failed to save report", status: 500 });
    }
  }

  if (Array.isArray(body)) {
    // Batch: 207 tells the client to inspect per-item results
    const failed = results.some((r) => r.error);
    return res.status(failed ? 207 : 201).json(results);
  }
  const [result] = results;
  // Single report: a failure must not look like success, or offline sync marks it as sent
  return res.status(result.error ? result.status : 201).json(result);
});

router.get("/", optionalAuth, async (req, res) => {
  try {
    // Reporter identity is only visible to responders/admins
    const canSeeReporter = STAFF_ROLES.includes(req.user?.role);
    const reports = await prisma.report.findMany({
      include: canSeeReporter
        ? { user: { select: { id: true, name: true, email: true } } }
        : undefined,
      // Base64 images make the list huge and no list view displays them
      omit: { attachment: true },
      orderBy: { timestamp: "desc" },
    });
    res.json(reports);
  } catch (error) {
    log.error({ err: error }, "failed to fetch reports");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

export default router;
