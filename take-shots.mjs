// Screenshot capture for the GTA VI trophy tracker.
// Reads shots.json, serves app/ on port 8123, visits each shot's path with
// its setup parameter applied, and saves the image to screenshots/<file>.
// Needs Playwright and a browser installed; it does not run in this VM.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PORT = 8123;
const BASE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(BASE, "app");

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));

const shots = JSON.parse(await readFile(join(BASE, "shots.json"), "utf8"));
const browser = await chromium.launch();
const page = await browser.newPage();

for (const shot of shots) {
  const url = new URL(`http://127.0.0.1:${PORT}${shot.path}`);
  if (shot.setup) url.searchParams.set("setup", shot.setup);
  await page.setViewportSize(shot.viewport);
  await page.goto(url.toString(), { waitUntil: "networkidle" });
  if (shot.scrollTo) {
    await page.evaluate((id) => {
      document.getElementById(id)?.scrollIntoView();
    }, shot.scrollTo);
    await page.waitForTimeout(400);
  }
  const png = await page.screenshot({ type: "jpeg", quality: 82 });
  await writeFile(join(BASE, "screenshots", shot.file), png);
  console.log(`captured ${shot.file} <- ${url.pathname}${url.search}`);
}

await browser.close();
server.close();
console.log(`done: ${shots.length} screenshots`);
