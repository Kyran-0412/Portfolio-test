// Browser test: Level 6, Fix the Mix (key of B), and its hidden heart.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const saved = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('cof-progress')));

async function open() {
  await page.goto(`${base}/dev/sim.html?page=level-b`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Fix the Mix' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-b.html'));
  // Moves a desk control the way dragging it would.
  const set = (track, ctl, value) => frame.evaluate(([t, c, v]) => {
    const input = document.querySelector(`[data-track="${t}"] input[data-ctl="${c}"]`);
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, [track, ctl, String(value)]);
  return { game, frame, set };
}

async function fixAll(game, set, { blendHidden = false } = {}) {
  if (blendHidden) {
    await game.locator('#revealBtn').click();
    await game.locator('[data-track="arp"]').waitFor();
    await game.locator('[data-track="arp"] .mute').click(); // unmute it
  }
  await game.locator('#round', { hasText: 'Round 1 of 3' }).waitFor();
  await set('lead', 'fader', 0);
  await game.locator('#checkBtn').click();
  await game.locator('#round', { hasText: 'Round 2 of 3' }).waitFor({ timeout: 5000 });
  await set('keys', 'low', 0);
  await game.locator('#checkBtn').click();
  await game.locator('#round', { hasText: 'Round 3 of 3' }).waitFor({ timeout: 5000 });
  await set('drums', 'pan', 0);
  await set('bass', 'pan', 0);
  await set('keys', 'pan', 0.4);
  await set('lead', 'pan', -0.3);
  await game.locator('#checkBtn').click();
  await game.locator('#found.show').waitFor({ timeout: 6000 });
}

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E'] })));
  let { game, frame, set } = await open();

  assert.equal(await game.locator('#piano').isVisible(), false, 'no piano');
  assert.equal(await game.locator('[data-track="arp"]').isVisible(), false, 'the fifth track starts hidden');

  // The loop plays and the meter moves.
  await game.locator('#playBtn').click();
  await page.waitForTimeout(700);
  const level = await frame.evaluate(() => parseFloat(document.querySelector('.meter i').style.height));
  assert.ok(level > 5, `master meter moves (${level}%)`);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lb-desk.png` });
  console.log('✓ the loop plays through the desk and the master meter moves');

  // Round 1: wrong checks, a hint, and muting doesn't count.
  assert.equal(await game.locator('#problem').textContent(), 'Something’s far too loud.');
  await game.locator('#checkBtn').click();
  assert.match(await game.locator('#feedback').textContent(), /^Not yet\. Listen again/);
  await game.locator('#checkBtn').click();
  assert.match(await game.locator('#feedback').textContent(), /Hint: The lead is much louder/);
  await game.locator('[data-track="lead"] .mute').click();
  await game.locator('#checkBtn').click();
  assert.match(await game.locator('#feedback').textContent(), /Every part still needs to be heard/);
  await game.locator('[data-track="lead"] .mute').click();
  // Solo dims the other strips.
  await game.locator('[data-track="keys"] .solo').click();
  assert.equal(await game.locator('.strip.dim:not([hidden])').count(), 3);
  await game.locator('[data-track="keys"] .solo').click();
  console.log('✓ round 1: checks, hint, muting refused, solo works');

  await fixAll(game, set);
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of B.');
  assert.equal(await game.locator('#heartFound').isVisible(), false);
  assert.deepEqual((await saved()).hearts, []);
  console.log('✓ three rounds fixed (lead level, muddy keys, panning); key found, no heart');

  // Replaying with the hidden track shown, unmuted and blended in finds the heart.
  ({ game, frame, set } = await open());
  await game.locator('#playBtn').click();
  await fixAll(game, set, { blendHidden: true });
  await game.locator('#heartFound').waitFor({ state: 'visible', timeout: 4000 });
  assert.deepEqual((await saved()).hearts, ['B']);
  console.log('✓ showing and blending in the hidden track finds the hidden heart');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 6 browser checks passed.');
} finally {
  await close();
}
