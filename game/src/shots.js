// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from a
// fresh world for a fixed stretch, steered by a simple autopilot (jump the hazard ahead, step away
// from where a knife will land, hide when the farmer is close, chase the nearest corn when safe),
// so the frame is what a short game really looks like and the same seed always gives the same frame.
import { GROUND_Y, STEP, PIXELS_PER_FOOT } from './config.js';
import { createWorld, resetWorld, stepWorld, entityScreenX } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
/** The play scene runs deep into the kitchen, until the farmer is right behind the bird. */
const PLAY_MIN_DISTANCE_FEET = 2850;
const PLAY_MAX_DISTANCE_FEET = 2980;
const PLAY_CLOSE_GAP_FEET = 50;
const END_LIMIT_SECONDS = 600;

/** Where a knife will be on screen when it reaches the ground, from its state now. */
function knifeLandingX(world, knife) {
  const screenX = entityScreenX(world, knife.worldX);
  const fallSeconds = knife.warning > 0
    ? knife.warning + (GROUND_Y - knife.y) / knife.speed
    : (GROUND_Y - knife.height - knife.y) / knife.speed;
  const scrollSpeedPx = 100 * PIXELS_PER_FOOT;
  return screenX - scrollSpeedPx * Math.max(0, fallSeconds);
}

/** The turkey's feet stay above the tallest hazard until this far into the jump. */
const CLEAR_UNTIL_SECONDS = 0.7;

/** Seconds until a falling knife's blade reaches the turkey's height. */
function secondsUntilBlade(world, knife) {
  const bladeAtTurkeyHeight = (world.turkey.y - 44 - knife.y) / knife.speed;
  return knife.warning > 0 ? knife.warning + Math.max(0, bladeAtTurkeyHeight) : bladeAtTurkeyHeight;
}

/** The autopilot's move for one step: jump, shift, hide, sprint, or chase corn. */
export function autopilot(world) {
  const turkey = world.turkey;
  const input = { jumpPressed: false, moveLeft: false, moveRight: false, hideHeld: false };

  // Stay hidden while the farmer is still worked up.
  if (turkey.hidden) {
    input.hideHeld = world.farmer.alert > 25;
    return input;
  }

  const scrollSpeedPx = 200;
  // Jump first: leap when the turkey will be airborne from the moment its chest reaches
  // the hazard until its tail has passed the hazard's far edge.
  if (turkey.grounded) {
    for (const hazard of world.hazards) {
      if (!hazard.active || hazard.hit) continue;
      const screenX = entityScreenX(world, hazard.worldX);
      const ahead = screenX - turkey.x;
      if (ahead < -20 || ahead > 320) continue;
      const chestReaches = (ahead - 23) / scrollSpeedPx;
      const tailClears = (ahead + hazard.width + 23) / scrollSpeedPx;
      if (chestReaches >= -0.05 && tailClears <= CLEAR_UNTIL_SECONDS) {
        input.jumpPressed = true;
        return input;
      }
    }
  }

  // Step away from a knife whose blade is about to reach the turkey.
  for (const knife of world.knives) {
    if (!knife.active || knife.stuckTimer > 0) continue;
    const landingX = knifeLandingX(world, knife);
    if (Math.abs(landingX - turkey.x) < 46 && secondsUntilBlade(world, knife) < 0.6) {
      if (landingX > turkey.x) input.moveLeft = true;
      else input.moveRight = true;
      return input;
    }
  }

  // Lose the farmer: run for the nearest haystack and duck in once under it.
  if (turkey.grounded && world.farmer.alert > 40) {
    let stack = null;
    let stackOffset = Infinity;
    for (const s of world.haystacks) {
      if (!s.active) continue;
      const offset = entityScreenX(world, s.worldX) + s.width / 2 - turkey.x;
      if (Math.abs(offset) < Math.abs(stackOffset)) {
        stackOffset = offset;
        stack = s;
      }
    }
    if (stack) {
      if (Math.abs(stackOffset) < 70) {
        input.hideHeld = true;
        return input;
      }
      if (stackOffset > 0 && stackOffset < 450) {
        input.moveRight = true;
        return input;
      }
      if (stackOffset < 0 && stackOffset > -150) {
        input.moveLeft = true;
        return input;
      }
    }
  }

  // Mid-air, hold still: shifting sideways now only lands the turkey on a hazard.
  if (!turkey.grounded) return input;

  // Step away from a knife that will land nearby, while there is still time.
  for (const knife of world.knives) {
    if (!knife.active || knife.stuckTimer > 0) continue;
    const landingX = knifeLandingX(world, knife);
    if (Math.abs(landingX - turkey.x) < 46) {
      if (landingX > turkey.x) input.moveLeft = true;
      else input.moveRight = true;
      return input;
    }
  }

  // Sprint when the farmer is on the turkey's tail and the way ahead is clear.
  let hazardNear = false;
  for (const hazard of world.hazards) {
    if (!hazard.active || hazard.hit) continue;
    const ahead = entityScreenX(world, hazard.worldX) - turkey.x;
    if (ahead > -10 && ahead < 320) hazardNear = true;
  }
  if (world.farmer.gapFeet < 60 && !world.farmer.searching && !hazardNear) {
    input.moveRight = true;
    return input;
  }

  // Otherwise drift toward the nearest corn, when one is close.
  let corn = null;
  let cornDistance = Infinity;
  for (const treat of world.treats) {
    if (!treat.active) continue;
    const distance = Math.abs(entityScreenX(world, treat.worldX) - turkey.x);
    if (distance < cornDistance) {
      cornDistance = distance;
      corn = treat;
    }
  }
  if (corn && cornDistance < 160 && cornDistance > 12) {
    const screenX = entityScreenX(world, corn.worldX);
    if (screenX > turkey.x) input.moveRight = true;
    else input.moveLeft = true;
  }
  return input;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      stepWorld(world, STEP, autopilot(world));
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    const limit = 300;
    for (let index = 0; index < limit / STEP; index += 1) {
      stepWorld(world, STEP, autopilot(world));
      if (world.over) break;
      const deepInKitchen = world.distanceFeet >= PLAY_MIN_DISTANCE_FEET;
      const farmerClose = world.farmer.gapFeet < PLAY_CLOSE_GAP_FEET;
      if ((deepInKitchen && farmerClose) || world.distanceFeet >= PLAY_MAX_DISTANCE_FEET) break;
    }
    return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
    stepWorld(world, STEP, autopilot(world));
    if (world.over) break;
  }
  return { screen: SCREEN_OVER, best: world.score };
}
