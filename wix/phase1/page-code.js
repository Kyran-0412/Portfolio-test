// Phase 1 test: page code for the test page on the Wix site.
// Paste this into the page's code panel (Dev Mode). It needs an Embed HTML
// element with the ID "gameEmbed" and the file public/progress.js.

import { local } from 'wix-storage-frontend';
import {
  STORAGE_KEY,
  emptyProgress,
  parseProgress,
  completeLevel,
  placeKey,
} from 'public/progress.js';

function loadProgress() {
  return parseProgress(local.getItem(STORAGE_KEY));
}

function saveProgress(progress) {
  local.setItem(STORAGE_KEY, JSON.stringify(progress));
}

$w.onReady(function () {
  const game = $w('#gameEmbed');

  const sendProgress = () => {
    game.postMessage({ type: 'progress', progress: loadProgress() });
  };

  // The game asks for things; the page decides and saves, then replies with
  // the current progress. Storage inside the embed box may not stick.
  game.onMessage((event) => {
    const message = event.data || {};
    let progress = loadProgress();

    switch (message.type) {
      case 'ready':
        break;
      case 'levelComplete':
        progress = completeLevel(progress, message.key);
        saveProgress(progress);
        break;
      case 'placeKey':
        progress = placeKey(progress, message.key);
        saveProgress(progress);
        break;
      case 'reset':
        saveProgress(emptyProgress());
        break;
      default:
        return;
    }
    sendProgress();
  });
});
