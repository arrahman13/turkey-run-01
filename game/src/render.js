// Gobble Dash: everything the player sees, painted on one canvas.
// One job: draw the farm, the turkey, the farmer, the HUD and the screens. No rules live here.
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, PIXELS_PER_FOOT } from './config.js';
import {
  KIND_FENCE,
  KIND_PUMPKIN,
  KIND_OVEN,
  KIND_CORN,
  KIND_FEATHER,
  drawTurkey,
  drawFarmer,
  drawGroundHazard,
  drawKnife,
  drawTreat,
  drawHaystack,
} from './entities.js';
import { entityScreenX, farmerScreenX } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function drawSky(ctx, stage, scrollPx, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  gradient.addColorStop(0, stage.skyTop);
  gradient.addColorStop(1, stage.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);
  // A low autumn sun and slow clouds.
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(820 - ((scrollPx * 0.05) % 200), 76, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 214, 0.85)';
  for (let i = 0; i < 3; i += 1) {
    const cx = ((i * 340 - scrollPx * 0.12 + time * 6) % (CANVAS_WIDTH + 260)) - 130;
    ctx.beginPath();
    ctx.ellipse(cx, 60 + i * 34, 62, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 40, 68 + i * 34, 44, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(ctx, stage, scrollPx) {
  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
  ctx.fillStyle = stage.grass;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 12);
  // Fence posts scrolling past in the farmyard and barn.
  ctx.fillStyle = '#7a4a21';
  const spacing = 120;
  const offset = -(scrollPx % spacing);
  for (let x = offset; x < CANVAS_WIDTH; x += spacing) {
    ctx.fillRect(x, GROUND_Y - 34, 8, 34);
    ctx.fillRect(x + 8, GROUND_Y - 26, spacing - 8, 5);
  }
  // The barn in the distance, then the kitchen wall.
  if (stage.name === 'BARN') {
    ctx.fillStyle = '#8a2f2a';
    ctx.fillRect(80, GROUND_Y - 190, 220, 190);
    ctx.fillStyle = '#5e1f1c';
    ctx.beginPath();
    ctx.moveTo(60, GROUND_Y - 190);
    ctx.lineTo(190, GROUND_Y - 260);
    ctx.lineTo(320, GROUND_Y - 190);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e3c2';
    ctx.fillRect(165, GROUND_Y - 120, 50, 120);
  }
  if (stage.name === 'KITCHEN') {
    ctx.fillStyle = '#4a3a30';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 150);
    ctx.fillStyle = '#6b5546';
    for (let x = 0; x < CANVAS_WIDTH; x += 64) {
      ctx.fillRect(x, 0, 2, 150);
      ctx.fillRect(0, 50, CANVAS_WIDTH, 2);
      ctx.fillRect(0, 100, CANVAS_WIDTH, 2);
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('THE KITCHEN — NO OVEN IS SAFE', 24, 132);
  }
}

function drawWorldEntities(ctx, world) {
  // Haystacks first, so the turkey can duck behind one.
  for (const stack of world.haystacks) {
    if (!stack.active) continue;
    drawHaystack(ctx, stack, entityScreenX(world, stack.worldX), GROUND_Y);
  }
  for (const hazard of world.hazards) {
    if (!hazard.active) continue;
    drawGroundHazard(ctx, hazard, entityScreenX(world, hazard.worldX), GROUND_Y, world.time);
  }
  for (const treat of world.treats) {
    if (!treat.active) continue;
    drawTreat(ctx, treat, entityScreenX(world, treat.worldX), world.time);
  }
  for (const knife of world.knives) {
    if (!knife.active) continue;
    drawKnife(ctx, knife, entityScreenX(world, knife.worldX));
  }
  // The farmer, chasing from behind.
  const farmerX = farmerScreenX(world);
  if (farmerX > -80 && farmerX < CANVAS_WIDTH + 80) {
    drawFarmer(ctx, farmerX, GROUND_Y, world.farmer.walkPhase, world.farmer.alert);
    if (world.farmer.searching) {
      ctx.fillStyle = '#fff3b0';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('?', farmerX - 6, GROUND_Y - 128);
    }
    if (world.farmer.shoutTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('HEY! COME BACK HERE!', farmerX - 70, GROUND_Y - 138);
    }
  }
  // The turkey, blinking while invulnerable.
  const turkey = world.turkey;
  if (!(turkey.invulnerableTimer > 0 && Math.floor(world.time * 12) % 2 === 0)) {
    drawTurkey(ctx, turkey, world.time);
  }
  // Knife warning shadows on the ground where one is about to land.
  for (const knife of world.knives) {
    if (!knife.active || knife.warning <= 0) continue;
    const x = entityScreenX(world, knife.worldX);
    ctx.fillStyle = 'rgba(255, 60, 40, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 8, GROUND_Y + 4, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The HUD: score, distance, lives, stage and the farmer's alert. */
export function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(30, 18, 8, 0.55)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 46);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${world.score}`, 16, 30);
  ctx.fillText(`DIST ${Math.floor(world.distanceFeet)} ft`, 210, 30);
  ctx.fillText(world.stage.name, 400, 30);
  // Lives as hearts.
  for (let i = 0; i < 3; i += 1) {
    const x = 560 + i * 30;
    ctx.fillStyle = i < world.lives ? '#ff5a5a' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(x, 24, 9, 0, Math.PI * 2);
    ctx.arc(x + 12, 24, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 6, 28);
    ctx.lineTo(x + 18, 28);
    ctx.lineTo(x + 6, 42);
    ctx.closePath();
    ctx.fill();
  }
  // Farmer alert meter.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(680, 16, 150, 14);
  ctx.fillStyle = world.farmer.alert > 60 ? '#ff4030' : '#ffb020';
  ctx.fillRect(680, 16, 150 * (world.farmer.alert / 100), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('FARMER', 684, 27);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('GOBBLE DASH', CANVAS_WIDTH - 16, 30);
  ctx.textAlign = 'left';
  // Centre message (SPOTTED!, HIDDEN!, stage changes). The end screen speaks for
  // itself, so it stays silent once the run is over.
  if (!world.over && world.messageTimer > 0 && world.message) {
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(30, 18, 8, 0.6)';
    const width = ctx.measureText(world.message).width + 36;
    ctx.fillRect((CANVAS_WIDTH - width) / 2, 84, width, 52);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(world.message, CANVAS_WIDTH / 2, 120);
    ctx.textAlign = 'left';
  }
  // Red flash when the turkey is hurt.
  if (world.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 40, 20, ${world.flashTimer * 0.9})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

/** One full frame of play: sky, ground, world and HUD. */
export function drawPlay(ctx, world) {
  drawSky(ctx, world.stage, world.scrollPx, world.time);
  drawGround(ctx, world.stage, world.scrollPx);
  drawWorldEntities(ctx, world);
  drawHud(ctx, world);
}

/** The title screen: the game, its name, and how to play it. */
export function drawTitle(ctx, world) {
  drawSky(ctx, world.stage, world.scrollPx, world.time);
  drawGround(ctx, world.stage, world.scrollPx);
  // The turkey idles on the lawn while the farmer waits off-screen.
  drawTurkey(ctx, { ...world.turkey, x: 200, y: GROUND_Y, runPhase: world.time * 2 }, world.time);
  ctx.fillStyle = 'rgba(30, 18, 8, 0.55)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffdd55';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('GOBBLE DASH', CANVAS_WIDTH / 2, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('A Thanksgiving Escape', CANVAS_WIDTH / 2, 192);
  ctx.font = '19px sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('The farmer wants you for dinner. Run 3,000 feet — farmyard, barn, kitchen —', CANVAS_WIDTH / 2, 250);
  ctx.fillText('and do not let him catch you.', CANVAS_WIDTH / 2, 276);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ARROWS / WASD — run and jump   •   DOWN / S — hide in a haystack', CANVAS_WIDTH / 2, 322);
  ctx.fillText('SPACE or CLICK — jump   •   RIGHT — sprint   •   P — pause   •   M — mute', CANVAS_WIDTH / 2, 350);
  ctx.fillStyle = '#ffdd55';
  ctx.font = 'bold 24px sans-serif';
  const pulse = 0.6 + Math.sin(world.time * 4) * 0.4;
  ctx.globalAlpha = pulse;
  ctx.fillText('Press ENTER or CLICK to start', CANVAS_WIDTH / 2, 420);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '16px sans-serif';
  ctx.fillText('Dodge the falling carving knives. Jump the fences, pumpkins and the oven.', CANVAS_WIDTH / 2, 460);
  ctx.fillText('Grab corn and golden feathers. Hide in haystacks when the farmer spots you.', CANVAS_WIDTH / 2, 484);
  ctx.textAlign = 'left';
}

/** The end screen: escaped with the score, or caught with a restart. */
export function drawOver(ctx, world) {
  drawPlay(ctx, world);
  ctx.fillStyle = 'rgba(30, 18, 8, 0.62)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  if (world.won) {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('ESCAPED!', CANVAS_WIDTH / 2, 170);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('You outran the farmer, the barn and the kitchen.', CANVAS_WIDTH / 2, 214);
    ctx.fillText('Happy Thanksgiving — no turkey was served today.', CANVAS_WIDTH / 2, 246);
  } else {
    ctx.fillStyle = '#ff6a5a';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('CAUGHT!', CANVAS_WIDTH / 2, 170);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('The farmer got his Thanksgiving dinner after all.', CANVAS_WIDTH / 2, 214);
    ctx.fillText('The oven was already warm.', CANVAS_WIDTH / 2, 246);
  }
  ctx.fillStyle = '#ffdd55';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`SCORE ${world.score}   •   DISTANCE ${Math.floor(world.distanceFeet)} ft`, CANVAS_WIDTH / 2, 310);
  ctx.fillStyle = '#ffffff';
  ctx.font = '19px sans-serif';
  ctx.fillText(`Best this session: ${world.best || world.score}`, CANVAS_WIDTH / 2, 344);
  const pulse = 0.6 + Math.sin(world.time * 4) * 0.4;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffdd55';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Press ENTER or CLICK to run again', CANVAS_WIDTH / 2, 410);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
