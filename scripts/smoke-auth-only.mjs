import { chromium } from 'playwright-core';

const BASE = process.env.SMOKE_BASE || 'http://localhost:8443';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EMAIL = process.env.WST_SMOKE_EMAIL;
const PASSWORD = process.env.WST_SMOKE_PASSWORD;

// Minimal: login -> home -> logout -> back. Exit 0 only if full cycle passes.
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on('pageerror', (e) => problems.push('PAGEERROR: ' + String(e).slice(0, 200)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await page.getByLabel(/email/i).fill(EMAIL);
await page.getByLabel(/password/i).first().fill(PASSWORD);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForTimeout(3000);
if (page.url() === BASE + '/' || page.url().endsWith('/')) {
  console.log('LOGIN-FAILED (still on login — likely 429 or bad creds)');
  process.exit(1);
}
console.log('LOGIN-OK ->', page.url());
// visit two data routes
for (const r of ['/notifications', '/training']) {
  await page.goto(BASE + r, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const blank = ((await page.textContent('body')) || '').trim().length < 20;
  console.log(r, '->', page.url(), blank ? 'BLANK' : 'RENDER-OK');
  if (blank) problems.push(r + ' blank');
}
// logout via topbar button
const logoutBtn = page.getByTitle(/logout/i);
if (!(await logoutBtn.count())) {
  problems.push('logout button not found');
} else {
  await logoutBtn.first().click();
  await page.waitForTimeout(1500);
  console.log('logout ->', page.url());
  await page.goBack().catch(() => {});
  await page.waitForTimeout(1200);
  const backUrl = page.url();
  const backText = ((await page.textContent('body')) || '').trim();
  const leaked = backText.length > 200 && backUrl !== BASE + '/' && !backUrl.endsWith('/');
  console.log('back ->', backUrl, leaked ? 'POSSIBLE-LEAK' : 'OK');
  if (leaked) problems.push('back after logout shows authenticated UI');
}
await browser.close();
console.log(problems.length ? 'FAIL: ' + problems.join(' | ') : 'AUTH-CYCLE: PASS');
process.exit(problems.length ? 1 : 0);
