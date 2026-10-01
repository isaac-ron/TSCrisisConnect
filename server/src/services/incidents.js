// Groups reports into incidents and describes how well each incident is corroborated.
//
// A model can't tell whether a report is true. What it can't fake easily is agreement:
// several independent people reporting the same kind of emergency in the same place at the same time,
// a photo that independently shows a crisis, or a matching alert from an official source.
import { prisma } from '../db.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'incidents' });

// Reports of the same type this close in space and time are treated as the same incident
const CLUSTER_RADIUS_KM = 3;
const CLUSTER_WINDOW_HOURS = 6;
// Official alerts cover large areas (an earthquake is felt far from its epicentre)
const OFFICIAL_MATCH_RADIUS_KM = { earthquake: 200, storm: 300, flood: 100, fire: 50 };
const DEFAULT_OFFICIAL_MATCH_RADIUS_KM = 50;
const OFFICIAL_MATCH_BEFORE_HOURS = 72;   // an alert can precede reports of the same event
const OFFICIAL_MATCH_AFTER_HOURS = 24;

export const ANONYMOUS_REPORTER_EMAIL = process.env.DEFAULT_REPORT_EMAIL || 'anonymous@crisisconnect.local';
const SEVERITY_RANK = { Low: 0, Medium: 1, High: 2, Critical: 3 };
const HOUR = 60 * 60 * 1000;

export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const hasCoordinates = (x) => x.latitude != null && x.longitude != null;
const normalizePlace = (name) => name?.trim().toLowerCase() || null;
const higherSeverity = (a, b) => ((SEVERITY_RANK[b] ?? -1) > (SEVERITY_RANK[a] ?? -1) ? b : a);

/** Picks the open incident a report belongs to, or null. */
async function findMatchingIncident(report, crisisType) {
  const candidates = await prisma.incident.findMany({
    where: {
      crisisType,
      reviewStatus: { in: ['pending', 'verified'] },
      lastReportedAt: { gte: new Date(report.timestamp.getTime() - CLUSTER_WINDOW_HOURS * HOUR) },
      firstReportedAt: { lte: new Date(report.timestamp.getTime() + CLUSTER_WINDOW_HOURS * HOUR) },
    },
  });
  if (hasCoordinates(report)) {
    const nearest = candidates
      .filter(hasCoordinates)
      .map((incident) => ({ incident, km: distanceKm(report.latitude, report.longitude, incident.latitude, incident.longitude) }))
      .filter(({ km }) => km <= CLUSTER_RADIUS_KM)
      .sort((a, b) => a.km - b.km)[0];
    if (nearest) return nearest.incident;
  }
  // Without coordinates, only an identical place name counts
  const place = normalizePlace(report.extractedLocation || report.location);
  return place ? candidates.find((c) => normalizePlace(c.locationName) === place) ?? null : null;
}

/** Links a report to an existing incident or starts a new one. Returns the incident id. */
export async function attachReportToIncident(report) {
  const crisisType = report.crisisType || report.category || 'other';
  const match = await findMatchingIncident(report, crisisType);

  let incident;
  if (match) {
    incident = await prisma.incident.update({
      where: { id: match.id },
      data: {
        lastReportedAt: report.timestamp > match.lastReportedAt ? report.timestamp : match.lastReportedAt,
        priority: higherSeverity(match.priority, report.severity),
        ...(!hasCoordinates(match) && hasCoordinates(report) ? { latitude: report.latitude, longitude: report.longitude } : {}),
        ...(!match.locationName && (report.extractedLocation || report.location) ? { locationName: report.extractedLocation || report.location } : {}),
        reports: { connect: { id: report.id } },
      },
    });
  } else {
    incident = await prisma.incident.create({
      data: {
        crisisType,
        priority: report.severity || 'Low',
        latitude: report.latitude,
        longitude: report.longitude,
        locationName: report.extractedLocation || report.location || null,
        firstReportedAt: report.timestamp,
        lastReportedAt: report.timestamp,
        reports: { connect: { id: report.id } },
      },
    });
  }
  if (!incident.officialAlertId) await matchOfficialAlert(incident);
  return incident.id;
}

