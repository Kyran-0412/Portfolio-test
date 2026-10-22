// Sound engine. Plays your samples when SAMPLES lists them, otherwise a soft
// built-in synth. Samples only need one note every few semitones: the nearest
// one is pitched to fill the gaps.
const Sound = (() => {
  // MIDI note number → sample link, e.g. { 60: 'https://static.wixstatic.com/mp3/...' }
  // Piano: one note every 3 semitones from C2 to C6. Everything in between,
  // and above or below, is the nearest one repitched.
  const SAMPLES = {
    36: 'https://static.wixstatic.com/mp3/281301_c7acf76ee6704f4f8472746d60b6ba09.wav', // C2
    39: 'https://static.wixstatic.com/mp3/281301_653af0d7a1c84996a486e6a52876b9a6.wav', // E♭2
    42: 'https://static.wixstatic.com/mp3/281301_8b801a53be144a509820b74c399ee184.wav', // F♯2
    45: 'https://static.wixstatic.com/mp3/281301_28e36fb856ad4cc1b48521b37f857a23.wav', // A2
    48: 'https://static.wixstatic.com/mp3/281301_dd13ec2873f142e5920a3b701b24f858.wav', // C3
    51: 'https://static.wixstatic.com/mp3/281301_96e88d23eab648d394a5a73bca193f23.wav', // E♭3
    54: 'https://static.wixstatic.com/mp3/281301_88e72b881bae4d7a8f02593460b3195f.mp3', // F♯3
    57: 'https://static.wixstatic.com/mp3/281301_584c436cd10a444793c67398eab8fdb6.wav', // A3
    60: 'https://static.wixstatic.com/mp3/281301_1df549ca37574616afa90bc2727e6e4b.wav', // C4
    63: 'https://static.wixstatic.com/mp3/281301_f6ee58761130423fa01f5fd4b1c2311d.wav', // E♭4
    66: 'https://static.wixstatic.com/mp3/281301_4225b49d9e324fefa5b4eb80e23b2907.wav', // F♯4
    69: 'https://static.wixstatic.com/mp3/281301_fe73ec5600624c0491122f9f8fde20ef.wav', // A4
    72: 'https://static.wixstatic.com/mp3/281301_f061bdd378524749898625a5dfcae23e.wav', // C5
    75: 'https://static.wixstatic.com/mp3/281301_331a2181f06d45428bcf646539b1046e.wav', // E♭5
    78: 'https://static.wixstatic.com/mp3/281301_2ba56f64a7324ee7b340dd1501cd8070.wav', // F♯5
    81: 'https://static.wixstatic.com/mp3/281301_b5b475fd6e374154b62c12a7c61bd67c.wav', // A5
    84: 'https://static.wixstatic.com/mp3/281301_df0024f76ace48bb9d646668e6c85134.wav', // C6
  };

  // Named sounds, loaded only by the levels that ask for them (Sound.preload).
  // A link plays as it is; a { note: link } set is pitched like the piano,
  // from the nearest one. Lasers are root + tritone, recorded around octave 3.
  const SOUNDS = {
    'red-charge': 'https://static.wixstatic.com/mp3/281301_73faded223f74068b94682aa3bae63a5.wav',
    'red-hit': 'https://static.wixstatic.com/mp3/281301_5ac0974a5bb04217b924de8f7e8c13d9.wav',
    'red-beam': { // a seamless loop
      48: 'https://static.wixstatic.com/mp3/281301_3a422f96cb4743fd86cea5b237f74b8a.mp3', // C3 + F♯3
      51: 'https://static.wixstatic.com/mp3/281301_240233f4f3b4402c88fbb470eca3639f.wav', // E♭3 + A3
      54: 'https://static.wixstatic.com/mp3/281301_554c1af92c7d4964b0a2981953f9cfe4.mp3', // F♯3 + C4
      57: 'https://static.wixstatic.com/mp3/281301_8b9c715c68b2437cb69ef69dce882831.mp3', // A3 + E♭4
    },
    'violet-charge': 'https://static.wixstatic.com/mp3/281301_4d8e6f555653447497e7add012050509.wav',
    // 'violet-hit' and 'violet-beam' go here when they're ready.
  };
  const LASER_GAIN = 0.6; // the laser samples' level; tune by ear

  const SAMPLE_GAIN = 0.7; // samples' level next to the synth; tune once real sounds are in
  let ctx = null;
  let out = null;
  const buffers = {};
  const named = {}; // name → buffer, or { note: buffer }
  const wanted = new Set(); // named sounds a level asked for
  // How the samples are doing, for the Preview-only status line.
  const status = { total: Object.keys(SAMPLES).length, loaded: 0, blocked: 0, broken: 0, done: false };
  let pending = 0;
  let onStatus = () => {};

  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      out = ctx.createDynamicsCompressor();
      out.connect(ctx.destination);
      Object.entries(SAMPLES).forEach(([midi, url]) => load(url, (b) => { buffers[midi] = b; }));
      wanted.forEach(loadNamed);
      if (!pending) finishLoad();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function finishLoad() { status.done = true; onStatus(status); }
  // Downloads and decodes one sound. A missing one just falls back to the synth.
  async function load(url, store) {
    pending++;
    try {
      let data;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        data = await res.arrayBuffer();
      } catch (err) {
        status.blocked++; // couldn't download it (blocked, or a bad link)
        return;
      }
      try {
        store(await ctx.decodeAudioData(data));
        status.loaded++;
      } catch (err) {
        status.broken++; // downloaded, but not a sound the browser can play
      }
    } finally {
      pending--;
      onStatus(status);
      if (!pending) finishLoad();
    }
  }
  function loadNamed(name) {
    const src = SOUNDS[name];
    if (!src) return;
    status.done = false;
    if (typeof src === 'string') { status.total++; load(src, (b) => { named[name] = b; }); return; }
    named[name] = {};
    for (const [midi, url] of Object.entries(src)) { status.total++; load(url, (b) => { named[name][midi] = b; }); }
  }

  // Loops skip the silence MP3s add at each end, so they don't stutter.
  function trimmed(buf) {
    if (buf.trim) return buf.trim;
    const d = buf.getChannelData(0);
    let a = 0, b = d.length - 1;
    while (a < b && Math.abs(d[a]) < 1e-4) a++;
    while (b > a && Math.abs(d[b]) < 1e-4) b--;
    buf.trim = [a / buf.sampleRate, (b + 1) / buf.sampleRate];
    return buf.trim;
  }
  // Plays a buffer; returns stop(fade). For loops, repeats the trimmed middle.
  function playBuffer(buf, { rate = 1, loop = false, volume = 1 } = {}) {
    const a = audio(), t = a.currentTime + 0.005;
    const src = a.createBufferSource(), gain = a.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate;
    gain.gain.setValueAtTime(volume, t);
    src.connect(gain).connect(out);
    if (loop) {
      const [ls, le] = trimmed(buf);
      src.loop = true; src.loopStart = ls; src.loopEnd = le;
      src.start(t, ls);
    } else src.start(t);
    let stopped = false;
    return {
      stop(fade = 0.08) {
        if (stopped) return;
        stopped = true;
        const now = a.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + fade);
        src.stop(now + fade + 0.02);
      },
    };
  }
  // The nearest note in a pitched set, counting octaves either way.
  function nearestIn(set, midi) {
    let best = null;
    for (const m of Object.keys(set).map(Number)) {
      for (const o of [-12, 0, 12]) {
        if (best === null || Math.abs(midi - (m + o)) < Math.abs(midi - best.at)) best = { m, at: m + o };
      }
    }
    return best && { buf: set[best.m], rate: Math.pow(2, (midi - best.at) / 12) };
  }

  function nearestSample(midi) {
    let best = null;
    for (const m of Object.keys(buffers).map(Number)) {
      if (best === null || Math.abs(m - midi) < Math.abs(best - midi)) best = m;
    }
    return best;
  }

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Starts a note that rings until stop() is called. Used for held keys.
  function voice(midi, t, volume, synthOnly = false) {
    const a = audio();
    const gain = a.createGain();
    gain.connect(out);
    const sources = [];

    const sample = synthOnly ? null : nearestSample(midi);
    if (sample !== null) {
      const src = a.createBufferSource();
      src.buffer = buffers[sample];
      src.playbackRate.value = Math.pow(2, (midi - sample) / 12);
      gain.gain.setValueAtTime(volume * SAMPLE_GAIN, t);
      src.connect(gain);
      src.start(t);
      sources.push(src);
    } else {
      const filter = a.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2600;
      filter.connect(gain);
      for (const detune of [-7, 7]) {
        const osc = a.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = hz(midi);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        sources.push(osc);
      }
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(volume * 0.25, t + 0.3);
    }

    let stopped = false;
    return {
      stop(at = a.currentTime) {
        if (stopped) return;
        stopped = true;
        const end = Math.max(at, a.currentTime);
        gain.gain.cancelScheduledValues(end);
        gain.gain.setTargetAtTime(0.0001, end, 0.12);
        sources.forEach((src) => src.stop(end + 1));
      },
    };
  }

  // One note of a set length. `when` is seconds from now.
  function note(midi, when = 0, length = 1.2, volume = 0.4) {
    const t = audio().currentTime + 0.03 + when;
    voice(midi, t, volume).stop(t + length);
  }

  // A held note: returns an object with stop().
  function hold(midi, volume = 0.4) {
    return voice(midi, audio().currentTime + 0.01, volume);
  }

  function chord(midis, when = 0, length = 1.2, volume = 0.4) {
    midis.forEach((m) => note(m, when, length, volume / Math.sqrt(midis.length)));
  }

  // Filtered noise, for thuds and whooshes.
  function noise(when, length, from, to, volume) {
    const a = audio();
    const t = a.currentTime + 0.03 + when;
    const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * length), a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    const filter = a.createBiquadFilter();
    const gain = a.createGain();
    src.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + length);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
  }

  function thump(when, from, to, length, volume) {
    const a = audio();
    const t = a.currentTime + 0.03 + when;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  // A laser's sound, in three parts: the charge while it warns, then (call
  // live()) the hit plus the beam loop underneath it. Any part without a
  // sample uses the old synth tritone instead. stop() fades everything.
  function laser(colour, root, synthVolume) {
    const charge = named[`${colour}-charge`], hit = named[`${colour}-hit`], beams = named[`${colour}-beam`];
    const loops = beams && Object.keys(beams).length ? beams : null;
    const synth = () => [root, root + 6].map((m) => voice(m, audio().currentTime + 0.01, synthVolume, true)); // a steady hum, not the piano
    const parts = [];
    let chargeParts = charge ? [playBuffer(charge, { volume: LASER_GAIN })] : loops ? synth() : null;
    // With no laser samples at all, the synth tritone carries straight through.
    if (!chargeParts) { const held = synth(); return { live() {}, stop() { held.forEach((v) => v.stop()); } }; }
    parts.push(...chargeParts);
    let isLive = false;
    return {
      live() {
        if (isLive) return;
        isLive = true;
        chargeParts.forEach((v) => v.stop(0.04));
        if (hit) parts.push(playBuffer(hit, { volume: LASER_GAIN }));
        if (loops) { const n = nearestIn(loops, root); parts.push(playBuffer(n.buf, { rate: n.rate, loop: true, volume: LASER_GAIN })); }
        else parts.push(...synth());
      },
      stop() { parts.forEach((v) => v.stop()); },
    };
  }

  return {
    unlock: audio,
    laser,
    // Levels list the named sounds they use, so others don't download them.
    preload(names) { names.forEach((n) => { if (!wanted.has(n)) { wanted.add(n); if (ctx) loadNamed(n); } }); },
    has: (name) => !!named[name],
    // Sample loading progress: { total, loaded, blocked, broken, done }.
    get samples() { return { ...status }; },
    onSamples(fn) { onStatus = fn; fn(status); },
    note,
    hold,
    chord,
    // A wrong note: a soft low buzz.
    buzz() {
      const a = audio();
      const t = a.currentTime + 0.02;
      const osc = a.createOscillator();
      const filter = a.createBiquadFilter();
      const gain = a.createGain();
      osc.type = 'square';
      osc.frequency.value = 98;
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(filter).connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.3);
    },
    // Locked door: two dull knocks.
    locked() {
      thump(0, 120, 55, 0.18, 0.5);
      noise(0, 0.08, 900, 200, 0.25);
      thump(0.11, 110, 50, 0.16, 0.35);
    },
    // Getting hit in a fight: a short, quiet feedback squeal.
    squeal() {
      const a = audio();
      const t = a.currentTime + 0.01;
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2100, t);
      osc.frequency.exponentialRampToValueAtTime(3200, t + 0.25);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.32);
      noise(0, 0.12, 3000, 800, 0.12);
    },
    // A note landing on the boss.
    hit() { thump(0, 190, 90, 0.12, 0.28); },
    // Ear defenders blocking a note.
    block() { noise(0, 0.1, 5000, 1500, 0.18); },
    // A lock springing open: two clicks and a soft thud.
    unlocked() {
      noise(0, 0.03, 6000, 3000, 0.35);
      noise(0.07, 0.03, 7000, 3500, 0.3);
      thump(0.1, 160, 70, 0.2, 0.35);
    },
    // Door swinging open.
    whoosh() {
      noise(0, 0.6, 300, 2400, 0.12);
    },
    // A key going into the circle: its perfect fifth, then its major triad.
    insert(root) {
      chord([root, root + 7], 0, 0.9, 0.5);
      chord([root, root + 4, root + 7, root + 12], 0.55, 2.4, 0.55);
    },
    // Clicking a lit key once the circle is complete.
    fifth(root) {
      chord([root, root + 7], 0, 1.1, 0.45);
    },
    // Finding a key at the end of a level: a rising arpeggio.
    keyFound(root) {
      [0, 4, 7, 12, 16].forEach((step, i) => note(root + step, i * 0.12, 1.4, 0.35));
    },
  };
})();
