// Offline + interaction smoke test for the guide: serve it, load it with
// non-local requests blocked, tick trophies, reload to check persistence,
// export and re-import, and check the spoiler and missable filters.
// Needs Playwright + the cached Chromium build; it does not touch the network.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/pwtest/node_modules/playwright-core');
const here = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8124;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('serve did not start')), 10000);
  server.stdout.on('data', () => { clearTimeout(timer); resolve(); });
  server.stderr.on('data', (d) => process.stderr.write(d));
});
const exe = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
let failures = 0;
const check = (name, cond, detail = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) failures++; };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const failedReqs = [];
  page.on('requestfailed', (r) => failedReqs.push(r.url()));
  page.on('pageerror', (e) => { console.log('  !! pageerror', e.message); failures++; });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  check('loads online', true);
  // Block everything except this app's own server, then reload: the app must
  // still work (it loads nothing over the network). Chromium's offline
  // emulation also blocks localhost, so route-blocking is the honest test.
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(`http://localhost:${PORT}`) || url.startsWith('data:')) route.continue();
    else route.abort();
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  check('loads with non-local requests blocked', true, `failed requests: ${failedReqs.length}`);
  const count = await page.evaluate(() => document.querySelectorAll('.trophy').length);
  check('renders 55 trophy cards offline', count === 55, `${count} cards`);
  // Tick two trophies, reload, check the progress stuck.
  await page.evaluate(() => {
    document.querySelector('#trophy-15 input[type=checkbox]').click();
    document.querySelector('#trophy-21 input[type=checkbox]').click();
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  const progress = await page.evaluate(() => document.getElementById('progressText').textContent);
  check('progress persists across reload', progress === '2 of 55 earned', progress);
  // Export downloads a JSON holding the earned ids.
  const dl = page.waitForEvent('download', { timeout: 10000 });
  await page.click('#export');
  const file = await dl;
  const tmp = '/tmp/export-test.json';
  await file.saveAs(tmp);
  const exported = JSON.parse(readFileSync(tmp, 'utf8'));
  check('export contains earned ids', JSON.stringify(exported.earned) === '[15,21]', JSON.stringify(exported.earned));
  // Reset, then import the export back.
  await page.evaluate(() => { window.confirm = () => true; });
  await page.click('#reset');
  const afterReset = await page.evaluate(() => document.getElementById('progressText').textContent);
  check('reset clears progress', afterReset === '0 of 55 earned', afterReset);
  await page.setInputFiles('#import', tmp);
  await page.waitForFunction(() => document.getElementById('progressText').textContent === '2 of 55 earned', null, { timeout: 10000 });
  check('import restores progress', true);
  // The spoiler toggle keeps a hidden story trophy's name covered.
  const hiddenName = await page.evaluate(() => document.querySelector('#trophy-4 h3').textContent);
  check('spoiler hides hidden story trophy', hiddenName.includes('Hidden trophy'), hiddenName);
  // The Missable chip leaves exactly the flagged trophy showing.
  await page.click('.chip:nth-child(3)'); // Missable chip (All, Story, Missable)
  const shown = await page.evaluate(() => document.querySelectorAll('.trophy').length);
  check('missable filter shows 1 trophy', shown === 1, `${shown} shown`);
  await page.unroute('**/*');
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `FAILURES: ${failures}` : 'offline + interaction smoke test passed');
process.exit(failures ? 1 : 0);
