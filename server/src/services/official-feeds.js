// Official alerts from free public feeds (no API keys):
//   USGS:  earthquakes of magnitude 4.5+ in the past week
//   GDACS: UN/EC Global Disaster Alert and Coordination System (cyclones, floods, wildfires, volcanoes, droughts)
// GDACS also republishes earthquakes; those are skipped so each quake is stored once (from USGS).
import { prisma } from '../db.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'official-feeds' });

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';
const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP';
// A free Render instance sleeps when idle, so feeds are refreshed on demand rather than only by a timer
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const GDACS_TYPES = { TC: 'storm', FL: 'flood', WF: 'fire', VO: 'other', DR: 'other' };
const GDACS_SEVERITY = { Green: 'Low', Orange: 'High', Red: 'Critical' };

function usgsSeverity(magnitude, pagerAlert) {
  if (pagerAlert === 'red' || magnitude >= 7) return 'Critical';
  if (pagerAlert === 'orange' || magnitude >= 6) return 'High';
  if (magnitude >= 5) return 'Medium';
  return 'Low';
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

async function fetchUsgs() {
  const { features } = await getJson(USGS_URL);
  return features.map(({ id, properties: p, geometry }) => ({
    source: 'usgs',
    externalId: id,
    title: p.title,
    url: p.url,
    crisisType: 'earthquake',
    severity: usgsSeverity(p.mag, p.alert),
    longitude: geometry.coordinates[0],
    latitude: geometry.coordinates[1],
    eventTime: new Date(p.time),
  }));
}

async function fetchGdacs() {
  const { features } = await getJson(GDACS_URL);
  return features
    .filter(({ properties: p }) => p.eventtype in GDACS_TYPES)
    .map(({ properties: p, geometry }) => ({
      source: 'gdacs',
      externalId: `${p.eventtype}-${p.eventid}`,
      title: p.country ? `${p.name} (${p.country})` : p.name,
      url: p.url?.report ?? null,
      crisisType: GDACS_TYPES[p.eventtype],
      severity: GDACS_SEVERITY[p.alertlevel] ?? 'Low',
      longitude: geometry?.coordinates?.[0] ?? null,
      latitude: geometry?.coordinates?.[1] ?? null,
      eventTime: new Date(`${p.fromdate}Z`),   // GDACS times are UTC without a zone suffix
    }));
}

async function refresh() {
  const results = await Promise.allSettled([fetchUsgs(), fetchGdacs()]);
  let stored = 0;
  for (const [i, result] of results.entries()) {
    const source = i === 0 ? 'usgs' : 'gdacs';
    if (result.status === 'rejected') {
      log.warn({ source, err: result.reason?.message }, 'feed unavailable');
      continue;
    }
    for (const alert of result.value) {
      const { source: s, externalId, ...data } = alert;
      await prisma.externalAlert.upsert({
        where: { source_externalId: { source: s, externalId } },
        create: alert,
        update: { ...data, fetchedAt: new Date() },
      });
      stored++;
    }
  }
  log.info({ stored }, 'official alerts refreshed');
  return stored;
}

let lastRefresh = 0;
let inFlight = null;

/** Refreshes the feeds if they are older than REFRESH_INTERVAL_MS. Never throws. */
export function refreshOfficialAlerts({ force = false } = {}) {
  if (!force && Date.now() - lastRefresh < REFRESH_INTERVAL_MS) return Promise.resolve(0);
  if (!inFlight) {
    inFlight = refresh()
      .then((stored) => { lastRefresh = Date.now(); return stored; })
      .catch((err) => { log.error({ err }, 'official alert refresh failed'); return 0; })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}
