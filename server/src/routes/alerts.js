import express from "express";
import { prisma } from "../db.js";
import { logger } from "../logger.js";
import { refreshOfficialAlerts } from "../services/official-feeds.js";
import { matchRecentIncidentsToOfficialAlerts } from "../services/incidents.js";

const router = express.Router();
const log = logger.child({ module: "alerts" });

const WINDOW_DAYS = 7;

/** Public: official alerts (USGS, GDACS) from the past week, refreshed from the feeds when stale. */
router.get("/official", async (req, res) => {
  try {
    if (await refreshOfficialAlerts()) {
      await matchRecentIncidentsToOfficialAlerts();
    }
    const alerts = await prisma.externalAlert.findMany({
      where: { eventTime: { gte: new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000) } },
      orderBy: { eventTime: "desc" },
      take: 300,
    });
    res.json(alerts);
  } catch (error) {
    log.error({ err: error }, "failed to fetch official alerts");
    res.status(500).json({ error: "Failed to fetch official alerts" });
  }
});

export default router;
