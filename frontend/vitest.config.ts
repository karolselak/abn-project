// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // setupFiles: ['./tests/setupTests.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
});