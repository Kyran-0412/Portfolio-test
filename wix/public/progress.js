// Progress rules for the Circle of Fifths game.
// Pure functions only (no Wix imports), so this same file runs on the Wix
// site (as public/progress.js) and in local tests.

// The 12 major keys, clockwise round the circle of fifths.
export const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// Name used in the visitor's browser storage.
export const STORAGE_KEY = 'cof-progress';

// Page addresses. These must match the URL slugs set in Wix.
export const CIRCLE_PATH = '/circle-of-fifths';
export const LEVEL_PATHS = {
  C: '/level-c', G: '/level-g', D: '/level-d', A: '/level-a', E: '/level-e', B: '/level-b',
  'F#': '/level-fsharp', Db: '/level-dflat', Ab: '/level-aflat', Eb: '/level-eflat',
  Bb: '/level-bflat', F: '/level-f',
};

// Levels that hide an extra heart (more starting hearts in boss fights).
export const HEART_LEVELS = ['E', 'B'];

// The boss fights. Attempting one unlocks its attacks in the Tutorial's practice mode.
export const BOSS_LEVELS = ['A', 'F#', 'F'];

// held:   keys won from a level but not yet placed in the circle
// placed: keys placed in the circle, always in circle order
// hearts: levels whose hidden extra heart has been found
// tried:  boss fights that have been started at least once
export function emptyProgress() {
  return { v: 1, held: [], placed: [], seenIntro: false, hearts: [], tried: [] };
}

// Starting a boss fight. Only boss levels count, once each.
export function markTried(progress, key) {
  if (!BOSS_LEVELS.includes(key) || (progress.tried || []).includes(key)) return progress;
  return { ...progress, tried: [...(progress.tried || []), key] };
}

// Bosses attempted so far, counting ones already beaten (in case they were
// beaten before attempts were recorded).
export function triedBosses(progress) {
  const done = [...progress.placed, ...progress.held];
  return BOSS_LEVELS.filter((k) => (progress.tried || []).includes(k) || done.includes(k));
}

// Finding a level's hidden heart. Only counts for levels that hide one,
// once each, and only if that level's door is open.
export function addHeart(progress, key) {
  if (!HEART_LEVELS.includes(key) || progress.hearts.includes(key) || !isDoorOpen(progress, key)) return progress;
  return { ...progress, hearts: [...progress.hearts, key] };
}

// The key whose level is currently open, or null once the circle is complete.
export function nextKey(progress) {
  return KEYS[progress.placed.length] ?? null;
}

// A door opens once the previous key is placed. Door C is open from the start,
// and beaten doors stay open so levels can be replayed.
export function isDoorOpen(progress, key) {
  const index = KEYS.indexOf(key);
  return index !== -1 && index <= progress.placed.length;
}

// How a door looks: 'locked', 'open' (its level is playable) or 'done' (beaten).
export function doorState(progress, key) {
  if (progress.placed.includes(key) || progress.held.includes(key)) return 'done';
  return isDoorOpen(progress, key) ? 'open' : 'locked';
}

export function isCircleComplete(progress) {
  return progress.placed.length === KEYS.length;
}

// Winning the open level gives its key. Replaying a beaten level gives nothing.
export function completeLevel(progress, key) {
  if (key !== nextKey(progress) || progress.held.includes(key)) return progress;
  return { ...progress, held: [...progress.held, key] };
}

// Placing a held key lights it on the circle and opens the next door.
export function placeKey(progress, key) {
  if (key !== nextKey(progress) || !progress.held.includes(key)) return progress;
  return {
    ...progress,
    held: progress.held.filter((k) => k !== key),
    placed: [...progress.placed, key],
  };
}

export function markIntroSeen(progress) {
  return progress.seenIntro ? progress : { ...progress, seenIntro: true };
}

// Reads saved progress. Anything missing, broken or out of order is repaired,
// so a bad value in storage can never break the site.
export function parseProgress(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (!data || typeof data !== 'object') return emptyProgress();

  const placed = [];
  for (const key of Array.isArray(data.placed) ? data.placed : []) {
    if (key !== KEYS[placed.length]) break;
    placed.push(key);
  }
  const next = KEYS[placed.length];
  const held = Array.isArray(data.held) && data.held.includes(next) ? [next] : [];

  const hearts = HEART_LEVELS.filter((k) => Array.isArray(data.hearts) && data.hearts.includes(k));
  const tried = BOSS_LEVELS.filter((k) => Array.isArray(data.tried) && data.tried.includes(k));

  return { v: 1, held, placed, seenIntro: data.seenIntro === true, hearts, tried };
}
