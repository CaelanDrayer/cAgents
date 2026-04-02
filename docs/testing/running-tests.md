# Running Tests

## Prerequisites

```bash
npm install    # Install vitest
```

## Commands

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:hooks          # Hook tests only
npm run test:config         # Config tests only

# Watch mode (re-runs on file changes)
npm run test:watch

# Verbose output
npx vitest run --config tests/vitest.config.js --reporter=verbose

# Single test file
npx vitest run --config tests/vitest.config.js tests/hooks/bash-validator.test.js
```

## Configuration

Test config: `tests/vitest.config.js`
```javascript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'archive', 'example'],
    testTimeout: 10000,
  },
});
```

## Writing New Tests

### Hook Tests

Hook tests execute hooks as subprocesses and verify JSON output:

```javascript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'my-hook.cjs');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('my-hook.cjs', () => {
  it('should return continue:true for safe input', () => {
    const result = runHook({ tool_name: 'Read' });
    expect(result.continue).toBe(true);
  });
});
```

### Config Tests

Config tests validate YAML and JSON files on disk:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('domain_overrides.yaml', () => {
  it('should exist for engineering', () => {
    const path = join(process.cwd(), 'engineering', 'config', 'domain_overrides.yaml');
    expect(existsSync(path)).toBe(true);
  });

  it('should declare controller_catalog', () => {
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('controller_catalog:');
  });
});
```

## CI Validation

Additional validation scripts beyond [Vitest](https://vitest.dev/):

```bash
bash scripts/ci/validate-agents.sh          # Agent schema validation
bash scripts/ci/validate-versions.sh        # Version consistency
bash scripts/ci/check-quality.sh            # Full quality gates
bash scripts/ci/cagents-ci.sh all           # All checks
```
