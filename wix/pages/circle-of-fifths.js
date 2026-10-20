// Page code for: Circle of Fifths (the graphic, plus doors B♭ and F)
import { setupCircle, setupDoor } from 'public/game-site.js';

$w.onReady(function () {
  setupCircle('#circle');
  setupDoor('#doorBb', 'Bb');
  setupDoor('#doorF', 'F');
});
