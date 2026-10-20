// Site code (masterPage.js): runs on every page.
// Shows the small key icon only while a key is held but not yet placed.
import { refreshKeyIcon } from 'public/game-site.js';

$w.onReady(function () {
  refreshKeyIcon();
});
