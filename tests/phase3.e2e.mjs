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

  const tut = (fn, arg) => page.frames().find((f) => f.url().includes('level-c.html')).evaluate(fn, arg);
  const chord = async (...ks) => { for (const k of ks) await page.keyboard.down(k); for (const k of ks) await page.keyboard.up(k); await page.waitForTimeout(150); };
  const holdUntil = async (key, test) => {
    await page.keyboard.down(key);
    await page.waitForFunction(test, null, { timeout: 4000, polling: 'raf' }).catch(() => {});
    await page.keyboard.up(key);
  };
  const xOf = () => `[...document.querySelectorAll('iframe')].find((f) => f.src.includes('level-c')).contentWindow.__tut.P.x`;

  // Step 3: walk to both markers with the arrow keys.
  await game.locator('#instruction', { hasText: 'Move with ← and →' }).waitFor();
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-move.png` });
  await holdUntil('ArrowLeft', new Function(`return ${xOf()} < 190`));
  await game.locator('.dot.on').first().waitFor();
  await holdUntil('ArrowRight', new Function(`return ${xOf()} > 710`));
  console.log('✓ step 3: arrow keys move the player to both markers');

  // Step 4: dash.
  await game.locator('#instruction', { hasText: 'Dash with Space' }).waitFor();
  await page.keyboard.press('Space');
  console.log('✓ step 4: Space dashes');

  // Step 5: power shot (A + G): one big shot rising from the player.
  await game.locator('#instruction', { hasText: 'Power shot' }).waitFor();
  await chord('a', 'g');
  assert.equal(await tut(() => document.querySelector('#feedback').textContent.includes('perfect fifth')), true);
  console.log('✓ step 5: A + G fires the power shot');

  // Step 6: triad.
  await game.locator('#instruction', { hasText: 'Triad' }).waitFor();
  await chord('a', 'd', 'g');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-triad.png` });
  console.log('✓ step 6: A + D + G fires the triad');

  // Step 7: resolve the practice laser.
  await game.locator('#instruction', { hasText: 'Resolve the laser' }).waitFor();
  assert.ok(await tut(() => window.__tut.laser !== null), 'a practice laser appears');
  await page.waitForTimeout(500);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-laser.png` });
  await chord('a', 'd');
  assert.equal(await tut(() => window.__tut.laser), null, 'resolved');
  console.log('✓ step 7: A + D resolves the laser');

  // Step 8: sus4 clears the floating notes.
  await game.locator('#instruction', { hasText: 'Sus4' }).waitFor();
  assert.equal(await tut(() => window.__tut.floaters.length), 5);
  await chord('a', 'f', 'g');
  assert.equal(await tut(() => window.__tut.floaters.length), 0, 'the shockwave clears them');
  console.log('✓ step 8: A + F + G shockwave clears the notes');

  // Step 9: catch the ear defenders.
  await game.locator('#instruction', { hasText: 'Catch the ear defenders' }).waitFor();
  await tut(() => { window.__tut.P.x = window.__tut.pickup.x; });
  await game.locator('#collect:not([hidden])').waitFor({ timeout: 4000 });
  console.log('✓ step 9: catching the ear defenders');

  // Free play: moves still work, and COLLECT KEY finishes the level.
  assert.equal(await game.locator('#instruction').textContent(), 'You know every move');
  await chord('a', 'g');
  assert.ok(await tut(() => document.querySelectorAll('#found.show').length === 0), 'free play: the level keeps going');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/p3-free.png` });
  await game.locator('#collect').click();
  await game.locator('#found.show').waitFor({ timeout: 5000 });
  assert.equal(await text('#foundTitle'), 'You found the key of C.');
  console.log('✓ free play, then COLLECT KEY gives the key of C');

  // Placeholder levels have the working piano too.
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D'] })));
  await page.goto(`${base}/dev/sim.html?page=level-a&embed=level-placeholder.html`);
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
  await page.goto(`${base}/dev/sim.html?page=health-and-safety&mode=site&embed=level-placeholder.html`);
  await page.frameLocator('#door').locator('.door.open').click();
  await page.waitForURL(/page=level-a&mode=site&embed=level-placeholder.html$/);
  await game.locator('#startBtn').click();
  await game.locator('#backBtn').waitFor();
  assert.equal(await game.locator('#winBtn').count(), 0);
  await game.locator('#backBtn').click();
  await page.waitForURL(/page=health-and-safety&mode=site&embed=level-placeholder.html$/);
  console.log('✓ live site: placeholder has no test button, Back returns to the page');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Phase 3 browser checks passed.');
} finally {
  await close();
}
