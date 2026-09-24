import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4174';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'wireframes';

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));

async function asRole(role) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([r]) => {
    localStorage.clear();
    if (r) localStorage.setItem('wst-role', r);
    localStorage.setItem('wst-lang', 'en');
  }, [role]);
}

// ── Supervisor ──
await asRole('supervisor');
await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const supTabs = await page.getByRole('button', { name: /^(Courses|Sessions|Students|Mentors)$/ }).count();
const scheduleBtn = await page.getByRole('button', { name: 'Schedule Session' }).count();
console.log('SUP tabs (expect 4):', supTabs, '| Schedule (expect 1):', scheduleBtn);
await page.screenshot({ path: `${OUT}/training.png` });
// Supervisor can open schedule modal and submit validation works
await page.getByRole('button', { name: 'Schedule Session' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/training-schedule.png` });
await page.keyboard.press('Escape');

// ── Student, same URL ──
await asRole('student');
await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
console.log('STUDENT url (expect /training):', page.url());
const stuTabs = await page.getByRole('button', { name: /^(My Sessions|My Results|My Progress|Certificate)$/ }).count();
const manageBtns = await page.getByRole('button', { name: /^(Schedule Session|Publish|Edit)$/ }).count();
console.log('STUDENT tabs (expect 4):', stuTabs, '| supervisor actions (expect 0):', manageBtns);
const othersData = await page.getByText(/Abdullah Al-Faraj|Lama Al-Saqr|Turki Al-Dosari|Maha Al-Otaibi/).count();
console.log('STUDENT sees other-student names (expect 0):', othersData);
await page.screenshot({ path: `${OUT}/training-catalog-student.png` });
// Student tabs navigate internally
for (const tab of ['My Results', 'My Progress', 'Certificate']) {
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.waitForTimeout(400);
}
await page.screenshot({ path: `${OUT}/training-student-results.png` });
await page.getByRole('button', { name: 'My Sessions', exact: true }).click();

// ── /my-training parity ──
await page.goto(BASE + '/my-training', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const myTabs = await page.getByRole('button', { name: /^(My Sessions|My Results|My Progress|Certificate)$/ }).count();
console.log('MY-TRAINING tabs (expect 4, same component):', myTabs);
await page.screenshot({ path: `${OUT}/my-training.png` });

// ── Unauthorized role ──
await asRole('manager');
await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
console.log('MANAGER blocked (expect not /training):', !page.url().includes('/training') ? `PASS (${page.url()})` : 'FAIL');

await browser.close();
console.log(errors.length === 0 ? 'ZERO page errors' : 'ERRORS: ' + errors.join(' | '));
