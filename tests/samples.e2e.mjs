// Browser test: audio samples load from their links, and Preview shows whether they did.
// The Wix link is faked here: served from a local test note, blocked, or broken.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const wav = await readFile(new URL('../dev/test-assets/test-note-C4.wav', import.meta.url));
const SAMPLE = /static\.wixstatic\.com\/mp3\//;

async function play(mode, how) {
  await page.unroute(SAMPLE);
  await page.route(SAMPLE, (r) => (how === 'ok' ? r.fulfill({ body: wav, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' } })
    : how === 'broken' ? r.fulfill({ body: 'not a sound', contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' } })
    : r.abort()));
  await page.goto(`${base}/dev/sim.html?page=level-c${mode === 'site' ? '&mode=site' : ''}`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Tutorial' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-c.html'));
  await frame.waitForFunction(() => Sound.samples.done, null, { timeout: 5000 });
  return { game, frame };
}

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: [] })));

  let { game, frame } = await play('preview', 'ok');
  assert.equal(await game.locator('#sampleStatus').textContent(), 'Samples: 1 / 1 loaded');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/samples-ok.png` });
  // Playing a note uses the sample (a buffer source) rather than the synth.
  const used = await frame.evaluate(() => {
    const a = Sound.unlock();
    let kind = null;
    const orig = a.createBufferSource.bind(a);
    a.createBufferSource = (...x) => { kind = 'sample'; return orig(...x); };
    Sound.note(64, 0, 0.3);
    a.createBufferSource = orig;
    return kind;
  });
  assert.equal(used, 'sample', 'E4 is played from the C4 sample, repitched');
  console.log('✓ the sample loads, Preview says "1 / 1 loaded", and notes play from it');

  ({ game } = await play('preview', 'blocked'));
  assert.match(await game.locator('#sampleStatus').textContent(), /1 blocked by the site \(using the synth\)/);
  assert.match(await game.locator('#sampleStatus').getAttribute('class'), /bad/);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/samples-blocked.png` });
  console.log('✓ a blocked link says so, and the synth plays instead');

  ({ game } = await play('preview', 'broken'));
  assert.match(await game.locator('#sampleStatus').textContent(), /not playable \(check the file type\)/);
  console.log('✓ a file that isn’t a sound says so');

  ({ game } = await play('site', 'ok'));
  assert.equal(await game.locator('#sampleStatus').isVisible(), false, 'players never see it');
  console.log('✓ the status line only shows in Preview');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All sample checks passed.');
} finally {
  await close();
}