/** Links an incident to the nearest official alert of the same type, if one is close in place and time. */
export async function matchOfficialAlert(incident) {
  if (!hasCoordinates(incident)) return null;
  const radius = OFFICIAL_MATCH_RADIUS_KM[incident.crisisType] ?? DEFAULT_OFFICIAL_MATCH_RADIUS_KM;
  const alerts = await prisma.externalAlert.findMany({
    where: {
      crisisType: incident.crisisType,
      eventTime: {
        gte: new Date(incident.firstReportedAt.getTime() - OFFICIAL_MATCH_BEFORE_HOURS * HOUR),
        lte: new Date(incident.lastReportedAt.getTime() + OFFICIAL_MATCH_AFTER_HOURS * HOUR),
      },
    },
  });
  const nearest = alerts
    .filter(hasCoordinates)
    .map((alert) => ({ alert, km: distanceKm(incident.latitude, incident.longitude, alert.latitude, alert.longitude) }))
    .filter(({ km }) => km <= radius)
    .sort((a, b) => a.km - b.km)[0];
  if (!nearest) return null;
  await prisma.incident.update({ where: { id: incident.id }, data: { officialAlertId: nearest.alert.id } });
  log.info({ incidentId: incident.id, alert: nearest.alert.title, km: Math.round(nearest.km) }, 'incident matched an official alert');
  return nearest.alert;
}

/** Re-checks recent unmatched incidents after new official alerts arrive. */
export async function matchRecentIncidentsToOfficialAlerts() {
  const incidents = await prisma.incident.findMany({
    where: { officialAlertId: null, lastReportedAt: { gte: new Date(Date.now() - 7 * 24 * HOUR) }, latitude: { not: null } },
  });
  for (const incident of incidents) await matchOfficialAlert(incident);
}

/** Groups reports that predate incidents (or failed to attach). Safe to run repeatedly. */
export async function attachUnlinkedReports() {
  const reports = await prisma.report.findMany({ where: { incidentId: null }, orderBy: { timestamp: 'asc' }, omit: { attachment: true } });
  for (const report of reports) await attachReportToIncident(report);
  if (reports.length) log.info({ reports: reports.length }, 'attached unlinked reports to incidents');
}

/**
 * Summarizes the evidence behind an incident.
 * Anonymous reports all share one account, so together they count as one independent reporter:
 * otherwise one person could fake a crowd by submitting repeatedly while logged out.
 */
export function corroboration(incident) {
  const named = new Set();
  let anonymous = 0;
  for (const r of incident.reports) {
    if (r.user?.email === ANONYMOUS_REPORTER_EMAIL) anonymous++;
    else named.add(r.userId);
  }
  const independentReporters = named.size + (anonymous > 0 ? 1 : 0);
  const photoEvidence = incident.reports.some((r) => r.imageVerified);
  const officialAlert = incident.officialAlert
    ? { source: incident.officialAlert.source, title: incident.officialAlert.title, url: incident.officialAlert.url }
    : null;
  const level = officialAlert ? 'official-match'
    : independentReporters >= 2 || photoEvidence ? 'corroborated'
      : 'single-report';
  return { level, independentReporters, photoEvidence, officialAlert };
}

// Reports created before isCrisis was stored have it null; for those, the pipeline left crisisType
// empty exactly when it judged the text not to be a crisis
const modelRejected = (report) => report.isCrisis === false || (report.isCrisis == null && report.crisisType == null);

/** True when the binary model judged every report in the incident not to be a crisis. */
export const modelDoubtsIncident = (incident) =>
  incident.reports.length > 0 && incident.reports.every(modelRejected);
