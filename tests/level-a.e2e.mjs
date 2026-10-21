// Browser test: Level 4, the Feedback boss fight (key of A).
// You build A major's triad: root first, then the fifth, then the third.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
// Scale-mode keys: a=A s=B d=C♯ f=D g=E h=F♯ j=G♯ k=A

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D'] })));
  await page.goto(`${base}/dev/sim.html?page=level-a`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Feedback' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-a.html'));
  const S = (fn, arg) => frame.evaluate(fn, arg);
  const calm = () => S(() => { const s = window.__boss; s.notes = []; s.warnings = []; s.shots = []; s.attackIn = 99; s.holdIn = 99; s.pickupIn = 99; s.meter = 0; s.shotGap = 0; s.player.safe = 0; s.player.shield = 0; });
  const fired = () => S(() => window.__boss.shots.map((x) => x.kind));
  const chord = async (...keys) => {
    for (const k of keys) await page.keyboard.down(k);
    for (const k of keys) await page.keyboard.up(k);
    await page.waitForTimeout(150);
  };

  // Only the root is unlocked at the start.
  assert.deepEqual(await game.locator('.piano-key .piano-name').allTextContents(), ['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G♯', 'A']);
  await game.locator('#fightBtn').click();
  await frame.waitForFunction(() => window.__boss.running);
  const locked = await game.locator('.piano-key.locked').count();
  assert.equal(locked, 6, 'all but the two As are greyed out');
  await calm();
  await chord('s');
  assert.deepEqual(await fired(), [], 'a locked key fires nothing');
  await chord('a');
  assert.deepEqual(await fired(), ['single']);
  console.log('✓ phase 1: only the root fires; other keys are greyed out');

  // The boss's single notes fly faster than its chords.
  await calm();
  await S(() => { const s = window.__boss; fire({ kind: 'note', midi: 57, tx: s.player.x }); fire({ kind: 'chord', triad: { notes: [57, 61, 64], major: true }, tx: s.player.x }); });
  const speeds = await S(() => window.__boss.notes.map((n) => [n.kind, Math.round(Math.hypot(n.vx, n.vy))]));
  assert.equal(speeds[0][1], 325, 'single note: 260 × 1.25');
  assert.ok(speeds.slice(1).every(([kind, v]) => kind === 'chord' && v === 260), 'chords at the phase speed');
  console.log('✓ boss single notes fly 25% faster than its chords');

  // Cancelling an A with an A refunds it; the boss still has the whole scale.
  await calm();
  await S(() => { const s = window.__boss; s.notes.push({ x: s.player.x, y: s.player.y - 170, vx: 0, vy: 0, midi: 57, pc: 9, kind: 'note', label: true }); });
  const hp0 = await S(() => window.__boss.boss.hp);
  await chord('a');
  await frame.waitForFunction(() => window.__boss.notes.length === 0, null, { timeout: 2000 });
  assert.ok(await S(() => window.__boss.meter < 1), 'refunded');
  assert.equal(hp0 - (await S(() => window.__boss.boss.hp)), 2, 'cancel reflects damage (3 ÷ 1.5 health)');
  console.log('✓ firing the same note cancels it, refunds it and reflects damage');

  // Phase 2 at 60%: the fifth unlocks. E alone is a single; A + E is a power shot.
  await calm();
  await S(() => { window.__boss.boss.hp = 61; damage(2); });
  assert.equal(await S(() => window.__boss.phase), 1);
  assert.equal(await game.locator('.piano-key.locked').count(), 5);
  await chord('g');
  assert.deepEqual(await fired(), ['single']);
  await calm();
  await chord('a', 'g');
  assert.deepEqual(await fired(), ['power']);
  assert.ok(await S(() => window.__boss.meter > 14), 'power shot costs more volume (16 vs 7)');
  const [speedSingle, speedPower] = await S(() => [560, Math.abs(window.__boss.shots[0].vy)]);
  assert.ok(speedPower > speedSingle, 'power shot is faster');
  await page.waitForTimeout(80);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/la-power.png` });
  console.log('✓ phase 2: fifth unlocks; E alone is a single note, A + E a faster, louder power shot');

  // Phase 3 at 30%: the boss holds A and E; find the missing note to unlock the third.
  await calm();
  await S(() => { window.__boss.boss.hp = 31; damage(2); });
  assert.equal(await S(() => window.__boss.phase), 2);
  assert.ok(await S(() => window.__boss.moment !== null), 'unlock moment started');
  assert.equal(await game.locator('.piano-key.locked').count(), 0, 'every key works while searching');
  await page.waitForTimeout(300);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/la-moment.png` });
  for (const wrong of ['s', 'f', 'h']) await chord(wrong);
  assert.ok(await S(() => window.__boss.texts.some((t) => /Hint: the third note/.test(t.text))), 'hint after three wrong tries');
  assert.deepEqual(await fired(), [], 'guesses do not fire');
  await chord('d');
  assert.equal(await S(() => window.__boss.moment), null);
  assert.equal(await game.locator('.piano-key.locked').count(), 4, 'A, C♯, E (and top A) unlocked');
  await calm();
  await chord('a', 'd', 'g');
  assert.deepEqual(await fired(), ['triad', 'triad', 'triad']);
  const spread = await S(() => window.__boss.shots.map((x) => Math.sign(Math.round(x.vx))));
  assert.deepEqual(spread, [-1, 0, 1], 'triad spreads wide');
  await page.waitForTimeout(120);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/la-triad.png` });
  console.log('✓ phase 3: finding C♯ unlocks the third; A + C♯ + E fires a wide triad');

  // Mashing chords makes you clip: stunned for a moment, no menu.
  await calm();
  for (let i = 0; i < 12; i++) { await chord('a', 'd', 'g'); await page.waitForTimeout(150); if (await S(() => window.__boss.player.stun > 0)) break; }
  assert.ok(await S(() => window.__boss.player.stun > 0), 'clipping stuns you');
  assert.equal(await S(() => window.__boss.banner.text), 'You clipped!');
  assert.equal(await game.locator('#endCard.show').count(), 0, 'no menu');
  assert.ok(await S(() => window.__boss.meter <= 70), 'meter drops back');
  await page.waitForTimeout(250);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/la-clipped.png` });
  const xStun = await S(() => window.__boss.player.x);
  await S(() => { window.__boss.shots = []; });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
  await chord('a');
  assert.equal(await S(() => window.__boss.player.x), xStun, 'cannot move while stunned');
  assert.deepEqual(await fired(), [], 'cannot fire while stunned');
  await frame.waitForFunction(() => window.__boss.player.stun === 0, null, { timeout: 3000 });
  await page.waitForTimeout(100);
  await chord('a');
  assert.deepEqual(await fired(), ['single'], 'can fire again after the stun');
  console.log('✓ spamming clips you: stunned for 2s with "You clipped!", then back in');

  // Hits filling the meter still lose the phase; retry keeps the third.
  await calm();
  await S(() => { const s = window.__boss; s.meter = 95; s.notes.push({ x: s.player.x, y: s.player.y - 6, vx: 0, vy: 0, midi: 64, pc: 4, kind: 'note', label: false }); });
  await game.locator('#endCard.show', { hasText: 'Too loud!' }).waitFor({ timeout: 2000 });
  await game.locator('#endButtons button', { hasText: 'Retry' }).click();
  assert.equal(await S(() => window.__boss.boss.hp), 30, 'retry restarts phase 3');
  assert.equal(await S(() => window.__boss.moment), null, 'the third stays unlocked on retry');
  console.log('✓ hits filling the meter lose the phase; retry keeps the third unlocked');

  // Winning
  await calm();
  await S(() => { const s = window.__boss; s.boss.hp = 1; s.boss.stun = 5; s.player.x = s.boss.x; });
  await chord('a');
  await game.locator('#endCard.show', { hasText: 'Feedback cut' }).waitFor({ timeout: 3000 });
  await game.locator('#found.show').waitFor({ timeout: 5000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of A.');
  console.log('✓ beating the boss gives the key of A');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 4 browser checks passed.');
} finally {
  await close();
}
