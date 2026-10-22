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
| `wix/embeds/level-b.html` | Level 6, Fix the Mix | Level B page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-fsharp.html` | Level 7, The Tritone (boss fight) | Level F♯ page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-dflat.html` | Level 8, Chord Progression | Level D♭ page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-aflat.html` | Level 9, Survival Waves (zombies) | Level A♭ page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-eflat.html` | Level 10, Beat Rebuild | Level E♭ page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-bflat.html` | Level 11, Arpeggio Rush | Level B♭ page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-f.html` | Level 12, the Final Boss (The Circle) | Level F page, Embed HTML box, ID `gameEmbed` |
| `wix/embeds/level-placeholder.html` | Stand-in for unbuilt levels: working piano and a test win button | Other level pages, Embed HTML box, ID `gameEmbed` |
| `assets/key-icon.svg` | The corner key icon | Upload as an image |
| `src/` | Source for the embeds (`npm run build` turns these into `wix/embeds/`) | Not used in Wix |
| `dev/`, `tests/` | Local copy of the site and automatic checks | Not used in Wix |

## Level 12: the Final Boss (The Circle)

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-f.html` | Level F page's Embed HTML box (replaces the placeholder) |

The Circle: all twelve keys orbiting a core, and the source of every attack. Every piano key plays from
the start, and the fight changes key with each phase: C major while you break C, G major while you
break G, and so on, back to F for the core. Scale mode keeps the moves on the same keys in every key
(A + G power shot, A + D + G triad, A + D resolves violet lasers, A + F + G sus4, Space to dash).
You have 3 hearts plus any hidden hearts found.

The fight is 12 short phases, one per key. The health bar is one bar split into 12 sections; emptying
a section breaks off an orbiting key (C first, then G, D … B♭) with a crack-and-shatter animation and
its own chord, and the boss adds something new:

| Key broken | What comes next |
| --- | --- |
| (start) | Single notes |
| C, G | Fifths, then fanned triads |
| D, A | Faster, then violet tritone lasers (A + D resolves) |
| E, B | Lasers that turn back, then power-chord bombs (they split into ground waves) |
| F♯, D♭ | Faster bombs, then arpeggio fans |
| A♭, E♭ | Red lasers that can't be resolved, then faster again |
| B♭ | Only the F core is left, at top speed |

The stage table (`STAGE_TABLE` in `src/embeds/level-f.html`) holds every number, one row per key.

At zero health the boss stops and waits: play F major (A + D + G) to finish it, and F resolves home
to C. Dying restarts the fight, with the hidden-hearts hint.

## Level 11: Arpeggio Rush (replaces Arpeggio Maze)

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-bflat.html` | Level B♭ page's Embed HTML box (replaces the placeholder) |
| `wix/embeds/circle.html` | Circle of Fifths page's `circle` box (new level name in a tooltip) |

A falling-notes rhythm game in B♭. Hit notes on the line with D F J K. The four lanes are the chord's
root, 3rd, 5th and octave, and they change note with the chords (B♭–Gm–E♭–F). The song runs Verse,
Chorus, Bridge, Solo and Finale (about a minute). Misses and stray presses drain the crowd meter; if it
empties you retry that section. Clicking away pauses the song. The level's name is now Arpeggio Rush,
so also re-paste `wix/embeds/circle.html` (its tooltips name each beaten level).

## Level 10: Beat Rebuild

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-eflat.html` | Level E♭ page's Embed HTML box (replaces the placeholder) |

Deck A plays a beat; rebuild it on Deck B's 16-step sequencer (kick, snare, hi-hat, clap) over four
beats. The crossfader switches between A, B or both, and S solos a row on both decks. A wrong check
says how many steps are off; from the second try it also marks which rows. After the fourth beat,
Deck A changes tempo and you match it with Deck B's tempo slider (within 1 BPM). To drop that
finale, set `BEATMATCH = false` near the top of `src/embeds/level-eflat.html` and rebuild.

## Level 9: Survival Waves

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-aflat.html` | Level A♭ page's Embed HTML box (replaces the placeholder) |

