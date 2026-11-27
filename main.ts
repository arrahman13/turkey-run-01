// Gobble Dash: Thanksgiving Escape — entry program (Node 22, standard library only).
//
// The game is this directory's game/ folder: plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library, no network request). This program
// hands it in: it copies game/ and screenshots/ beside this file to /output (or to
// $MAKEFUN_OUTPUT_DIR outside the grader's container) and writes /output/dossier.json, the
// summary the judge reads, built with the vendored make.fun library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally first with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or one over
// 256 KiB; more than 993 files in game/ or 48 MiB of game files, in all, or a path under
// game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its screenshots/
// and dossier.json).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Count the files under a directory, recursively, for the run summary. */
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? countFiles(path) : 1;
  }
  return total;
}

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
  throw new Error(`main.ts: no game/ directory beside this file (looked in ${gameDir})`);
}
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('main.ts: game/index.html is missing — the game has no entry page');
}

// Fail loudly here, not at the gate, when a screenshot is missing or over the cap.
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir)
    .filter((name) => statSync(join(shotsDir, name)).isFile())
    .sort();
  if (shots.length === 0) throw new Error('main.ts: screenshots/ is empty — the entry needs 3 or 4 renders');
  if (shots.length > CAPS.screenshots.max) {
    throw new Error(`main.ts: ${shots.length} screenshots, but the cap is ${CAPS.screenshots.max}`);
  }
  for (const name of shots) {
    if (!/\.(jpg|jpeg|png)$/i.test(name)) {
      throw new Error(`main.ts: screenshot ${name} is not a JPEG or PNG`);
    }
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > CAPS.screenshots.max_bytes) {
      throw new Error(`main.ts: screenshot ${name} is ${bytes} bytes, over the ${CAPS.screenshots.max_bytes} cap`);
    }
  }
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);

const gameFiles = countFiles(join(out, 'game'));
const shotFiles = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).filter((name) => statSync(join(out, 'screenshots', name)).isFile()).length
  : 0;
console.log(`gobble-dash: copied ${gameFiles} game files and ${shotFiles} screenshots to ${out}`);
console.log(`gobble-dash: dossier.json is ${dossier.length} bytes`);
