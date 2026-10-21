// Wix side of the game: doors, level pages, the circle page and the key icon.
// Every page's code calls one of these. The embed boxes ask; this code checks
// the rules, saves progress and answers.

import { local, session } from 'wix-storage-frontend';
import wixLocationFrontend from 'wix-location-frontend';
import wixWindowFrontend from 'wix-window-frontend';
import {
  KEYS,
  STORAGE_KEY,
  CIRCLE_PATH,
  LEVEL_PATHS,
  emptyProgress,
  parseProgress,
  isDoorOpen,
  doorState,
  completeLevel,
  placeKey,
  addHeart,
} from 'public/progress.js';

const RETURN_KEY = 'cof-return';
const changeListeners = [];

export function loadProgress() {
  return parseProgress(local.getItem(STORAGE_KEY));
}

function saveProgress(progress) {
  local.setItem(STORAGE_KEY, JSON.stringify(progress));
  refreshKeyIcon(progress);
  changeListeners.forEach((listener) => listener(progress));
}

function currentPath() {
  return '/' + wixLocationFrontend.path.join('/');
}

// Calls the handler that matches each message type from an embed box.
function listen(embed, handlers) {
  embed.onMessage((event) => {
    const message = event.data || {};
    const handler = handlers[message.type];
    if (handler) handler(message);
  });
}

// The small key in the corner (element ID "keyIcon", shown on all pages,
// hidden on load). It only appears while a key is held but not placed.
export function refreshKeyIcon(progress = loadProgress()) {
  try {
    const icon = $w('#keyIcon');
    if (progress.held.length > 0) icon.show('fade', { duration: 400 });
    else icon.hide('fade', { duration: 400 });
  } catch (err) {
    // No key icon on this page: nothing to do.
  }
}

// A door embed. Opens its level when the door is open; otherwise the embed
// rattles the door by itself.
export function setupDoor(selector, key) {
  const embed = $w(selector);
  const sendState = (progress = loadProgress()) => {
    embed.postMessage({ type: 'door', key, state: doorState(progress, key) });
  };
  changeListeners.push(sendState);

  listen(embed, {
    ready: () => sendState(),
    enter: () => {
      const progress = loadProgress();
      if (!isDoorOpen(progress, key)) return sendState(progress);
      session.setItem(RETURN_KEY, currentPath());
      wixLocationFrontend.to(LEVEL_PATHS[key]);
    },
  });
}

// A level page. Visitors who arrive too early are sent home quietly.
export function setupLevel(selector, key) {
  if (!isDoorOpen(loadProgress(), key)) {
    wixLocationFrontend.to('/');
    return;
  }
  const embed = $w(selector);

  listen(embed, {
    ready: () => {
      const beaten = doorState(loadProgress(), key) === 'done';
      // Test buttons only appear in Preview, never on the live site.
      const testMode = wixWindowFrontend.viewMode === 'Preview';
      const extraHearts = loadProgress().hearts.length; // hidden hearts found so far
      embed.postMessage({ type: 'level', key, status: beaten ? 'beaten' : 'new', testMode, extraHearts });
    },
    levelComplete: (message) => {
      const before = loadProgress();
      const withKey = completeLevel(before, key);
      // A level can also report finding its hidden heart.
      const after = message.heart ? addHeart(withKey, key) : withKey;
      const gotKey = withKey !== before;
      const gotHeart = after.hearts.length > withKey.hearts.length;
      if (after !== before) saveProgress(after);
      embed.postMessage({ type: 'levelSaved', key, gotKey, gotHeart, firstKey: gotKey && key === KEYS[0] });
    },
    navigate: (message) => {
      if (message.to === 'circle') wixLocationFrontend.to(CIRCLE_PATH);
      else wixLocationFrontend.to(session.getItem(RETURN_KEY) || '/');
    },
  });
}

// The circle of fifths graphic.
export function setupCircle(selector) {
  const embed = $w(selector);
  const send = (extra = {}) => {
    embed.postMessage({ type: 'progress', progress: loadProgress(), ...extra });
  };

  listen(embed, {
    ready: () => send(),
    placeKey: (message) => {
      const before = loadProgress();
      const after = placeKey(before, message.key);
      if (after === before) return send();
      saveProgress(after);
      send({ justPlaced: message.key });
    },
    reset: () => {
      saveProgress(emptyProgress());
      send();
    },
  });
}
