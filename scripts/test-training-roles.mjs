import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4174';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'C:/Users/CS/AppData/Local/Temp/opencode/shots3';
const results = [];
const errors = [];
function check(name, ok, extra = '') {
  const line = `${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`;
  results.push(line);
  console.log(line);
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

async function asRole(role, demoEmail) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 150)));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([email]) => {
    localStorage.clear(); sessionStorage.clear();
    // Real demo session: the app restores role + user from this marker.
    sessionStorage.setItem('wst-demo-session', email);
    localStorage.setItem('wst-lang', 'en');
  }, [demoEmail]);
  return { ctx, page };
}

// ── Supervisor ──
{
  const { ctx, page } = await asRole('supervisor', 'sami@wst.sa');
  await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('SUP url /training', page.url().endsWith('/training'), page.url());
  check('SUP management tabs', (await page.getByRole('button', { name: /^(Courses|Sessions|Students|Mentors)$/ }).count()) === 4);
  check('SUP schedule btn', (await page.getByRole('button', { name: 'Schedule Session' }).count()) === 1);
  check('SUP no student tabs', (await page.getByRole('button', { name: /^(My Sessions|My Results|My Progress|Certificate)$/ }).count()) === 0);
  check('SUP no mentor tabs', (await page.getByRole('button', { name: /^(My Groups|Attendance|Returned)$/ }).count()) === 0);
  await page.screenshot({ path: `${OUT}/training.png` });
  await ctx.close();
}

// ── Mentor ──
{
  const { ctx, page } = await asRole('mentor', 'mentor@wst.sa');
  await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('MENTOR url /training', page.url().endsWith('/training'), page.url());
  check('MENTOR tabs', (await page.getByRole('button', { name: /^(My Sessions|My Groups|Attendance|Assessments)$/ }).count()) === 4
    && (await page.getByRole('button', { name: /^Returned/ }).count()) === 1);
  check('MENTOR no schedule', (await page.getByRole('button', { name: 'Schedule Session' }).count()) === 0);
  check('MENTOR no sign-off btn', (await page.getByRole('button', { name: /sign off/i }).count()) === 0);
  check('MENTOR no supervisor tabs', (await page.getByRole('button', { name: /^(Courses|Students|Mentors)$/ }).count()) === 0);
  // attendance interaction
  await page.getByRole('button', { name: 'Attendance', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Save Attendance' }).click();
  await page.waitForTimeout(300);
  check('MENTOR attendance saves', (await page.getByText(/attendance saved/i).count()) > 0);
  // assessment entry validation + submit
  await page.getByRole('button', { name: 'Assessments', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Submit Result' }).click();
  await page.waitForTimeout(300);
  check('MENTOR entry validation', (await page.getByText(/required/i).first().count()) > 0);
  await page.screenshot({ path: `${OUT}/training-mentor.png` });
  // returned correction flow
  await page.getByRole('button', { name: /^Returned/ }).click();
  await page.waitForTimeout(300);
  check('MENTOR returned badge', (await page.getByText(/evidence photo/i).count()) > 0);
  await page.getByRole('button', { name: 'Correct' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Resubmit for Sign-off' }).click();
  await page.waitForTimeout(400);
  check('MENTOR resubmit works', (await page.getByText(/resubmitted/i).count()) > 0);
  await ctx.close();
}

// ── Student ──
{
  const { ctx, page } = await asRole('student', 'rayan@wst.sa');
  await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('STUDENT url /training', page.url().endsWith('/training'), page.url());
  check('STUDENT tabs', (await page.getByRole('button', { name: /^(My Sessions|My Results|My Progress|Certificate)$/ }).count()) === 4);
  check('STUDENT no admin actions', (await page.getByRole('button', { name: /^(Schedule Session|Publish|Edit|Submit Result|Save Attendance)$/ }).count()) === 0);
  check('STUDENT no other students', (await page.getByText(/Abdullah Al-Faraj|Lama Al-Saqr|Turki Al-Dosari|Maha Al-Otaibi/).count()) === 0);
  check('STUDENT no supervisor tabs', (await page.getByRole('button', { name: /^(Courses|Students|Mentors|My Groups|Attendance|Returned)$/ }).count()) === 0);
  await page.screenshot({ path: `${OUT}/training-catalog-student.png` });
  await ctx.close();
}

// ── Unauthorized (manager) ──
{
  const { ctx, page } = await asRole('manager', 'ahmed@wst.sa');
  await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('MANAGER blocked from /training', !page.url().endsWith('/training'), page.url());
  await ctx.close();
}

// ── Mentor direct routes ──
{
  const { ctx, page } = await asRole('mentor', 'mentor@wst.sa');
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  check('MENTOR settings (password change)', page.url().endsWith('/settings'), page.url());
  await page.goto(BASE + '/assessments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  check('MENTOR blocked from /assessments', !page.url().endsWith('/assessments'), page.url());
  await ctx.close();
}

await browser.close();
console.log(errors.length === 0 ? 'ZERO page errors' : 'ERRORS:\n' + errors.join('\n'));
