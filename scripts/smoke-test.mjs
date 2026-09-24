import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4173';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Routes reachable per role after the Workshop Manager restructure.
const routes = [
  { role: null, route: '/' },
  { role: null, route: '/signup' },
  { role: null, route: '/forgot-password' },
  { role: 'manager', route: '/dashboard' },
  { role: 'manager', route: '/customers' },
  { role: 'manager', route: '/vehicles' },
  { role: 'manager', route: '/job-cards' },
  { role: 'manager', route: '/inventory' },
  { role: 'manager', route: '/purchasing' },
  { role: 'manager', route: '/assessments' },
  { role: 'manager', route: '/competencies' },
  { role: 'manager', route: '/reports' },
  { role: 'manager', route: '/ai-insights' },
  { role: 'manager', route: '/settings' },
  { role: 'supervisor', route: '/training' },
  { role: 'supervisor', route: '/role-matrix' },
  { role: 'student', route: '/my-training' },
  { role: 'student', route: '/training' },
  { role: 'technician', route: '/my-jobs' },
  { role: 'finance', route: '/invoices' },
];

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];

for (const r of routes) {
  const errors = [];
  const onConsole = (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 160)); };
  const onPageError = (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 160));
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([role]) => {
    localStorage.clear();
    if (role) localStorage.setItem('wst-role', role);
    localStorage.setItem('wst-lang', 'en');
  }, [r.role]);
  await page.goto(BASE + r.route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const buttons = await page.$$('button:not([disabled])');
  let clicked = 0;
  for (const btn of buttons) {
    try {
      if (await btn.isVisible()) { await btn.click({ timeout: 1500 }); clicked++; await page.waitForTimeout(120); }
    } catch { /* overlay-covered or detached — non-fatal */ }
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (errors.filter((e) => !e.includes('favicon')).length > 0) {
    problems.push(`${r.role ?? 'anon'} ${r.route}: ${errors.join(' | ')}`);
  }
  console.log(`${r.role ?? 'anon'} ${r.route}: ${buttons.length} buttons, ${clicked} clicked, ${errors.length} js errors`);
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
}

// Flow 1: demo login (backend down) lands on the manager home.
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.getByPlaceholder('you@wst.sa').fill('ahmed@wst.sa');
await page.locator('input[type="password"]').fill('Demo@1234');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL('**/dashboard', { timeout: 8000 }).catch(() => {});
console.log('FLOW demo-login:', page.url().includes('/dashboard') ? 'PASS' : `FAIL (${page.url()})`);

// Flow 2: manager is redirected away from /training (moved to student).
await page.evaluate(() => localStorage.setItem('wst-role', 'manager'));
await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
console.log('FLOW manager-blocked-training:', !page.url().includes('/training') ? `PASS (at ${page.url()})` : 'FAIL (still on /training)');

// Flow 3: student sees training catalog read-only (no schedule/publish/edit).
await page.evaluate(() => localStorage.setItem('wst-role', 'student'));
await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const manageBtns = await page.getByRole('button', { name: /schedule session|publish|edit/i }).count();
console.log('FLOW student-readonly-training:', manageBtns === 0 ? 'PASS' : `FAIL (${manageBtns} management buttons visible)`);

// Flow 4: supervisor sees the standalone role matrix.
await page.evaluate(() => localStorage.setItem('wst-role', 'supervisor'));
await page.goto(BASE + '/role-matrix', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const matrixVisible = await page.getByText('Permission Matrix').count();
console.log('FLOW supervisor-role-matrix:', matrixVisible > 0 ? 'PASS' : 'FAIL');

await browser.close();
console.log(problems.length === 0 ? 'SMOKE: zero JS errors on all routes' : 'SMOKE PROBLEMS:\n' + problems.join('\n'));
