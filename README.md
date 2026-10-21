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
| `wix/embeds/level-c.html` | Level 1, the Tutorial | Level C page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-g.html` | Level 2, Wrong Note | Level G page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-d.html` | Level 3, Key Signature Lock | Level D page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-a.html` | Level 4, Feedback (boss fight) | Level A page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-e.html` | Level 5, Melody Memory | Level E page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-placeholder.html` | Stand-in for unbuilt levels: working piano and a test win button | Other level pages, Embed HTML box, ID `gameEmbed` |
| `assets/key-icon.svg` | The corner key icon | Upload as an image |
| `src/` | Source for the embeds (`npm run build` turns these into `wix/embeds/`) | Not used in Wix |
| `dev/`, `tests/` | Local copy of the site and automatic checks | Not used in Wix |

## Level 4: Feedback (boss fight)

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-a.html` | Level A page's Embed HTML box (replaces the placeholder) |

Controls: ← → move, Space dashes. You build A major's triad over the fight:
phase 1 only A fires; phase 2 unlocks E (A + E together is a power shot);
phase 3 starts with finding the missing note C♯, then A + C♯ + E fires a triad.
You have 3 hearts (HEARTS in the file); each hit takes one, and losing them all restarts the fight. Firing fills your
volume meter; clipping it stuns you for 2 seconds.

## Level 3: Key Signature Lock

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-d.html` | Level D page's Embed HTML box (replaces the placeholder) |

## Level 2: Wrong Note

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-g.html` | Level G page's Embed HTML box (replaces the placeholder) |
| `wix/embeds/level-c.html` | Level C page's Embed HTML box (adds the Preview-only skip button) |
| `wix/embeds/level-placeholder.html` | Every other level page's box (adds the skip button) |

Real levels now have a **Skip level (test)** button in the top-right corner, in Preview only.

## Setting up every level page and door

Each level page is set up once. Unbuilt levels use the placeholder, and each new
level later only means replacing that one box's code.

| Door | Key | Door goes on | Door box ID | Page code | Level page URL slug | Level page code |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | C | Home | `door` | `home.js` | `level-c` | `level-c.js` |
| 2 | G | Production Logs | `door` | `production-logs.js` | `level-g` | `level-g.js` |
| 3 | D | Musical Elements | `door` | `musical-elements.js` | `level-d` | `level-d.js` |
| 4 | A | Health and Safety | `door` | `health-and-safety.js` | `level-a` | `level-a.js` |
| 5 | E | Job Roles in Music | `door` | `job-roles-in-music.js` | `level-e` | `level-e.js` |
| 6 | B | Mixing Desk Operation | `door` | `mixing-desk-operation.js` | `level-b` | `level-b.js` |
| 7 | F♯ | Live Production | `door` | `live-production.js` | `level-fsharp` | `level-fsharp.js` |
| 8 | D♭ | Music Production | `door` | `music-production.js` | `level-dflat` | `level-dflat.js` |
| 9 | A♭ | Performance | `door` | `performance.js` | `level-aflat` | `level-aflat.js` |
| 10 | E♭ | DJing | `door` | `djing.js` | `level-eflat` | `level-eflat.js` |
| 11 | B♭ | Circle of Fifths | `doorBb` | `circle-of-fifths.js` | `level-bflat` | `level-bflat.js` |
| 12 | F | Circle of Fifths | `doorF` | (same page) | `level-f` | `level-f.js` |

- **Doors:** Embed HTML box with `wix/embeds/door.html`, about 240 × 340 px, at the bottom of the page.
- **Level pages:** hidden from the menu and from search engines. Embed HTML box with
  `wix/embeds/level-placeholder.html` (Level C uses `level-c.html`), about 980 × 640 px, ID `gameEmbed`.
- **Tip:** once one level page is set up, duplicate it (**Pages → ⋯ → Duplicate**), then change its name, URL slug and page code.
- **Test buttons:** "Win level (test)" only appears in Preview. On the live site, unbuilt levels say "Coming soon" with a Back button.

## Phase 3: the Tutorial and the on-screen piano

Every level now has an on-screen piano you play with the computer keyboard
(A–K white keys, W E T Y U black keys, Z / X to change octave) or by clicking.

1. **Level C page:** open the Embed HTML box, replace its code with `wix/embeds/level-c.html`, and resize it to about **980 × 640 px**.
2. **Level G page:** replace its code with the new `wix/embeds/level-placeholder.html` and resize it to about **980 × 640 px**.
3. **Try it in Preview:** reset progress on the circle page, then go through door C. Press **Start**, then:
   1. Press **A** to play C.
   2. Play the C major scale (**A S D F G H J K**), following the glowing keys.
   3. Hold **A** and **G** together for a perfect fifth.

   The key-found screen should appear as before.

Nothing else changes: the doors, circle and page code stay as they are.

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
