// Takes the entry's screenshots with Playwright + the cached Chromium build.
//   node take-shots.mjs [shots.json] [out-dir]
// Serves app/ itself (node serve.ts --port 8123), opens each scene from
// shots.json, waits for window.__shotReady, saves a JPEG, and checks the
// gate's screenshot limits (<= 256 KiB, long side <= 1280, short side >= 480).
// Also asserts no request leaves localhost.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/pwtest/node_modules/playwright-core');

const here = fileURLToPath(new URL('.', import.meta.url));
const shotsFile = process.argv[2] ?? join(here, 'shots.json');
const outDir = process.argv[3] ?? join(here, 'screenshots');
const shots = JSON.parse(readFileSync(shotsFile, 'utf8'));
mkdirSync(outDir, { recursive: true });

const PORT = 8123;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('serve.ts did not start')), 10000);
  server.stdout.on('data', () => { clearTimeout(timer); resolve(); });
  server.stderr.on('data', (d) => process.stderr.write(d));
});

const exe = process.env.CHROMIUM_EXE
  ?? '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--force-color-profile=srgb'] });

const KEY = 'gta6-trophy-guide-v1';
const SETUPS = {
  checkSome: `localStorage.setItem('${KEY}', JSON.stringify({earned:[2,3,15,21,44],counts:{15:137},spoiler:true}))`,
  spoilersOff: `localStorage.setItem('${KEY}', JSON.stringify({earned:[],counts:{},spoiler:false}))`,
  spoilersOn: `localStorage.setItem('${KEY}', JSON.stringify({earned:[],counts:{},spoiler:true}))`,
};

let failures = 0;
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.viewport.width, height: shot.viewport.height } });
    const outside = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith(`http://localhost:${PORT}`) && !url.startsWith('data:')) outside.push(url);
    });
    page.on('pageerror', (err) => console.log(`  !! page error in ${shot.file}: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`  !! console error in ${shot.file}: ${msg.text()}`);
    });
    const url = `http://localhost:${PORT}${shot.path}`;
    if (shot.setup) {
      // Seed localStorage before the page loads, so the first render uses it.
      await page.addInitScript(SETUPS[shot.setup]);
    }
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
    if (shot.scrollTo) {
      await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), shot.scrollTo);
    }
    await page.waitForTimeout(300);
    const file = join(outDir, shot.file);
    await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
    const size = statSync(file).size;
    const ok = size <= 262144 && shot.viewport.width <= 1280 && Math.min(shot.viewport.width, shot.viewport.height) >= 480;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${shot.file} ${shot.viewport.width}x${shot.viewport.height} ${size} bytes${outside.length ? ` EXTERNAL REQUESTS: ${outside.join(', ')}` : ''}`);
    if (!ok || outside.length) failures++;
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `FAILURES: ${failures}` : 'all shots ok');
process.exit(failures ? 1 : 0);
