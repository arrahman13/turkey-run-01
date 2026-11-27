// The cast of Gobble Dash: what each thing is and how it is drawn on canvas.
// One job: build every turkey, farmer, hazard and treat, and paint it. No rules live here.
import { TURKEY } from './config.js';

export const KIND_FENCE = 'fence';
export const KIND_PUMPKIN = 'pumpkin';
export const KIND_OVEN = 'oven';
export const KIND_KNIFE = 'knife';
export const KIND_CORN = 'corn';
export const KIND_FEATHER = 'feather';
export const KIND_HAYSTACK = 'haystack';

/** The turkey: a plump bird with a tail fan, a red wattle and worried eyes. */
export function makeTurkey() {
  return {
    x: TURKEY.startX,
    y: 0,
    vy: 0,
    width: TURKEY.width,
    height: TURKEY.height,
    grounded: true,
    hidden: false,
    hiddenTimer: 0,
    hideHaystack: null,
    invulnerableTimer: 0,
    runPhase: 0,
    facing: 1,
  };
}

/** The farmer: overalls, a straw hat and a moustache, always a few steps behind. */
export function makeFarmer() {
  return {
    gapFeet: 140,
    alert: 0,
    searching: false,
    searchTimer: 0,
    lastSeenX: 0,
    walkPhase: 0,
    shoutTimer: 0,
  };
}

/** A fence, a pumpkin or a kitchen oven: something the turkey must jump over. */
export function makeGroundHazard(kind, worldX) {
  const sizes = {
    [KIND_FENCE]: { width: 26, height: 46 },
    [KIND_PUMPKIN]: { width: 40, height: 34 },
    [KIND_OVEN]: { width: 60, height: 62 },
  };
  const size = sizes[kind];
  return { kind, worldX, width: size.width, height: size.height, active: true, hit: false };
}

/** A carving knife that drops from the sky onto one spot, with a warning flash first. */
export function makeKnife(worldX) {
  return {
    kind: KIND_KNIFE,
    worldX,
    width: 16,
    height: 52,
    y: -60,
    speed: 560,
    warning: 0.7,
    active: true,
    stuckTimer: 0,
  };
}

/** Corn (+10) or a golden feather (+50): the reason to risk a detour. */
export function makeTreat(kind, worldX, y) {
  return { kind, worldX, y, width: 26, height: 26, active: true, bobPhase: 0 };
}

/** A haystack the turkey can duck into to lose the farmer. */
export function makeHaystack(worldX) {
  return { kind: KIND_HAYSTACK, worldX, width: 92, height: 64, active: true };
}

