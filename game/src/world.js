// Gobble Dash: the world — rules, the farmer's chase, hazards, stages and scoring.
// One job: advance the game one step at a time. Pure logic: no canvas, no audio, no DOM.
import {
  CANVAS_WIDTH,
  GROUND_Y,
  PIXELS_PER_FOOT,
  TURKEY,
  RUN,
  FARMER,
  KNIFE,
  STAGES,
  createSeededRandom,
  rangeRandom,
  clampNumber,
} from './config.js';
import {
  KIND_FENCE,
  KIND_PUMPKIN,
  KIND_OVEN,
  KIND_KNIFE,
  KIND_CORN,
  KIND_FEATHER,
  KIND_HAYSTACK,
  makeTurkey,
  makeFarmer,
  makeGroundHazard,
  makeKnife,
  makeTreat,
  makeHaystack,
} from './entities.js';

export const EVENT_NONE = 0;
export const EVENT_SPOTTED = 1;
export const EVENT_HIT = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_COLLECTED = 8;
export const EVENT_FEATHER = 16;
export const EVENT_ESCAPED = 32;
export const EVENT_HIDDEN = 64;
export const EVENT_STAGE = 128;
export const EVENT_LOST = 256;
export const EVENT_OVER = 512;

/** A fresh world for one run, dealt from the seed so a shot always deals the same run. */
export function createWorld(seed) {
  const world = {
    seed,
    random: createSeededRandom(seed),
    time: 0,
    distanceFeet: 0,
    scrollPx: 0,
    score: 0,
    lives: RUN.startLives,
    stageIndex: 0,
    stage: STAGES[0],
    turkey: makeTurkey(),
    farmer: makeFarmer(),
    hazards: [],
    knives: [],
    treats: [],
    haystacks: [],
    spawnObstacleIn: 1.6,
    spawnKnifeIn: 3.0,
    spawnCornIn: 0.8,
    spawnHaystackIn: 5.0,
    over: false,
    won: false,
    events: [],
    message: '',
    messageTimer: 0,
    flashTimer: 0,
    spotted: false,
  };
  world.turkey.y = GROUND_Y;
  return world;
}

/** Put a world back to the start of a run, keeping its seed. */
export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

function stageForDistance(feet) {
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (feet >= STAGES[i].fromFeet) index = i;
  }
  return index;
}

function setMessage(world, text, seconds) {
  world.message = text;
  world.messageTimer = seconds;
}

function screenXOf(world, worldX) {
  return worldX - world.scrollPx;
}

function nearestHaystack(world) {
  let best = null;
  let bestDistance = Infinity;
  for (const haystack of world.haystacks) {
    if (!haystack.active) continue;
    const distance = Math.abs(screenXOf(world, haystack.worldX) + haystack.width / 2 - world.turkey.x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = haystack;
    }
  }
  return bestDistance < 70 ? best : null;
}

function spawnObstacle(world) {
  const stage = world.stage;
  const worldX = world.scrollPx + CANVAS_WIDTH + rangeRandom(world.random, 40, 220);
  for (const hazard of world.hazards) {
    if (hazard.active && Math.abs(hazard.worldX - worldX) < 300) return;
  }
  const roll = world.random();
  let kind = KIND_FENCE;
  if (stage.name === 'KITCHEN') {
    kind = roll < 0.55 ? KIND_OVEN : roll < 0.8 ? KIND_FENCE : KIND_PUMPKIN;
  } else {
    kind = roll < 0.5 ? KIND_FENCE : KIND_PUMPKIN;
  }
  world.hazards.push(makeGroundHazard(kind, worldX));
}

function spawnKnife(world) {
  const worldX = world.scrollPx + world.turkey.x + rangeRandom(world.random, 80, 340);
  world.knives.push(makeKnife(worldX));
}

function spawnTreat(world) {
  const worldX = world.scrollPx + CANVAS_WIDTH + rangeRandom(world.random, 40, 200);
  const kind = world.random() < 0.12 ? KIND_FEATHER : KIND_CORN;
  const y = world.random() < 0.45 ? GROUND_Y - 95 : GROUND_Y - 24;
  const treat = makeTreat(kind, worldX, y);
  treat.bobPhase = rangeRandom(world.random, 0, Math.PI * 2);
  world.treats.push(treat);
}

