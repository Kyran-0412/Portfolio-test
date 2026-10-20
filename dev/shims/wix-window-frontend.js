// Local stand-in for Wix's 'wix-window-frontend' (testing only).
// Acts like Wix Preview unless the address has &mode=site.
const site = new URLSearchParams(location.search).get('mode') === 'site';
export default { viewMode: site ? 'Site' : 'Preview', formFactor: 'Desktop' };
