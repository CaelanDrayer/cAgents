import { defineConfig } from 'vitest/config';

// Reporter selection (v12.78.0, ITEM-5): an explicit CAGENTS_TEST_REPORTER wins;
// under Claude Code (CLAUDECODE=1) use 'dot' to keep agent context small; humans
// and CI keep 'default'. With 'dot', the reporter still prints the full details of a failure.
const reporters = process.env.CAGENTS_TEST_REPORTER
  ? [process.env.CAGENTS_TEST_REPORTER]
  : process.env.CLAUDECODE === '1'
    ? ['dot']
    : ['default'];

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'archive', 'example', 'vendor_repos', '_archive/**', '**/_archive/**'],
    testTimeout: 10000,
    // Remove developer opt-out env vars that would change hook behavior under test.
    setupFiles: ['tests/setup/clean-env.js'],
    reporters,
    coverage: {
      provider: 'v8',
      include: ['.claude/hooks/*.cjs'],
      exclude: ['node_modules', 'tests/fixtures'],
    },
  },
});
