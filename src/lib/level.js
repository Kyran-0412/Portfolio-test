// The frame every level sits in: intro screen, play screen with the piano,
// the key-found screen and the phone message. A level calls Level.setup()
// with what to do when play starts, and Level.win() when it's beaten.
const Level = (() => {
  const $ = (id) => document.getElementById(id);
  let key = null;
  let testMode = false;
  let extraHearts = 0;
  let status = 'new';
  let tried = [];
  let onStart = () => {};
  let usesPiano = true;
  let finishing = false;

  document.body.insertAdjacentHTML('beforeend', `
    <section class="screen" id="phone">
      <div class="eyebrow">Hidden level</div>
      <h1>Best played on a computer</h1>
      <p>This level needs a keyboard and a bigger screen. Come back on a laptop or desktop to play.</p>
    </section>
    <section class="screen" id="intro">
      <div class="eyebrow" id="introEyebrow"></div>
      <h1 id="introTitle"></h1>
      <p id="introText"></p>
      <p id="introBeaten" hidden>You've already found this key. Play again for fun.</p>
      <div class="buttons"><button class="primary" id="startBtn">Start</button></div>
    </section>
    <section class="screen" id="play">
      <div class="focus-banner" id="focusBanner">Click here to keep playing with your keyboard</div>
      <button class="skip" id="skipBtn" hidden>Skip level (test)</button>
      <div class="preview-tools">
        <div class="sample-status" id="sampleStatus" hidden></div>
        <button class="reverb-test" id="reverbTest" hidden>Reverb: normal</button>
      </div>
      <div class="stage" id="stage"></div>
      <div id="piano"></div>
    </section>
    <section class="screen" id="found">
      <svg class="key-art" viewBox="0 0 120 240" aria-hidden="true">
        <defs>
          <linearGradient id="keyFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#C8B8FF"/><stop offset="1" stop-color="#9A7FE0"/>
          </linearGradient>
        </defs>
        <circle cx="60" cy="52" r="40" fill="none" stroke="url(#keyFill)" stroke-width="12"/>
        <text id="keyArtLabel" x="60" y="64" text-anchor="middle" fill="#C8B8FF" font-family="Oswald, sans-serif" font-weight="600" font-size="32"></text>
        <rect x="53" y="90" width="14" height="128" rx="4" fill="url(#keyFill)"/>
        <rect x="66" y="176" width="26" height="12" rx="3" fill="url(#keyFill)"/>
        <rect x="66" y="200" width="18" height="12" rx="3" fill="url(#keyFill)"/>
      </svg>
      <div class="text">
        <h1 id="foundTitle"></h1>
        <p class="lead" id="foundText"></p>
        <div class="heart-found" id="heartFound" hidden>
          <svg viewBox="-12 -12 24 20" aria-hidden="true"><path d="M0 6C-10-2-10-10-5-10C-2-10 0-8 0-6C0-8 2-10 5-10C10-10 10-2 0 6Z"/></svg>
          <span>You found a hidden heart. You’ll start every boss fight with one more.</span>
        </div>
        <div class="buttons" id="foundButtons"></div>
      </div>
    </section>`);

  const piano = Piano.create($('piano'));
  piano.setEnabled(false);

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('show', s.id === id));
    piano.setEnabled(id === 'play' && usesPiano);
  }

  function button(text, onClick, primary) {
    const b = document.createElement('button');
    b.textContent = text;
    if (primary) b.className = 'primary';
    b.onclick = onClick;
    return b;
  }

  // The game only hears the keyboard while it has focus.
  window.addEventListener('blur', () => $('focusBanner').classList.add('show'));
  window.addEventListener('focus', () => $('focusBanner').classList.remove('show'));
  $('focusBanner').onclick = () => { window.focus(); $('focusBanner').classList.remove('show'); };

  const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;

  Bridge.on('level', (message) => {
    key = message.key;
    testMode = message.testMode === true;
    extraHearts = Number(message.extraHearts) || 0;
    status = message.status === 'beaten' ? 'beaten' : 'new';
    tried = Array.isArray(message.tried) ? message.tried : [];
    if (touchOnly) return show('phone');
    $('introEyebrow').textContent = `Level ${KEYS.indexOf(key) + 1} · Key of ${keyLabel(key)}`;
    $('introTitle').textContent = KEY_INFO[key].level;
    $('introBeaten').hidden = message.status !== 'beaten';
    show('intro');
  });

  $('startBtn').onclick = () => {
    Sound.unlock();
    window.focus();
    show('play');
    // Preview only: lets you skip a level while testing the site.
    $('skipBtn').hidden = !testMode;
    $('skipBtn').onclick = () => Level.win();
    // Preview only: whether your audio samples loaded.
    if (testMode) {
      Sound.onSamples((st) => {
        if (!st.total) return;
        const el = $('sampleStatus');
        el.hidden = false;
        el.className = 'sample-status' + (st.blocked || st.broken ? ' bad' : '');
        el.textContent = !st.done ? `Samples: loading ${st.loaded} / ${st.total}…`
          : st.blocked ? `Samples: ${st.loaded} / ${st.total} loaded · ${st.blocked} blocked by the site (using the synth)`
          : st.broken ? `Samples: ${st.loaded} / ${st.total} loaded · ${st.broken} not playable (check the file type)`
          : `Samples: ${st.loaded} / ${st.total} loaded`;
      });
    }
    onStart($('stage'));
    // Preview only: hear the reverb on its own, or without it.
    if (testMode && Sound.hasReverb) { // the level has just turned its reverb on
      const modes = ['normal', 'wet', 'off'], labels = { normal: 'Reverb: normal', wet: 'Reverb: 100% wet', off: 'Reverb: off' };
      let m = 0;
      $('reverbTest').hidden = false;
      $('reverbTest').onclick = (e) => { e.currentTarget.blur(); m = (m + 1) % 3; Sound.reverbTest(modes[m]); $('reverbTest').textContent = labels[modes[m]]; };
    }
  };

  Bridge.on('levelSaved', (message) => {
    const label = keyLabel(key);
    $('keyArtLabel').textContent = label;
    const buttons = $('foundButtons');
    buttons.innerHTML = '';
    $('foundTitle').textContent = message.gotKey ? `You found the key of ${label}.`
      : message.gotHeart ? 'Hidden heart found' : 'Level complete';
    if (message.gotKey) Sound.keyFound(rootMidi(key));
    $('heartFound').hidden = !message.gotHeart;
    if (message.gotHeart) Sound.chord([rootMidi(key) + 12, rootMidi(key) + 16, rootMidi(key) + 19], 1.2, 1.6, 0.35);

    // The tutorial is the only time the player is told what to do.
    if (message.firstKey) {
      $('foundText').textContent = 'You just discovered your first key. Take it to the circle of fifths to continue.';
      buttons.append(button('Go to the circle of fifths', () => Bridge.send({ type: 'navigate', to: 'circle' }), true));
    } else {
      $('foundText').textContent = message.gotKey || message.gotHeart ? '' : 'You already have this key.';
    }
    buttons.append(button('Back', () => Bridge.send({ type: 'navigate', to: 'back' }), !message.firstKey));
    show('found');
  });

  return {
    piano,
    get key() { return key; },
    // True in Wix Preview: levels may show test shortcuts.
    get testMode() { return testMode; },
    // Hidden hearts found so far: boss fights add these to the starting hearts.
    get extraHearts() { return extraHearts; },
    // 'beaten' if this level's key is already won, otherwise 'new'.
    get status() { return status; },
    // Boss fights attempted so far, e.g. ['A', 'F#'] (unlocks practice attacks).
    get tried() { return tried; },
    // A boss fight calls this when it starts, so the attempt is remembered.
    attempted() { Bridge.send({ type: 'attempted' }); },
    back() { Bridge.send({ type: 'navigate', to: 'back' }); },
    // description: the line under the title on the intro screen.
    // piano: false hides the on-screen piano for levels that don't use it.
    setup({ description, start, piano: showPiano = true }) {
      $('introText').textContent = description;
      onStart = start;
      usesPiano = showPiano;
      $('piano').hidden = !showPiano;
      Bridge.start();
    },
    // Reveals the piano partway through a level that started without it.
    showPiano() {
      usesPiano = true;
      $('piano').hidden = false;
      piano.setEnabled(true);
    },
    // win({ heart: true }) also reports finding this level's hidden heart.
    win(options = {}) {
      if (finishing) return;
      finishing = true;
      piano.setEnabled(false);
      Bridge.send({ type: 'levelComplete', heart: options.heart === true });
    },
  };
})();
