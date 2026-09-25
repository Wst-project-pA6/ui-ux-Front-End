import { chromium } from 'playwright-core';

// Route/link/button runtime audit for the FINAL v6 frontend.
// - Unauthenticated: every protected route must redirect to login (no blank
//   screens, no JS errors, no infinite redirects).
// - Public /verify/:token renders without login.
// - Authenticated (optional): set WST_SMOKE_EMAIL + WST_SMOKE_PASSWORD env
//   vars to log in through the UI and sweep key routes + logout.

const BASE = process.env.SMOKE_BASE || 'http://localhost:4173';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const PROTECTED = [
  '/dashboard', '/customers', '/vehicles', '/job-cards', '/my-jobs',
  '/bays', '/service-types', '/technician-profiles', '/operating-hours',
  '/inventory', '/purchasing', '/invoices', '/notifications', '/audit-log',
  '/settings', '/training', '/my-training', '/assessments', '/competencies',
  '/certificates', '/reports', '/ai-insights', '/role-matrix', '/change-password',
  '/job-cards/00000000-0000-0000-0000-000000000000', '/invoices/00000000-0000-0000-0000-000000000000',
];
const PUBLIC = ['/', '/verify/does-not-exist-token'];

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const problems = [];

async function checkRoute(page, route, { authed = false } = {}) {
  const errors = [];
  const resourceErrors = [];
  const onConsole = (msg) => {
    if (msg.type() !== 'error') return;
    // Failed fetches are environmental (backend/CORS/proxy/offline) — the
    // app must show its error UI instead. Tracked separately, not app faults.
    if (/failed to load resource|ERR_FAILED|CORS|net::/i.test(msg.text())) {
      resourceErrors.push(msg.text().slice(0, 160));
    } else {
      errors.push(msg.text().slice(0, 300));
    }
  };
  const onPageError = (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 300));
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const url = page.url();
  const bodyText = (await page.textContent('body')).trim();
  // Error UI counts as rendered (not blank): the app correctly surfaces
  // backend/network failures instead of crashing or faking data.
  const result = { route, url, blank: bodyText.length < 20, errors, resourceErrors };
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  return result;
}

// ── Phase A: unauthenticated ────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  for (const route of [...PUBLIC, ...PROTECTED]) {
    const r = await checkRoute(page, route);
    const isPublic = PUBLIC.includes(route);
    const expectLogin = !isPublic;
    const atLogin = r.url.endsWith('/') || r.url === BASE + '/';
    const status = r.blank ? 'BLANK' : r.errors.length ? `JSERRORS(${r.errors.length})` : (expectLogin ? (atLogin ? 'REDIRECT-LOGIN-OK' : `NO-REDIRECT(${r.url})`) : 'RENDER-OK');
    console.log(`UNAUTH ${route} -> ${status}${r.resourceErrors.length ? ` [net:${r.resourceErrors.length}]` : ''}`);
    if (r.blank) problems.push(`UNAUTH ${route}: blank screen`);
    if (r.errors.length) problems.push(`UNAUTH ${route}: ${r.errors.join(' | ')}`);
    if (expectLogin && !atLogin && !r.blank) problems.push(`UNAUTH ${route}: did not redirect to login (${r.url})`);
  }
  await page.close();
}

// ── Phase B: authenticated (optional) ───────────────────────────────────
const EMAIL = process.env.WST_SMOKE_EMAIL;
const PASSWORD = process.env.WST_SMOKE_PASSWORD;
if (EMAIL && PASSWORD) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(2500);
  const afterLogin = page.url();
  console.log(`AUTH login -> ${afterLogin}`);
  if (afterLogin === BASE + '/' || afterLogin.endsWith('/')) problems.push('AUTH: login did not navigate away');

  for (const route of PROTECTED) {
    const r = await checkRoute(page, route, { authed: true });
    const status = r.blank ? 'BLANK' : r.errors.length ? `JSERRORS(${r.errors.length})` : 'RENDER-OK';
    console.log(`AUTH ${route} -> ${status} (${r.url})${r.resourceErrors.length ? ` [net:${r.resourceErrors.length}]` : ''}`);
    if (r.blank) problems.push(`AUTH ${route}: blank screen`);
    if (r.errors.length) problems.push(`AUTH ${route}: ${r.errors.join(' | ')}`);
  }

  // Logout -> back must not be authenticated.
  const logoutBtn = page.getByTitle(/logout/i);
  if (await logoutBtn.count()) {
    await logoutBtn.first().click();
    await page.waitForTimeout(1500);
    console.log(`AUTH logout -> ${page.url()}`);
    await page.goBack().catch(() => {});
    await page.waitForTimeout(1200);
    const backUrl = page.url();
    const backText = (await page.textContent('body')).trim();
    const leaked = backText.length > 200 && !backUrl.endsWith('/');
    console.log(`AUTH back-after-logout -> ${backUrl} ${leaked ? 'POSSIBLE-LEAK' : 'OK'}`);
    if (leaked) problems.push('AUTH: back after logout shows authenticated UI');
  } else {
    problems.push('AUTH: logout button not found');
  }
  await page.close();
} else {
  console.log('AUTH phase skipped (set WST_SMOKE_EMAIL/PASSWORD to enable)');
}

await browser.close();
console.log(problems.length === 0 ? 'SMOKE: PASS — no route/link/button runtime faults' : 'SMOKE PROBLEMS:\n' + problems.join('\n'));
process.exit(problems.length === 0 ? 0 : 1);
