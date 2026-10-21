// Browser test: Level 8, Chord Progression (key of D♭).
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const ANSWERS = [['D♭', 'A♭', 'B♭m', 'G♭'], ['E♭m', 'A♭', 'D♭'], ['D♭', 'B♭m', 'G♭', 'A♭']];

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'] })));
  await page.goto(`${base}/dev/sim.html?page=level-dflat`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Chord Progression' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-dflat.html'));
  const slots = () => frame.evaluate(() => window.__prog.slots);
  const card = (name) => game.locator(`.tray .card[data-chord="${name}"]`);
  const slot = (i) => game.locator(`.slot[data-index="${i}"]`);
  // Drags a tray card onto a slot with the mouse.
  async function drag(name, i) {
    const from = await card(name).boundingBox(), to = await slot(i).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
    await page.mouse.up();
  }

  assert.equal(await game.locator('#piano').isVisible(), false, 'no piano to start');
  assert.deepEqual(await game.locator('.slot .numeral').allTextContents(), ['I', 'V', 'vi', 'IV']);
  assert.equal(await game.locator('.tray .card').count(), 6, '4 answers + 2 decoys');
  assert.ok(await game.locator('#playBtn').isDisabled(), 'cannot check until every slot is full');

  // Round 1: a wrong answer (B♭ major for vi) shakes that slot and reveals the piano.
  await drag('D♭', 0);
  await drag('A♭', 1);
  await drag('B♭', 2);           // wrong: vi is B♭m
  await card('G♭').click();      // click to select, then click a slot
  await slot(3).click();
  assert.deepEqual(await slots(), ['D♭', 'A♭', 'B♭', 'G♭']);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lp-placed.png` });
  await game.locator('#playBtn').click();
  await game.locator('#feedback', { hasText: '1 chord is in the wrong place' }).waitFor({ timeout: 10000 });
  assert.equal(await game.locator('.slot.wrong').count(), 1);
  await game.locator('#piano').waitFor({ state: 'visible' });
  assert.equal(await game.locator('.piano-key.locked').count(), 18 - 11, 'keys outside D♭ major greyed out');
  assert.equal(await game.locator('.piano-key[data-midi="61"] .piano-name').textContent(), 'D♭', 'keys are named');
  await page.waitForTimeout(400);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lp-wrong.png` });
  console.log('✓ round 1: drag and click placing; a wrong chord shakes its slot and reveals the piano');

  // Fix it by dragging B♭m onto the slot (B♭ goes back to the tray).
  await drag('B♭m', 2);
  assert.deepEqual(await slots(), ['D♭', 'A♭', 'B♭m', 'G♭']);
  assert.equal(await card('B♭').count(), 1, 'replaced card returns to the tray');
  await game.locator('#playBtn').click();
  await game.locator('#feedback', { hasText: 'countless pop songs' }).waitFor({ timeout: 10000 });
  console.log('✓ round 1 solved: I – V – vi – IV');

  for (const r of [1, 2]) {
    await game.locator('#round', { hasText: `Round ${r + 1} of 3` }).waitFor({ timeout: 6000 });
    for (const [i, name] of ANSWERS[r].entries()) await drag(name, i);
    await game.locator('#playBtn').click();
    await game.locator('.slot.right').first().waitFor({ timeout: 10000 });
    console.log(`✓ round ${r + 1} solved: ${ANSWERS[r].join(' – ')}`);
  }
  await game.locator('#found.show').waitFor({ timeout: 8000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of D♭.');
  console.log('✓ key of D♭ found');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 8 browser checks passed.');
} finally {
  await close();
}
