// Browser test: the C tutorial and the shared on-screen piano.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${base}/dev/sim.html?page=level-c`);
  const game = page.frameLocator('#gameEmbed');
  const text = (id) => game.locator(id).textContent();

  await game.locator('#intro.show').waitFor();
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-intro.png` });
  await game.locator('#startBtn').click();

  // Step 1: a wrong note explains where C is; A plays C.
  await game.locator('#instruction', { hasText: 'Press A to play C' }).waitFor();
  assert.equal(await game.locator('.piano-key.mark-target').count(), 2, 'both Cs glow');
  await page.keyboard.press('d');
  assert.match(await text('#feedback'), /That’s E\. C is the A key/);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-step1.png` });
  await page.keyboard.press('a');
  console.log('✓ step 1: wrong note explained, A plays C');

  // Step 2: scale, with one mistake and one note clicked on screen.
  await game.locator('#instruction', { hasText: 'Play the C major scale' }).waitFor();
  await page.keyboard.press('a');
  await page.keyboard.press('s');
  await page.keyboard.press('f'); // wrong: wants E
  assert.match(await text('#feedback'), /Next is E \(the D key\)/);
  assert.equal(await game.locator('.dot.on').count(), 2, 'a mistake does not lose progress');
  await game.locator('.piano-key[data-midi="64"]').click(); // E, clicked
  await page.keyboard.press('f');
  await page.keyboard.press('g');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-step2.png` });
  await page.keyboard.press('z'); // octave down: targets follow the note names
  assert.equal(await text('.piano-octave b'), '3');
  assert.ok(await game.locator('.piano-key.mark-target[data-midi="57"]').count(), 'A3 glows after octave change');
  await page.keyboard.press('x');
  for (const k of 'hjk') await page.keyboard.press(k);
  console.log('✓ step 2: scale with a mistake, a clicked note and an octave change');

  // Step 3: a fifth needs both notes held together.
  await game.locator('#instruction', { hasText: 'Play a perfect fifth' }).waitFor();
  await page.keyboard.press('g');
  assert.match(await text('#feedback'), /Keep holding G and add C/);
  await page.keyboard.down('a');
  await page.keyboard.down('g');
  await game.locator('#feedback', { hasText: 'perfect fifth' }).waitFor();
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-step3.png` });
  await page.keyboard.up('g');
  await page.keyboard.up('a');
  await game.locator('#found.show').waitFor({ timeout: 5000 });
  assert.equal(await text('#foundTitle'), 'You found the key of C.');
  console.log('✓ step 3: fifth played, key found');

  // Placeholder levels have the working piano too.
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C'] })));
  await page.goto(`${base}/dev/sim.html?page=level-g`);
  await game.locator('#startBtn').click();
  await page.keyboard.down('h');
  await game.locator('.piano-key.down[data-midi="69"]').waitFor();
  await page.keyboard.up('h');
  await game.locator('.piano-key.down').waitFor({ state: 'detached' }).catch(() => {});
  assert.equal(await game.locator('.piano-key.down').count(), 0);
  // Losing focus shows the banner.
  await page.locator('header').click();
  await game.locator('#focusBanner.show').waitFor();
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-placeholder.png` });
  console.log('✓ placeholder level piano works; focus banner shows when the game loses focus');

  // On the live site, unbuilt levels can't be won: no test button, just Back.
  await page.goto(`${base}/dev/sim.html?page=production-logs&mode=site`);
  await page.frameLocator('#door').locator('.door.open').click();
  await page.waitForURL(/page=level-g&mode=site$/);
  await game.locator('#startBtn').click();
  await game.locator('#backBtn').waitFor();
  assert.equal(await game.locator('#winBtn').count(), 0);
  await game.locator('#backBtn').click();
  await page.waitForURL(/page=production-logs&mode=site$/);
  console.log('✓ live site: placeholder has no test button, Back returns to the page');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Phase 3 browser checks passed.');
} finally {
  await close();
}
