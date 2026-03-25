# Plugin Data Migration Guide

How to use `CLAUDE_PLUGIN_DATA` for persistent state that survives plugin updates.

## Overview

cAgents stores two categories of state with different lifetimes:

| Store | Location | Survives Updates? | Shared Across Projects? |
|-------|----------|-------------------|------------------------|
| **Agent_Memory/** | `<project>/Agent_Memory/` | No (git-ignored) | No (per-project) |
| **Plugin Data** | `~/.claude/plugins/data/<plugin-id>/` | **Yes** | Yes (user-wide) |

The `CLAUDE_PLUGIN_DATA` environment variable is set by Claude Code to point to the plugin's persistent data directory: `~/.claude/plugins/data/<plugin-id>/`. Data written here persists across plugin reinstalls, version upgrades, and project switches.

## What Belongs Where

### Keep in Agent_Memory/ (ephemeral, session-scoped)

- `sessions/` — All session artifacts (`plan.yaml`, `coordination_log.yaml`, etc.)
- `_communication/` — Agent-to-agent messages (per-session)
- `_archive/` — Completed session snapshots
- `_system/logs/` — Daily log files

These are inherently ephemeral. They relate to specific workflow runs and have no value once a session is complete. They are correctly git-ignored.

### Migrate to CLAUDE_PLUGIN_DATA (persistent, user-wide)

| Current Location | Migrate To | Rationale |
|-----------------|-----------|-----------|
| `Agent_Memory/_knowledge/patterns/` | `$CLAUDE_PLUGIN_DATA/knowledge/patterns/` | Controller coordination patterns improve with use |
| `Agent_Memory/_knowledge/calibration/` | `$CLAUDE_PLUGIN_DATA/knowledge/calibration/` | Model routing calibration data accumulates over time |
| `Agent_Memory/_knowledge/learnings/` | `$CLAUDE_PLUGIN_DATA/knowledge/learnings/` | Lessons from past sessions should persist |
| `Agent_Memory/_knowledge/analytics/` | `$CLAUDE_PLUGIN_DATA/knowledge/analytics/` | Usage metrics inform future decisions |
| `Agent_Memory/_system/config/` | `$CLAUDE_PLUGIN_DATA/config/` | User-customized pipeline configuration |
| `Agent_Memory/_system/evals/` | `$CLAUDE_PLUGIN_DATA/evals/` | Evaluation baselines should survive reinstalls |

## Migration Steps

### 1. Check Current State

```bash
# See what is currently in _knowledge
ls Agent_Memory/_knowledge/

# Check if plugin data dir exists
ls "${CLAUDE_PLUGIN_DATA:-~/.claude/plugins/data/cagents}/"
```

### 2. Identify the Plugin Data Path

Claude Code sets `CLAUDE_PLUGIN_DATA` automatically when the plugin is active:

```bash
echo $CLAUDE_PLUGIN_DATA
# Output: ~/.claude/plugins/data/cagents
```

If the variable is not set (e.g., running locally without plugin mode), use the fallback:

```bash
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-${HOME}/.claude/plugins/data/cagents}"
```

### 3. Run the Migration

```bash
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-${HOME}/.claude/plugins/data/cagents}"

# Create destination directories
mkdir -p "${PLUGIN_DATA}/knowledge/patterns"
mkdir -p "${PLUGIN_DATA}/knowledge/calibration"
mkdir -p "${PLUGIN_DATA}/knowledge/learnings"
mkdir -p "${PLUGIN_DATA}/knowledge/analytics"
mkdir -p "${PLUGIN_DATA}/config"
mkdir -p "${PLUGIN_DATA}/evals"

# Copy (not move) first to verify
cp -r Agent_Memory/_knowledge/patterns/   "${PLUGIN_DATA}/knowledge/patterns/"
cp -r Agent_Memory/_knowledge/calibration/ "${PLUGIN_DATA}/knowledge/calibration/"
cp -r Agent_Memory/_knowledge/learnings/   "${PLUGIN_DATA}/knowledge/learnings/"
cp -r Agent_Memory/_knowledge/analytics/   "${PLUGIN_DATA}/knowledge/analytics/"
cp -r Agent_Memory/_system/config/         "${PLUGIN_DATA}/config/"
cp -r Agent_Memory/_system/evals/          "${PLUGIN_DATA}/evals/"

echo "Migration complete. Verify then remove Agent_Memory/_knowledge/ copies."
```

### 4. Update Hook References

Hooks that read from `_knowledge/` or `_system/config/` must be updated to check `CLAUDE_PLUGIN_DATA` first:

```javascript
// In hook-utils.cjs or individual hooks:
const PLUGIN_DATA_DIR = process.env.CLAUDE_PLUGIN_DATA
  || path.join(process.env.HOME || '~', '.claude', 'plugins', 'data', 'cagents');

// Read patterns with fallback to Agent_Memory:
function readPatterns() {
  const pluginPath = path.join(PLUGIN_DATA_DIR, 'knowledge', 'patterns');
  const legacyPath = path.join(AGENT_MEMORY_DIR, '_knowledge', 'patterns');
  const base = fs.existsSync(pluginPath) ? pluginPath : legacyPath;
  // ... read from base
}
```

### 5. Verify and Clean Up

```bash
# Spot-check migrated files
ls "${PLUGIN_DATA}/knowledge/"
cat "${PLUGIN_DATA}/config/pipeline_config.yaml"

# Once verified, remove legacy copies from Agent_Memory
# (sessions/ and logs/ stay in Agent_Memory — do NOT remove those)
rm -rf Agent_Memory/_knowledge/
```

## Using CLAUDE_PLUGIN_DATA in Hooks

### Reading Persistent Configuration

```javascript
const { createHook, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

const PLUGIN_DATA_DIR = process.env.CLAUDE_PLUGIN_DATA
  || path.join(require('os').homedir(), '.claude', 'plugins', 'data', 'cagents');

createHook('MyHook', async (input) => {
  // Read from persistent config (survives updates)
  const configPath = path.join(PLUGIN_DATA_DIR, 'config', 'my-config.yaml');
  const config = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, 'utf8')
    : null;

  // Write learnings back to persistent store
  const learningsPath = path.join(PLUGIN_DATA_DIR, 'knowledge', 'learnings', 'hook.jsonl');
  fs.appendFileSync(learningsPath, JSON.stringify({ ts: Date.now(), ...data }) + '\n');

  return null;
});
```

### Writing Calibration Data

```javascript
// After a workflow completes, persist calibration metrics
function saveCalibration(domain, tier, durationMs) {
  const calibDir = path.join(PLUGIN_DATA_DIR, 'knowledge', 'calibration');
  if (!fs.existsSync(calibDir)) fs.mkdirSync(calibDir, { recursive: true });

  const file = path.join(calibDir, `${domain}_tier${tier}.jsonl`);
  fs.appendFileSync(file, JSON.stringify({
    ts: Date.now(),
    duration_ms: durationMs,
    domain,
    tier
  }) + '\n');
}
```

## Rationale

### Why Agent_Memory/ Is Not Enough

`Agent_Memory/` is git-ignored and project-local. When you:
- Update the cAgents plugin to a new version
- Clone the project to a new machine
- Run cAgents on a different project

...all learned patterns, calibration data, and evaluation baselines are lost. This defeats the purpose of having a learning system.

### Why Not Just Commit _knowledge/?

`_knowledge/` contains user-specific runtime data — it is not part of the plugin source. Committing it would pollute the repository with per-user learning state and cause merge conflicts in team settings.

### Why CLAUDE_PLUGIN_DATA Is the Right Answer

- Scoped to the user (not the repo): no git conflicts
- Persists across project switches: patterns learned on Project A apply to Project B
- Survives plugin reinstalls and updates: no learning regression on upgrade
- Controlled location: users can back it up or reset it intentionally

## Boundary Summary

```
PLUGIN SOURCE (git)           PLUGIN DATA (~/.claude/plugins/data/)   AGENT_MEMORY/ (ephemeral)
─────────────────────         ────────────────────────────────────     ─────────────────────────
SKILL.md files                knowledge/patterns/                      sessions/
hook .cjs files               knowledge/calibration/                   _communication/
config YAML templates         knowledge/learnings/                     _archive/
domain overrides              knowledge/analytics/                     _system/logs/
plugin.json                   config/  (user overrides)
                              evals/   (baselines)
```

The source is versioned. The plugin data is persistent but unversioned. The agent memory is ephemeral.
