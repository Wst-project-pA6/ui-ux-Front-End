import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://localhost:8443';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADMIN_EMAIL = 'demo.admin@demo.wst.local';
const ADMIN_PW = 'Wst!Demo2026pass123';
const ADVISOR_EMAIL = 'demo.advisor@demo.wst.local';
const ADVISOR_PW = 'Wst!Demo2026pass12';
const TEST_EMAIL = 'frontend.test1@demo.wst.local';
const TEST_PW = 'Frontend!Test1234';
const NEW_PW = 'Frontend!Changed5678';

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = [];
const errors = [];
function check(name, ok, extra = '') {
  const line = `${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`;
  results.push(line);
  fs.appendFileSync('C:/Users/CS/AppData/Local/Temp/opencode/test-out.txt', line + '\n');
}

async function newPage(label) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 150)));
  page.on('response', (r) => {
    if (r.url().includes('/api/v1/')) {
      fs.appendFileSync('C:/Users/CS/AppData/Local/Temp/opencode/api-trace.txt', `${label} ${r.status()} ${r.url().split('/api/v1/')[1]}\n`);
    }
  });
  return { ctx, page };
}

/** Login with one 429-aware retry (test suite must not hammer the limiter). */
async function loginAs(page, email, pw) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('you@wst.sa').fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForTimeout(4000);
  const limited = await page.getByText(/too many attempts/i).count();
  if (limited > 0) {
    const m = (await page.getByText(/too many attempts/i).first().textContent())?.match(/(\d+)/);
    const waitS = Math.min(120, Number(m?.[1] ?? 60) + 5);
    console.log(`  (rate limited, waiting ${waitS}s)`);
    await page.waitForTimeout(waitS * 1000);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.waitForTimeout(4000);
  }
}

