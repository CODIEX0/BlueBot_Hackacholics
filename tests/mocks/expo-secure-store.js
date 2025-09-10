// Jest mock for expo-secure-store (CommonJS) to avoid ESM parsing issues
const store = new Map();

module.exports = {
  getItemAsync: jest.fn(async (key) => store.has(key) ? store.get(key) : null),
  setItemAsync: jest.fn(async (key, value) => {
    store.set(key, value);
    return undefined;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    store.delete(key);
    return undefined;
  }),
};
