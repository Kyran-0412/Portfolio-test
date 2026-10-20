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

// held:   keys won from a level but not yet placed in the circle
// placed: keys placed in the circle, always in circle order
export function emptyProgress() {
  return { v: 1, held: [], placed: [], seenIntro: false };
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

  return { v: 1, held, placed, seenIntro: data.seenIntro === true };
}
