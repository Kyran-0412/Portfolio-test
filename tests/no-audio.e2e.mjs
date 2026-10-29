// Browser test: if the browser won't create audio, doors, the circle and levels still work.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const { base, page, errors, close } = await start();
try {
  // Every frame: making an AudioContext throws (like a strict browser or embed).
  await page.addInitScript(() => {
    const Broken = function () { throw new Error('audio not allowed'); };
    window.AudioContext = Broken; window.webkitAudioContext = Broken;
  });
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: [] })));
  await page.goto(`${base}/dev/sim.html?page=home`);
  const door = page.frameLocator('#door');
  await door.locator('.door.open').waitFor({ timeout: 5000 });
  assert.equal(await door.locator('#plaque').textContent(), 'C');
  console.log('✓ door C opens and shows its letter even when audio is blocked');

  await page.goto(`${base}/dev/sim.html?page=circle-of-fifths`);
  await page.frameLocator('#circle').locator('#count').waitFor({ state: 'attached' });
  await page.goto(`${base}/dev/sim.html?page=level-c`);
  await page.frameLocator('#gameEmbed').locator('#introTitle', { hasText: 'Tutorial' }).waitFor({ timeout: 5000 });
  console.log('✓ the circle and the Tutorial still load');

  const real = errors.filter((e) => !/audio not allowed/.test(e));
  assert.deepEqual(real, [], 'no other page errors');
  console.log('All no-audio checks passed.');
} finally {
  await close();
}
