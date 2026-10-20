// Browser test: Level 3, Key Signature Lock (key of D).
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G'] })));
  await page.goto(`${base}/dev/sim.html?page=level-d`);
  const game = page.frameLocator('#gameEmbed');
  const feedback = () => game.locator('#feedback').textContent();
  const sharps = () => game.locator('.tumbler.sharp').evaluateAll((ts) => ts.map((t) => t.dataset.letter));

  await game.locator('#introTitle', { hasText: 'Key Signature Lock' }).waitFor();
  await game.locator('#startBtn').click();

  // Lock 1, G major: a wrong try reports how many tumblers fit.
  await game.locator('#title', { hasText: 'Set the lock to G major' }).waitFor();
  await game.locator('#tryBtn').click();
  await game.locator('#feedback', { hasText: '6 of 7 tumblers' }).waitFor({ timeout: 5000 });
  await game.locator('#tryBtn:not([disabled])').waitFor();
  await game.locator('#tryBtn').click();
  await game.locator('#feedback', { hasText: 'Hint: G major has 1 sharp' }).waitFor({ timeout: 5000 });
  // Setting F♯ with the piano (T key), then F natural (F), then F♯ by clicking.
  await page.keyboard.press('t');
  assert.deepEqual(await sharps(), ['F']);
  await page.keyboard.press('f');
  assert.deepEqual(await sharps(), []);
  await game.locator('.tumbler[data-letter="F"]').click();
  assert.deepEqual(await sharps(), ['F']);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/ld-lock1.png` });
  await game.locator('#tryBtn').click();
  await game.locator('#feedback', { hasText: 'Unlocked. G major has 1 sharp: F♯.' }).waitFor({ timeout: 5000 });
  console.log('✓ lock 1 (G): wrong tries counted, piano and clicks set tumblers, opens');

  // Lock 2, D major: tumblers reset; add C♯ with the piano (W key).
  await game.locator('#title', { hasText: 'Set the lock to D major' }).waitFor({ timeout: 5000 });
  assert.deepEqual(await sharps(), []);
  await page.keyboard.press('t');
  await page.keyboard.press('w');
  await game.locator('#tryBtn').click();
  await game.locator('#feedback', { hasText: 'D major has 2 sharps: F♯, C♯.' }).waitFor({ timeout: 5000 });
  console.log('✓ lock 2 (D) opens');

  // Lock 3, A major.
  await game.locator('#title', { hasText: 'Set the lock to A major' }).waitFor({ timeout: 5000 });
  for (const l of ['F', 'C', 'G']) await game.locator(`.tumbler[data-letter="${l}"]`).click();
  await game.locator('#tryBtn').click();
  await game.locator('#feedback', { hasText: 'A major has 3 sharps' }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(700);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/ld-open.png` });
  await game.locator('#feedback', { hasText: 'Each step clockwise adds one sharp' }).waitFor({ timeout: 5000 });
  await game.locator('#found.show').waitFor({ timeout: 8000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of D.');
  console.log('✓ lock 3 (A) opens, key of D found');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 3 browser checks passed.');
} finally {
  await close();
}
