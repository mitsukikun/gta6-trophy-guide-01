// Smoke test for the GTA VI trophy tracker.
// Serves app/ on port 8124 with the Node http stdlib, fetches the home page
// and the trophy data, and fails loudly if either does not look right.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8124;
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "app");

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const file = join(ROOT, path);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

function fail(message) {
  console.error(`SMOKE FAIL: ${message}`);
  server.close(() => process.exit(1));
}

server.listen(PORT, async () => {
  try {
    const page = await (await fetch(`http://127.0.0.1:${PORT}/`)).text();
    if (!page.includes('id="trophyList"')) fail("home page has no #trophyList element");
    if (!page.includes('id="controls"')) fail("home page has no #controls element");
    if (!page.includes('id="roadmap"')) fail("home page has no #roadmap element");
    if (!page.includes("app.js")) fail("home page does not load app.js");

    const dataRes = await fetch(`http://127.0.0.1:${PORT}/data/trophies.json`);
    if (!dataRes.ok) fail(`trophies.json returned ${dataRes.status}`);
    const data = await dataRes.json();
    if (!Array.isArray(data.trophies) || data.trophies.length !== 55) {
      fail(`expected 55 trophies, got ${data.trophies?.length}`);
    }
    if (data.trophies.some((t) => typeof t.guide !== "string" || t.guide.length <= 50)) {
      fail("at least one trophy guide is missing or too short");
    }

    console.log("SMOKE OK: home page + 55 trophies load correctly");
    server.close(() => process.exit(0));
  } catch (err) {
    fail(err.message);
  }
});
