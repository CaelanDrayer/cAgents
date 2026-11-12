# Testing Overview

## Test Infrastructure

cAgents uses [Vitest](https://vitest.dev/) for testing. 2408+ tests across 288+ test files (288 test files on disk) covering hooks and configuration validation.

## Test Categories

### Hook Tests (8 files, 121 tests)
| File | Tests | Coverage |
|------|-------|----------|
| hook-utils.test.js | ~38 | Shared utilities, error format |
| secret-detection.test.js | 24 | Secrets, protected paths, false positives |
| tool-failure-tracker.test.js | 12 | Failure tracking, alternatives |
| post-write-validator.test.js | 12 | JSON/YAML validation |
| verify-completion.test.js | 14 | Completion criteria |
| session-catchup.test.js | 10 | Session initialization |
| subagent-tracker.test.js | 8 | Agent spawn tracking |
| notification.test.js | 6 | Notification logging |

The narrow Bash guard, `bash-validator.cjs`, has its own tests in `tests/hooks/bash-validator.test.js` and `tests/hooks/bash-validator-fp-corpus.test.js`. The table above does not count them. The guard denies a critical or high secret literal in the command text. It also denies a write, a delete, a move, or a mode or owner change on a protected path. It fails open.

### Config Tests (3 files, 120 tests)
| File | Tests | Coverage |
|------|-------|----------|
| pipeline-config.test.js | 14 | States, paths, revision routing |
| planner-config.test.js | ~60 | Domain overrides, controller catalogs |
| plugin-json.test.js | ~46 | Plugin manifests, agent paths |

## Running Tests

```bash
npm test                    # All tests
npm run test:hooks          # Hook tests only
npm run test:config         # Config tests only
npm run test:watch          # Watch mode
```

## CI Integration

Tests run as part of the CI pipeline:
```bash
bash scripts/ci/cagents-ci.sh test    # Tests only
bash scripts/ci/cagents-ci.sh all     # All checks including tests
```
