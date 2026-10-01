// End-to-end tests against a running API server and ML service, using the database in server/.env.
//
//   npm run seed:users    (with SEED_ADMIN_PASSWORD set; creates the FR001 responder and the admin)
//   npm run dev           (API) and ml-service/app.py, then:
//   npm test
//
// The tests create users and reports, and delete the reports (and emptied incidents) when they finish.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const API = process.env.E2E_API_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('Set SEED_ADMIN_PASSWORD (the password used for npm run seed:users) to run the tests.');
  process.exit(1);
}
const prisma = new PrismaClient();
let failures = 0;
const check = (name, ok, extra = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
};
const req = async (method, path, { body, token } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
const register = async (label) => {
  const r = await req('POST', '/auth/register', { body: { name: `E2E ${label}`, email: `e2e-${label}-${Date.now()}@example.com`, password: 'secret123' } });
  return r.data;
};
const createdReports = [];
const report = async (body, token) => {
  const r = await req('POST', '/reports', { body, token });
  if (r.data?.id) createdReports.push(r.data.id);
  return r;
};

try {
  // --- Auth & roles
  const reg = await req('POST', '/auth/register', { body: { name: 'E2E', email: `e2e-${Date.now()}@example.com`, password: 'secret123', role: 'admin', badgeId: 'HACK1' } });
  check('register ignores role/badgeId from body', reg.status === 201 && reg.data.user.role === 'user' && !reg.data.user.badgeId);
  const userToken = reg.data.token;
  check('/auth/me returns user', (await req('GET', '/auth/me', { token: userToken })).status === 200);
  const admin = await req('POST', '/auth/login', { body: { email: 'admin@crisisconnect.local', password: ADMIN_PASSWORD } });
  check('admin login', admin.status === 200 && admin.data.user.role === 'admin');
  const responder = await req('POST', '/auth/responder-login', { body: { badgeId: 'fr001', password: 'emergency123' } });
  check('responder login (badge is case-insensitive)', responder.status === 200);
  const responderToken = responder.data.token;
  check('anonymous reporter account cannot be logged into with old default password',
    (await req('POST', '/auth/login', { body: { email: 'anonymous@crisisconnect.local', password: 'offline-reporter' } })).status === 400);
  check('user cannot create responder accounts',
    (await req('POST', '/auth/responders', { token: userToken, body: { name: 'x', password: 'x', badgeId: 'X1' } })).status === 403);
  check('removed routes are gone', (await req('GET', '/messages', { token: responderToken })).status === 404
    && (await req('GET', '/first-responders')).status === 404 && (await req('POST', '/social/ingest-tweets')).status === 404);

  // --- Reports
  const fire = await report({ content: 'Apartment building on fire in Los Angeles, people trapped on the upper floors', category: 'fire', userId: 1 }, userToken);
  check('report created with 201 and attached to an incident', fire.status === 201 && Number.isInteger(fire.data?.incidentId), `incident ${fire.data?.incidentId}`);
  check('report attributed to caller, not body userId', fire.data?.userId === reg.data.user.id);
  check('crisis type is the reporter category; model verdict stored', fire.data?.crisisType === 'fire' && fire.data?.isCrisis === true);
  check('empty report rejected with 400', (await req('POST', '/reports', { body: { content: '   ' } })).status === 400);
  check('over-long report rejected with 400', (await req('POST', '/reports', { body: { content: 'x'.repeat(501) } })).status === 400);
  const publicReports = await req('GET', '/reports');
  check('public report list has no reporter info or attachments',
    publicReports.status === 200 && publicReports.data.every((r) => r.user === undefined && r.attachment === undefined));

  // --- Incidents: two independent reporters, same type, same town -> one corroborated incident
  const a = await register('a');
  const b = await register('b');
  const leak1 = await report({ content: 'Strong smell of gas, a gas leak near the market in Nakuru. People are coughing.', category: 'chemical' }, a.token);
  const leak2 = await report({ content: 'Gas leak reported in Nakuru town, residents evacuating the area', category: 'chemical' }, b.token);
  check('nearby reports of the same type share an incident', leak1.data?.incidentId && leak1.data.incidentId === leak2.data?.incidentId,
    `${leak1.data?.incidentId} / ${leak2.data?.incidentId}`);
  let incidents = (await req('GET', '/incidents')).data;
  const leakIncident = incidents.find((i) => i.id === leak1.data.incidentId);
  check('two independent reporters -> corroborated', leakIncident?.corroboration.level === 'corroborated'
    && leakIncident.corroboration.independentReporters === 2 && leakIncident.reportCount === 2, JSON.stringify(leakIncident?.corroboration));
  check('public incidents expose no reporter identities', !JSON.stringify(incidents).includes('@example.com'));

  // Different type, same town -> separate incident
  const flood = await report({ content: 'Flooding on the main road in Nakuru, cars stuck in the water', category: 'flood' }, a.token);
  check('different crisis type in the same town -> separate incident', flood.data?.incidentId && flood.data.incidentId !== leak1.data.incidentId);

  // Three anonymous reports count as one independent reporter
  const anon = [];
  for (const text of ['Building collapsed in Eldoret, people trapped under rubble', 'Collapsed building in Eldoret town, rescue needed',
    'Eldoret: a building has collapsed, many trapped']) {
    anon.push(await report({ content: text, category: 'building' }));
  }
  incidents = (await req('GET', '/incidents')).data;
  const anonIncident = incidents.find((i) => i.id === anon[0].data?.incidentId);
  check('three anonymous reports -> one incident, one independent reporter, not corroborated',
    anon.every((r) => r.data?.incidentId === anon[0].data?.incidentId) && anonIncident?.reportCount === 3
    && anonIncident.corroboration.independentReporters === 1 && anonIncident.corroboration.level === 'single-report',
    JSON.stringify(anonIncident?.corroboration));

  // Official alert match: a (test) USGS quake near Nairobi, then an earthquake report from Nairobi
  const quake = await prisma.externalAlert.create({ data: { source: 'usgs', externalId: `e2e-${Date.now()}`, title: 'M 5.6 - E2E test quake near Nairobi',
    crisisType: 'earthquake', severity: 'Medium', latitude: -1.35, longitude: 36.9, eventTime: new Date() } });
  const shake = await report({ content: 'Strong earthquake shaking in Nairobi just now, buildings swaying', category: 'earthquake' }, b.token);
  const quakeIncident = (await req('GET', '/incidents')).data.find((i) => i.id === shake.data?.incidentId);
  check('report near an official alert -> official-match', quakeIncident?.corroboration.level === 'official-match'
    && quakeIncident.corroboration.officialAlert?.title === quake.title, JSON.stringify(quakeIncident?.corroboration));
  await prisma.externalAlert.delete({ where: { id: quake.id } });

  // --- Review workflow
  check('user cannot view incident details', (await req('GET', `/incidents/${leak1.data.incidentId}`, { token: userToken })).status === 403);
  check('user cannot review incidents', (await req('PATCH', `/incidents/${leak1.data.incidentId}/review`, { token: userToken, body: { status: 'verified' } })).status === 403);
  check('invalid review status rejected', (await req('PATCH', `/incidents/${leak1.data.incidentId}/review`, { token: responderToken, body: { status: 'approved' } })).status === 400);
  const verified = await req('PATCH', `/incidents/${leak1.data.incidentId}/review`, { token: responderToken, body: { status: 'verified', note: 'Confirmed by county fire service' } });
  check('responder verifies an incident', verified.status === 200 && verified.data.reviewStatus === 'verified');

  // Reporter track record: reporter a's flood incident detail shows the verified gas leak
  const detail = await req('GET', `/incidents/${flood.data.incidentId}`, { token: responderToken });
  const reporterA = detail.data?.reports?.[0]?.reporter;
  check('incident detail shows reporters with track record', detail.status === 200 && reporterA?.trackRecord?.confirmed >= 1, JSON.stringify(reporterA));
  const anonDetail = await req('GET', `/incidents/${anon[0].data.incidentId}`, { token: responderToken });
  check('anonymous reporters are marked anonymous', anonDetail.data?.reports?.every((r) => r.reporter.anonymous === true));

  await req('PATCH', `/incidents/${flood.data.incidentId}/review`, { token: responderToken, body: { status: 'dismissed', note: 'Duplicate' } });
  check('dismissed incidents are hidden from the public feed', !(await req('GET', '/incidents')).data.some((i) => i.id === flood.data.incidentId));
  check('staff can still see dismissed incidents', (await req('GET', '/incidents?all=1', { token: responderToken })).data.some((i) => i.id === flood.data.incidentId));

  // --- Official feeds
  const official = await req('GET', '/alerts/official');
  const sources = new Set((official.data ?? []).map((x) => x.source));
  check('official alerts load from USGS and GDACS', official.status === 200 && sources.has('usgs') && sources.has('gdacs'),
    `${official.data?.length} alerts, sources ${[...sources]}`);
} finally {
  // Clean up: this run's reports, then incidents left without reports
  await prisma.report.deleteMany({ where: { id: { in: createdReports } } });
  await prisma.incident.deleteMany({ where: { reports: { none: {} } } });
  await prisma.$disconnect();
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
