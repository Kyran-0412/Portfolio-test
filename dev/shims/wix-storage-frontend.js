// Local stand-in for Wix's 'wix-storage-frontend' module (testing only).
const wrap = (store) => ({
  getItem: (key) => store.getItem(key),
  setItem: (key, value) => store.setItem(key, value),
  removeItem: (key) => store.removeItem(key),
  clear: () => store.clear(),
});
export const local = wrap(localStorage);
export const session = wrap(sessionStorage);
