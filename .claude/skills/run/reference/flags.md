# /run Command Flags Reference

## Flag Parsing Logic

Parse command arguments before delegation:

```javascript
function parseCommandFlags(commandString) {
  const flags = {
    request: commandString.split('--')[0].trim(),
    interactive: commandString.includes('--interactive'),
    dryRun: commandString.includes('--dry-run'),
    quiet: commandString.includes('--quiet') || commandString.includes('-q'),
    stream: commandString.includes('--stream'),
    skipPreflight: commandString.includes('--skip-preflight'),
    team: commandString.includes('--team'),
    template: extractFlagValue(commandString, '--template'),
    domain: extractFlagValue(commandString, '--domain'),
    tier: extractFlagValue(commandString, '--tier'),
    confidence: extractFlagValue(commandString, '--confidence') || '0.7'
  };
  return flags;
}
```

## Complete Flag Table

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--interactive` | Boolean | Enable interactive mode - ask user preferences before starting | false | `/run Fix bug --interactive` |
| `--dry-run` | Boolean | Preview workflow without executing - shows plan and stops | false | `/run Add feature --dry-run` |
| `--quiet`, `-q` | Boolean | Skip plan display, proceed directly to execution | false | `/run Fix bug --quiet` |
| `--stream` | Boolean | Real-time progress updates during execution | false | `/run Deploy app --stream` |
| `--skip-preflight` | Boolean | Skip pre-flight validation (not recommended) | false | `/run Hotfix --skip-preflight` |
| `--template <name>` | String | Use specific workflow template | auto-match | `/run Budget --template budget_creation` |
| `--domain <domain>` | String | Override domain detection | auto-detect | `/run Analyze --domain engineering` |
| `--tier <N>` | Number | Override tier classification (2-4) | auto-classify | `/run Migrate --tier 4` |
| `--confidence <N>` | Number | Set detection confidence threshold | 0.7 | `/run Request --confidence 0.6` |
| `--team` | Boolean | Use parallel team execution via Agent Teams | false | `/run Build feature --team` |
| `--resume <id>` | String | Resume an interrupted workflow session | none | `/run --resume run_20260207_143022` |
| `--session <dir>` | String | Pre-enriched session directory (used by /team teammates) | none | `/run Implement feature --session cagents-memory/sessions/team_xyz_260512_001` |
| `--brief <path>` | String | Strategic brief (path to brief YAML; produced by /team strategic mode in v12.2.0+ or by pre-v12.2.0 /org) | none | `/run Launch product --brief cagents-memory/sessions/team_xyz/outputs/strategic_brief.yaml` |
| `--analytics` | Boolean | Display pipeline analytics dashboard and exit | false | `/run --analytics` |
| `--analytics domain` | String | Show per-domain analytics breakdown | none | `/run --analytics domain` |
| `--mode <value>` | String | Pipeline execution mode (V10.26.11+, expanded v12.1.2). Accepts `standard` (default), `debug`, `review`, `optimize`, or `full`. `debug` enables the 4-phase debugging methodology on controllers and validator; `review`/`optimize`/`full` are the absorbed `/improve` modes (also reachable via the Step 1a first-word keyword router `improve`/`review`/`audit`/`optimize`). Unknown values are rejected. | standard | `/run Reproduce flaky test --mode debug` |
| `--no-goal` | Boolean | Opt out of the V11.3.0 `/goal` auto-anchor in Step 1. By default `/run` derives a `/goal` condition referencing `completion_summary.yaml` and clean TaskList state, with a turn cap. Use `--no-goal` to skip this (useful for `/designer` flows, scripted runs with their own continuation logic, or when an active `/goal` is already set). Also opt out by setting `CAGENTS_NO_GOAL=1` in the environment. | false | `/run Fix typo --no-goal` |
| `--baseline <ref>` | String | (improve modes) Reference baseline for diff/comparison during `review`/`optimize`/`full`. | none | `/run optimize bundle.js --baseline main` |
| `--suppress <pattern>` | String | (improve modes) Suppress review findings matching a pattern. | none | `/run review src/ --suppress "TODO"` |
| `--benchmark <tool>` | String | (improve modes) Run benchmarks before/after an optimization run. | none | `/run optimize api --benchmark wrk` |
| `--scope <path>` | String | (improve modes) Restrict improve operations to a path subset. | none | `/run improve . --scope src/auth/` |
| `--auto-fix` | Boolean | (improve modes) Apply atomic auto-fixes during `review` mode. | false | `/run review src/ --auto-fix` |

## Plan Display Behavior

By default, `/run` shows the workflow plan after planning completes (for tier 2+ workflows):
- Use `--quiet` to skip this display (silent execution)
- Use `--dry-run` to see the plan and STOP (without executing)

## Available Templates (12)

| Template | Tier | Domain | Use Case |
|----------|------|--------|----------|
| `bug_fix` | 2 | engineering | Bug fix workflow |
| `feature_addition` | 3 | engineering + product | Feature addition |
| `code_refactor` | 3 | engineering | Code refactoring |
| `architecture_migration` | 4 | engineering + HITL | Major migration |
| `content_creation` | 2 | creative/growth | Content creation |
| `story_development` | 3 | creative | Story development |
| `campaign_planning` | 3 | growth | Marketing campaign |
| `sales_forecast` | 2 | growth/business | Sales forecasting |
| `analysis_request` | 2 | universal | General analysis |
| `budget_creation` | 3 | business | Budget creation |
| `question_answer` | 2 | universal | Q&A |
| `documentation_creation` | 2 | universal/engineering | Documentation |

## Usage Examples

### Basic
```bash
/run Fix the authentication bug
/run Write a novel about space pirates
/run Create Q4 sales forecast
```

### Enhanced
```bash
/run Fix authentication bug --interactive          # Ask preferences first
/run Implement OAuth2 system --dry-run             # Preview only
/run Create Q4 budget --template budget_creation   # Use template
/run Analyze user behavior --domain engineering    # Force domain
/run Refactor authentication module --tier 3       # Force tier
/run Add payment gateway --interactive --stream    # Combined flags
/run Build user dashboard --team                   # Parallel team execution
/run --analytics                                   # Show pipeline analytics dashboard
/run --analytics domain                            # Per-domain analytics breakdown
```
