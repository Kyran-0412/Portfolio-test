// Browser test: Level 7, The Tritone (second boss, key of F♯).
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
// Scale-mode keys: a=F♯ s=G♯ d=A♯ f=B g=C♯ h=D♯ j=E♯ k=F♯

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E', 'B'] })));
  await page.goto(`${base}/dev/sim.html?page=level-fsharp`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'The Tritone' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-fsharp.html'));
  const S = (fn, arg) => frame.evaluate(fn, arg);
  const names = () => game.locator('.piano-key .piano-name').allTextContents();
  const chord = async (...keys) => {
    for (const k of keys) await page.keyboard.down(k);
    for (const k of keys) await page.keyboard.up(k);
    await page.waitForTimeout(150);
  };
  const calm = () => S(() => { const s = window.__boss; s.notes = []; s.warnings = []; s.shots = []; s.waves = []; s.lasers.forEach((l) => l.sound.forEach((x) => x.stop())); s.lasers = []; s.attackIn = 99; s.laserIn = 99; s.groundIn = 99; s.pickupIn = 99; s.meter = 0; s.shotGap = 0; s.player.safe = 0; s.player.shield = 0; s.banner = null; });
  const finishTransition = async () => {
    await frame.waitForFunction(() => window.__boss.transition !== null, null, { timeout: 2000 });
    await S(() => { window.__boss.transition.t = 0.01; });
    await frame.waitForFunction(() => window.__boss.transition === null, null, { timeout: 2000 });
  };
  // A laser sweeping straight down onto the player.
  const laserOnPlayer = (cancellable) => S((c) => {
    const s = window.__boss, a = Math.atan2(s.player.y - 6 - (s.boss.y + 40 * 0.72), s.player.x - s.boss.x);
    s.lasers.push({ stage: 'sweep', e: 1.2, dur: 1, a0: a, a1: a, cancellable: c, reverse: false, sound: [] });
  }, cancellable);

  assert.deepEqual(await names(), ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯', 'F♯']);
  await game.locator('#fightBtn').click();
  await frame.waitForFunction(() => window.__boss.running);
  assert.equal(await game.locator('.piano-key.locked').count(), 4, 'F♯, A♯, C♯ (and top F♯) to start');
  console.log('✓ F♯ major in scale mode (E♯ spelled right), triad notes unlocked');

  // The boss fires single notes and perfect fifths, never triads.
  await calm();
  const kinds = await S(() => { const s = window.__boss; for (let i = 0; i < 60; i++) attack(); const k = [...new Set(s.warnings.map((w) => w.kind))].sort(); s.warnings = []; return k; });
  assert.deepEqual(kinds, ['fifth', 'note']);
  await S(() => { const s = window.__boss; fire({ kind: 'note', midi: 54, tx: s.player.x }); fire({ kind: 'fifth', notes: [54, 61], tx: s.player.x }); });
  const speeds = await S(() => window.__boss.notes.map((n) => [n.kind, Math.hypot(n.vx, n.vy)]));
  assert.ok(speeds[1][0] === 'fifth' && speeds[1][1] > speeds[0][1], 'fifths fly faster than single notes');
  // Firing either note of a fifth cancels it.
  await calm();
  await S(() => { const s = window.__boss; s.notes.push({ x: s.player.x, y: s.player.y - 170, vx: 0, vy: 0, midi: 54, pcs: [6, 1], notes: [54, 61], kind: 'fifth', label: true }); });
  await chord('g'); // C♯
  await frame.waitForFunction(() => window.__boss.notes.length === 0, null, { timeout: 2000 });
  console.log('✓ the boss fires notes and faster perfect fifths (no triads); either note cancels a fifth');

  // A violet laser: warning line, then a sweep; A + D resolves it.
  await calm();
  await S(() => startLasers());
  assert.equal(await S(() => window.__boss.lasers[0].cancellable), true);
  // The preview is the start of the sweep: it moves towards where the live
  // beam begins, then the beam carries on from there at the same speed.
  const { a0, a1 } = await S(() => window.__boss.lasers[0]);
  await page.waitForTimeout(300);
  const aEarly = await S(() => window.__boss.lasers[0].a);
  await page.waitForTimeout(400);
  const aLater = await S(() => window.__boss.lasers[0].a);
  assert.equal(await S(() => window.__boss.lasers[0].stage), 'warn');
  const toward = Math.sign(a1 - a0);
  assert.ok(Math.sign(aLater - aEarly) === toward && Math.sign(a0 - aLater) === toward, 'preview moves along the path, short of the live start');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lt-warn.png` });
  await frame.waitForFunction(() => window.__boss.lasers.length && window.__boss.lasers[0].stage === 'sweep', null, { timeout: 3000 });
  const aLive = await S(() => window.__boss.lasers[0].a);
  assert.ok(Math.abs(aLive - a0) < Math.abs(a1 - a0) * 0.15, 'the live beam picks up where the preview left off');
  await S(() => { window.__boss.player.safe = 99; }); // stay safe for the screenshot
  await page.waitForTimeout(400);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lt-sweep.png` });
  const hp0 = await S(() => window.__boss.boss.hp);
  await chord('a', 'd');
  assert.equal(await S(() => window.__boss.lasers.length), 0, 'resolved');
  assert.ok(hp0 - (await S(() => window.__boss.boss.hp)) > 1.5, 'resolving hurts the boss');
  console.log('✓ violet laser warns, sweeps, and A + D resolves it');

  // Resolving a laser on the very frame its beam goes live leaves no sound running.
  await calm();
  const stuck = await S(() => {
    const s = window.__boss;
    startLasers();
    const l = s.lasers[0];
    l.e = 1.2 - 0.001; // one frame from going live
    let loops = 0;
    l.sound = [{ live() { loops++; }, stop() {} }];
    resolveLasers();  // resolved, still in the list until the frame ends
    update(1 / 60);   // the frame where it would have gone live
    return loops;
  });
  assert.equal(stuck, 0, 'a resolved laser never goes live');
  console.log('✓ a laser resolved on the frame it goes live stays silent');

  // A laser hits you, unless you're mid-dash.
  await calm();
  await laserOnPlayer(true);
  await frame.waitForFunction(() => window.__boss.hearts === 2, null, { timeout: 2000 });
  await calm();
  await S(() => { window.__boss.player.safe = 0.3; });
  await laserOnPlayer(true);
  await page.waitForTimeout(150);
  assert.equal(await S(() => window.__boss.hearts), 2, 'dashing through the beam is safe');
  console.log('✓ the beam takes a heart, but dashing through it is safe');

  // Phase 2: flips to G♭, sus4 unlocks.
  await calm();
  await S(() => { window.__boss.hearts = 3; window.__boss.boss.hp = 66; damage(3); });
  await page.waitForTimeout(1300);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lt-transition.png` });
  await finishTransition();
  assert.equal(await S(() => window.__boss.flipped), true);
  assert.deepEqual(await names(), ['G♭', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F', 'G♭']);
  assert.equal(await game.locator('.piano-key.locked').count(), 3, 'C♭ (the fourth) unlocked');
  await calm();
  await S(() => { const s = window.__boss; for (let i = 0; i < 5; i++) s.notes.push({ x: s.player.x + (i - 2) * 40, y: s.player.y - 90, vx: 0, vy: 0, midi: 56, pc: 8, kind: 'note' }); s.notes.push({ x: 20, y: 40, vx: 0, vy: 0, midi: 56, pc: 8, kind: 'note' }); });
  await chord('a', 'f', 'g');
  assert.equal(await S(() => window.__boss.notes.length), 1, 'sus4 clears nearby notes only');
  assert.ok(await S(() => window.__boss.sus4Cool > 5), 'sus4 on cooldown');
  assert.ok(await S(() => window.__boss.meter > 25), 'sus4 is loud');
  await page.waitForTimeout(80);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lt-sus4.png` });
  await S(() => { window.__boss.meter = 0; });
  await chord('a', 'f', 'g');
  assert.ok(await S(() => window.__boss.texts.some((t) => /recharging/.test(t.text))));
  console.log('✓ phase 2: flipped to G♭ (flats on the keys); sus4 shockwave clears notes, then recharges');

  // No ground waves in this fight (saved for the Final Boss).
  assert.equal(await S(() => window.__boss.groundIn > 50), true, 'no ground waves scheduled');

  // Phase 3: red double lasers that can't be resolved.
  await calm();
  await S(() => { window.__boss.boss.hp = 31; damage(3); });
  await finishTransition();
  await calm();
  await S(() => startLasers());
  assert.equal(await S(() => window.__boss.lasers.length), 2);
  assert.equal(await S(() => window.__boss.lasers.some((l) => l.cancellable)), false);
  await frame.waitForFunction(() => window.__boss.lasers.length && window.__boss.lasers[0].stage === 'sweep', null, { timeout: 3000 });
  await S(() => { window.__boss.player.safe = 99; });
  await page.waitForTimeout(500);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lt-red.png` });
  await chord('a', 'd');
  assert.equal(await S(() => window.__boss.lasers.length), 2, 'red lasers cannot be resolved');
  console.log('✓ phase 3: red double lasers close in and cannot be resolved');

  // Losing shows the extra-hearts hint, then restarts the whole fight.
  await calm();
  await S(() => { window.__boss.hearts = 1; });
  await laserOnPlayer(false);
  await game.locator('#endCard.show', { hasText: 'Out of hearts' }).waitFor({ timeout: 2000 });
  assert.match(await game.locator('#endHint').textContent(), /find extra hearts by exploring/);
  await game.locator('#endButtons button', { hasText: 'Try again' }).click();
  assert.equal(await S(() => window.__boss.boss.hp), 100);
  assert.equal(await S(() => window.__boss.flipped), false);
  assert.deepEqual(await names(), ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯', 'F♯']);
  console.log('✓ out of hearts: the extra-hearts hint shows, and the fight restarts');

  // Winning
  await calm();
  await S(() => { const s = window.__boss; s.boss.hp = 0.5; s.boss.stun = 5; s.player.x = s.boss.x; });
  await chord('a');
  await game.locator('#endCard.show', { hasText: 'Resolved' }).waitFor({ timeout: 3000 });
  await game.locator('#found.show').waitFor({ timeout: 5000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of F♯.');
  console.log('✓ beating The Tritone gives the key of F♯');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 7 browser checks passed.');
} finally {
  await close();
}
