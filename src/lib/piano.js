// On-screen piano, played with the computer keyboard (the same layout as
// Ableton's and FL Studio's computer-keyboard piano) or by clicking.
//   W E   T Y U   O P
//  A S D F G H J K L ; '      Z / X shift the octave
// Every level shows it. Levels listen with onNoteOn / onNoteOff and can mark
// keys with mark(midi, 'target' | 'good' | 'bad').
const Piano = (() => {
  // Keyboard code → semitones above the lowest C shown.
  const KEYMAP = {
    KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8,
    KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
  };
  const LETTERS = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K', 'O', 'L', 'P', ';', "'"];
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const BLACK = [1, 3, 6, 8, 10];
  const SPAN = 18; // C to F above the next C

  const noteName = (midi) => NAMES[midi % 12];
  const octaveOf = (midi) => Math.floor(midi / 12) - 1;

  function create(container, { octave = 4 } = {}) {
    const minOctave = 2, maxOctave = 6;
    const listeners = { on: [], off: [] };
    const held = new Map(); // midi → sound
    const pressedCodes = new Map(); // keyboard code → midi
    const keyEls = [];
    const targetPitches = new Set();
    let enabled = true;

    container.classList.add('piano');
    container.innerHTML = `
      <div class="piano-bar">
        <span class="piano-octave">Octave <b></b></span>
        <span class="piano-help">Z / X change octave</span>
      </div>
      <div class="piano-keys"></div>`;
    const keysEl = container.querySelector('.piano-keys');
    const octaveEl = container.querySelector('.piano-octave b');

    // White keys sit in a row; black keys sit over the gaps.
    let whiteIndex = 0;
    for (let i = 0; i < SPAN; i++) {
      const black = BLACK.includes(i % 12);
      const key = document.createElement('div');
      key.className = 'piano-key ' + (black ? 'black' : 'white');
      key.innerHTML = `<span class="piano-letter">${LETTERS[i]}</span><span class="piano-name"></span>`;
      if (black) key.style.left = `calc(${whiteIndex} * var(--white-w) - var(--black-w) / 2)`;
      else whiteIndex++;
      key.dataset.step = i;
      keysEl.appendChild(key);
      keyEls.push(key);
    }
    container.style.setProperty('--whites', whiteIndex);

    const base = () => (octave + 1) * 12;
    const keyFor = (midi) => keyEls[midi - base()] || null;

    function relabel() {
      octaveEl.textContent = octave;
      keyEls.forEach((key, i) => {
        const midi = base() + i;
        key.dataset.midi = midi;
        key.querySelector('.piano-name').textContent = i % 12 === 0 ? `C${octaveOf(midi)}` : '';
      });
    }

    function down(midi, source) {
      if (!enabled || held.has(midi)) return;
      held.set(midi, Sound.hold(midi));
      const key = keyFor(midi);
      if (key) key.classList.add('down');
      listeners.on.forEach((fn) => fn(midi, source));
    }

    function up(midi) {
      const sound = held.get(midi);
      if (!sound) return;
      sound.stop();
      held.delete(midi);
      const key = keyFor(midi);
      if (key) key.classList.remove('down');
      listeners.off.forEach((fn) => fn(midi));
    }

    function releaseAll() {
      [...held.keys()].forEach(up);
      pressedCodes.clear();
    }

    function setOctave(n) {
      const next = Math.min(maxOctave, Math.max(minOctave, n));
      if (next === octave) return;
      releaseAll();
      octave = next;
      relabel();
      // Marks follow note names (markPitch), so they stay on the right keys.
      keyEls.forEach((k) => {
        k.classList.toggle('mark-target', targetPitches.has(Number(k.dataset.midi) % 12));
        k.classList.remove('mark-good', 'mark-bad');
      });
    }

    // Computer keyboard
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'KeyZ' || e.code === 'KeyX') {
        e.preventDefault();
        if (!e.repeat) setOctave(octave + (e.code === 'KeyZ' ? -1 : 1));
        return;
      }
      if (!(e.code in KEYMAP)) return;
      e.preventDefault();
      if (e.repeat || pressedCodes.has(e.code)) return;
      Sound.unlock();
      const midi = base() + KEYMAP[e.code];
      pressedCodes.set(e.code, midi);
      down(midi, 'keyboard');
    });
    window.addEventListener('keyup', (e) => {
      if (!pressedCodes.has(e.code)) return;
      up(pressedCodes.get(e.code));
      pressedCodes.delete(e.code);
    });
    window.addEventListener('blur', releaseAll);

    // Mouse and touch
    keysEl.addEventListener('pointerdown', (e) => {
      const key = e.target.closest('.piano-key');
      if (!key) return;
      e.preventDefault();
      Sound.unlock();
      const midi = Number(key.dataset.midi);
      down(midi, 'pointer');
      const release = () => {
        up(midi);
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
    });

    relabel();

    return {
      onNoteOn: (fn) => listeners.on.push(fn),
      onNoteOff: (fn) => listeners.off.push(fn),
      held: () => [...held.keys()],
      // Marks a key: 'target' glows (play this), 'good' and 'bad' flash.
      mark(midi, kind) {
        const key = keyFor(midi);
        if (!key) return;
        if (kind === 'target') return key.classList.add('mark-target');
        key.classList.remove('mark-good', 'mark-bad');
        void key.offsetWidth;
        key.classList.add('mark-' + kind);
        setTimeout(() => key.classList.remove('mark-' + kind), 600);
      },
      // Marks every key with this note name (in any octave) as a target.
      markPitch(pitchClass) {
        targetPitches.add(((pitchClass % 12) + 12) % 12);
        keyEls.forEach((key) => {
          if (targetPitches.has(Number(key.dataset.midi) % 12)) key.classList.add('mark-target');
        });
      },
      clearMarks() {
        targetPitches.clear();
        keyEls.forEach((k) => k.classList.remove('mark-target', 'mark-good', 'mark-bad'));
      },
      setEnabled(on) { enabled = on; if (!on) releaseAll(); },
      get octave() { return octave; },
      setOctave,
    };
  }

  return { create, noteName, octaveOf };
})();
