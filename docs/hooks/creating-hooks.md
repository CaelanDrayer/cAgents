# Creating Hooks

## Using createHook() Factory

```javascript
const { createHook } = require('./hook-utils.cjs');

createHook('MyHook', async (input) => {
  // input = parsed JSON from stdin

  // Return null for pass-through
  if (!relevant) return null;

  // Return deny for PreToolUse blocks
  return { deny: true, reason: 'Blocked because ...' };

  // Return allow for PreToolUse approvals
  return { allow: true, reason: 'Safe operation' };

  // Return system message
  return { continue: true, systemMessage: 'Info for model' };

  // Return block for Stop hooks
  return { decision: 'block', reason: 'Not complete yet' };
});
```

## Structured Error Format

Use `formatError()`, `denyWithReason()`, `warnWithReason()` from hook-utils.cjs:

```javascript
const { createHook, denyWithReason, warnWithReason } = require('./hook-utils.cjs');

createHook('MyHook', async (input) => {
  if (dangerous) {
    return denyWithReason({
      what: 'Dangerous command detected',
      why: 'rm -rf / would destroy the system',
      fix: 'Use a targeted path instead',
      hook: 'MyHook'
    });
  }

  if (risky) {
    return warnWithReason({
      what: 'Potentially risky operation',
      why: 'Force push could overwrite remote changes',
      fix: 'Use --force-with-lease instead',
      hook: 'MyHook'
    });
  }

  return null; // Pass through
});
```

## Registration

Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'R=\"${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}\"; node \"$R/.claude/hooks/run-hook.cjs\" my-hook'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

## Available Utilities (hook-utils.cjs)

| Function | Purpose |
|----------|---------|
| `createHook(name, handler)` | Factory with boilerplate |
| `readStdin()` | Parse JSON from stdin |
| `safeRead(path)` | Read file, return null on error |
| `extractYamlValue(content, key)` | Extract YAML key-value |
| `countPattern(content, regex)` | Count regex matches |
| `findActiveSession(hint?)` | Find active session directory |
| `findTeamSession(input)` | Find active team session |
| `ensureDir(path)` | Create directory recursively |
| `getTimestampSlug(date?)` | Filesystem-safe timestamp |
| `assignGrade(score, thresholds?)` | Grade from score |
| `calculateScore(breakdown)` | Sum breakdown values |
| `formatError(opts)` | Structured error message |
| `denyWithReason(opts)` | Deny with What/Why/Fix |
| `warnWithReason(opts)` | Warn with What/Why/Fix |

## Best Practices

1. Use `createHook()` -- eliminates boilerplate
2. Keep hooks under 5 seconds
3. Use `console.error()` for logs (stderr)
4. Make hooks idempotent
5. No external dependencies (built-in Node.js only)
6. Store state in cagents-memory, not memory
