// Facts about the 12 keys, shared by the embed boxes.
const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

const KEY_INFO = {
  C:    { label: 'C',  minor: 'Am',  signature: 'No sharps or flats', level: 'Tutorial',           semitones: 0 },
  G:    { label: 'G',  minor: 'Em',  signature: '1 sharp',            level: 'Wrong Note',         semitones: 7 },
  D:    { label: 'D',  minor: 'Bm',  signature: '2 sharps',           level: 'Key Signature Lock', semitones: 2 },
  A:    { label: 'A',  minor: 'F♯m', signature: '3 sharps',           level: 'Feedback',           semitones: 9 },
  E:    { label: 'E',  minor: 'C♯m', signature: '4 sharps',           level: 'Melody Memory',      semitones: 4 },
  B:    { label: 'B',  minor: 'G♯m', signature: '5 sharps',           level: 'Fix the Mix',        semitones: 11 },
  'F#': { label: 'F♯', minor: 'D♯m', signature: '6 sharps (or 6 flats as G♭)', level: 'The Tritone', semitones: 6, alt: 'G♭' },
  Db:   { label: 'D♭', minor: 'B♭m', signature: '5 flats',            level: 'Chord Progression',  semitones: 1 },
  Ab:   { label: 'A♭', minor: 'Fm',  signature: '4 flats',            level: 'Survival Waves',     semitones: 8 },
  Eb:   { label: 'E♭', minor: 'Cm',  signature: '3 flats',            level: 'Beat Rebuild',       semitones: 3 },
  Bb:   { label: 'B♭', minor: 'Gm',  signature: '2 flats',            level: 'Arpeggio Rush',      semitones: 10 },
  F:    { label: 'F',  minor: 'Dm',  signature: '1 flat',             level: 'Final Boss',         semitones: 5 },
};

const keyLabel = (key) => KEY_INFO[key].label;

// Root note of a key as a MIDI number, kept between F#3 and F#4.
function rootMidi(key) {
  const s = KEY_INFO[key].semitones;
  return 60 + (s > 6 ? s - 12 : s);
}
