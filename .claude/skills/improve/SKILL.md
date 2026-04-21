---
name: improve
description: "Unified quality improvement engine combining /review auditing and /optimize measurable improvement. Use for auditing code, documentation, content, infrastructure, or performance. TRIGGER: improve, review, audit, optimize. Mode selection via --mode review|optimize|full. NOT for: new implementation (/run) or design exploration (/designer)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "10.26.21"
  argument-hint: "[target] [--mode review|optimize|full] [flags]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TodoWrite
---

# /improve — Unified Review + Optimize Engine (Preview)

**Status**: Preview in V10.26.19. Mode handlers land across V10.26.20–V10.26.26.
Until V10.26.23 lands the review-mode SCOPING+MEASURING implementation, this
skill is inert and prints a "handler not yet implemented" notice.

`/improve` consolidates the `/review` and `/optimize` skills into a single
7-state state machine. The cut-over lands in V10.26.26 (`/review` becomes a
shim → `/improve --mode review`). The `/optimize` shim follows in Cluster 5.

## Coming Soon

| Version | Delivery |
|---------|----------|
| V10.26.19 | Skeleton SKILL.md + helper catalog slot (this patch) |
| V10.26.20 | Register in `.claude-plugin/plugin.json` description |
| V10.26.21 | `--mode` flag parser (review/optimize/full, no-op handlers) |
| V10.26.22 | 7-state unified machine documented (SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING → VALIDATING → REPORTING) |
| V10.26.23 | `--mode review` SCOPING + MEASURING with baseline migration |
| V10.26.24 | `--mode review` DETECTING + PLANNING (3 parallel specialist groups) |
| V10.26.25 | `--mode review` EXECUTING + VALIDATING + REPORTING (feature complete) |
| V10.26.26 | `/review` → shim over `/improve --mode review` |

## Argument Handling (V10.26.21)

Parse `$ARGUMENTS` as a whitespace-separated token list. Extract the first
`--mode <value>` pair and validate it against the accepted set:

| Mode | Accepted value | V10.26.21 behavior |
|------|----------------|--------------------|
| review | `--mode review` | Accepted. Handler lands V10.26.23–25. |
| optimize | `--mode optimize` | Accepted. Handler lands in Cluster 5. |
| full | `--mode full` | Accepted. Handler lands after Cluster 5. |
| default (no flag) | — | Accepted. Defaults to `review`. |
| unknown | anything else | Rejected with usage message below. |

### Rejection message for unknown modes

```
/improve: unknown --mode value "{value}". Accepted: review, optimize, full.
         Default: review. See .claude/skills/improve/reference/flags.md.
```

Exit cleanly after printing. Do NOT spawn agents, create sessions, or write any
files. V10.26.21 is a parser-only patch.

### V10.26.21 handler stub

After successful parsing, print:

```
/improve: mode={mode}; handler not yet implemented in V10.26.21.
          SCOPING + MEASURING land in V10.26.23.
```

And exit. See [`reference/flags.md`](reference/flags.md) for the flag catalog
structure that downstream patches will flesh out.

## State Machine (Preview)

The 7-state unified pipeline will be documented in V10.26.22. Detail lives in
[`reference/state-machine.md`](reference/state-machine.md).

## Cross-Session Baseline Location

Baselines persist at `Agent_Memory/_projects/{hash}/improve/baseline.yaml`.
During the migration window (V10.26.23+), `/improve --mode review` falls back
to reading `Agent_Memory/_projects/{hash}/review/baseline.yaml` if the new
location is absent and copies the legacy file forward on first read.

## See Also

- `/review` — legacy review skill (becomes shim in V10.26.26)
- `/optimize` — legacy optimize skill (becomes shim in Cluster 5)
- `/run` — canonical workflow engine
- `Agent_Memory/sessions/team_consolidation-tiny-bumps_260421_001/outputs/cluster_4_roadmap.md` — full patch schedule
