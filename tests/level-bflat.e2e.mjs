// Browser test: Level 11, Arpeggio Rush (key of B♭).
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const shots = process.env.SHOTS || '/tmp';
const { base, page, errors, close } = await start();
const saved = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('cof-progress')));

try {
  await page.goto(`${base}/dev/sim.html?page=home`);
  await page.evaluate(() => localStorage.setItem('cof-progress', JSON.stringify({ v: 1, held: [], placed: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb'] })));
  await page.goto(`${base}/dev/sim.html?page=level-bflat`);
  const game = page.frameLocator('#gameEmbed');
  await game.locator('#introTitle', { hasText: 'Arpeggio Rush' }).waitFor();
  await game.locator('#startBtn').click();
  const frame = page.frames().find((f) => f.url().includes('level-bflat.html'));
  const rush = (expr, arg) => frame.evaluate(expr, arg);
  assert.equal(await game.locator('#piano').isVisible(), false, 'no piano');

  // The song is built from arpeggios: every note is a tone of its bar's chord.
  const info = await rush(() => ({
    count: window.__rush.notes.length,
    lanes: [...new Set(window.__rush.notes.map((n) => n.lane))].sort(),
    sorted: window.__rush.notes.every((n, i, a) => i === 0 || a[i - 1].t <= n.t),
    firstBar: window.__rush.notes.slice(0, 4).map((n) => n.name),
    sections: window.__rush.sections.map((s) => s.name),
  }));
  assert.deepEqual(info.lanes, [0, 1, 2, 3]);
  assert.ok(info.sorted, 'notes in time order');
  assert.deepEqual(info.firstBar, ['B♭', 'D', 'F', 'B♭'], 'verse opens on a B♭ arpeggio');
  console.log(`✓ song built: ${info.count} notes over ${info.sections.join(', ')}`);

  await game.locator('#goBtn').click();
  await page.waitForFunction(() => {
    const f = [...document.querySelectorAll('iframe')].find((x) => x.src.includes('level-bflat'));
    return f.contentWindow.__rush.time > 0;
  });
  // Pressing a key with nothing on the line breaks the streak and costs a bit of crowd.
  await page.keyboard.press('KeyJ');
  assert.equal(await rush(() => window.__rush.meter), 48);

  // Hit the first verse notes properly with real key presses, on time.
  const keys = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
  for (let i = 0; i < 4; i++) {
    const { t, lane } = await rush((i) => window.__rush.notes[i], i);
    await page.waitForFunction(([t]) => {
      const f = [...document.querySelectorAll('iframe')].find((x) => x.src.includes('level-bflat'));
      return f.contentWindow.__rush.time >= t - 0.015;
    }, [t], { polling: 'raf' });
    await page.keyboard.press(keys[lane]);
  }
  const c = await rush(() => ({ ...window.__rush.counts, combo: window.__rush.combo }));
  assert.equal(c.perfect + c.good, 4, `four verse notes hit (${JSON.stringify(c)})`);
  assert.equal(c.combo, 4);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lbb-verse.png` });
  console.log(`✓ real key presses hit the verse notes (${c.perfect} perfect, ${c.good} good)`);

  // Let notes go by: the crowd drains, then the section can be retried.
  await rush(() => { window.__rush.meter = 10; });
  await game.locator('#failed.show').waitFor({ timeout: 8000 });
  assert.match(await game.locator('#failedText').textContent(), /in the verse/);
  assert.equal(await game.locator('#retryBtn').textContent(), 'Retry the verse');
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lbb-failed.png` });
  await game.locator('#retryBtn').click();
  assert.equal(await rush(() => window.__rush.state), 'playing');
  assert.equal(await rush(() => window.__rush.meter), 50, 'crowd back to half');
  const t = await rush(() => window.__rush.time);
  const verseStart = await rush(() => window.__rush.sections[1].start);
  assert.ok(t < verseStart, 'retry starts with a run-up bar before the verse');
  console.log('✓ missing notes loses the crowd; retry restarts that section');

  // Autoplay the solo and finale to the end.
  await rush(() => {
    const s = window.__rush.sections[4];
    window.__rush.seek(s.start - 0.5, s.start);
    window.__rush.autoplay = true;
  });
  await page.waitForTimeout(1500);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lbb-solo.png` });
  await game.locator('#done.show').waitFor({ timeout: 25000 });
  assert.match(await game.locator('#stats').textContent(), /Accuracy/);
  await page.locator('#gameEmbed').screenshot({ path: `${shots}/lbb-done.png` });
  await game.locator('#takeBtn').click();
  await game.locator('#found.show').waitFor({ timeout: 4000 });
  assert.equal(await game.locator('#foundTitle').textContent(), 'You found the key of B♭.');
  assert.deepEqual((await saved()).held, ['Bb']);
  console.log('✓ finishing the song gives the key of B♭');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('All Level 11 browser checks passed.');
} finally {
  await close();
}
