// Local stand-in for Velo's $w, covering only what the game uses (testing only).
// $w('#id') on an <iframe> acts like a Wix Embed HTML element; other elements
// get show()/hide().
(() => {
  const embed = (iframe) => ({
    postMessage: (data) => iframe.contentWindow.postMessage(data, '*'),
    onMessage: (handler) => {
      window.addEventListener('message', (event) => {
        if (event.source === iframe.contentWindow) handler({ data: event.data });
      });
    },
  });
  const element = (el) => ({
    show: () => { el.hidden = false; return Promise.resolve(); },
    hide: () => { el.hidden = true; return Promise.resolve(); },
    get hidden() { return el.hidden; },
  });

  function $w(selector) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`$w: no element ${selector}`);
    return el.tagName === 'IFRAME' ? embed(el) : element(el);
  }
  $w.onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => fn());
    else fn();
  };
  window.$w = $w;
})();