Pick a weapon (Arpeggiator, Sub Bass or Mic Swing), then survive 5 waves. WASD to move, aim with the
mouse, left click (or hold) to attack. Pick an upgrade between waves; if you're overrun, retry the wave.

**Mic Swing special, Feedback:** hold E to charge (ear defenders go on, you move slower and can't swing),
release when the bar is full, and a second later shockwaves ring out of all four speaker stacks. Each ring
hits every zombie once for 14% of its health plus a little (raised by Louder), staggering and pushing it
back, so walkers and runners drop while brutes survive badly hurt. Letting go early cancels it for free.
Ready at the start, then a 2 minute cooldown that carries across waves. The numbers are in `FEEDBACK`
near the top of `src/embeds/level-aflat.html`.

## Level 8: Chord Progression

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-dflat.html` | Level D♭ page's Embed HTML box (replaces the placeholder) |

Drag chord cards (or click a card, then a slot) into slots labelled with Roman numerals. A wrong
answer reveals a reference piano with D♭ major marked.

## Smaller doors, and Tritone tweaks

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/door.html` | Every door box (all 12). The door is a fixed size (about 80 × 115 px) and centred, so any box from about 120 × 150 px leaves room for its glow |
| `wix/embeds/level-fsharp.html` | Level F♯ page's box (warning line previews the sweep; no ground waves) |

Locked doors are now faint (30% opacity).

## Level 7: The Tritone (second boss), and phase transitions

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-fsharp.html` | Level F♯ page's Embed HTML box (replaces the placeholder) |
| `wix/embeds/level-a.html` | Level A page's box (Feedback now has phase transitions too) |

Controls in scale mode (F♯ major): A + G power shot, A + D + G triad, A + D resolves a violet laser,
A + F + G sus4 shockwave (from phase 2). Dash through lasers. At phase 2 it flips to G♭; phase 3's
red double lasers can't be resolved.

## Level 6: Fix the Mix (and the piano only where it's needed)

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/embeds/level-b.html` | Level B page's Embed HTML box (replaces the placeholder) |
| `wix/embeds/level-g.html` | Level G page's box (no piano) |
| `wix/embeds/level-d.html` | Level D page's box (no piano) |
| `wix/embeds/level-e.html` | Level E page's box (full keyboard) |

The on-screen piano only shows on levels that use it: Tutorial, Feedback and Melody Memory.
Hidden heart: a hidden fifth track. A small + at the end of the desk shows it; unmute it and blend it in before finishing.

## Level 5: Melody Memory, and hidden hearts

**Files to update in Wix**

| File | Where |
| --- | --- |
| `wix/public/progress.js` | Public file `progress.js` (saves hidden hearts) |
| `wix/public/game-site.js` | Public file `game-site.js` (passes hidden hearts to levels) |
| `wix/embeds/level-e.html` | Level E page's Embed HTML box (replaces the placeholder) |
| `wix/embeds/level-a.html` | Level A page's box (boss fights start with the extra hearts) |

Hidden heart: finish all six rounds with no mistakes. Each heart found adds a heart at the start of every boss fight.

## MIDI keyboard (tested, dropped)

`wix/embeds/midi-test.html` checks whether a MIDI keyboard works inside a Wix embed box.
Result on the site: Wix's boxes block MIDI, so the game stays on the computer keyboard.

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

- **Doors:** Embed HTML box with `wix/embeds/door.html`, about 120 × 150 px, at the bottom of the page.
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
2. Size it about **120 × 150 px** and set its ID to `door`.
3. Replace the page code with `wix/pages/home.js` (Home) or `wix/pages/production-logs.js` (Production Logs).

### 4. The Circle of Fifths page

1. Add a page called **Circle of Fifths**. In **Page Settings → SEO basics**, set the URL slug to `circle-of-fifths`.
2. Add an Embed HTML box with `wix/embeds/circle.html`, about **700 × 800 px**, ID `circle`.
3. Below it, add two door boxes (`door.html`, 120 × 150 px) with the IDs `doorBb` and `doorF`.
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
