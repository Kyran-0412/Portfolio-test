# Circle of Fifths Easter Egg

A hidden game for Kyran Kelly's Music Performance and Production portfolio (Wix Editor, free plan).
Design doc: https://claude.ai/code/artifact/a36a4d70-a7f3-49ba-b706-98674dd6d60c

## What's here

| Path | What it is | Where it goes in Wix |
| --- | --- | --- |
| `wix/public/progress.js` | The game rules: keys won, keys placed, which doors are open | Public file `progress.js` |
| `wix/phase1/page-code.js` | Page code for the Phase 1 test page | The test page's code panel |
| `wix/phase1/embed-test.html` | The Phase 1 test, shown inside an Embed HTML box | Embed HTML element, "Code" option |
| `dev/` | A local stand-in for a Wix page, for testing here | Not used in Wix |
| `tests/` | Automatic checks | Not used in Wix |

## Phase 1: set up the test page in Wix

This checks that the game can talk to your page, that progress saves, and that sounds work.

1. **Turn on Dev Mode.** In the Wix Editor top bar, click **Dev Mode → Turn on Dev Mode**. A code panel appears.
2. **Add the rules file.** In the code sidebar on the left, open **Public & Backend** (the `{ }` icon). Next to **Public**, click **+ → New .js file**, name it `progress.js`, and paste in everything from `wix/public/progress.js`.
3. **Add a test page.** Add a new blank page called `Game Test`. In its settings, hide it from the menu.
4. **Add the embed box.** On the test page, click **Add Elements (+) → Embed Code → Embed HTML**. Choose **Code**, paste in everything from `wix/phase1/embed-test.html` and click **Update**. Stretch the box to roughly 800 × 1100 px.
5. **Name the box.** With the box selected, open the **Properties & Events** panel and set its ID to `gameEmbed`. It must match exactly.
6. **Add the page code.** In the code panel at the bottom of the test page, delete what's there and paste in everything from `wix/phase1/page-code.js`.
7. **Preview** (or publish) and open the test page. Work through the four sections.

### What to check and report back

1. **Connection:** says "Connected to the page ✓"?
2. **Saving progress:** win C, place C, then reload the page. Is C still lit?
3. **Built-in sound:** do you hear two notes, then three?
4. **Your sample:** upload a short MP3 to the Media Manager, copy its link, paste it in and press the button. Do you hear the note, a fifth and a triad, or does it say "Blocked"?

If section 4 says "Blocked", that's fine: the samples will be hosted on GitHub Pages instead.

## Running the checks here

```sh
npm test               # game rules
npm run test:browser   # full Phase 1 run in a browser (needs Playwright)
```
