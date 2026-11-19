// Offline + interaction smoke test: load the guide with the network off,
// tick trophies, reload, confirm persistence, export and re-import.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
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
const ok = (name, cond, detail = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) failures++; };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const failedReqs = [];
  page.on('requestfailed', (r) => failedReqs.push(r.url()));
  page.on('pageerror', (e) => { console.log('  !! pageerror', e.message); failures++; });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  ok('loads online', true);
  // Block everything except this app's own server, then reload: the app
  // must still work (it loads nothing over the network). Chromium's offline
  // emulation also blocks localhost, so route-blocking is the honest test.
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(`http://localhost:${PORT}`) || url.startsWith('data:')) route.continue();
    else route.abort();
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  ok('loads with non-local requests blocked', true, `failed requests: ${failedReqs.length}`);
  const count = await page.evaluate(() => document.querySelectorAll('.trophy').length);
  ok('renders 55 trophy cards offline', count === 55, `${count} cards`);
  // Tick two trophies + set a counter, reload, check persistence.
  await page.evaluate(() => {
    document.querySelector('#trophy-15 input[type=checkbox]').click();
    document.querySelector('#trophy-21 input[type=checkbox]').click();
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  const progress = await page.evaluate(() => document.getElementById('progressText').textContent);
  ok('progress persists across reload', progress === '2 of 55 earned', progress);
  // Export downloads a JSON with the earned ids.
  const dl = page.waitForEvent('download', { timeout: 10000 });
  await page.click('#export');
  const file = await dl;
  const tmp = '/tmp/export-test.json';
  await file.saveAs(tmp);
  const exported = JSON.parse(readFileSync(tmp, 'utf8'));
  ok('export contains earned ids', JSON.stringify(exported.earned) === '[15,21]', JSON.stringify(exported.earned));
  // Reset, then import the export back.
  await page.evaluate(() => { window.confirm = () => true; });
  await page.click('#reset');
  const afterReset = await page.evaluate(() => document.getElementById('progressText').textContent);
  ok('reset clears progress', afterReset === '0 of 55 earned', afterReset);
  await page.setInputFiles('#import', tmp);
  await page.waitForFunction(() => document.getElementById('progressText').textContent === '2 of 55 earned', null, { timeout: 10000 });
  ok('import restores progress', true);
  // Spoiler toggle hides a hidden story trophy's name.
  const hiddenName = await page.evaluate(() => {
    const h = document.querySelector('#trophy-4 h3').textContent;
    return h;
  });
  ok('spoiler hides hidden story trophy', hiddenName.includes('Hidden trophy'), hiddenName);
  // Missable filter shows exactly the flagged trophy.
  await page.click('.chip:nth-child(3)'); // Missable chip (All, Story, Missable)
  const shown = await page.evaluate(() => document.querySelectorAll('.trophy').length);
  ok('missable filter shows 1 trophy', shown === 1, `${shown} shown`);
  await page.unroute('**/*');
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `FAILURES: ${failures}` : 'offline + interaction smoke test passed');
process.exit(failures ? 1 : 0);
