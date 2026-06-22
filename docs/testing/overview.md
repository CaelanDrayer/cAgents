# Testing Overview

## Test Infrastructure

cAgents uses [Vitest](https://vitest.dev/) for testing. 1335+ tests across 157+ test files (159 test files on disk) covering hooks and configuration validation.

## Test Categories

### Hook Tests (10 files, 145 tests)
| File | Tests | Coverage |
|------|-------|----------|
| hook-utils.test.js | ~38 | Shared utilities, error format |
| bash-validator.test.js | 14 | Blocked/warned/safe commands |
| secret-detection.test.js | 24 | Secrets, protected paths, false positives |
| tool-failure-tracker.test.js | 12 | Failure tracking, alternatives |
| post-write-validator.test.js | 12 | JSON/YAML validation |
| verify-completion.test.js | 14 | Completion criteria |
| session-catchup.test.js | 10 | Session initialization |
| permission-handler.test.js | 10 | Auto-approve patterns |
| subagent-tracker.test.js | 8 | Agent spawn tracking |
| notification.test.js | 6 | Notification logging |

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
