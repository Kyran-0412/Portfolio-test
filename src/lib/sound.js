// Sound engine. Plays your samples when SAMPLES lists them, otherwise a soft
// built-in synth. Samples only need one note every few semitones: the nearest
// one is pitched to fill the gaps.
const Sound = (() => {
  // MIDI note number → sample link, e.g. { 60: 'https://static.wixstatic.com/mp3/...' }
  const SAMPLES = {};

  let ctx = null;
  let out = null;
  const buffers = {};

  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      out = ctx.createDynamicsCompressor();
      out.connect(ctx.destination);
      loadSamples();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  async function loadSamples() {
    for (const [midi, url] of Object.entries(SAMPLES)) {
      try {
        const data = await (await fetch(url)).arrayBuffer();
        buffers[midi] = await ctx.decodeAudioData(data);
      } catch (err) {
        // A missing sample falls back to the synth.
      }
    }
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
  function voice(midi, t, volume) {
    const a = audio();
    const gain = a.createGain();
    gain.connect(out);
    const sources = [];

    const sample = nearestSample(midi);
    if (sample !== null) {
      const src = a.createBufferSource();
      src.buffer = buffers[sample];
      src.playbackRate.value = Math.pow(2, (midi - sample) / 12);
      gain.gain.setValueAtTime(volume, t);
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

  return {
    unlock: audio,
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
