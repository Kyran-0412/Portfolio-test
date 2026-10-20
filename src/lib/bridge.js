// Talks to the Wix page code around this embed box.
// Keeps saying "ready" until the page answers, in case the page code
// starts listening after the box loads.
const Bridge = (() => {
  const handlers = {};
  const standalone = window.parent === window;
  let answered = false;

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || typeof message.type !== 'string' || message.type === 'ready') return;
    answered = true;
    if (handlers[message.type]) handlers[message.type](message);
  });

  function send(message) {
    if (!standalone) window.parent.postMessage(message, '*');
  }

  function start() {
    if (standalone) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (answered || ++tries > 40) clearInterval(timer);
      else send({ type: 'ready' });
    }, 400);
    send({ type: 'ready' });
  }

  return { on: (type, fn) => { handlers[type] = fn; }, send, start, standalone };
})();
