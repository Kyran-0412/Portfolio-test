// Browser test: Level 5, Melody Memory (key of E), and its hidden heart.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
// The full keyboard: A = C4, W = C♯4, S = D4 … so E4 is the D key.
const CHROMATIC = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';', "'"];
const keyFor = (midi) => CHROMATIC[midi - 60];
const saved = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('cof-progress')));

async function playRun(game, frame, { mistakeInRound = null } = {}) {
  await game.locator('#startBtn').click();
  for (let round = 1; round <= 6; round++) {
    await game.locator('#round', { hasText: `Round ${round} of 6` }).waitFor({ timeout: 8000 });
    await game.locator('#status', { hasText: 'Your turn' }).waitFor({ timeout: 8000 });
    const { melody, length } = await frame.evaluate(() => ({ melody: window.__melody.melody, length: window.__melody.length }));
    assert.equal(length, round + 2, `round ${round} has ${round + 2} notes`);
    if (round === mistakeInRound) {
      await page.keyboard.press(keyFor(melody[0] === 65 ? 67 : 65)); // F or G: not in E major
      await game.locator('#feedback', { hasText: 'Not quite' }).waitFor();
      if (round === 2) await page.locator('#gameEmbed').screenshot({ path: `${shots}/le-miss.png` });
      await game.locator('#status', { hasText: 'Your turn' }).waitFor({ timeout: 8000 });
    }
    if (round === 3 && !mistakeInRound) await page.locator('#gameEmbed').screenshot({ path: `${shots}/le-turn.png` });
    for (const midi of melody.slice(0, length)) await page.keyboard.press(keyFor(midi));
  }
  await game.locator('#found.show').waitFor({ timeout: 8000 });
}

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A'] })));
  await page.goto(`${base}/dev/sim.html?page=level-e`);
  let game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Melody Memory' }).waitFor();
  let frame = page.frames().find((f) => f.url().includes('level-e.html'));
  assert.equal(await game.locator('.piano-key').count(), 18, 'the full keyboard');

  // A run with one mistake: the key, but no heart, and nothing said about hearts.
  await playRun(game, frame, { mistakeInRound: 2 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of E.');
  assert.equal(await game.locator('#heartFound').isVisible(), false);
  assert.deepEqual((await saved()).hearts, []);
  console.log('✓ six rounds (3 to 8 notes); a mistake replays the round; key found, no heart');

  // Replaying with no mistakes finds the hidden heart.
  await page.goto(`${base}/dev/sim.html?page=level-e`);
  game = page.frameLocator('#gameEmbed');
  frame = page.frames().find((f) => f.url().includes('level-e.html'));
  await playRun(game, frame);
  await game.locator('#heartFound').waitFor({ state: 'visible', timeout: 4000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'Hidden heart found');
  await page.waitForTimeout(2000);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/le-heart.png` });
  assert.deepEqual((await saved()).hearts, ['E']);
  console.log('✓ a perfect run finds the hidden heart');

  // Boss fights now start with an extra heart.
  await page.goto(`${base}/dev/sim.html?page=level-a`);
  game = page.frameLocator('#gameEmbed');
  await game.locator('#startBtn').click();
  await game.locator('#fightBtn').click();
  frame = page.frames().find((f) => f.url().includes('level-a.html'));
  assert.equal(await frame.evaluate(() => window.__boss.hearts), 4);
  console.log('✓ the boss fight starts with 4 hearts');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 5 browser checks passed.');
} finally {
  await close();
}
