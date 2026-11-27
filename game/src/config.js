// Gobble Dash: Thanksgiving Escape — tuning, stages and the seeded dice.
// One job: every number the game balances on, in one place.
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const GROUND_Y = 470;
export const PIXELS_PER_FOOT = 2;
export const STEP = 1 / 60;

export const TURKEY = {
  width: 46,
  height: 44,
  minX: 110,
  maxX: 430,
  startX: 220,
  gravity: 2600,
  jumpSpeed: 1000,
  walkSpeed: 170,
  sprintSpeed: 330,
};

export const RUN = {
  baseFeetPerSecond: 100,
  sprintFeetPerSecond: 138,
  slowFeetPerSecond: 62,
  distanceGoalFeet: 3000,
  startLives: 3,
  cornScore: 10,
  featherScore: 50,
  hideScorePerSecond: 5,
};

export const FARMER = {
  startGapFeet: 170,
  calmFeetPerSecond: 52,
  searchFeetPerSecond: 45,
  catchGapFeet: 2,
  alertRisePerSecond: 14,
  alertFallPerSecond: 18,
  hiddenFallPerSecond: 55,
  spotDistanceFeet: 220,
  farSpotDistanceFeet: 450,
};

export const KNIFE = {
  width: 16,
  height: 52,
  fallSpeed: 560,
  warnSeconds: 0.7,
};

export const STAGES = [
  {
    name: 'FARMYARD',
    fromFeet: 0,
    toFeet: 1000,
    skyTop: '#f7b267',
    skyBottom: '#f4845f',
    ground: '#8a5a2b',
    grass: '#7fae4c',
    obstacleEverySeconds: [1.9, 3.1],
    knifeEverySeconds: [3.4, 5.2],
    cornEverySeconds: [1.1, 1.9],
    haystackEverySeconds: [4.5, 7.0],
    farmerHuntFeetPerSecond: 140,
    farmerFarAlertRisePerSecond: 5,
  },
  {
    name: 'BARN',
    fromFeet: 1000,
    toFeet: 2000,
    skyTop: '#e07a5f',
    skyBottom: '#b5524d',
    ground: '#6e4423',
    grass: '#a8893c',
    obstacleEverySeconds: [1.5, 2.5],
    knifeEverySeconds: [2.6, 4.1],
    cornEverySeconds: [1.0, 1.7],
    haystackEverySeconds: [4.0, 6.5],
    farmerHuntFeetPerSecond: 144,
    farmerFarAlertRisePerSecond: 6,
  },
  {
    name: 'KITCHEN',
    fromFeet: 2000,
    toFeet: 3000,
    skyTop: '#c94f4f',
    skyBottom: '#7a2e3a',
    ground: '#5b3a29',
    grass: '#c98a3d',
    obstacleEverySeconds: [1.2, 2.1],
    knifeEverySeconds: [2.0, 3.3],
    cornEverySeconds: [0.9, 1.6],
    haystackEverySeconds: [5.0, 8.0],
    farmerHuntFeetPerSecond: 155,
    farmerFarAlertRisePerSecond: 9,
  },
];

/** A tiny seeded dice (mulberry32) so a shot with seed=1 always deals the same run. */
export function createSeededRandom(seed) {
  let value = seed >>> 0;
  return function nextRandom() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a value in [low, high) from the dice. */
export function rangeRandom(random, low, high) {
  return low + random() * (high - low);
}

/** Clamp a number into [low, high]. */
export function clampNumber(value, low, high) {
  return value < low ? low : value > high ? high : value;
}
