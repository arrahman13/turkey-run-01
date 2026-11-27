[![turkey-run-game-01](https://make.fun/badge/turkey-run-game-01)](https://make.fun/bounty/turkey-run-game-01)
[![rank](https://make.fun/badge/rank/arrahman13/turkey-run-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![reward](https://make.fun/badge/reward/arrahman13/turkey-run-01.svg)](https://make.fun/bounty/turkey-run-game-01)

# Gobble Dash: Thanksgiving Escape

A turkey escape game for [Make the best turkey escape game](https://make.fun/bounty/turkey-run-game-01) on make.fun.

You are the turkey, and the farmer wants you for Thanksgiving dinner. Run 3,000 feet —
farmyard, barn, kitchen — outrun the farmer, jump the fences, pumpkins and glowing ovens,
duck the falling carving knives, grab corn and golden feathers, and hide in the haystacks
when the farmer spots you. Reach the kitchen door and you are free.

## How to play

Open `game/index.html` in a desktop browser. No build step, no network, no files outside
`game/` — it plays offline.

- **Jump:** Space / Up / W / click — clear fences, pumpkins and ovens
- **Sprint:** Right / D — run faster when the farmer is on your tail
- **Slow down:** Left / A — dawdle when a knife is about to land on your spot
- **Hide:** Down / S — duck into a haystack and ride it while the farmer loses your trail
- **Restart:** Enter / click on the end screen

The HUD shows score, distance, three hearts, the stage name and the farmer's alert meter.
The farmer chases, searches the last place he saw you, and corners you if his alert stays
high — hide to make him lose the trail. Sounds are synthesized live with WebAudio; there
are no audio files.

## Structure

- `main.ts` — the entry program (Node 22, standard library only): copies `game/` and
  `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored
  make.fun library
- `game/index.html` — the page; `game/src/main.js` — the loop and screen state machine
- `game/src/config.js` — tuning, stages, farmer, knives
- `game/src/input.js` — keyboard and mouse, edge detection
- `game/src/world.js` — the rules: stages, farmer AI, spawning, collisions, scoring
- `game/src/entities.js` — turkey, farmer, hazards, treats, haystacks and their drawing
- `game/src/render.js` — backgrounds, HUD, title and end screens
- `game/src/audio.js` — procedural WebAudio sound effects
- `game/src/shots.js` — deterministic `?shot=start|play|end&seed=1` scenes and the autopilot
- `vendor/makefun-game.ts` — copied unchanged from the kit

Serve it locally with any static server, then open http://localhost:8080.
