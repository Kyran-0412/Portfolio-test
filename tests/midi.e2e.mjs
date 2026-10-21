// Browser test: the MIDI test page reports correctly when its box is a
// different site from the page (like Wix), with and without MIDI allowed.
import assert from 'node:assert/strict';
import { start } from './helpers/browser.mjs';

const { base, page, errors, close } = await start();
const other = base.replace('localhost', '127.0.0.1'); // a different site, like Wix's embed domain
await page.context().grantPermissions(['midi'], { origin: other });
await page.context().grantPermissions(['midi'], { origin: base });

try {
  for (const allow of [false, true]) {
    await page.goto(`${base}/dev/midi-host.html?origin=${encodeURIComponent(other)}${allow ? '&allow=1' : ''}`);
    const box = page.frameLocator('#box');
    await box.locator('#support:not(.wait)').waitFor();
    const support = await box.locator('#support').textContent();
    await box.locator('#connectBtn').click();
    await box.locator('#connect.ok, #connect.fail').waitFor({ timeout: 10000 });
    const connect = await box.locator('#connect').textContent();
    console.log(`${allow ? 'allowed' : 'blocked'} box →`, support, '|', connect);
    // This sandbox has no MIDI system, so an allowed box gets as far as the
    // permission step; what matters is that it is not reported as blocked.
    if (allow) assert.doesNotMatch(connect, /Blocked/);
    else assert.match(connect, /^✗ Blocked: the Wix box does not allow MIDI/);
  }
  // Chrome logs a warning when it blocks MIDI: expected in the blocked case.
  assert.deepEqual(errors.filter((e) => !/Permissions policy violation: Midi/.test(e)), []);
  console.log('All MIDI test-page checks passed.');
} finally {
  await close();
}
