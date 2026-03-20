import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'archive', 'example', 'vendor_repos'],
    testTimeout: 10000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['.claude/hooks/*.cjs'],
      exclude: ['node_modules', 'tests/fixtures'],
    },
  },
});
