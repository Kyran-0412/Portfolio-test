// Browser test: plays the Phase 2 loop on the local copy of the site, running
// the real page code, site code and built embeds.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const go = (name) => page.goto(`${base}/dev/sim.html?page=${name}`);
const atPage = (name) => page.waitForURL(new RegExp(`page=${name}$`), { timeout: 8000 });
const saved = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('cof-progress')));
const keyIconShown = () => page.evaluate(() => !document.getElementById('keyIcon').hidden);
page.on('dialog', (d) => d.accept());

// Beats the C tutorial with the computer keyboard.
async function playTutorial(game) {
  await game.locator('#instruction', { hasText: 'Press A' }).waitFor();
  await page.keyboard.press('a');
  await game.locator('#instruction', { hasText: 'scale' }).waitFor();
  for (const k of 'asdfghjk') await page.keyboard.press(k);
  await game.locator('#instruction', { hasText: 'fifth' }).waitFor();
  await page.keyboard.down('a');
  await page.keyboard.down('g');
  await page.keyboard.up('g');
  await page.keyboard.up('a');
}

try {
  await go('home');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await go('home');

  // 1. Home: door C is open from the start; no key icon for a new visitor.
  let door = page.frameLocator('#door');
  await door.locator('.door.open').waitFor();
  assert.equal(await door.locator('#plaque').textContent(), 'C');
  assert.equal(await keyIconShown(), false);
  await page.screenshot({ path: `${shots}/p2-home.png` });
  await door.locator('.door').click();
  await atPage('level-c');
  console.log('✓ door C opens and leads to its level');

  // 2. Level C: win, get the key, see the one-time tutorial message.
  let game = page.frameLocator('#gameEmbed');
  await game.locator('#intro.show').waitFor();
  assert.equal(await game.locator('#introTitle').textContent(), 'Tutorial');
  await game.locator('#startBtn').click();
  await playTutorial(game);
  await game.locator('#found.show').waitFor();
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of C.');
  assert.match(await game.locator('#foundText').textContent(), /first key. Take it to the circle/);
  await page.waitForFunction(() => !document.getElementById('keyIcon').hidden);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${shots}/p2-key-found.png` });
  assert.deepEqual(await saved(), { v: 1, held: ['C'], placed: [], seenIntro: false, hearts: [] });
  console.log('✓ winning C gives the key, shows the tutorial message and the key icon');

  // 3. Circle: C's slot shimmers; placing it lights C and points to G once.
  await game.locator('button', { hasText: 'Go to the circle of fifths' }).click();
  await atPage('circle-of-fifths');
  let circle = page.frameLocator('#circle');
  await circle.locator('g.node.ready[data-key="C"]').waitFor();
  assert.equal(await circle.locator('g.node.ready').count(), 1);
  await page.frameLocator('#doorBb').locator('.door.locked').waitFor();
  await page.frameLocator('#doorF').locator('.door.locked').waitFor();
  await circle.locator('g.node[data-key="C"]').hover();
  await circle.locator('.tip.show', { hasText: 'Your key fits here.' }).waitFor();
  await page.locator('#circle').screenshot({ path: `${shots}/p2-circle-ready.png` });
  await circle.locator('g.node[data-key="C"]').click();
  await circle.locator('g.node.lit[data-key="C"]').waitFor();
  await circle.locator('.message.show', { hasText: 'Somewhere on the site, a door in G has opened.' }).waitFor({ timeout: 5000 });
  assert.equal(await keyIconShown(), false);
  assert.deepEqual((await saved()).placed, ['C']);
  await page.waitForTimeout(1500);
  await page.locator('#circle').screenshot({ path: `${shots}/p2-circle-c.png` });
  console.log('✓ placing C lights it, hides the key icon and opens G');

  // 4. Production Logs: door G is open; its level gives the key with no directions.
  await go('production-logs');
  door = page.frameLocator('#door');
  await door.locator('.door.open').waitFor();
  await door.locator('.door').click();
  await atPage('level-g');
  game = page.frameLocator('#gameEmbed');
  await game.locator('#startBtn').click();
  await game.locator('#skipBtn').click(); // Preview-only skip
  await game.locator('#found.show').waitFor();
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of G.');
  assert.equal(await game.locator('#foundText').textContent(), '');
  assert.equal(await game.locator('#foundButtons button').count(), 1, 'only a Back button');
  await game.locator('button', { hasText: 'Back' }).click();
  await atPage('production-logs');
  await page.frameLocator('#door').locator('.door.done').waitFor();
  console.log('✓ level G gives its key without directions, Back returns to the page, door shows done');

  // 5. Arriving at a level too early sends you home; locked doors rattle.
  await go('level-d');
  await atPage('home');
  await go('musical-elements');
  door = page.frameLocator('#door');
  await door.locator('.door.locked').waitFor();
  await door.locator('.door').click();
  await door.locator('.door.rattle').waitFor();
  await page.waitForTimeout(1000);
  assert.match(page.url(), /page=musical-elements$/);
  await page.screenshot({ path: `${shots}/p2-locked.png` });
  console.log('✓ early level visits go home, locked door rattles and stays shut');

  // 6. Last key: placing F completes the circle; lit keys become playable.
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({
    v: 1, held: ['F'], placed: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb'], seenIntro: false,
  })));
  await go('circle-of-fifths');
  circle = page.frameLocator('#circle');
  await circle.locator('g.node.ready[data-key="F"]').waitFor();
  await page.waitForTimeout(1800);
  await page.locator('#circle').screenshot({ path: `${shots}/p2-circle-11.png` });
  await circle.locator('g.node[data-key="F"]').click();
  await circle.locator('svg.complete').waitFor({ timeout: 5000 });
  await circle.locator('.message.show', { hasText: 'The circle is complete.' }).waitFor();
  await page.frameLocator('#doorF').locator('.door.done').waitFor();
  await page.waitForTimeout(1600);
  await page.locator('#circle').screenshot({ path: `${shots}/p2-circle-complete.png` });
  await circle.locator('g.node[data-key="D"]').click();
  await circle.locator('g.node.ping[data-key="D"]').waitFor();
  console.log('✓ placing F completes the circle and lit keys play');

  // 7. Reset clears everything.
  await circle.locator('#reset').click();
  await circle.locator('#reset[hidden]').waitFor({ state: 'attached' });
  assert.equal(await circle.locator('g.node.lit').count(), 0);
  assert.deepEqual(await saved(), { v: 1, held: [], placed: [], seenIntro: false, hearts: [] });
  await page.waitForTimeout(1500);
  await page.locator('#circle').screenshot({ path: `${shots}/p2-circle-new.png` });
  console.log('✓ reset clears progress');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Phase 2 browser checks passed.');
} finally {
  await close();
}
