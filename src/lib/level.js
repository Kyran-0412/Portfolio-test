// The frame every level sits in: intro screen, play screen with the piano,
// the key-found screen and the phone message. A level calls Level.setup()
// with what to do when play starts, and Level.win() when it's beaten.
const Level = (() => {
  const $ = (id) => document.getElementById(id);
  let key = null;
  let testMode = false;
  let onStart = () => {};
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
        <div class="buttons" id="foundButtons"></div>
      </div>
    </section>`);

  const piano = Piano.create($('piano'));
  piano.setEnabled(false);

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('show', s.id === id));
    piano.setEnabled(id === 'play');
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
    onStart($('stage'));
  };

  Bridge.on('levelSaved', (message) => {
    const label = keyLabel(key);
    $('keyArtLabel').textContent = label;
    const buttons = $('foundButtons');
    buttons.innerHTML = '';
    $('foundTitle').textContent = message.gotKey ? `You found the key of ${label}.` : 'Level complete';
    if (message.gotKey) Sound.keyFound(rootMidi(key));

    // The tutorial is the only time the player is told what to do.
    if (message.firstKey) {
      $('foundText').textContent = 'You just discovered your first key. Take it to the circle of fifths to continue.';
      buttons.append(button('Go to the circle of fifths', () => Bridge.send({ type: 'navigate', to: 'circle' }), true));
    } else {
      $('foundText').textContent = message.gotKey ? '' : 'You already have this key.';
    }
    buttons.append(button('Back', () => Bridge.send({ type: 'navigate', to: 'back' }), !message.firstKey));
    show('found');
  });

  return {
    piano,
    get key() { return key; },
    // True in Wix Preview: levels may show test shortcuts.
    get testMode() { return testMode; },
    back() { Bridge.send({ type: 'navigate', to: 'back' }); },
    // description: the line under the title on the intro screen.
    setup({ description, start }) {
      $('introText').textContent = description;
      onStart = start;
      Bridge.start();
    },
    win() {
      if (finishing) return;
      finishing = true;
      piano.setEnabled(false);
      Bridge.send({ type: 'levelComplete' });
    },
  };
})();