// ── Admin context (single login, reused) ──
{
  const { page } = await newPage('ctx');
  await loginAs(page, ADMIN_EMAIL, ADMIN_PW);
  await page.waitForURL('**/users', { timeout: 25000 }).catch(() => {});
  check('admin login lands on /users', page.url().includes('/users'), page.url());
  try {
    await page.getByText('Nadia Fathy').waitFor({ timeout: 25000 });
    await page.locator('tbody tr').first().waitFor({ timeout: 25000 });
  } catch {
    await page.screenshot({ path: 'C:/Users/CS/AppData/Local/Temp/opencode/fail-admin-landing.png' });
  }
  check('header shows Nadia Fathy', (await page.getByText('Nadia Fathy').count()) > 0);
  check('Users nav visible (users.read)', (await page.getByRole('link', { name: /^users$/i }).count()) > 0);

  // search
  await page.waitForTimeout(2500);
  try {
    await page.getByPlaceholder(/search by name/i).waitFor({ timeout: 60000 });
  } catch {
    await page.screenshot({ path: 'C:/Users/CS/AppData/Local/Temp/opencode/fail-search.png' });
    console.log('SEARCH-BOX missing. url=', page.url());
    throw new Error('search box missing');
  }
  const rowsBefore = await page.locator('tbody tr').count();
  await page.getByPlaceholder(/search by name/i).fill('advisor');
  await page.waitForTimeout(1500);
  const rowsAfter = await page.locator('tbody tr').count();
  check('users search filters', rowsAfter >= 1 && rowsAfter <= rowsBefore, `${rowsBefore} -> ${rowsAfter}`);
  await page.screenshot({ path: 'C:/Users/CS/AppData/Local/Temp/opencode/users-admin.png' });

  // create (idempotent: duplicate is an accepted outcome)
  await page.getByPlaceholder(/search by name/i).fill('');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Create User' }).click();
  await page.getByPlaceholder('name@example.com').fill(TEST_EMAIL);
  await page.getByPlaceholder('Full name').fill('Frontend Test One');
  await page.getByPlaceholder('at-least-12-chars').fill(TEST_PW);
  await page.getByRole('button', { name: /^create user$/i }).last().click();
  await page.waitForTimeout(3500);
  const dup = await page.getByText('This email is already used.').count();
  const created = await page.getByText('User created.').count();
  check('create test user (created or duplicate)', created > 0 || dup > 0);
  if (created > 0) await page.screenshot({ path: 'C:/Users/CS/AppData/Local/Temp/opencode/users-create.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // detail + assign role
  await page.getByPlaceholder(/search by name/i).fill('frontend.test1');
  await page.waitForTimeout(1500);
  await page.locator('tbody tr').first().click();
  await page.waitForTimeout(3000);
  check('user detail opens', (await page.getByText('Service Advisor').count()) > 0);
  const svcCheckbox = page.locator('label', { hasText: 'Service Advisor' }).locator('input[type="checkbox"]');
  if ((await svcCheckbox.count()) > 0 && !(await svcCheckbox.isChecked())) {
    await svcCheckbox.check();
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForTimeout(3000);
  }
  check('role assignment saves cleanly', (await page.getByText(/forbidden|save failed/i).count()) === 0);
  await page.screenshot({ path: 'C:/Users/CS/AppData/Local/Temp/opencode/users-detail.png' });
  await page.keyboard.press('Escape');

  // own account protection
  await page.getByPlaceholder(/search by name/i).fill('demo.admin');
  await page.waitForTimeout(1500);
  await page.locator('tbody tr').first().click();
  await page.waitForTimeout(3000);
  const disabledBoxes = await page.locator('input[type="checkbox"][disabled]').count();
  check('self controls disabled', disabledBoxes > 0, `${disabledBoxes} disabled`);
  await page.keyboard.press('Escape');
  await page.context().close();
}

// ── Wrong password (own context, unknown account to spare budgets) ──
{
  const { page } = await newPage('wrong');
  await loginAs(page, 'nobody@demo.wst.local', 'wrong-password-123');
  await page.waitForTimeout(2500);
  check('wrong credentials message', (await page.getByText('Wrong email or password.').count()) > 0);
  await page.context().close();
}

// ── Advisor (no Users access) ──
{
  const { page } = await newPage('advisor');
  await loginAs(page, ADVISOR_EMAIL, ADVISOR_PW);
  await page.waitForURL('**/job-cards', { timeout: 25000 }).catch(() => {});
  check('advisor lands on /job-cards', page.url().includes('/job-cards'), page.url());
  check('advisor has no Users nav', (await page.getByRole('link', { name: /^users$/i }).count()) === 0);
  try {
    await page.goto(BASE + '/users', { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch { /* redirect aborts the wait — intended */ }
  await page.waitForTimeout(1500);
  check('advisor blocked from /users', !page.url().includes('/users'), page.url());
  await page.context().close();
}

// ── Test user: try current password first (idempotent across runs) ──
{
  const { page } = await newPage('testuser');
  let loggedIn = false;
  for (const pw of [NEW_PW, TEST_PW]) {
    await loginAs(page, TEST_EMAIL, pw);
    await page.waitForTimeout(2500);
    if (page.url().includes('/job-cards') || page.url().includes('/change-password')) {
      loggedIn = pw;
      break;
    }
  }
  check('test user login works', !!loggedIn, String(loggedIn ? 'ok' : page.url()));
  if (page.url().includes('/change-password')) {
    const currentPw = loggedIn;
    check('new user forced to change-password', true, page.url());
    const pwFields = page.locator('input[type="password"]');
    await pwFields.nth(0).fill(currentPw);
    await pwFields.nth(1).fill(currentPw);
    await pwFields.nth(2).fill(currentPw);
    await page.getByRole('button', { name: /change password/i }).click();
    await page.waitForTimeout(3000);
    check('password reuse rejected', (await page.getByText(/different from the current/i).count()) > 0);
    await pwFields.nth(1).fill(NEW_PW);
    await pwFields.nth(2).fill(NEW_PW);
    await page.getByRole('button', { name: /change password/i }).click();
    await page.waitForURL('**/', { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1500);
    check('changed -> login with message', (await page.getByText(/sign in with your new password/i).count()) > 0, page.url());
    await page.getByPlaceholder('you@wst.sa').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(NEW_PW);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.waitForURL('**/job-cards', { timeout: 25000 }).catch(() => {});
    check('login with new password works', page.url().includes('/job-cards'), page.url());
  }

  // reload keeps session (refresh flow)
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  check('reload restores session', page.url().includes('/job-cards'), page.url());

  // logout + back: build real history first (login replaces, so visit a
  // second page), then logout, then back must show the login screen.
  await page.getByRole('link', { name: /^customers$/i }).click();
  await page.waitForURL('**/customers', { timeout: 15000 }).catch(() => {});
  // logout + back (desktop header button — what users actually click)
  await page.locator('header.hidden').getByRole('button', { name: /^logout$/i }).click();
  await page.waitForURL('**/', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.goBack();
  await page.waitForTimeout(4000);
  const afterBack = page.url();
  let rtAfter = 'unknown';
  let signinVisible = -1;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      rtAfter = await page.evaluate(() => sessionStorage.getItem('wst-refresh-token'));
      signinVisible = await page.getByRole('button', { name: /^sign in$/i }).count();
      break;
    } catch {
      await page.waitForTimeout(1000);
    }
  }
  console.log(`BACK-STATE url=${afterBack} rt=${rtAfter ? 'PRESENT' : 'null'} signinBtns=${signinVisible}`);
  check('back after logout shows login', signinVisible > 0, afterBack);
  await page.context().close();
}

await browser.close();
console.log(results.join('\n'));
console.log(errors.length === 0 ? 'ZERO page errors' : 'ERRORS:\n' + errors.join('\n'));
