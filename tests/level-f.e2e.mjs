// Browser test: Level 12, the Final Boss, The Circle (key of F).
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
// Scale-mode keys A–K play the current phase's major scale (C first, F for the core).

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb'], hearts: ['E'] })));
  await page.goto(`${base}/dev/sim.html?page=level-f`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Final Boss' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-f.html'));
  const S = (fn, arg) => frame.evaluate(fn, arg);
  const names = () => game.locator('.piano-key .piano-name').allTextContents();
  const chord = async (...keys) => {
    for (const k of keys) await page.keyboard.down(k);
    for (const k of keys) await page.keyboard.up(k);
    await page.waitForTimeout(150);
  };
  const calm = () => S(() => { const s = window.__boss; s.notes = []; s.warnings = []; s.shots = []; s.waves = []; s.arps = []; s.lasers.forEach((l) => l.sound.forEach((x) => x.stop())); s.lasers = []; s.attackIn = 99; s.laserIn = 99; s.groundIn = 99; s.arpIn = 99; s.pickupIn = 99; s.meter = 0; s.shotGap = 0; s.player.safe = 0; s.player.shield = 0; s.banner = null; });
  // Breaks keys until the fight reaches stage n (0 = all keys, 11 = bare F core).
  const toStage = async (n) => {
    while (await S(() => window.__boss.phase) < n) {
      await S(() => { const s = window.__boss; s.boss.hp = 100 - (s.phase + 1) * SEG + 0.05; damage(1); });
      await finishTransition();
    }
  };
  const finishTransition = async () => {
    await frame.waitForFunction(() => window.__boss.transition !== null, null, { timeout: 2000 });
    await S(() => { window.__boss.transition.t = 0.01; });
    await frame.waitForFunction(() => window.__boss.transition === null, null, { timeout: 2000 });
  };

  assert.deepEqual(await names(), ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']);
  await game.locator('#fightBtn').click();
  await frame.waitForFunction(() => window.__boss.running);
  assert.equal(await game.locator('.piano-key.locked').count(), 0, 'every key playable from the start');
  assert.equal(await S(() => window.__boss.maxHearts), 4, '3 hearts plus the hidden one found');
  await page.waitForTimeout(400);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lf-start.png` });
  console.log('✓ starts in C major, every key playable, hidden heart counted');

  // Stage 1 (C): single notes only.
  await calm();
  const kindsAt = () => S(() => { const s = window.__boss; for (let i = 0; i < 80; i++) attack(); const k = [...new Set(s.warnings.map((w) => w.kind))].sort(); s.warnings = []; return k; });
  assert.deepEqual(await kindsAt(), ['note']);
  assert.equal(await S(() => window.__boss.laserIn > 50 && window.__boss.groundIn > 50 && window.__boss.arpIn > 50), true);

  // Breaking C: one key per section, however big the hit.
  await S(() => { const s = window.__boss; s.boss.hp = 100 - SEG + 0.05; damage(100); });
  assert.equal(await S(() => window.__boss.phase), 1, 'one key at a time');
  assert.ok(Math.abs(await S(() => window.__boss.boss.hp - (100 - SEG))) < 1e-6, 'health stops at the section line');
  assert.equal(await S(() => window.__boss.transition.key), 'C');
  await page.waitForTimeout(300);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lf-crack.png` });
  await page.waitForTimeout(400);
  assert.ok(await S(() => window.__boss.shards.length > 0), 'the key shatters');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lf-shatter.png` });
  await finishTransition();
  await calm();
  assert.deepEqual(await kindsAt(), ['fifth', 'note'], 'G adds fifths');
  assert.deepEqual(await names(), ['G', 'A', 'B', 'C', 'D', 'E', 'F♯', 'G'], 'breaking C moves the fight to G major');
  assert.equal(await game.locator('.piano-key.locked').count(), 0);
  assert.deepEqual(await S(() => [...window.__boss.unlocked].sort((a, b) => a - b)), [0, 2, 4, 6, 7, 9, 11]);
  const fifths = await S(() => FIFTHS.map((f) => f.map((m) => m % 12)));
  assert.deepEqual(fifths[0], [7, 2], 'the boss fires G major fifths');
  // The power shot is still A + G: G + D in this key.
  await calm();
  await chord('a', 'g');
  assert.equal(await S(() => window.__boss.shots[0]?.label), 'G+D');
  await toStage(2);
  await calm();
  assert.deepEqual(await kindsAt(), ['fifth', 'note', 'triad'], 'D adds triads');
  await S(() => { const s = window.__boss; fire({ kind: 'triad', notes: [53, 57, 60], tx: s.player.x }); });
  const triad = await S(() => window.__boss.notes.map((n) => Math.atan2(n.vy, n.vx)));
  assert.equal(triad.length, 3);
  assert.ok(triad[2] - triad[0] > 0.4, 'triad notes fan out');
  console.log('✓ stages 1–3: notes, then fifths, then fanned triads; each key breaks with a shatter');

  // Sus4 works from the start and clears ground waves too.
  await calm();
  await S(() => { const s = window.__boss; s.notes.push({ x: s.player.x + 30, y: s.player.y - 80, vx: 0, vy: 0, midi: 55, pcs: [7], kind: 'note' }); s.waves.push({ x: s.player.x + 60, dir: -1 }); });
  await chord('a', 'f', 'g');
  assert.equal(await S(() => window.__boss.notes.length + window.__boss.waves.length), 0, 'sus4 cleared a note and a wave');
  console.log('✓ sus4 (A + F + G) clears notes and ground waves');

  // Lasers from E, bombs from F♯.
  await toStage(4);
  assert.ok(await S(() => window.__boss.laserIn < 10 && window.__boss.groundIn > 50), 'E adds lasers, no bombs yet');
  await toStage(6);
  assert.deepEqual(await names(), ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯', 'F♯'], 'F♯ spelled with E♯');
  const timers = await S(() => ({ laser: window.__boss.laserIn, ground: window.__boss.groundIn, arp: window.__boss.arpIn }));
  assert.ok(timers.laser < 10 && timers.ground < 10 && timers.arp > 50, `F♯ stage timers ${JSON.stringify(timers)}`);
  await calm();
  await S(() => startLasers());
  assert.equal(await S(() => window.__boss.lasers[0].cancellable), true, 'phase 2 lasers are violet');
  await frame.waitForFunction(() => window.__boss.lasers.length && window.__boss.lasers[0].stage === 'sweep', null, { timeout: 3000 });
  await chord('a', 'd');
  assert.equal(await S(() => window.__boss.lasers.length), 0, 'A + D resolves it');
  await calm();
  await S(() => { window.__boss.player.x = 200; startGround(); });
  assert.match(await S(() => window.__boss.banner.text), /Power-chord bomb/);
  await S(() => { window.__boss.player.x = 750; }); // out of the way of the waves
  await page.waitForTimeout(600);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lf-bomb.png` });
  await frame.waitForFunction(() => window.__boss.waves.length === 2, null, { timeout: 2000 });
  console.log('✓ E and F♯ stages: violet lasers resolve with A + D; bombs drop from the boss and split into ground waves');

  // A ground wave takes a heart unless you dash.
  await calm();
  const h0 = await S(() => window.__boss.hearts);
  await S(() => { const s = window.__boss; s.waves.push({ x: s.player.x - 40, dir: 1 }); });
  await frame.waitForFunction((h) => window.__boss.hearts === h - 1, h0, { timeout: 2000 });
  await calm();
  await S(() => { const s = window.__boss; s.player.safe = 0.3; s.waves.push({ x: s.player.x - 20, dir: 1 }); });
  await page.waitForTimeout(250);
  assert.equal(await S(() => window.__boss.hearts), h0 - 1, 'dashing through a wave is safe');
  console.log('✓ ground waves hurt, dashing through them is safe');

  // Arpeggio fans from A♭, red lasers from E♭.
  await S(() => { window.__boss.hearts = 4; });
  await toStage(8);
  assert.deepEqual(await names(), ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G', 'A♭'], 'A♭ in flats');
  assert.ok(await S(() => window.__boss.arpIn < 10), 'arpeggios scheduled');
  await calm();
  await S(() => warnArp());
  await page.waitForTimeout(500);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lf-arp-warn.png` });
  await frame.waitForFunction(() => window.__boss.notes.filter((n) => n.kind === 'arp').length >= 4, null, { timeout: 3000 });
  await S(() => { window.__boss.player.safe = 99; });
  await page.waitForTimeout(300);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lf-arp.png` });
  const arp = await S(() => window.__boss.notes.filter((n) => n.kind === 'arp').map((n) => ({ a: Math.atan2(n.vy, n.vx), pc: n.midi % 12 })));
  assert.ok(Math.abs(arp.at(-1).a - arp[0].a) > 0.5, 'arpeggio fans across');
  assert.ok(new Set(arp.map((x) => x.pc)).size >= 3, 'arpeggio plays the chord tones');
  await toStage(9);
  assert.ok(await S(() => window.__boss.laserIn <= 2.5), 'the first red laser comes soon after the banner');
  await calm();
  assert.equal(await S(() => { startLasers(); const r = window.__boss.lasers.some((l) => !l.cancellable); window.__boss.lasers.forEach(endLaser); window.__boss.lasers = []; return r; }), true, 'the first laser after the banner is red');
  await calm();
  await S(() => { const s = window.__boss; for (let i = 0; i < 20; i++) { startLasers(); } s.reds = s.lasers.filter((l) => !l.cancellable).length; s.lasers.forEach((l) => l.sound.forEach((x) => x.stop())); s.lasers = []; });
  assert.ok(await S(() => window.__boss.reds > 0), 'phase 3 has red lasers');
  console.log('✓ A♭ and E♭ stages: arpeggio fans spray chord tones across the floor; red lasers join in');

  // Losing restarts the fight, with the hint (only one hidden heart found).
  await calm();
  await S(() => { window.__boss.hearts = 1; const s = window.__boss; s.waves.push({ x: s.player.x - 20, dir: 1 }); });
  await game.locator('#endCard.show', { hasText: 'Out of hearts' }).waitFor({ timeout: 2000 });
  assert.match(await game.locator('#endHint').textContent(), /find extra hearts/);
  await game.locator('#endButtons button', { hasText: 'Try again' }).click();
  assert.equal(await S(() => window.__boss.boss.hp), 100);
  assert.equal(await S(() => window.__boss.phase), 0);
  assert.deepEqual(await names(), ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'], 'back to C');
  console.log('✓ out of hearts: hint shown, fight restarts');

  // Down to the F core, then zero health: it waits for F major.
  await toStage(11);
  assert.deepEqual(await names(), ['F', 'G', 'A', 'B♭', 'C', 'D', 'E', 'F'], 'the core is back in F');
  assert.match(await S(() => window.__boss.banner?.text || ''), /Only F is left/);
  await calm();
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lf-core.png` });
  await S(() => { const s = window.__boss; s.boss.hp = 0.5; damage(5); });
  assert.equal(await S(() => window.__boss.finale), true);
  assert.equal(await S(() => window.__boss.running), true);
  await page.waitForTimeout(300);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lf-finale.png` });
  await chord('a', 'g');
  assert.ok(await S(() => window.__boss.texts.some((t) => /Play F major/.test(t.text))));
  assert.equal(await S(() => window.__boss.running), true, 'a power shot does not finish it');
  await page.waitForTimeout(300);
  await chord('a', 'd', 'g');
  await game.locator('#endCard.show', { hasText: 'Full circle' }).waitFor({ timeout: 3000 });
  await game.locator('#found.show').waitFor({ timeout: 5000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of F.');
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('cof-progress')));
  assert.deepEqual(saved.held, ['F']);
  console.log('✓ F major finishes it: full circle, key of F found');

  // Aim lines follow the player with a lag (as in Feedback).
  await calm();
  const mid = await S(async () => {
    const s = window.__boss;
    s.running = true; s.transition = null; s.over = false; s.finale = false; s.player.x = 200; s.player.safe = 99;
    s.warnings = [{ t: 0.8, total: 0.8, tx: 200, kind: 'note', midi: 60, miss: 0 }];
    const w = s.warnings[0];
    s.player.x = 700;
    await new Promise((r) => setTimeout(r, 250));
    return w.tx;
  });
  assert.ok(mid > 210 && mid < 500, `the aim line follows but lags (${Math.round(mid)})`);
  console.log('✓ aim lines follow you with a lag');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 12 browser checks passed.');
} finally {
  await close();
}
