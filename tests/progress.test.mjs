import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEYS, LEVEL_PATHS, emptyProgress, nextKey, isDoorOpen, isCircleComplete, doorState,
  completeLevel, placeKey, markIntroSeen, parseProgress, addHeart,
} from '../wix/public/progress.js';
import { readFileSync } from 'node:fs';

test('a new player can only open door C', () => {
  const p = emptyProgress();
  assert.equal(nextKey(p), 'C');
  assert.equal(isDoorOpen(p, 'C'), true);
  assert.equal(isDoorOpen(p, 'G'), false);
});

test('winning gives the key, placing it opens the next door', () => {
  let p = completeLevel(emptyProgress(), 'C');
  assert.deepEqual(p.held, ['C']);
  assert.equal(isDoorOpen(p, 'G'), false, 'G stays shut until C is placed');
  p = placeKey(p, 'C');
  assert.deepEqual(p.held, []);
  assert.deepEqual(p.placed, ['C']);
  assert.equal(isDoorOpen(p, 'G'), true);
  assert.equal(isDoorOpen(p, 'C'), true, 'beaten doors stay open for replays');
});

test('out-of-order wins and placements are ignored', () => {
  const p = emptyProgress();
  assert.equal(completeLevel(p, 'G'), p);
  assert.equal(placeKey(p, 'C'), p, 'cannot place a key you do not hold');
  const held = completeLevel(p, 'C');
  assert.equal(completeLevel(held, 'C'), held, 'winning twice gives one key');
  const placed = placeKey(held, 'C');
  assert.equal(completeLevel(placed, 'C'), placed, 'replaying a beaten level gives nothing');
});

test('all 12 keys in order completes the circle', () => {
  let p = emptyProgress();
  for (const key of KEYS) p = placeKey(completeLevel(p, key), key);
  assert.equal(isCircleComplete(p), true);
  assert.equal(nextKey(p), null);
});

test('intro flag is set once', () => {
  const p = markIntroSeen(emptyProgress());
  assert.equal(p.seenIntro, true);
  assert.equal(markIntroSeen(p), p);
});

test('broken or tampered storage is repaired', () => {
  assert.deepEqual(parseProgress(null), emptyProgress());
  assert.deepEqual(parseProgress('not json'), emptyProgress());
  assert.deepEqual(parseProgress('"text"'), emptyProgress());
  assert.deepEqual(
    parseProgress(JSON.stringify({ placed: ['C', 'G', 'A'], held: ['A', 'D', 'E'], seenIntro: true })),
    { v: 1, placed: ['C', 'G'], held: ['D'], seenIntro: true, hearts: [] },
    'keeps only the next key, drops placed keys out of order',
  );
  assert.deepEqual(
    parseProgress(JSON.stringify({ placed: ['C'], held: ['G'] })),
    { v: 1, placed: ['C'], held: ['G'], seenIntro: false, hearts: [] },
  );
});

test('doors show locked, open or done', () => {
  let p = emptyProgress();
  assert.equal(doorState(p, 'C'), 'open');
  assert.equal(doorState(p, 'G'), 'locked');
  p = completeLevel(p, 'C');
  assert.equal(doorState(p, 'C'), 'done', 'held key counts as beaten');
  assert.equal(doorState(p, 'G'), 'locked');
  p = placeKey(p, 'C');
  assert.equal(doorState(p, 'C'), 'done');
  assert.equal(doorState(p, 'G'), 'open');
});

test('every key has a level page', () => {
  assert.deepEqual(Object.keys(LEVEL_PATHS).sort(), [...KEYS].sort());
  assert.equal(new Set(Object.values(LEVEL_PATHS)).size, KEYS.length);
});

test('embed key list matches the Wix key list', () => {
  const source = readFileSync(new URL('../src/lib/keys.js', import.meta.url), 'utf8');
  const embedKeys = eval(source.match(/const KEYS = (\[[^\]]+\]);/)[1]);
  assert.deepEqual(embedKeys, KEYS);
});

test('hidden hearts: only in E and B, once each, once the door is open', () => {
  let p = emptyProgress();
  assert.equal(addHeart(p, 'E'), p, 'door E not open yet');
  for (const key of ['C', 'G', 'D', 'A']) p = placeKey(completeLevel(p, key), key);
  assert.equal(addHeart(p, 'C'), p, 'C hides no heart');
  p = addHeart(p, 'E');
  assert.deepEqual(p.hearts, ['E']);
  assert.equal(addHeart(p, 'E'), p, 'found once');
  assert.deepEqual(parseProgress(JSON.stringify({ ...p, hearts: ['E', 'E', 'X'] })).hearts, ['E']);
  assert.deepEqual(parseProgress(JSON.stringify({ placed: [] })).hearts, []);
});
