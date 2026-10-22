// Browser test: Level 9, Survival Waves (key of A♭), the zombie rush.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();

async function open(weapon) {
  await page.goto(`${base}/dev/sim.html?page=level-aflat`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Survival Waves' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-aflat.html'));
  await game.locator('#choose.show').waitFor();
  if (weapon) await game.locator(`#weapon-${weapon}`).click();
  const S = (fn, arg) => frame.evaluate(fn, arg);
  // Canvas point → page point, for aiming the mouse.
  const box = await page.locator('#gameEmbed').boundingBox();
  const canvasBox = await game.locator('#arena').boundingBox();
  const at = (x, y) => [canvasBox.x + x * (canvasBox.width / 900), canvasBox.y + y * (canvasBox.height / 540)];
  return { game, frame, S, at, box };
}
// Clears the arena but keeps one zombie waiting to spawn, so the wave isn't "cleared".
const calm = (S) => S(() => { const s = window.__zombie; s.queue = ['walker']; s.zombies = []; s.spits = []; s.shots = []; s.spawnIn = 999; s.banner = null; s.player.x = 450; s.player.y = 270; });
const clearWave = (S) => S(() => { const s = window.__zombie; s.queue = []; s.zombies = []; });

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db'] })));
  let { game, frame, S, at } = await open(null);
  assert.equal(await game.locator('#piano').isVisible(), false, 'no piano');
  assert.equal(await game.locator('.choice').count(), 3, 'three weapons to choose from');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lz-choose.png` });
  await game.locator('#weapon-arp').click();
  assert.equal(await S(() => window.__zombie.mode), 'fight');
  assert.deepEqual(await S(() => [...new Set(window.__zombie.queue)]), ['walker'], 'wave 1 is walkers only');
  console.log('✓ weapon choice screen; wave 1 starts with walkers');

  // WASD moves; holding the mouse fires notes towards it.
  await calm(S);
  await page.mouse.move(...at(450, 120));
  await page.keyboard.down('d'); await page.waitForTimeout(300); await page.keyboard.up('d');
  assert.ok(await S(() => window.__zombie.player.x) > 480, 'D moves right');
  await page.keyboard.down('w'); await page.waitForTimeout(200); await page.keyboard.up('w');
  assert.ok(await S(() => window.__zombie.player.y) < 250, 'W moves up');
  await calm(S);
  await S(() => { window.__zombie.zombies.push({ type: 'walker', x: 450, y: 150, hp: 3, maxHp: 3, size: 14, attackCool: 0, fireIn: 9, flash: 0, wobble: 0 }); });
  await page.mouse.move(...at(450, 150));
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  assert.equal(await S(() => window.__zombie.zombies.length), 0, 'the walker was shot down');
  console.log('✓ WASD moves; holding left click fires the Arpeggiator at the mouse');

  // The Arpeggiator has a 12-note clip, then reloads.
  await calm(S);
  await S(() => { window.__zombie.ammo = 12; window.__zombie.reloading = 0; window.__zombie.shots = []; });
  await page.mouse.move(...at(450, 20));
  await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up();
  const after = await S(() => ({ ammo: window.__zombie.ammo, reloading: window.__zombie.reloading }));
  assert.ok(after.reloading > 0 || after.ammo === 12, 'clip ran dry and reloaded');
  const fired = await S(() => window.__zombie.note);
  assert.ok(fired <= 16, `no more than a clip and a bit fired in 2.6s (${fired})`);
  await frame.waitForFunction(() => window.__zombie.reloading === 0 && window.__zombie.ammo === 12, null, { timeout: 3000 });
  // R reloads early.
  await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up();
  await page.keyboard.press('r');
  assert.ok(await S(() => window.__zombie.reloading > 0), 'R starts a reload');
  console.log('✓ Arpeggiator: 12-note clip, automatic reload, R to reload early');

  // Zombies hurt you up close; spitters shoot from range.
  await calm(S);
  await S(() => { const s = window.__zombie; s.zombies.push({ type: 'walker', x: s.player.x + 10, y: s.player.y, hp: 3, maxHp: 3, size: 14, attackCool: 0, fireIn: 9, flash: 0, wobble: 0 }); });
  await frame.waitForFunction(() => window.__zombie.player.hp < 100, null, { timeout: 2000 });
  await calm(S);
  await S(() => { const s = window.__zombie; s.zombies.push({ type: 'spitter', x: s.player.x + 220, y: s.player.y, hp: 5, maxHp: 5, size: 14, attackCool: 0, fireIn: 0.1, flash: 0, wobble: 0 }); });
  await frame.waitForFunction(() => window.__zombie.spits.length > 0, null, { timeout: 3000 });
  console.log('✓ walkers hit up close; spitters fire from range');

  // Clearing a wave offers three upgrades; picking one starts the next wave.
  await clearWave(S);
  await game.locator('#upgrade.show').waitFor({ timeout: 2000 });
  assert.equal(await game.locator('#upgrades .choice').count(), 3);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lz-upgrade.png` });
  const rate0 = await S(() => window.__zombie.mods.rate);
  const picked = await game.locator('#upgrades .choice').first().getAttribute('id');
  await game.locator('#upgrades .choice').first().click();
  assert.equal(await S(() => window.__zombie.wave), 1);
  assert.ok((await S(() => window.__zombie.queue)).includes('brute'), 'wave 2 brings brutes');
  console.log(`✓ wave cleared: three upgrades offered (${picked}); wave 2 brings brutes`);

  // A screenshot of a busy wave.
  await S(() => { const s = window.__zombie; startWave(3); s.player.hp = 999; s.player.maxHp = 999; s.spawnIn = 0; WAVES[3].gap = 0.05; });
  await page.mouse.move(...at(700, 120));
  await page.mouse.down(); await page.waitForTimeout(1800); await page.mouse.up();
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lz-fight.png` });

  // Overrun: retry the same wave with your upgrades.
  await calm(S);
  await S(() => { const s = window.__zombie; s.wave = 2; s.waveStart = { hp: 100, maxHp: 125, speed: 230, regen: 2, mods: { damage: 1.3, rate: 1, extra: 1, pierce: 0, size: 1, reach: 1 } }; s.player.hp = 1; s.zombies.push({ type: 'brute', x: s.player.x + 5, y: s.player.y, hp: 14, maxHp: 14, size: 23, attackCool: 0, fireIn: 9, flash: 0, wobble: 0 }); });
  await game.locator('#endCard.show', { hasText: 'Overrun' }).waitFor({ timeout: 2000 });
  await game.locator('#endButtons button', { hasText: 'Retry wave' }).click();
  assert.deepEqual(await S(() => [window.__zombie.wave, window.__zombie.player.hp, window.__zombie.player.maxHp, window.__zombie.mods.damage]), [2, 125, 125, 1.3]);
  console.log('✓ overrun: retry the same wave at full health, keeping upgrades');

  // Surviving the final wave gives the key.
  await S(() => startWave(4));
  await clearWave(S);
  await game.locator('#endCard.show', { hasText: 'Survived' }).waitFor({ timeout: 2000 });
  await game.locator('#found.show').waitFor({ timeout: 5000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of A♭.');
  console.log('✓ surviving wave 5 gives the key of A♭');

  // Mic Swing: melee hits in front, not behind.
  ({ game, frame, S, at } = await open('mic'));
  await calm(S);
  await S(() => { const s = window.__zombie; s.zombies.push({ type: 'walker', x: 500, y: 270, hp: 3, maxHp: 3, size: 14, attackCool: 9, fireIn: 9, flash: 0, wobble: 0 }, { type: 'walker', x: 400, y: 270, hp: 3, maxHp: 3, size: 14, attackCool: 9, fireIn: 9, flash: 0, wobble: 0 }); });
  await page.mouse.move(...at(700, 270));
  await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
  await page.waitForTimeout(50);
  assert.deepEqual(await S(() => window.__zombie.zombies.map((z) => z.x < 450)), [true], 'only the zombie in front was hit');
  console.log('✓ Mic Swing hits in front of you, not behind');

  // Mic special: Feedback. Ready at the start; letting go early cancels it.
  await calm(S);
  const zombie = (type, x, y) => { const z = { walker: 4, brute: 18, spitter: 6, runner: 2 }[type]; return { type, x, y, hp: z, maxHp: z, size: type === 'brute' ? 23 : 14, attackCool: 9, fireIn: 9, flash: 0, wobble: 0 }; };
  assert.equal(await S(() => window.__zombie.fb.cool), 0, 'ready from the start');
  await page.keyboard.down('e'); await page.waitForTimeout(500); await page.keyboard.up('e');
  assert.equal(await S(() => window.__zombie.fb.state), 'idle', 'released early: cancelled');
  assert.equal(await S(() => window.__zombie.fb.cool), 0, 'no cooldown for a cancelled charge');
  // A full charge: bar, ear defenders, no swinging, then the blast.
  await S(([a, b, c]) => { window.__zombie.zombies.push(a, b, c); }, [zombie('walker', 200, 300), zombie('brute', 700, 300), zombie('spitter', 450, 470)]);
  await S(() => { window.__zombie.zombies.forEach((z) => { z.stun = 99; }); }); // hold them still for the test
  await page.keyboard.down('e');
  await page.waitForTimeout(1000);
  assert.equal(await S(() => window.__zombie.fb.state), 'charging');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lz-charge.png` });
  await page.waitForTimeout(1200);
  assert.equal(await S(() => window.__zombie.fb.state), 'full');
  await page.keyboard.up('e');
  assert.equal(await S(() => window.__zombie.fb.state), 'windup');
  assert.equal(await S(() => Math.round(window.__zombie.fb.cool)), 120, '2 minute cooldown starts');
  await frame.waitForFunction(() => window.__zombie.fb.state === 'blast', null, { timeout: 2000 });
  await page.waitForTimeout(350);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lz-blast.png` });
  await page.waitForTimeout(450);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lz-blast2.png` });
  await frame.waitForFunction(() => window.__zombie.fb.state === 'idle', null, { timeout: 4000 });
  const left = await S(() => window.__zombie.zombies.map((z) => [z.type, +(z.hp / z.maxHp).toFixed(2)]));
  assert.ok(!left.some(([t]) => t === 'walker'), `the walker died (${JSON.stringify(left)})`);
  const brute = left.find(([t]) => t === 'brute');
  assert.ok(brute && brute[1] > 0.15 && brute[1] < 0.5, `the brute survives, badly hurt (${JSON.stringify(left)})`);
  // On cooldown now, and it carries into the next wave.
  await page.keyboard.down('e'); await page.waitForTimeout(200); await page.keyboard.up('e');
  assert.equal(await S(() => window.__zombie.fb.state), 'idle', 'on cooldown: nothing happens');
  const cool = await S(() => window.__zombie.fb.cool);
  await S(() => startWave(1));
  assert.ok(Math.abs((await S(() => window.__zombie.fb.cool)) - cool) < 0.5, 'a new wave keeps the cooldown');
  console.log(`✓ Mic special: charge with E, ear defenders, blast from all 4 speakers (walker dead, brute at ${Math.round(brute[1] * 100)}%), 2 min cooldown kept across waves`);

  // Sub Bass: one wave pierces a whole line.
  ({ game, frame, S, at } = await open('bass'));
  await calm(S);
  await S(() => { const s = window.__zombie; for (let i = 0; i < 4; i++) s.zombies.push({ type: 'walker', x: 450, y: 210 - i * 40, hp: 3, maxHp: 3, size: 14, attackCool: 9, fireIn: 9, flash: 0, wobble: 0 }); });
  await page.mouse.move(...at(450, 20));
  await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
  await frame.waitForFunction(() => window.__zombie.zombies.length === 0, null, { timeout: 3000 });
  console.log('✓ Sub Bass rolls through a whole line of zombies');

  // Sub Bass has a 4-wave clip.
  await calm(S);
  await S(() => { window.__zombie.ammo = 4; window.__zombie.reloading = 0; window.__zombie.fireCool = 0; });
  await page.mouse.move(...at(450, 20));
  await page.mouse.down(); await page.waitForTimeout(3300); await page.mouse.up();
  assert.ok(await S(() => window.__zombie.reloading > 0 || window.__zombie.ammo === 4), 'the clip ran dry and reloads');
  console.log('✓ Sub Bass: 4-wave clip, then a reload');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 9 browser checks passed.');
} finally {
  await close();
}
