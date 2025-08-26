/**
 * Simple Jest Test Setup for BlueBot
 */

// Mock fetch for Node.js environment
(global as any).fetch = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  });
