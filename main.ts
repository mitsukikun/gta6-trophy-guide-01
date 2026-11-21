// Build script for the GTA VI trophy guide entry.
// Copies the finished app (and the screenshots folder, when it exists) into
// the output directory named by MAKEFUN_OUTPUT_DIR, then writes dossier.json
// through the vendored makefun frontend helper.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outDir, { recursive: true });

// Ship the tracker app as-is; it is plain static files with no build step.
// Guard: fail fast with a clear message if the app folder is missing,
// instead of letting cpSync throw a cryptic ENOENT halfway through.
if (!existsSync(join(here, "app"))) {
  throw new Error(`app/ folder not found next to main.ts (${here})`);
}
cpSync(join(here, "app"), join(outDir, "app"), { recursive: true });

// Screenshots are captured separately and may not exist on a fresh checkout.
const shotsDir = join(here, "screenshots");
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, "screenshots"), { recursive: true });
}

// Dossier caps for this entry: a text budget of 160 KiB, up to 4 screenshots
// of at most 256 KiB each, and an app of at most 993 files / 48 MiB.
// buildDossier returns the dossier bytes; it does not write the file itself,
// so this script writes them to dossier.json in the output directory.
const dossier = await buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, "dossier.json"), dossier);

console.log(`dossier written to ${join(outDir, "dossier.json")}`);