/** Draw the turkey at screen position (x, y) — y is the ground line under its feet. */
export function drawTurkey(ctx, turkey, time) {
  const x = turkey.x;
  const feetY = turkey.y;
  const bob = turkey.grounded ? Math.sin(turkey.runPhase) * 2 : 0;
  const bodyY = feetY - 22 + bob;
  ctx.save();
  ctx.translate(x, bodyY);
  if (turkey.hidden) {
    ctx.globalAlpha = 0.25;
  }
  // Tail fan.
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 10 - Math.PI / 2 + Math.PI);
    ctx.fillStyle = i % 2 === 0 ? '#8b4513' : '#a0522d';
    ctx.beginPath();
    ctx.ellipse(-16, 0, 7, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9a05b';
    ctx.beginPath();
    ctx.ellipse(-16, -12, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = '#6b3a1f';
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wing.
  ctx.fillStyle = '#5a2f18';
  ctx.beginPath();
  ctx.ellipse(-4, 2, 12, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Head and neck.
  ctx.fillStyle = '#7a4a21';
  ctx.fillRect(14, -30, 8, 16);
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.arc(20, -32, 11, 0, Math.PI * 2);
  ctx.fill();
  // Beak, wattle and eye.
  ctx.fillStyle = '#e8a020';
  ctx.beginPath();
  ctx.moveTo(28, -34);
  ctx.lineTo(40, -30);
  ctx.lineTo(28, -28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d43d2a';
  ctx.beginPath();
  ctx.ellipse(26, -22, 4, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(23, -36, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(24, -36, 2, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.strokeStyle = '#e8a020';
  ctx.lineWidth = 3;
  const stride = turkey.grounded ? Math.sin(turkey.runPhase) * 6 : 4;
  ctx.beginPath();
  ctx.moveTo(-6, 16);
  ctx.lineTo(-6 + stride, feetY - bodyY);
  ctx.moveTo(6, 16);
  ctx.lineTo(6 - stride, feetY - bodyY);
  ctx.stroke();
  ctx.restore();
}

/** Draw the farmer at screen position (x, feetY), mid-stride, hat and all. */
export function drawFarmer(ctx, x, feetY, walkPhase, alert) {
  ctx.save();
  ctx.translate(x, feetY);
  const stride = Math.sin(walkPhase) * 8;
  // Legs and overalls.
  ctx.strokeStyle = '#2e4a6b';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-6, -52);
  ctx.lineTo(-6 + stride, 0);
  ctx.moveTo(6, -52);
  ctx.lineTo(6 - stride, 0);
  ctx.stroke();
  ctx.fillStyle = '#3b6ea5';
  ctx.fillRect(-14, -84, 28, 36);
  ctx.fillStyle = '#d43d2a';
  ctx.fillRect(-14, -84, 28, 8);
  // Shirt arms reaching forward.
  ctx.strokeStyle = '#e8e0c8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-12, -78);
  ctx.lineTo(10, -62);
  ctx.moveTo(12, -78);
  ctx.lineTo(26, -64);
  ctx.stroke();
  // Head, moustache and straw hat.
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(0, -96, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a1a';
  ctx.beginPath();
  ctx.ellipse(2, -88, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.ellipse(0, -106, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -112, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Angry eyes that glow redder as the alert rises.
  const glow = Math.floor(80 + alert * 1.6);
  ctx.fillStyle = `rgb(${glow}, 30, 20)`;
  ctx.beginPath();
  ctx.arc(-5, -98, 2.5, 0, Math.PI * 2);
  ctx.arc(6, -98, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw a ground hazard (fence, pumpkin or oven) at its screen box. */
export function drawGroundHazard(ctx, hazard, screenX, groundY, time) {
  const top = groundY - hazard.height;
  if (hazard.kind === KIND_FENCE) {
    ctx.fillStyle = '#7a4a21';
    ctx.fillRect(screenX, top, 5, hazard.height);
    ctx.fillRect(screenX + hazard.width - 5, top, 5, hazard.height);
    ctx.fillRect(screenX - 4, top + 8, hazard.width + 8, 6);
    ctx.fillRect(screenX - 4, top + 26, hazard.width + 8, 6);
  } else if (hazard.kind === KIND_PUMPKIN) {
    ctx.fillStyle = '#e07830';
    ctx.beginPath();
    ctx.ellipse(screenX + hazard.width / 2, groundY - hazard.height / 2, hazard.width / 2, hazard.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b85a1e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(screenX + hazard.width / 2, groundY - hazard.height / 2, hazard.width / 4, hazard.height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#4a7a2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX + hazard.width / 2, top);
    ctx.lineTo(screenX + hazard.width / 2 + 4, top - 8);
    ctx.stroke();
  } else if (hazard.kind === KIND_OVEN) {
    // A glowing oven: the hot box the turkey must jump clean over.
    const flicker = 0.75 + Math.sin(time * 9) * 0.25;
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(screenX, top, hazard.width, hazard.height);
    ctx.fillStyle = `rgba(255, ${Math.floor(120 + 80 * flicker)}, 30, ${0.55 + 0.35 * flicker})`;
    ctx.fillRect(screenX + 10, top + 12, hazard.width - 20, 26);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(screenX + 10, top + 12, hazard.width - 20, 4);
    ctx.fillStyle = '#c8c8d0';
    ctx.fillRect(screenX + 6, top + 44, hazard.width - 12, 5);
    ctx.fillStyle = '#ffdd55';
    ctx.beginPath();
    ctx.arc(screenX + 16, top + 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw a falling carving knife: blade, handle and a warning glint while it drops. */
export function drawKnife(ctx, knife, screenX) {
  if (knife.warning > 0) {
    ctx.fillStyle = 'rgba(255, 60, 40, 0.85)';
    ctx.beginPath();
    ctx.moveTo(screenX + knife.width / 2, knife.y - 14);
    ctx.lineTo(screenX + knife.width / 2 - 8, knife.y - 30);
    ctx.lineTo(screenX + knife.width / 2 + 8, knife.y - 30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#d8dce2';
  ctx.beginPath();
  ctx.moveTo(screenX, knife.y + knife.height);
  ctx.lineTo(screenX + knife.width / 2, knife.y);
  ctx.lineTo(screenX + knife.width, knife.y + knife.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(screenX + 2, knife.y + knife.height - 14, knife.width - 4, 14);
}

/** Draw a treat: corn cob or a golden feather, bobbing gently. */
export function drawTreat(ctx, treat, screenX, time) {
  const y = treat.y + Math.sin(time * 3 + treat.bobPhase) * 3;
  if (treat.kind === KIND_CORN) {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.ellipse(screenX, y, 9, 13, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a9a2e';
    ctx.beginPath();
    ctx.ellipse(screenX - 6, y + 8, 5, 8, -0.5, 0, Math.PI * 2);
    ctx.ellipse(screenX + 6, y + 8, 5, 8, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.ellipse(screenX, y, 6, 14, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.ellipse(screenX - 1, y - 4, 2.5, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw a haystack: golden straw, the turkey's hiding place. */
export function drawHaystack(ctx, haystack, screenX, groundY) {
  const top = groundY - haystack.height;
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  ctx.moveTo(screenX, groundY);
  ctx.quadraticCurveTo(screenX + haystack.width / 2, top - 14, screenX + haystack.width, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b8862e';
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i += 1) {
    const x = screenX + (haystack.width * i) / 5;
    ctx.beginPath();
    ctx.moveTo(x, groundY - 6);
    ctx.quadraticCurveTo(x + 4, top + 16, x - 2, top + 26);
    ctx.stroke();
  }
}
