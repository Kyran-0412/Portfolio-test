// Local stand-in for Wix's 'wix-location-frontend' (testing only).
// Site paths like '/level-c' map to dev/sim.html?page=level-c.
const page = new URLSearchParams(location.search).get('page') || 'home';

export default {
  get path() { return page === 'home' ? [] : [page]; },
  get url() { return location.href; },
  to(path) {
    const target = path.replace(/^\//, '') || 'home';
    window.__lastNavigation = path;
    const params = new URLSearchParams(location.search);
    const keep = ['mode', 'embed'].filter((k) => params.get(k)).map((k) => `&${k}=${params.get(k)}`).join('');
    location.href = `sim.html?page=${encodeURIComponent(target)}${keep}`;
  },
};
