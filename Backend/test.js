// Backend test with a STUBBED llm (offline). The real app calls the real LLM.
const assert = require('node:assert');
const { openDb, setup } = require('./db');
const { makeApp } = require('./app');

const T = (title, assigneeId, deadline, estimatedHours) => ({ title, description: title, assigneeId, deadline, estimatedHours });
const GOOD = { projects: [
  { name: 'UrbanCart Website', clientName: 'UrbanCart Clothing', description: 'd', managerId: 'PM01', deadline: '2026-10-20', tasks: [
    T('Product catalog UI', 'DEV01', '2026-10-12', 12), T('Demo cart UI', 'DEV01', '2026-10-15', 8),
    T('Product and cart APIs', 'DEV02', '2026-10-14', 14), T('Website integration and testing', 'DEV01', '2026-10-19', 6)] },
  { name: 'QuickServe Mobile App', clientName: 'QuickServe Services', description: 'd', managerId: 'PM02', deadline: '2026-10-24', tasks: [
    T('Login and profile screens', 'DEV03', '2026-10-12', 8), T('Service booking screens', 'DEV03', '2026-10-17', 12),
    T('Booking and account APIs', 'DEV02', '2026-10-16', 16), T('Mobile integration and testing', 'DEV04', '2026-10-22', 10)] },
  { name: 'HelpDeskPro AI Assistant', clientName: 'HelpDeskPro Solutions', description: 'd', managerId: 'PM03', deadline: '2026-10-22', tasks: [
    T('FAQ document processing', 'DEV06', '2026-10-13', 10), T('Assistant answer generation', 'DEV05', '2026-10-17', 14),
    T('Human escalation flow', 'DEV05', '2026-10-18', 6), T('Assistant evaluation and testing', 'DEV06', '2026-10-21', 8)] },
] };

let nextLLM = async () => JSON.stringify(GOOD), lastPrompt = '';
let db, server, base;

async function client() {
  const jar = new Map();
  const call = async (method, path, body) => {
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
    for (const sc of r.headers.getSetCookie()) { const [kv] = sc.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };
  return { get: (p) => call('GET', p), post: (p, b) => call('POST', p, b),
    login: (e) => call('POST', '/api/login', { email: `${e}@novaworks.example`, password: 'Demo123!' }) };
}
const count = async (t) => (await db.query(`SELECT COUNT(*)::int AS c FROM ${t}`))[0].c;
(async () => {
  db = await openDb(':memory:'); await setup(db); await setup(db);
  assert.equal(await count('users'), 10, 'seed idempotent');
  server = makeApp({ db, llm: (a) => { lastPrompt = a.system + a.user; return nextLLM(); } }).listen(0);
  base = `http://localhost:${server.address().port}`;
  let c = await client();
  assert.equal((await c.get('/api/projects')).status, 401);
  assert.equal((await c.post('/api/login', { email: 'admin@novaworks.example', password: 'nope' })).status, 401);

  const admin = await client(); assert.equal((await admin.login('admin')).status, 200);
  assert.equal((await admin.post('/api/transcript', { transcript: '  ' })).status, 400);

  // failures save nothing
  nextLLM = async () => { throw new Error('boom'); };
  assert.equal((await admin.post('/api/transcript', { transcript: 'x' })).status, 502);
  nextLLM = async () => 'not json';
  assert.equal((await admin.post('/api/transcript', { transcript: 'x' })).status, 502);
  const bad = JSON.parse(JSON.stringify(GOOD)); bad.projects[2].tasks[3].assigneeId = 'DEV99'; bad.projects[0].tasks[0].deadline = '2026-11-01';
  nextLLM = async () => JSON.stringify(bad);
  let r = await admin.post('/api/transcript', { transcript: 'x' });
  assert.equal(r.status, 422); assert.equal(r.data.issues.length, 2); assert.equal((await count('projects')) + (await count('tasks')), 0);
  // correct + revalidate
  r = await admin.post('/api/transcript/commit', { draft: GOOD });
  assert.equal(r.status, 200); assert.equal(r.data.projectCount, 3); assert.equal(r.data.taskCount, 12);
  assert.ok(!/Demo123|passwordHash|@novaworks/.test(lastPrompt), 'no secrets/emails sent to AI');

  const ap = (await admin.get('/api/projects')).data.projects;
  assert.deepEqual(ap.map((p) => p.totalHours).sort(), [38, 40, 46]);
  const urban = ap.find((p) => p.name.startsWith('UrbanCart')), quick = ap.find((p) => p.name.startsWith('Quick'));

  const ayesha = await client(); await ayesha.login('ayesha');
  const pr = (await ayesha.get('/api/projects')).data.projects;
  assert.equal(pr.length, 1); assert.equal(pr[0].name, 'UrbanCart Website');
  assert.equal((await ayesha.get(`/api/projects/${quick.id}`)).status, 403);
  assert.equal((await ayesha.get(`/api/projects/${urban.id}`)).data.project.tasks.length, 4);

  const ali = await client(); await ali.login('ali');
  assert.equal((await ali.get('/api/tasks/mine')).data.tasks.length, 3);
  const ad = (await ali.get(`/api/projects/${urban.id}`)).data.project;
  assert.equal(ad.tasks.length, 3); assert.ok(ad.tasks.every((t) => t.assigneeId === 'DEV01'));
  assert.equal((await ali.get(`/api/projects/${quick.id}`)).status, 403);
  assert.equal((await ali.post('/api/transcript', { transcript: 'x' })).status, 403);
  assert.equal((await ali.post('/api/transcript/commit', { draft: GOOD })).status, 403);

  const hamza = await client(); await hamza.login('hamza');
  const ht = (await hamza.get('/api/tasks/mine')).data.tasks;
  assert.equal(ht.length, 2); assert.deepEqual(ht.map((t) => t.projectName).sort(), ['QuickServe Mobile App', 'UrbanCart Website']);
  assert.equal((await hamza.get('/api/projects')).data.projects.length, 2);
  assert.equal((await ali.get('/api/team')).data.team.length, 10);
  // logout clears the session
  await ali.post('/api/logout'); assert.equal((await ali.get('/api/me')).status, 401);
  // a forged/tampered cookie is rejected
  const r2 = await fetch(base + '/api/me', { headers: { cookie: 'nw_session=' + Buffer.from('{"userId":"ADMIN"}').toString('base64') } });
  assert.equal(r2.status, 401);
  console.log('ALL TESTS PASSED'); server.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
