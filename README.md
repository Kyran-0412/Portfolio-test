# Circle of Fifths Easter Egg

A hidden game for Kyran Kelly's Music Performance and Production portfolio (Wix Editor, free plan).
Design doc: https://claude.ai/code/artifact/a36a4d70-a7f3-49ba-b706-98674dd6d60c

## What's here

Everything you copy into Wix is in `wix/`. Paste each file in whole.

| Path | What it is | Where it goes in Wix |
| --- | --- | --- |
| `wix/public/progress.js` | Game rules: keys won, keys placed, which doors are open | Public file `progress.js` |
| `wix/public/game-site.js` | Doors, level pages, the circle and the key icon | Public file `game-site.js` |
| `wix/masterPage.js` | Runs on every page (shows the key icon) | Site code (`masterPage.js`) |
| `wix/pages/*.js` | Page code, one file per page | Each page's code panel |
| `wix/embeds/door.html` | A door | Embed HTML box, ID `door` |
| `wix/embeds/circle.html` | The circle of fifths graphic | Embed HTML box, ID `circle` |
| `wix/embeds/level-placeholder.html` | Stand-in level with a test win button | Embed HTML box, ID `gameEmbed` |
| `assets/key-icon.svg` | The corner key icon | Upload as an image |
| `src/` | Source for the embeds (`npm run build` turns these into `wix/embeds/`) | Not used in Wix |
| `dev/`, `tests/` | Local copy of the site and automatic checks | Not used in Wix |

## Phase 2: doors, levels and the circle

Phase 2 sets up the full loop for the first two keys: Home door C → Level C → place C on the circle → Production Logs door G → Level G.

### 1. Code files

1. In **Public & Backend**, open `progress.js` and replace everything with `wix/public/progress.js` (it has new rules).
2. Next to **Public**, add a new file `game-site.js` and paste in `wix/public/game-site.js`.
3. In the code sidebar under **Page Code**, open **Global (masterPage.js)** and paste in `wix/masterPage.js`.

### 2. The key icon (all pages)

1. Upload `assets/key-icon.svg` (**Add Elements → Image → Upload**) and place it in the bottom-right corner, about 56 × 56 px.
2. Right-click it → **Pin to Screen** (bottom right), then right-click → **Show on All Pages**.
3. In **Properties & Events**, set the ID to `keyIcon` and tick **Hidden on load**. Regular visitors never see it.

### 3. Doors on Home and Production Logs

On each page:

1. Add **Embed Code → Embed HTML** at the bottom of the page. Choose **Code** and paste in `wix/embeds/door.html`.
2. Size it about **240 × 340 px** and set its ID to `door`.
3. Replace the page code with `wix/pages/home.js` (Home) or `wix/pages/production-logs.js` (Production Logs).

### 4. The Circle of Fifths page

1. Add a page called **Circle of Fifths**. In **Page Settings → SEO basics**, set the URL slug to `circle-of-fifths`.
2. Add an Embed HTML box with `wix/embeds/circle.html`, about **700 × 800 px**, ID `circle`.
3. Below it, add two door boxes (`door.html`, 240 × 340 px) with the IDs `doorBb` and `doorF`.
4. Replace the page code with `wix/pages/circle-of-fifths.js`.

Your explanation of the circle of fifths can go above or around the graphic.

### 5. Level pages C and G

For each one:

1. Add a page called **Level C** (or **Level G**). Hide it from the menu. In **Page Settings → SEO basics**, set the URL slug to `level-c` (or `level-g`) and turn off **Let search engines index this page**.
2. Add an Embed HTML box with `wix/embeds/level-placeholder.html`, about **980 × 560 px**, ID `gameEmbed`.
3. Replace the page code with `wix/pages/level-c.js` (or `wix/pages/level-g.js`).

### 6. Try it

In Preview:

1. **Home:** door C glows. Click it.
2. **Level C:** press **Win level (test)**. You should see "You found the key of C" and the key icon appears in the corner.
3. **Go to the circle of fifths:** C's slot shimmers. Click it. You should hear a fifth, then a triad, and see "Somewhere on the site, a door in G has opened." The key icon disappears.
4. **Production Logs:** door G glows. Win level G, then press **Back**. The door now shows as done.
5. **Any other door** (once added) rattles when locked.
6. On the circle page, **Reset game progress** starts everything again.

The Phase 1 **Game Test** page can be deleted once this works.

## Running the checks here

```sh
npm run build          # rebuild wix/embeds/ from src/
npm test               # game rules
npm run test:browser   # Phase 1 and 2 in a browser (needs Playwright)
```
