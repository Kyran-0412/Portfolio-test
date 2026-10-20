// Browser test: runs the real page code and embed in the local Wix stand-in.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const { base, page, errors, close } = await start();

try {
  await page.goto(`${base}/dev/phase1-sim.html`);
  const game = page.frameLocator('#gameEmbed');

  await game.locator('#connection.ok').waitFor({ timeout: 5000 });
  await game.locator('#winBtn', { hasText: 'Win level C' }).click();
  await game.locator('#placeBtn:not([disabled])').click();
  await game.locator('#winBtn', { hasText: 'Win level G' }).click();
  await game.locator('#placeBtn:not([disabled])').waitFor();
  console.log('✓ won C, placed C, won G');

  await page.reload();
  await game.locator('#connection.ok').waitFor({ timeout: 5000 });
  const text = await game.locator('#progressText').textContent();
  assert.match(text, /Placed: 1 of 12\. Holding the G key\./);
  assert.equal(await game.locator('.key.placed').count(), 1);
  assert.equal(await game.locator('.key.held').count(), 1);
  console.log('✓ progress survived a reload:', text);

  const saved = await page.evaluate(() => localStorage.getItem('cof-progress'));
  assert.deepEqual(JSON.parse(saved), { v: 1, held: ['G'], placed: ['C'], seenIntro: false });
  console.log('✓ saved by the page, not the embed:', saved);

  await game.locator('#toneBtn').click();
  await game.locator('#toneResult.ok').waitFor();
  console.log('✓ built-in sound played');

  await game.locator('#sampleUrl').fill(`${base}/dev/test-assets/test-note-C4.wav`);
  await game.locator('#sampleBtn').click();
  await game.locator('#sampleLog li', { hasText: 'Samples work' }).waitFor({ timeout: 5000 });
  console.log('✓ sample loaded, decoded and played');

  await game.locator('#sampleUrl').fill('https://blocked.example.invalid/x.mp3');
  await game.locator('#sampleBtn').click();
  await game.locator('#sampleLog li.fail').waitFor({ timeout: 10000 });
  console.log('✓ unreachable sample reports a clear error');

  await game.locator('#resetBtn').click();
  await game.locator('#progressText', { hasText: 'Placed: 0 of 12. Door C is open.' }).waitFor();
  console.log('✓ reset works');

  await page.waitForTimeout(600); // let the key fade-out finish
  await page.screenshot({ path: process.env.SHOT || '/tmp/phase1.png', fullPage: true });
  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Phase 1 browser checks passed.');
} finally {
  await close();
}
