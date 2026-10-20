// Browser test: Level 4, the Feedback boss fight (key of A).
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const SCALE_KEYS = 'asdfghjk'; // A B C♯ D E F♯ G♯ A

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D'] })));
  await page.goto(`${base}/dev/sim.html?page=level-a`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Feedback' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-a.html'));
  const S = (fn) => frame.evaluate(fn);

  // Scale mode: eight keys showing A major.
  const names = await game.locator('.piano-key .piano-name').allTextContents();
  assert.deepEqual(names, ['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G♯', 'A']);
  await game.locator('#howTo.show').waitFor();
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/la-howto.png` });
  await game.locator('#fightBtn').click();
  console.log('✓ scale-mode piano, how-to card, fight starts');

  // The boss warns, then fires.
  await frame.waitForFunction(() => window.__boss.warnings.length > 0, null, { timeout: 4000 });
  await frame.waitForFunction(() => window.__boss.notes.length > 0, null, { timeout: 4000 });
  console.log('✓ boss warns before firing, then fires');

  // Moving and dashing.
  const x0 = await S(() => window.__boss.player.x);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
  const x1 = await S(() => window.__boss.player.x);
  assert.ok(x1 > x0 + 60, `moved right (${x0} → ${x1})`);
  await page.keyboard.down('ArrowLeft'); await page.keyboard.press('Space'); await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(250);
  const x2 = await S(() => window.__boss.player.x);
  assert.ok(x2 < x1, 'dash moved left');
  assert.equal(await S(() => window.__boss.running), true, 'Space did not restart the fight');
  console.log('✓ arrows move, Space dashes');

  // Clear the field, then test each mechanic with notes placed by hand.
  const calm = () => S(() => { const s = window.__boss; s.notes = []; s.warnings = []; s.attackIn = 99; s.holdIn = 99; s.pickupIn = 99; s.meter = 0; s.player.safe = 0; s.player.shield = 0; });
  await calm();
  // An A coming at you is cancelled by firing A.
  await S(() => { const s = window.__boss; s.notes.push({ x: s.player.x, y: s.player.y - 170, vx: 0, vy: 0, midi: 57, pc: 9, kind: 'note', label: true }); });
  await page.keyboard.press('a');
  const hpCancel = await S(() => window.__boss.boss.hp);
  await frame.waitForFunction(() => window.__boss.notes.length === 0, null, { timeout: 2000 });
  assert.ok(await S(() => window.__boss.meter < 1), 'cancelling refunds the note');
  assert.equal(hpCancel - (await S(() => window.__boss.boss.hp)), 3, 'cancelling reflects damage');
  console.log('✓ firing the same note cancels an incoming note, refunds it and reflects damage');

  // Mashing: notes come no faster than the gap, and each adds to the meter.
  await calm();
  await S(() => { window.__boss.shots = []; });
  for (let i = 0; i < 6; i++) await page.keyboard.press('asdfgh'[i]);
  const fired = await S(() => window.__boss.shots.length);
  assert.ok(fired < 6, `rapid presses are limited (${fired} of 6 fired)`);
  assert.ok(await S(() => window.__boss.meter) > 0, 'firing fills your meter');
  console.log(`✓ rapid presses limited (${fired} of 6 fired) and each note costs volume`);

  // A different note passes through and hits you.
  await S(() => { const s = window.__boss; s.notes.push({ x: s.player.x, y: s.player.y - 170, vx: 0, vy: 160, midi: 64, pc: 4, kind: 'note', label: true }); });
  await page.keyboard.press('a');
  await frame.waitForFunction(() => window.__boss.meter > 15, null, { timeout: 3000 });
  console.log('✓ a different note passes through and fills the volume meter');

  // Ear defenders block a hit.
  await calm();
  await S(() => { const s = window.__boss; s.pickups.push({ x: s.player.x, y: s.player.y }); });
  await frame.waitForFunction(() => window.__boss.player.shield > 0, null, { timeout: 2000 });
  await S(() => { const s = window.__boss; s.notes.push({ x: s.player.x, y: s.player.y - 6, vx: 0, vy: 0, midi: 64, pc: 4, kind: 'note', label: true }); });
  await page.waitForTimeout(200);
  assert.ok(await S(() => window.__boss.meter < 1), 'blocked by ear defenders');
  console.log('✓ ear defenders block hits');

  // Phase 2 at 60% health; then a held chord, cut with the missing note.
  await calm();
  await S(() => { window.__boss.boss.hp = 61; damage(2); });
  assert.equal(await S(() => window.__boss.phase), 1);
  await S(() => hold());
  await page.waitForTimeout(400);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/la-held.png` });
  const missingKey = await S(() => {
    const scale = [57, 59, 61, 62, 64, 66, 68, 69];
    return 'asdfghjk'[scale.findIndex((m) => m % 12 === window.__boss.held.missing % 12)];
  });
  const hpBefore = await S(() => window.__boss.boss.hp);
  await page.keyboard.press(missingKey);
  assert.equal(await S(() => window.__boss.held), null);
  assert.ok(await S(() => window.__boss.boss.stun > 0), 'boss stunned');
  assert.equal(Math.round(hpBefore - (await S(() => window.__boss.boss.hp))), 14);
  console.log('✓ phase 2 at 60%; playing the missing note cuts the feedback');

  // Let it fight for a moment for a screenshot of phase 3.
  await S(() => { const s = window.__boss; s.boss.hp = 26; damage(2); s.attackIn = 0.2; s.meter = 0; });
  assert.equal(await S(() => window.__boss.phase), 2);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowLeft');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/la-fight.png` });

  // Losing: a full meter ends the phase; Retry restarts it.
  await calm();
  await S(() => { const s = window.__boss; s.meter = 95; s.notes.push({ x: s.player.x, y: s.player.y - 6, vx: 0, vy: 0, midi: 64, pc: 4, kind: 'note', label: false }); });
  await game.locator('#endCard.show', { hasText: 'Too loud!' }).waitFor({ timeout: 2000 });
  await game.locator('#endButtons button', { hasText: 'Retry' }).click();
  assert.equal(await S(() => window.__boss.running), true);
  assert.equal(await S(() => window.__boss.boss.hp), 25, 'retry restarts phase 3');
  console.log('✓ a full volume meter loses the phase; Retry restarts it');

  // Mashing until you clip loses the phase.
  await calm();
  for (let i = 0; i < 30; i++) { await page.keyboard.press('asdfghjk'[i % 8]); await page.waitForTimeout(230); if (await game.locator('#endCard.show').count()) break; }
  await game.locator('#endCard.show', { hasText: 'Clipped!' }).waitFor({ timeout: 2000 });
  await game.locator('#endButtons button', { hasText: 'Retry' }).click();
  console.log('✓ spamming notes makes you clip and lose the phase');

  // Winning
  await calm();
  await S(() => { window.__boss.boss.hp = 1; });
  const bossX = await S(() => window.__boss.boss.x);
  await S((x) => { window.__boss.player.x = x; }, bossX);
  await frame.evaluate((x) => { window.__boss.player.x = x; }, bossX);
  await page.keyboard.press('a');
  await game.locator('#endCard.show', { hasText: 'Feedback cut' }).waitFor({ timeout: 3000 });
  await game.locator('#found.show').waitFor({ timeout: 5000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of A.');
  console.log('✓ beating the boss gives the key of A');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 4 browser checks passed.');
} finally {
  await close();
}
