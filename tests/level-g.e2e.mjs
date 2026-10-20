// Browser test: Level 2, Wrong Note (key of G).
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const ANSWERS = [2, 3, 6]; // the wrong note in each round

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C'] })));
  await page.goto(`${base}/dev/sim.html?page=level-g`);
  const game = page.frameLocator('#gameEmbed');
  const feedback = () => game.locator('#feedback').textContent();

  await game.locator('#introTitle', { hasText: 'Wrong Note' }).waitFor();
  await game.locator('#startBtn').click();
  assert.equal(await game.locator('#skipBtn').isVisible(), true, 'skip button shows in Preview');

  for (let round = 0; round < 3; round++) {
    await game.locator('#round', { hasText: `Round ${round + 1} of 3` }).waitFor();
    if (round === 0) {
      // Blocks can't be picked before the melody has played once.
      await game.locator('.block').first().click();
      assert.match(await feedback(), /Press Play/);
    }
    await game.locator('#playBtn').click();
    await game.locator('#feedback', { hasText: 'Click the note' }).waitFor({ timeout: 8000 });
    if (round === 0) {
      await page.locator('#gameEmbed').screenshot({ path: `${shots}/lg-round1.png` });
      await game.locator('.block[data-index="0"]').click();
      assert.match(await feedback(), /That one fits in G major/);
      await game.locator('.block[data-index="1"]').click();
      assert.match(await feedback(), /Hint: G major has one sharp/);
    }
    await game.locator(`.block[data-index="${ANSWERS[round]}"]`).click();
    assert.match(await feedback(), /^Got it\./);
    if (round === 2) {
      assert.match(await feedback(), /F♮ isn’t in G major\. It should be F♯/);
      await page.waitForTimeout(300);
      await page.locator('#gameEmbed').screenshot({ path: `${shots}/lg-found.png` });
    }
    console.log(`✓ round ${round + 1}: wrong note found`);
  }

  await game.locator('#found.show').waitFor({ timeout: 15000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of G.');
  assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('cof-progress'))).held, ['G']);
  console.log('✓ all three rounds give the key of G');

  // On the live site there is no skip button.
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C'] })));
  await page.goto(`${base}/dev/sim.html?page=level-g&mode=site`);
  await game.locator('#startBtn').click();
  await game.locator('#round').waitFor();
  assert.equal(await game.locator('#skipBtn').isVisible(), false);
  console.log('✓ no skip button on the live site');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 2 browser checks passed.');
} finally {
  await close();
}
