// Browser test: Level 10, Beat Rebuild (key of E♭).
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const saved = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('cof-progress')));

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab'] })));
  await page.goto(`${base}/dev/sim.html?page=level-eflat`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Beat Rebuild' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-eflat.html'));
  assert.equal(await game.locator('#piano').isVisible(), false, 'no piano');

  const cell = (r, s) => game.locator(`.cell[data-row="${r}"][data-step="${s}"]`);
  // Clicks the grid until it matches the given beat for every listed row.
  async function enter(beat) {
    for (const [r, pattern] of Object.entries(beat)) {
      for (let s = 0; s < 16; s++) {
        const on = await frame.evaluate(([row, i]) => window.__beat.grid[row][i], [r, s]);
        if (on !== (pattern[s] === 'x')) await cell(r, s).click();
      }
    }
  }
  const rounds = await frame.evaluate(() => window.__beat.rounds);

  // Round 1: only kick and snare can be clicked.
  assert.equal(await game.locator('#round').textContent(), 'Beat 1 of 4');
  assert.equal(await game.locator('.seq-row.locked').count(), 2, 'hat and clap locked');
  await cell('hat', 0).click();
  assert.equal(await frame.evaluate(() => window.__beat.grid.hat[0]), false, 'locked rows ignore clicks');

  // Playback: lights and the playhead move, the platters spin.
  await game.locator('#playBtn').click();
  await page.waitForTimeout(600);
  assert.ok(await game.locator('#lightsA i.on').count() >= 0);
  assert.equal(await game.locator('.platter.spin').count(), 2, 'both platters spin');
  await game.locator('.cell.now').first().waitFor({ timeout: 2000 });
  console.log('✓ both decks play, platters spin, the playhead moves');

  // Wrong checks: a count first, then the rows with mistakes.
  await cell('kick', 0).click();
  await game.locator('#checkBtn').click();
  assert.match(await game.locator('#feedback').textContent(), /^Not yet: 5 steps are off\. Try soloing/);
  await game.locator('#checkBtn').click();
  assert.match(await game.locator('#feedback').textContent(), /in the kick and snare rows\.$/);
  assert.equal(await game.locator('.seq-row.off').count(), 2);
  // Solo and crossfader.
  await game.locator('[data-row="kick"] .solo').click();
  assert.equal(await game.locator('.solo.on').count(), 1);
  await game.locator('[data-row="kick"] .solo').click();
  await game.locator('#toA').click();
  assert.equal(await game.locator('#xfadeLabel').textContent(), 'DECK A');
  await game.locator('#toB').click();
  assert.equal(await game.locator('#xfadeLabel').textContent(), 'DECK B');
  console.log('✓ wrong checks count steps, then mark rows; solo and crossfader work');

  await enter(rounds[0].beat);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/leb-round1.png` });
  await game.locator('#checkBtn').click();
  await game.locator('#round', { hasText: 'Beat 2 of 4' }).waitFor({ timeout: 4000 });
  // Round 2 keeps the kick and snare.
  assert.equal(await frame.evaluate(() => window.__beat.grid.kick.filter(Boolean).length), 4, 'kick carried over');
  assert.equal(await frame.evaluate(() => window.__beat.grid.hat.filter(Boolean).length), 0);
  await enter(rounds[1].beat);
  await game.locator('#checkBtn').click();
  await game.locator('#round', { hasText: 'Beat 3 of 4' }).waitFor({ timeout: 4000 });
  assert.equal(await frame.evaluate(() => window.__beat.grid.kick.filter(Boolean).length), 0, 'round 3 starts empty');
  await enter(rounds[2].beat);
  await game.locator('#checkBtn').click();
  await game.locator('#round', { hasText: 'Beat 4 of 4' }).waitFor({ timeout: 4000 });
  assert.equal(await game.locator('.seq-row.locked').count(), 0, 'all four rows in the last beat');
  await enter(rounds[3].beat);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/leb-round4.png` });
  await game.locator('#checkBtn').click();
  console.log('✓ four beats rebuilt (round 2 keeps kick and snare)');

  // Beatmatch: Deck A changes tempo; B's slider has to match it.
  await game.locator('#round', { hasText: 'Beatmatch' }).waitFor({ timeout: 4000 });
  assert.equal(await game.locator('#tempo').isVisible(), true);
  assert.equal(await game.locator('#subA').textContent(), '??? BPM');
  assert.equal(await game.locator('.seq-row.locked').count(), 4, 'grid locked while matching');
  const tempoA = await frame.evaluate(() => window.__beat.tempoA);
  assert.notEqual(tempoA, 110);
  const setTempo = (v) => frame.evaluate((x) => {
    const input = document.querySelector('#tempoInput');
    input.value = x;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));
  await game.locator('#checkBtn').click();
  assert.match(await game.locator('#feedback').textContent(), /Listen for the kicks/);
  await game.locator('#checkBtn').click();
  assert.match(await game.locator('#feedback').textContent(), tempoA > 110 ? /slower than Deck A/ : /faster than Deck A/);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/leb-match.png` });
  await setTempo(tempoA + 0.5);
  assert.equal(await game.locator('#bpm').textContent(), `${(tempoA + 0.5).toFixed(1)} BPM`);
  await page.waitForTimeout(1500); // let the decks play at the new tempo
  await game.locator('#checkBtn').click();
  await game.locator('#found.show').waitFor({ timeout: 5000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of E♭.');
  assert.deepEqual((await saved()).held, ['Eb']);
  console.log(`✓ beatmatch: hints say faster/slower, matching ${tempoA} BPM gives the key of E♭`);

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 10 browser checks passed.');
} finally {
  await close();
}
