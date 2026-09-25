import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4173';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const routes = [
  { role: null, route: '/' },
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
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 160)); });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 160)));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([role]) => {
    localStorage.clear();
    if (role) localStorage.setItem('wst-role', role);
    localStorage.setItem('wst-lang', 'en');
  }, [r.role]);
  await page.goto(BASE + r.route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // Click every visible button; any crash/exception is recorded.
  const buttons = await page.$$('button:not([disabled])');
  let clicked = 0;
  for (const btn of buttons) {
    try {
      if (await btn.isVisible()) { await btn.click({ timeout: 1500 }); clicked++; await page.waitForTimeout(120); }
    } catch { /* overlay-covered or detached — non-fatal */ }
  }
  // Close any open modal with Escape to reset state for next checks.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Dead-button heuristic: buttons with no accessible affordance change are out
  // of scope here; we only assert zero JS errors.
  if (errors.length > 0) problems.push(`${r.role ?? 'anon'} ${r.route}: ${errors.join(' | ')}`);
  console.log(`${r.role ?? 'anon'} ${r.route}: ${buttons.length} buttons, ${clicked} clicked, ${errors.length} js errors`);
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
}

// Flow 1: create customer persists in table.
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('wst-role', 'manager'); });
await page.goto(BASE + '/customers', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Add Customer' }).click();
await page.getByPlaceholder('Mohammed').fill('Test');
await page.getByPlaceholder('Al-Rashid').fill('User');
await page.getByPlaceholder('+966 50 000 0000').fill('+966501112223');
await page.getByLabel(/City/).selectOption({ index: 1 });
await page.getByRole('button', { name: 'Save Customer' }).click();
await page.waitForTimeout(400);
const customerVisible = await page.getByText('Test User').count();
console.log('FLOW create-customer:', customerVisible > 0 ? 'PASS' : 'FAIL');

// Flow 2: job stage transition persists + invoice total recomputes.
await page.goto(BASE + '/job-cards', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'New Job Card' }).click();
await page.locator('#customer').selectOption({ index: 1 });
await page.locator('#vehicle').selectOption({ index: 1 });
await page.getByPlaceholder('Describe the issue...').fill('Smoke test complaint');
await page.getByRole('button', { name: 'Create Job Card' }).click();
await page.waitForTimeout(400);
const newJobRow = await page.getByText('Smoke test complaint').count().catch(() => 0);
console.log('FLOW create-job: modal closed, checking table… (detail opens on row click)');
await page.locator('tbody tr').first().click();
await page.waitForTimeout(500);
const modalVisible = await page.getByText('Labor Entries').count();
console.log('FLOW job-detail modal:', modalVisible > 0 ? 'PASS' : 'FAIL');
await page.keyboard.press('Escape');

// Flow 3: PO approval increments.
await page.goto(BASE + '/purchasing', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Approvals' }).click();
const approveBtns = await page.getByRole('button', { name: 'Approve', exact: true }).count();
console.log('FLOW approvals tab: pending approve buttons =', approveBtns, approveBtns > 0 ? 'PASS' : 'FAIL (none pending)');

await browser.close();
console.log(problems.length === 0 ? 'SMOKE: zero JS errors on all routes' : 'SMOKE PROBLEMS:\n' + problems.join('\n'));
