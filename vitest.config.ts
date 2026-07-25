import { defineConfig } from 'vitest/config';

// Engine and replay tests run in a plain Node environment — no DOM, no UI.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
