// 全局 mock localStorage（store.js 依赖）
const _storage = new Map();
globalThis.localStorage = {
  getItem: (key) => _storage.get(key) ?? null,
  setItem: (key, value) => _storage.set(key, String(value)),
  removeItem: (key) => _storage.delete(key),
  clear: () => _storage.clear(),
  key: (index) => [..._storage.keys()][index] ?? null,
  get length() { return _storage.size; },
};
