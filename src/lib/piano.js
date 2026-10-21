// On-screen piano, played with the computer keyboard (the same layout as
// Ableton's and FL Studio's computer-keyboard piano) or by clicking.
//   W E   T Y U   O P
//  A S D F G H J K L ; '      Z / X shift the octave
// Boss fights switch to scale mode: A S D F G H J K play the 8 notes of the
// level's scale, so one hand can play while the other moves.
// Levels listen with onNoteOn / onNoteOff and can mark keys with
// mark(midi, 'target' | 'good' | 'bad').
const Piano = (() => {
  const CHROMATIC_CODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY',
    'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon', 'Quote'];
  const CHROMATIC_LETTERS = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K', 'O', 'L', 'P', ';', "'"];
  const SCALE_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'];
  const SCALE_LETTERS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'];
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const BLACK = [1, 3, 6, 8, 10];

  const noteName = (midi) => NAMES[((midi % 12) + 12) % 12];
  const octaveOf = (midi) => Math.floor(midi / 12) - 1;

  function create(container, { octave: startOctave = 4 } = {}) {
    const listeners = { on: [], off: [] };
    const held = new Map(); // midi → sound
    const pressedCodes = new Map(); // keyboard code → midi
    const targetPitches = new Set();
    let enabled = true;
    let shift = 0; // octaves up or down from the starting layout
    let layout = []; // [{ code, letter, midi, black, el }]
    let scaleMode = false;
    let allowed = null; // null = every key works; otherwise a Set of note names (0–11)
    let chromaticBase = (startOctave + 1) * 12;

    container.classList.add('piano');
    container.innerHTML = `
      <div class="piano-bar">
        <span class="piano-octave">Octave <b></b></span>
        <span class="piano-help">Z / X change octave</span>
      </div>
      <div class="piano-keys"></div>`;
    const keysEl = container.querySelector('.piano-keys');
    const octaveEl = container.querySelector('.piano-octave b');

    const midiOf = (entry) => entry.midi + shift * 12;
    const entryFor = (midi) => layout.find((k) => midiOf(k) === midi) || null;

    function render() {
      keysEl.innerHTML = '';
      let whiteIndex = 0;
      layout.forEach((k) => {
        const el = document.createElement('div');
        el.className = 'piano-key ' + (k.black ? 'black' : 'white');
        el.innerHTML = `<span class="piano-letter">${k.letter}</span><span class="piano-name"></span>`;
        if (k.black) el.style.left = `calc(${whiteIndex} * var(--white-w) - var(--black-w) / 2)`;
        else whiteIndex++;
        keysEl.appendChild(el);
        k.el = el;
      });
      container.style.setProperty('--whites', whiteIndex);
      container.classList.toggle('scale-mode', scaleMode);
      relabel();
    }

    function relabel() {
      octaveEl.textContent = octaveOf(midiOf(layout[0]));
      layout.forEach((k) => {
        const midi = midiOf(k);
        k.el.dataset.midi = midi;
        const name = scaleMode ? noteName(midi) : (midi % 12 === 0 ? `C${octaveOf(midi)}` : '');
        k.el.querySelector('.piano-name').textContent = name;
        k.el.classList.toggle('mark-target', targetPitches.has(midi % 12));
        k.el.classList.toggle('locked', allowed !== null && !allowed.has(midi % 12));
        k.el.classList.remove('mark-good', 'mark-bad');
      });
    }

    function chromatic() {
      scaleMode = false;
      layout = CHROMATIC_CODES.map((code, i) => ({
        code, letter: CHROMATIC_LETTERS[i], midi: chromaticBase + i, black: BLACK.includes(i % 12),
      }));
      render();
    }

    function down(midi, source) {
      if (!enabled || held.has(midi)) return;
      if (allowed !== null && !allowed.has(midi % 12)) return; // greyed out
      held.set(midi, Sound.hold(midi));
      const entry = entryFor(midi);
      if (entry) entry.el.classList.add('down');
      listeners.on.forEach((fn) => fn(midi, source));
    }

    function up(midi) {
      const sound = held.get(midi);
      if (!sound) return;
      sound.stop();
      held.delete(midi);
      const entry = entryFor(midi);
      if (entry) entry.el.classList.remove('down');
      listeners.off.forEach((fn) => fn(midi));
    }

    function releaseAll() {
      [...held.keys()].forEach(up);
      pressedCodes.clear();
    }

    function setOctave(n) {
      const nextShift = shift + (n - octaveOf(midiOf(layout[0])));
      const lowest = midiOf(layout[0]) + (nextShift - shift) * 12;
      if (lowest < 36 || lowest > 84) return; // keep between C2 and C6
      releaseAll();
      shift = nextShift;
      relabel();
    }

    // Computer keyboard
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'KeyZ' || e.code === 'KeyX') {
        e.preventDefault();
        if (!e.repeat) setOctave(octaveOf(midiOf(layout[0])) + (e.code === 'KeyZ' ? -1 : 1));
        return;
      }
      const entry = layout.find((k) => k.code === e.code);
      if (!entry) return;
      e.preventDefault();
      if (e.repeat || pressedCodes.has(e.code)) return;
      Sound.unlock();
      const midi = midiOf(entry);
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

    chromatic();

    return {
      onNoteOn: (fn) => listeners.on.push(fn),
      onNoteOff: (fn) => listeners.off.push(fn),
      held: () => [...held.keys()],
      // Marks a key: 'target' glows (play this), 'good' and 'bad' flash.
      mark(midi, kind) {
        const entry = entryFor(midi);
        if (!entry) return;
        const el = entry.el;
        if (kind === 'target') return el.classList.add('mark-target');
        el.classList.remove('mark-good', 'mark-bad');
        void el.offsetWidth;
        el.classList.add('mark-' + kind);
        setTimeout(() => el.classList.remove('mark-' + kind), 600);
      },
      // Marks every key with this note name (in any octave) as a target.
      markPitch(pitchClass) {
        targetPitches.add(((pitchClass % 12) + 12) % 12);
        relabel();
      },
      clearMarks() {
        targetPitches.clear();
        relabel();
      },
      // Scale mode: A S D F G H J K play root + each step (default: major scale).
      useScale(root, steps = [0, 2, 4, 5, 7, 9, 11, 12]) {
        releaseAll();
        scaleMode = true;
        shift = 0;
        layout = steps.map((step, i) => ({ code: SCALE_CODES[i], letter: SCALE_LETTERS[i], midi: root + step, black: false }));
        render();
      },
      useChromatic() { releaseAll(); shift = 0; chromatic(); },
      setEnabled(on) { enabled = on; if (!on) releaseAll(); },
      // Greys out every key except these note names (0–11). null unlocks all.
      setAllowed(pitchClasses) {
        allowed = pitchClasses ? new Set(pitchClasses.map((pc) => ((pc % 12) + 12) % 12)) : null;
        relabel();
      },
      get octave() { return octaveOf(midiOf(layout[0])); },
      setOctave,
    };
  }

  return { create, noteName, octaveOf };
})();
