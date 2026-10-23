// Browser test: audio samples load from their links, and Preview shows whether they did.
// The Wix link is faked here: served from a local test note, blocked, or broken.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const wav = await readFile(new URL('../dev/test-assets/test-note-C4.wav', import.meta.url));
const SAMPLE = /static\.wixstatic\.com\/mp3\//;
// A 5-second steady tone, like a boss synth note.
function longWav(seconds = 5, rate = 22050) {
  const n = seconds * rate, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 12000), 44 + i * 2);
  return buf;
}
const long = longWav();

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
  const total = await frame.evaluate(() => Sound.samples.total);
  assert.ok(total >= 14, `${total} piano samples listed`);
  assert.equal(await game.locator('#sampleStatus').textContent(), `Samples: ${total} / ${total} loaded`);
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
  console.log(`✓ all ${total} samples load, Preview says "${total} / ${total} loaded", and notes play from them`);

  ({ game } = await play('preview', 'blocked'));
  assert.match(await game.locator('#sampleStatus').textContent(), /blocked by the site \(using the synth\)/);
  assert.match(await game.locator('#sampleStatus').getAttribute('class'), /bad/);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/samples-blocked.png` });
  console.log('✓ a blocked link says so, and the synth plays instead');

  ({ game } = await play('preview', 'broken'));
  assert.match(await game.locator('#sampleStatus').textContent(), /not playable \(check the file type\)/);
  console.log('✓ a file that isn’t a sound says so');

  ({ game } = await play('site', 'ok'));
  assert.equal(await game.locator('#sampleStatus').isVisible(), false, 'players never see it');
  console.log('✓ the status line only shows in Preview');

  // Lasers: only the fights load them. Charge, then hit + a pitched beam loop.
  ({ game } = await play('preview', 'ok'));
  assert.equal(await page.frames().find((f) => f.url().includes('level-c.html')).evaluate(() => Sound.has('red-beam')), false, 'the Tutorial skips laser sounds');
  assert.equal(await page.frames().find((f) => f.url().includes('level-c.html')).evaluate(() => Sound.hasReverb), false, 'the Tutorial stays dry');
  assert.equal(await game.locator('#reverbTest').isVisible(), false, 'no reverb switch without reverb');
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E', 'B'] })));
  await page.goto(`${base}/dev/sim.html?page=level-fsharp`);
  const boss = page.frameLocator('#gameEmbed');
  await boss.locator('#startBtn').click();
  const bf = page.frames().find((f) => f.url().includes('level-fsharp.html'));
  await bf.waitForFunction(() => Sound.samples.done && Sound.has('red-beam'), null, { timeout: 5000 });
  assert.equal(await boss.locator('#sampleStatus').textContent(), `Samples: ${total + 19} / ${total + 19} loaded`, 'piano + 12 laser files + 6 Tritone notes + its drone');
  assert.equal(await bf.evaluate(() => Sound.has('tritone') && Sound.has('tritone-drone') && Sound.hasReverb), true, 'Tritone synth, drone and reverb');
  const log = await bf.evaluate(async () => {
    const a = Sound.unlock(), made = [];
    const orig = a.createBufferSource.bind(a), origOsc = a.createOscillator.bind(a);
    a.createBufferSource = () => { const s = orig(); made.push(s); return s; };
    let oscs = 0;
    a.createOscillator = () => { oscs++; return origOsc(); };
    const red = Sound.laser('red', 54, 0.1);       // F♯ root: the F♯ beam, unshifted
    const afterCharge = made.length;
    red.live();
    const loop = made.find((s) => s.loop);
    const out = { afterCharge, total: made.length, loopRate: loop && loop.playbackRate.value, trimmed: loop && loop.loopEnd > loop.loopStart, oscs };
    const shifted = Sound.laser('red', 53, 0.1); shifted.live(); // F root: nearest is F♯, a semitone down
    out.fRate = made.filter((s) => s.loop).at(-1).playbackRate.value;
    const before = made.length;
    const violet = Sound.laser('violet', 54, 0.1); violet.live();
    out.violetSources = made.length - before;
    out.violetLoop = made.at(-1).loop;
    out.violetOscs = oscs;
    red.stop(); shifted.stop(); violet.stop();
    // A laser stopped before it went live (resolved on that exact frame) stays silent.
    const count = made.length;
    const early = Sound.laser('red', 54, 0.1); early.stop(); early.live();
    out.lateLoops = made.slice(count).filter((x) => x.loop).length;
    a.createBufferSource = orig; a.createOscillator = origOsc;
    return out;
  });
  assert.equal(log.afterCharge, 1, 'the charge plays first');
  assert.equal(log.total, 3, 'then the hit and the beam loop');
  assert.equal(log.loopRate, 1, 'F♯ uses the F♯ beam as recorded');
  assert.ok(log.trimmed, 'the loop is trimmed');
  assert.equal(log.oscs, 0, 'no synth while red samples exist');
  assert.ok(Math.abs(log.fRate - Math.pow(2, -1 / 12)) < 1e-6, 'F shifts the F♯ beam down a semitone');
  assert.equal(log.lateLoops, 0, 'a stopped laser never starts its loop');
  assert.equal(log.violetSources, 3, 'violet: charge, hit, beam');
  assert.ok(log.violetLoop, 'the violet beam loops');
  assert.equal(log.violetOscs, 0, 'no synth left in the lasers');
  console.log('✓ lasers: only the fights load them; charge → hit + pitched beam loop; both colours fully sampled');

  // Feedback's boss synth: only its fight loads it; holds outlast the 5 s note.
  await page.unroute(SAMPLE);
  await page.route(SAMPLE, (r) => r.fulfill({ body: long, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' } }));
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D'] })));
  await page.goto(`${base}/dev/sim.html?page=level-a`);
  const fb = page.frameLocator('#gameEmbed');
  await fb.locator('#startBtn').click();
  const ff = page.frames().find((f) => f.url().includes('level-a.html'));
  await ff.waitForFunction(() => Sound.samples.done && Sound.has('feedback'), null, { timeout: 8000 });
  assert.equal(await fb.locator('#sampleStatus').textContent(), `Samples: ${total + 8} / ${total + 8} loaded`, 'piano + 7 Feedback notes + its drone, no lasers');
  await ff.waitForFunction(() => Sound.has('feedback-drone'));
  await fb.locator('#fightBtn').click();
  await ff.waitForFunction(() => window.__drone() !== null, null, { timeout: 3000 });
  assert.equal(await ff.evaluate(() => Sound.hasReverb), true, 'Feedback has reverb');
  await fb.locator('#reverbTest', { hasText: 'Reverb: normal' }).click();
  assert.equal(await fb.locator('#reverbTest').textContent(), 'Reverb: 100% wet');
  await fb.locator('#reverbTest').click();
  assert.equal(await fb.locator('#reverbTest').textContent(), 'Reverb: off');
  await fb.locator('#reverbTest').click();
  assert.equal(await fb.locator('#reverbTest').textContent(), 'Reverb: normal');
  console.log('✓ the drone starts with the fight, with reverb on the notes');
  const held = await ff.evaluate(async () => {
    const a = Sound.unlock(), made = [];
    const orig = a.createBufferSource.bind(a);
    a.createBufferSource = () => { const x = orig(); made.push(x); return x; };
    const h = BOSS.hold(64, 0.18); // E4: the E♭4 note, shifted up a semitone
    await new Promise((r) => setTimeout(r, 4600)); // past the first repeat point
    const out = { sources: made.length, rate: made[0].playbackRate.value };
    h.stop();
    a.createBufferSource = orig;
    return out;
  });
  assert.ok(held.sources >= 2, `a long hold repeats the steady middle (${held.sources} segments)`);
  assert.ok(Math.abs(held.rate - Math.pow(2, 1 / 12)) < 1e-6, 'E4 is E♭4 up a semitone');
  console.log('✓ Feedback’s synth: loads only in its fight; holds keep ringing past the end of the 5 s note');

  // The Circle's synth evolves: one voice at C, layered and driven by the F core.
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb'] })));
  await page.goto(`${base}/dev/sim.html?page=level-f`);
  const cg = page.frameLocator('#gameEmbed');
  await cg.locator('#startBtn').click();
  const cf = page.frames().find((f) => f.url().includes('level-f.html'));
  await cf.waitForFunction(() => Sound.samples.done && Sound.has('circle'), null, { timeout: 8000 });
  await cg.locator('#fightBtn').click();
  const evo = await cf.evaluate(() => {
    const a = Sound.unlock(), made = [];
    const orig = a.createBufferSource.bind(a);
    a.createBufferSource = () => { const x = orig(); made.push(x); return x; };
    const count = (stage) => { BOSS.evolve(EVOLVE[stage], 0); const before = made.length; BOSS.hold(60, 0.3).stop(); return made.length - before; };
    const out = { c: count(0), a: count(3), f: count(11), stage: BOSS.stage };
    a.createBufferSource = orig;
    return out;
  });
  assert.equal(evo.c, 1, 'at C the synth is a single voice');
  assert.equal(evo.a, 3, 'at A a detuned pair joins it');
  assert.equal(evo.f, 5, 'at the F core: detuned pair, octave up and sub');
  assert.equal(evo.stage.cutoff, 18000);
  console.log('✓ The Circle’s synth evolves: 1 voice at C, 3 at A, 5 by the F core, filter opening up');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All sample checks passed.');
} finally {
  await close();
}
