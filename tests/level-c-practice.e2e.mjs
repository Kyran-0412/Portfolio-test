// Browser test: the Tutorial's free play, its buttons, and practice mode.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const saved = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('cof-progress')));
const setProgress = (p) => page.evaluate((x) => localStorage.setItem('cof-progress', JSON.stringify(x)), p);

async function openTutorial() {
  await page.goto(`${base}/dev/sim.html?page=level-c`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-c.html'));
  return { game, frame, T: (fn, arg) => frame.evaluate(fn, arg) };
}
const chord = async (...ks) => { for (const k of ks) await page.keyboard.down(k); for (const k of ks) await page.keyboard.up(k); await page.waitForTimeout(150); };

try {
  await page.goto(`${base}/dev/sim.html?page=home`);

  // Already have C, no boss attempted: straight to free play; practice is locked.
  await setProgress({ v: 1, held: [], placed: ['C'] });
  let { game, frame, T } = await openTutorial();
  await game.locator('#instruction', { hasText: 'Welcome back' }).waitFor();
  assert.equal(await T(() => window.__tut.mode), 'free', 'no tutorial steps the second time');
  assert.equal(await game.locator('#collect').textContent(), 'RETURN HOME');
  assert.equal(await game.locator('#practiceBtn').isDisabled(), true);
  assert.equal(await game.locator('#practiceWrap').getAttribute('data-tip'), 'Unlocks after level “Feedback” has been attempted');
  await game.locator('#practiceWrap').hover();
  await page.waitForTimeout(250);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/pc-locked.png` });
  console.log('✓ with C already won: straight to free play, RETURN HOME, practice locked with a tooltip');

  // Redo tutorial starts the steps again.
  await game.locator('#redoBtn').click();
  await game.locator('#instruction', { hasText: 'Press A to play C' }).waitFor();
  assert.equal(await game.locator('#actions').isVisible(), false);
  console.log('✓ Redo tutorial goes back to step 1');

  // Starting Feedback's fight records the attempt.
  await setProgress({ v: 1, held: [], placed: ['C', 'G', 'D'] });
  await page.goto(`${base}/dev/sim.html?page=level-a`);
  const fb = page.frameLocator('#gameEmbed');
  await fb.locator('#startBtn').click();
  await fb.locator('#fightBtn').click();
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem('cof-progress')).tried || []).includes('A'), null, { timeout: 5000 });
  assert.deepEqual((await saved()).tried, ['A']);
  console.log('✓ starting a boss fight records the attempt');

  // Practice unlocks; only Feedback's attacks can be picked so far.
  ({ game, frame, T } = await openTutorial());
  await game.locator('#instruction', { hasText: 'Welcome back' }).waitFor();
  assert.equal(await game.locator('#practiceBtn').isDisabled(), false);
  await game.locator('#practiceBtn').click();
  await game.locator('#menu:not([hidden])').waitFor();
  for (const id of ['note', 'triad', 'held']) assert.equal(await game.locator(`#attack-${id}`).isDisabled(), false, id);
  for (const id of ['fifth', 'violet', 'red', 'bomb', 'arp']) assert.equal(await game.locator(`#attack-${id}`).isDisabled(), true, id);
  assert.match(await game.locator('#attack-violet').textContent(), /Unlocks after “The Tritone” has been attempted/);
  await game.locator('#attack-note').click(); // deselect the default
  assert.equal(await game.locator('#goBtn').isDisabled(), true, 'nothing picked: can’t start');
  await game.locator('#attack-triad').click();
  await game.locator('#attack-held').click();
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/pc-menu.png` });
  await game.locator('#goBtn').click();
  assert.equal(await T(() => window.__tut.mode), 'practice');
  console.log('✓ practice menu: Feedback’s attacks only, toggle on and off, Practise needs at least one');

  // In practice: the dummy fires triads; you can't run out of hearts.
  await frame.waitForFunction(() => window.__practice.notes.length > 0, null, { timeout: 5000 });
  await T(() => { const q = window.__practice; q.notes.push({ x: window.__tut.P.x, y: 200, vx: 0, vy: 300, midi: 62, notes: [62], pcs: [2], kind: 'note' }); });
  await frame.waitForFunction(() => window.__practice.stats.hits > 0, null, { timeout: 3000 });
  assert.ok(await T(() => document.querySelector('#play').classList.contains('show')), 'still playing after a hit');
  // Moves work: a power shot leaves the player.
  await T(() => { window.__practice.safe = 99; window.__practice.timers.held = 99; });
  await chord('a', 'g');
  assert.ok(await T(() => window.__practice.shots.some((s) => s.kind === 'power')), 'power shot fired');
  // The held chord: playing the missing note cuts it.
  await T(() => { const q = window.__practice; q.timers.held = 0; });
  await frame.waitForFunction(() => window.__practice.held !== null, null, { timeout: 2000 });
  const missing = await T(() => window.__practice.held.missing);
  await page.keyboard.press({ 0: 'a', 4: 'd', 7: 'g' }[missing]);
  await frame.waitForFunction(() => window.__practice.held === null && window.__practice.boss.stun > 0, null, { timeout: 2000 });
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/pc-practice.png` });
  console.log('✓ practice: the dummy fires, hits are counted but never fatal, moves work, the held chord can be cut');

  // Back to free play.
  await game.locator('#backFree').click();
  await game.locator('#instruction', { hasText: 'Welcome back' }).waitFor();
  assert.equal(await T(() => window.__practice), null);
  console.log('✓ Return to free play');

  // Every boss attempted: every attack unlocks.
  await setProgress({ v: 1, held: [], placed: ['C'], tried: ['A', 'F#', 'F'] });
  ({ game, frame, T } = await openTutorial());
  await game.locator('#practiceBtn').click();
  for (const id of ['fifth', 'violet', 'red', 'bomb', 'arp']) assert.equal(await game.locator(`#attack-${id}`).isDisabled(), false, id);
  await game.locator('#attack-triad').click(); // off
  await game.locator('#attack-held').click();  // off
  for (const id of ['violet', 'bomb', 'arp']) await game.locator(`#attack-${id}`).click();
  await game.locator('#goBtn').click();
  await T(() => { const q = window.__practice; q.safe = 999; q.timers.laser = 0; });
  await frame.waitForFunction(() => window.__practice.lasers.length > 0, null, { timeout: 2000 });
  assert.equal(await T(() => window.__practice.lasers[0].cancellable), true, 'violet only');
  await chord('a', 'd');
  assert.equal(await T(() => window.__practice.stats.resolved), 1, 'A + D resolves it');
  await T(() => { const q = window.__practice; q.timers.bomb = 0; q.timers.fan = 0; });
  await frame.waitForFunction(() => window.__practice.waves.length > 0, null, { timeout: 4000, polling: 'raf' });
  await frame.waitForFunction(() => window.__practice.notes.some((n) => n.kind === 'arp'), null, { timeout: 6000 });
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/pc-all.png` });
  console.log('✓ every boss attempted: lasers, bombs and arpeggio fans can all be practised');

  // Change attacks goes back to the menu.
  await game.locator('#changeBtn').click();
  await game.locator('#menu:not([hidden])').waitFor();
  await game.locator('#menuBack').click();
  // RETURN HOME leaves the level.
  await game.locator('#collect', { hasText: 'RETURN HOME' }).click();
  await page.waitForURL(/page=home/);
  console.log('✓ Change attacks, Back to free play, and RETURN HOME');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Tutorial free-play and practice checks passed.');
} finally {
  await close();
}