function spawnHaystack(world) {
  const worldX = world.scrollPx + CANVAS_WIDTH + rangeRandom(world.random, 40, 160);
  world.haystacks.push(makeHaystack(worldX));
}

function hurtTurkey(world, event) {
  if (world.turkey.invulnerableTimer > 0 || world.over) return;
  world.lives -= 1;
  world.turkey.invulnerableTimer = 2;
  world.turkey.vy = -320;
  world.turkey.grounded = false;
  world.flashTimer = 0.35;
  world.events.push(event);
  setMessage(world, event === EVENT_CAUGHT ? 'CAUGHT!' : 'OUCH!', 1.1);
  if (world.lives <= 0) {
    world.over = true;
    world.won = false;
    world.events.push(EVENT_OVER);
    setMessage(world, 'CAUGHT! DINNER IS SERVED...', 999);
  }
}

/**
 * Advance the world by dt seconds. `input` is { jumpPressed, moveLeft, moveRight, hideHeld }.
 * Returns the events raised this step (also appended to world.events for the caller to drain).
 */
export function stepWorld(world, dt, input) {
  world.events.length = 0;
  if (world.over) return world.events;
  world.time += dt;
  if (world.messageTimer > 0) world.messageTimer -= dt;
  if (world.flashTimer > 0) world.flashTimer -= dt;

  const turkey = world.turkey;
  const farmer = world.farmer;
  if (turkey.invulnerableTimer > 0) turkey.invulnerableTimer -= dt;
  if (turkey.hiddenTimer > 0) turkey.hiddenTimer -= dt;

  // How fast the turkey runs this step: sprint right, dawdle left.
  let runSpeed = RUN.baseFeetPerSecond;
  if (input.moveRight) runSpeed = RUN.sprintFeetPerSecond;
  if (input.moveLeft) runSpeed = RUN.slowFeetPerSecond;
  world.distanceFeet += runSpeed * dt;
  world.scrollPx = world.distanceFeet * PIXELS_PER_FOOT;
  world.score += Math.round(runSpeed * dt * 0.2);

  // Stage changes as the turkey flees farmyard, barn, then kitchen.
  const stageIndex = stageForDistance(world.distanceFeet);
  if (stageIndex !== world.stageIndex) {
    world.stageIndex = stageIndex;
    world.stage = STAGES[stageIndex];
    world.events.push(EVENT_STAGE);
    setMessage(world, `STAGE ${stageIndex + 1}: ${world.stage.name}!`, 1.6);
  }

  // Hiding: duck into a haystack and ride it while the farmer loses the trail.
  const haystack = turkey.hidden ? turkey.hideHaystack : nearestHaystack(world);
  if (!turkey.hidden && input.hideHeld && haystack && turkey.grounded) {
    turkey.hidden = true;
    turkey.hiddenTimer = 0;
    turkey.hideHaystack = haystack;
    farmer.searching = true;
    farmer.searchTimer = 2.4;
    farmer.lastSeenX = turkey.x;
    world.events.push(EVENT_HIDDEN);
    setMessage(world, 'HIDDEN!', 1.0);
  }
  if (turkey.hidden) {
    world.score += Math.round(RUN.hideScorePerSecond * dt);
    const stackScreenX = screenXOf(world, turkey.hideHaystack.worldX);
    turkey.x = stackScreenX + turkey.hideHaystack.width / 2;
    if (!input.hideHeld || stackScreenX < 20 || !turkey.hideHaystack.active) {
      turkey.hidden = false;
      turkey.hideHaystack = null;
      turkey.x = clampNumber(turkey.x, TURKEY.minX, TURKEY.maxX);
      if (farmer.gapFeet < 60 && !farmer.searching) {
        farmer.alert = Math.max(farmer.alert, 85);
      }
    }
  }

  // The turkey's own movement: run, jump, and shift left or right.
  if (!turkey.hidden) {
    if (input.moveLeft) turkey.x -= TURKEY.walkSpeed * dt;
    if (input.moveRight) turkey.x += TURKEY.walkSpeed * dt;
    turkey.x = clampNumber(turkey.x, TURKEY.minX, TURKEY.maxX);
    if (input.jumpPressed && turkey.grounded) {
      turkey.vy = -TURKEY.jumpSpeed;
      turkey.grounded = false;
    }
  }
  turkey.vy += TURKEY.gravity * dt;
  turkey.y += turkey.vy * dt;
  if (turkey.y >= GROUND_Y) {
    turkey.y = GROUND_Y;
    turkey.vy = 0;
    turkey.grounded = true;
  }
  if (turkey.grounded && !turkey.hidden) turkey.runPhase += dt * 11;

  // The farmer: his alert rises while the turkey is in sight, falls while it hides.
  // He can make the bird out from a good way off, so his suspicion creeps up
  // even at a distance — one good hide only buys a breather, not the whole run.
  if (turkey.hidden) {
    farmer.alert -= FARMER.hiddenFallPerSecond * dt;
  } else if (farmer.gapFeet < FARMER.spotDistanceFeet) {
    farmer.alert += FARMER.alertRisePerSecond * dt;
  } else if (farmer.gapFeet < FARMER.farSpotDistanceFeet) {
    farmer.alert += world.stage.farmerFarAlertRisePerSecond * dt;
  } else {
    farmer.alert -= FARMER.alertFallPerSecond * dt;
  }
  farmer.alert = clampNumber(farmer.alert, 0, 100);
  if (farmer.alert >= 60 && !world.spotted) {
    world.spotted = true;
    farmer.shoutTimer = 0.8;
    world.events.push(EVENT_SPOTTED);
    setMessage(world, 'SPOTTED!', 1.0);
  }
  if (farmer.alert < 40) world.spotted = false;

  // The farmer's pace: calm, hunting, or searching the last place he saw the bird.
  let farmerSpeed;
  if (farmer.searching) {
    farmer.searchTimer -= dt;
    // He runs to the spot he last saw the bird, then slows to look around.
    farmerSpeed = farmer.gapFeet > 40 ? 125 : FARMER.searchFeetPerSecond;
    if (farmer.searchTimer <= 0) {
      farmer.searching = false;
      farmer.alert = 12;
      world.events.push(EVENT_LOST);
      setMessage(world, 'HE LOST YOU!', 1.2);
    }
  } else {
    farmerSpeed = FARMER.calmFeetPerSecond + (farmer.alert / 100) * (world.stage.farmerHuntFeetPerSecond - FARMER.calmFeetPerSecond);
  }
  if (turkey.invulnerableTimer > 0) farmerSpeed = runSpeed;
  farmer.gapFeet += (runSpeed - farmerSpeed) * dt;
  farmer.gapFeet = Math.max(farmer.gapFeet, -4);
  farmer.walkPhase += dt * (4 + farmerSpeed / 14);
  if (farmer.shoutTimer > 0) farmer.shoutTimer -= dt;

  // Caught: the farmer closes the gap.
  if (farmer.gapFeet <= FARMER.catchGapFeet && turkey.invulnerableTimer <= 0 && !turkey.hidden) {
    farmer.gapFeet = FARMER.startGapFeet;
    farmer.alert = 35;
    farmer.searching = false;
    turkey.x = TURKEY.startX;
    hurtTurkey(world, EVENT_CAUGHT);
    return world.events;
  }

  // Spawn the next stretch of the farm, the barn, the kitchen.
  world.spawnObstacleIn -= dt;
  if (world.spawnObstacleIn <= 0) {
    spawnObstacle(world);
    world.spawnObstacleIn = rangeRandom(world.random, world.stage.obstacleEverySeconds[0], world.stage.obstacleEverySeconds[1]);
  }
  world.spawnKnifeIn -= dt;
  if (world.spawnKnifeIn <= 0) {
    spawnKnife(world);
    world.spawnKnifeIn = rangeRandom(world.random, world.stage.knifeEverySeconds[0], world.stage.knifeEverySeconds[1]);
  }
  world.spawnCornIn -= dt;
  if (world.spawnCornIn <= 0) {
    spawnTreat(world);
    world.spawnCornIn = rangeRandom(world.random, world.stage.cornEverySeconds[0], world.stage.cornEverySeconds[1]);
  }
  world.spawnHaystackIn -= dt;
  if (world.spawnHaystackIn <= 0) {
    spawnHaystack(world);
    world.spawnHaystackIn = rangeRandom(world.random, world.stage.haystackEverySeconds[0], world.stage.haystackEverySeconds[1]);
  }

  // Ground hazards: jump them or trip over them.
  for (const hazard of world.hazards) {
    if (!hazard.active) continue;
    const screenX = screenXOf(world, hazard.worldX);
    if (screenX + hazard.width < -40) {
      hazard.active = false;
      continue;
    }
    const overlapX = Math.abs(screenX + hazard.width / 2 - turkey.x) < (hazard.width + turkey.width) / 2 - 14;
    const lowEnough = turkey.y > GROUND_Y - 12;
    if (!hazard.hit && overlapX && lowEnough && !turkey.hidden) {
      hazard.hit = true;
      hazard.active = false;
      turkey.x = Math.max(TURKEY.minX, turkey.x - 30);
      hurtTurkey(world, EVENT_HIT);
      return world.events;
    }
  }

  // Knives: warn, fall, stick, and punish a turkey standing underneath.
  for (const knife of world.knives) {
    if (!knife.active) continue;
    const screenX = screenXOf(world, knife.worldX);
    if (screenX < -60 || screenX > CANVAS_WIDTH + 120) {
      knife.active = false;
      continue;
    }
    if (knife.warning > 0) {
      knife.warning -= dt;
      continue;
    }
    knife.y += knife.speed * dt;
    if (knife.y + knife.height >= GROUND_Y) {
      knife.y = GROUND_Y - knife.height;
      if (knife.stuckTimer <= 0) knife.stuckTimer = 1.1;
    }
    if (knife.stuckTimer > 0) {
      knife.stuckTimer -= dt;
      if (knife.stuckTimer <= 0) knife.active = false;
      continue;
    }
    const underKnife = Math.abs(screenX + knife.width / 2 - turkey.x) < 30;
    const inBladePath = knife.y + knife.height > turkey.y - turkey.height && knife.y < turkey.y;
    if (underKnife && inBladePath && !turkey.hidden && turkey.invulnerableTimer <= 0) {
      knife.active = false;
      hurtTurkey(world, EVENT_HIT);
      return world.events;
    }
  }

  // Treats: corn and feathers, collected by running through them.
  for (const treat of world.treats) {
    if (!treat.active) continue;
    const screenX = screenXOf(world, treat.worldX);
    if (screenX < -40) {
      treat.active = false;
      continue;
    }
    const closeX = Math.abs(screenX - turkey.x) < 36;
    const closeY = Math.abs(treat.y - (turkey.y - 22)) < 42;
    if (closeX && closeY && !turkey.hidden) {
      treat.active = false;
      if (treat.kind === KIND_FEATHER) {
        world.score += RUN.featherScore;
        world.events.push(EVENT_FEATHER);
      } else {
        world.score += RUN.cornScore;
        world.events.push(EVENT_COLLECTED);
      }
    }
  }

  // Haystacks drift off to the left once passed.
  for (const stack of world.haystacks) {
    if (screenXOf(world, stack.worldX) + stack.width < -40) stack.active = false;
  }

  // Escaped: the turkey outruns the farm, the barn and the kitchen.
  if (world.distanceFeet >= RUN.distanceGoalFeet) {
    world.over = true;
    world.won = true;
    world.events.push(EVENT_ESCAPED);
    world.events.push(EVENT_OVER);
    setMessage(world, 'ESCAPED! HAPPY THANKSGIVING!', 999);
  }

  return world.events;
}

/** Screen x of an entity, for the renderer and the autopilot. */
export function entityScreenX(world, worldX) {
  return worldX - world.scrollPx;
}

/** Screen x of the farmer, from how far behind the turkey he is. */
export function farmerScreenX(world) {
  return world.turkey.x - world.farmer.gapFeet * PIXELS_PER_FOOT;
}
