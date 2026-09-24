import { chromium } from 'playwright-core';
import path from 'node:path';

const BASE = 'http://localhost:4173';
const OUT = 'C:/Users/CS/AppData/Local/Temp/opencode/shots';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const shots = [
  { file: 'login.png', role: null, route: '/' },
  { file: 'signup.png', role: null, route: '/signup' },
  { file: 'forgot-password.png', role: null, route: '/forgot-password' },
  { file: 'dashboard.png', role: 'manager', route: '/dashboard' },
  { file: 'customers.png', role: 'manager', route: '/customers' },
  { file: 'vehicles.png', role: 'manager', route: '/vehicles' },
  { file: 'workshops.png', role: 'manager', route: '/job-cards' },
  { file: 'workshop-details.png', role: 'manager', route: '/job-cards/JC-2024-0912' },
  { file: 'inventory.png', role: 'manager', route: '/inventory' },
  { file: 'purchasing.png', role: 'manager', route: '/purchasing' },
  { file: 'assessments.png', role: 'manager', route: '/assessments' },
  { file: 'competencies.png', role: 'manager', route: '/competencies' },
  { file: 'reports.png', role: 'manager', route: '/reports' },
  { file: 'ai-insights.png', role: 'manager', route: '/ai-insights' },
  { file: 'settings.png', role: 'manager', route: '/settings' },
  { file: 'training.png', role: 'supervisor', route: '/training' },
  { file: 'role-matrix.png', role: 'supervisor', route: '/role-matrix' },
  { file: 'my-training.png', role: 'student', route: '/my-training' },
  { file: 'training-catalog-student.png', role: 'student', route: '/training' },
  { file: 'my-jobs.png', role: 'technician', route: '/my-jobs' },
  { file: 'invoices.png', role: 'finance', route: '/invoices' },
];

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const shot of shots) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([role]) => {
    localStorage.clear();
    if (role) localStorage.setItem('wst-role', role);
    localStorage.setItem('wst-lang', 'en');
  }, [shot.role]);
  await page.goto(BASE + shot.route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, shot.file) });
  console.log('captured', shot.file);
}

await browser.close();
