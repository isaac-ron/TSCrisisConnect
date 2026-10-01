import express from "express";
import { prisma } from "../db.js";
import { logger } from "../logger.js";
import { authenticate, authorize, optionalAuth } from "../middleware/authMiddleware.js";
import { ANONYMOUS_REPORTER_EMAIL, corroboration, modelDoubtsIncident } from "../services/incidents.js";

const router = express.Router();
const log = logger.child({ module: "incidents" });

const STAFF_ROLES = ["first-responder", "admin"];
const REVIEW_STATUSES = ["pending", "verified", "dismissed", "resolved"];
const PUBLIC_WINDOW_DAYS = 14;
const SEVERITY_RANK = { Low: 0, Medium: 1, High: 2, Critical: 3 };
const isStaff = (user) => STAFF_ROLES.includes(user?.role);

const REPORT_FIELDS = {
  id: true, userId: true, description: true, timestamp: true, isCrisis: true, imageVerified: true,
  severity: true, crisisType: true, user: { select: { email: true } },
};

function summarize(incident) {
  const latest = [...incident.reports].sort((a, b) => b.timestamp - a.timestamp)[0];
  return {
    id: incident.id,
    crisisType: incident.crisisType,
    priority: incident.priority,
    latitude: incident.latitude,
    longitude: incident.longitude,
    locationName: incident.locationName,
    firstReportedAt: incident.firstReportedAt,
    lastReportedAt: incident.lastReportedAt,
    reviewStatus: incident.reviewStatus,
    reviewNote: incident.reviewNote,
    reviewedAt: incident.reviewedAt,
    reportCount: incident.reports.length,
    summary: latest?.description ?? null,
    corroboration: corroboration(incident),
    modelDoubt: modelDoubtsIncident(incident),
  };
}

// Open incidents first, then by priority, then by most recent activity
function compareIncidents(a, b) {
  const open = (i) => (i.reviewStatus === "pending" || i.reviewStatus === "verified" ? 0 : 1);
  return open(a) - open(b)
    || (SEVERITY_RANK[b.priority] ?? 0) - (SEVERITY_RANK[a.priority] ?? 0)
    || b.lastReportedAt - a.lastReportedAt;
}

/**
 * Public: recent incidents, without reporter identities. Dismissed incidents, and unreviewed ones the
 * model judged not to be crises, are hidden. Responders see everything with ?all=1.
 */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const staffView = isStaff(req.user) && req.query.all === "1";
    const incidents = await prisma.incident.findMany({
      where: staffView ? {} : {
        reviewStatus: { not: "dismissed" },
        lastReportedAt: { gte: new Date(Date.now() - PUBLIC_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
      },
      include: { reports: { select: REPORT_FIELDS }, officialAlert: true },
    });
    const visible = staffView ? incidents : incidents.filter((i) => i.reviewStatus !== "pending" || !modelDoubtsIncident(i));
    res.json(visible.sort(compareIncidents).map(summarize));
  } catch (error) {
    log.error({ err: error }, "failed to list incidents");
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

/** Staff: one incident with its reports, reporters and each reporter's track record. */
router.get("/:id", authenticate, authorize(...STAFF_ROLES), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reports: { select: { ...REPORT_FIELDS, crisisType: true, category: true, extractedLocation: true, confidence: true,
          user: { select: { id: true, name: true, email: true } } }, orderBy: { timestamp: "asc" } },
        officialAlert: true,
        reviewedBy: { select: { id: true, name: true } },
      },
    });
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    // How each named reporter's other reports were judged
    const reporterIds = [...new Set(incident.reports.filter((r) => r.user.email !== ANONYMOUS_REPORTER_EMAIL).map((r) => r.userId))];
    const history = await prisma.report.findMany({
      where: { userId: { in: reporterIds }, incidentId: { not: id } },
      select: { userId: true, incident: { select: { reviewStatus: true } } },
    });
    const trackRecord = Object.fromEntries(reporterIds.map((uid) => {
      const statuses = history.filter((h) => h.userId === uid).map((h) => h.incident?.reviewStatus);
      return [uid, {
        confirmed: statuses.filter((s) => s === "verified" || s === "resolved").length,
        dismissed: statuses.filter((s) => s === "dismissed").length,
        unreviewed: statuses.filter((s) => s === "pending").length,
      }];
    }));

    res.json({
      ...summarize(incident),
      reviewedBy: incident.reviewedBy,
      officialAlert: incident.officialAlert,
      reports: incident.reports.map(({ user, ...report }) => ({
        ...report,
        reporter: user.email === ANONYMOUS_REPORTER_EMAIL ? { anonymous: true }
          : { id: user.id, name: user.name, email: user.email, trackRecord: trackRecord[user.id] },
      })),
    });
  } catch (error) {
    log.error({ err: error }, "failed to fetch incident");
    res.status(500).json({ error: "Failed to fetch incident" });
  }
});

/** Staff: verify, dismiss, resolve, or reopen (pending) an incident. */
router.patch("/:id/review", authenticate, authorize(...STAFF_ROLES), async (req, res) => {
  const { status, note } = req.body ?? {};
  if (!REVIEW_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${REVIEW_STATUSES.join(", ")}` });
  }
  if (note != null && (typeof note !== "string" || note.length > 500)) {
    return res.status(400).json({ error: "note must be a string of at most 500 characters" });
  }
  try {
    const incident = await prisma.incident.update({
      where: { id: Number.parseInt(req.params.id, 10) },
      data: {
        reviewStatus: status,
        reviewNote: note ?? null,
        reviewedAt: status === "pending" ? null : new Date(),
        reviewedById: status === "pending" ? null : req.user.id,
      },
      include: { reports: { select: REPORT_FIELDS }, officialAlert: true },
    });
    log.info({ incidentId: incident.id, status, reviewer: req.user.id }, "incident reviewed");
    res.json(summarize(incident));
  } catch (error) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Incident not found" });
    log.error({ err: error }, "failed to review incident");
    res.status(500).json({ error: "Failed to update incident" });
  }
});

export default router;
