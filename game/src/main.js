// Gobble Dash: the loop that ties input, world, sound and paint together.
// One job: own the screen state machine (title, play, over) and drive one frame at a time.
import { CANVAS_WIDTH, CANVAS_HEIGHT, STEP } from './config.js';
import { InputReader, KEY_JUMP, KEY_START, KEY_PAUSE, KEY_MUTE } from './input.js';
import { createWorld, resetWorld, stepWorld, EVENT_SPOTTED, EVENT_HIT, EVENT_CAUGHT, EVENT_COLLECTED, EVENT_FEATHER, EVENT_ESCAPED, EVENT_OVER } from './world.js';
import { SoundBank } from './audio.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER, drawPlay, drawTitle, drawOver } from './render.js';
import { stageShot, autopilot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new InputReader();
input.attach(canvas);
const sounds = new SoundBank();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const world = createWorld(seed);
let screen = SCREEN_TITLE;
let paused = false;
let bestScore = 0;
let accumulator = 0;
let lastTime = performance.now();

/** Play the sound for each event the world raised this step. */
function soundForEvents(events) {
  for (const event of events) {
    if (event === EVENT_SPOTTED) sounds.playSpotted();
    else if (event === EVENT_HIT) sounds.playHit();
    else if (event === EVENT_CAUGHT) sounds.playCaught();
    else if (event === EVENT_COLLECTED) sounds.playCollected();
    else if (event === EVENT_FEATHER) sounds.playFeather();
    else if (event === EVENT_ESCAPED) sounds.playEscaped();
  }
}

/** Start a fresh run from the title screen. */
function startRun() {
  resetWorld(world);
  world.best = bestScore;
  screen = SCREEN_PLAY;
  paused = false;
  sounds.ensure();
  sounds.playClick();
}

/** Back to the title after a run ends, keeping the session best. */
function endRun() {
  bestScore = Math.max(bestScore, world.score);
  world.best = bestScore;
  screen = SCREEN_OVER;
}

function readInput() {
  return {
    jumpPressed: input.wasPressed(KEY_JUMP),
    moveLeft: input.isHeld('left'),
    moveRight: input.isHeld('right'),
    hideHeld: input.isHeld('hide'),
  };
}

function stepGame() {
  const events = stepWorld(world, STEP, readInput());
  soundForEvents(events);
  if (events.includes(EVENT_OVER)) endRun();
  input.clearEdges();
}

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (input.wasPressed(KEY_MUTE)) {
    sounds.ensure();
    sounds.toggleMute();
  }
  if (screen === SCREEN_TITLE) {
    if (input.wasPressed(KEY_START) || input.clickHappened()) {
      startRun();
    } else {
      // The farm idles behind the title: the turkey runs on, steered, and resets if caught.
      stepWorld(world, STEP, autopilot(world));
      if (world.over) resetWorld(world);
      input.clearEdges();
    }
    world.best = bestScore;
    drawTitle(ctx, world);
  } else if (screen === SCREEN_PLAY) {
    if (input.wasPressed(KEY_PAUSE)) {
      paused = !paused;
      input.clearEdges();
    } else if (!paused) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        stepGame();
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else {
      input.clearEdges();
    }
    drawPlay(ctx, world);
    if (paused) {
      ctx.fillStyle = 'rgba(30, 18, 8, 0.55)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '20px sans-serif';
      ctx.fillText('Press P to keep running', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 36);
      ctx.textAlign = 'left';
    }
  } else {
    if (input.wasPressed(KEY_START) || input.clickHappened()) {
      startRun();
    }
    input.clearEdges();
    drawOver(ctx, world);
  }
  requestAnimationFrame(frame);
}

// A screenshot scene (?shot=start|play|end&seed=1): stage it once and paint one frame.
if (shotName) {
  const staged = stageShot(shotName, world);
  bestScore = staged.best;
  world.best = staged.best;
  if (staged.screen === SCREEN_TITLE) drawTitle(ctx, world);
  else if (staged.screen === SCREEN_OVER) drawOver(ctx, world);
  else drawPlay(ctx, world);
  document.title = `shot:${shotName}:ok`;
} else {
  world.best = 0;
  drawTitle(ctx, world);
  requestAnimationFrame(frame);
}
