import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/release/**', '**/e2e/**'],
  },
});
