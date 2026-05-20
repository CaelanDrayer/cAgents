# cAgents Skill Mode & Flag Registry

Single source of truth for all skill modes, flags, and trigger phrases. Skill
SKILL.md bodies SHOULD reference this registry rather than redefining modes inline.
This prevents documentation drift across `team/`, `run/`, `improve/`, and the
other 3 user skills.

**Last regenerated**: 2026-05-20 (v12.0.3)
**Reference pattern**: Imbad0202/academic-research-skills MODE_REGISTRY.md (Apache-2.0)

---

## /run

| Flag / Mode | Type | Description | Trigger phrases |
|-------------|------|-------------|-----------------|
| (default) | mode | Standard pipeline — orchestrator → planner → controller → validator | "run X", "fix Y", "implement Z" |
| `--mode standard` | mode | Explicit standard pipeline (same as default) | — |
| `--mode debug` | mode | Debug-focused execution with verbose logging | "debug X", "trace Y" |
| `--team` | flag | Delegate to /team for parallel multi-agent execution | "run X in parallel" |
| `--analytics` | flag | Capture execution analytics for review | "run X with metrics" |
| `--resume <session_id>` | flag | Resume an existing session at its last checkpoint | "resume run_..." |
| `--session <session_dir>` | flag | Bind to an existing session dir (used by /org and /team) | — |
| `--dry-run` | flag | Show plan/wave structure without executing | "preview the plan" |
| `--interactive` | flag | Run with interactive prompts at key gates | — |
| `--quiet` | flag | Suppress non-essential progress output | — |
| `--stream` | flag | Stream output incrementally | — |
| `--skip-preflight` | flag | Skip preflight validation (advanced) | — |
| `--template <name>` | flag | Use a named workflow template | — |
| `--domain <name>` | flag | Override domain auto-detection | — |
| `--tier <N>` | flag | Override tier classification (2/3/4) | — |
| `--confidence <N>` | flag | Set confidence threshold for routing | — |
| `--brief <path>` | flag | Consume a strategic brief (typically from /org) | — |
| `--no-goal` | flag | Disable goal-evaluator integration | — |

## /team

| Flag / Mode | Type | Description | Trigger phrases |
|-------------|------|-------------|-----------------|
| (default) | mode | N-wave parallel team execution | "team", "parallel", "multi-part" |
| `--dry-run` | flag | Display wave structure without spawning teammates | "preview team" |
| `--members <N>` | flag | Target teammate count per wave (default 5) | — |
| `--teammate-mode auto\|tmux\|in-process` | flag | Display mode for teammates | — |
| `--waves <N>` | flag | Force minimum wave count (default per tier) | "use 8 waves" |
| `--template <id>` | flag | Use a named team template (fullstack-app, etc.) | — |
| `--no-template` | flag | Force flat execution, skip template selection | — |

## /org

| Flag / Mode | Type | Description | Trigger phrases |
|-------------|------|-------------|-----------------|
| (default) | mode | C-suite hierarchy analysis + sequential /team execution per domain | "strategic X", "cross-domain Y" |
| `--dry-run` | flag | Preview routing decision without invoking subskills | "preview org routing" |
| `--quick` | flag | Skip deliberation phase, route directly | — |
| `--domains <d1,d2>` | flag | Restrict to specific domain(s) | — |
| `--resume <session_id>` | flag | Resume an existing org session | — |

## /designer

| Phase | Description |
|-------|-------------|
| Discovery | Initial requirements Q&A — what are we designing |
| Architecture | Component breakdown + interface contracts |
| Validation | Edge cases, failure modes, observability |
| Synthesis | Implementation-ready design document |

| Flag | Description |
|------|-------------|
| `--deep` | Extended Q&A with more rigorous exploration |
| `--resume <id>` | Resume an in-progress design session |
| `--template <name>` | Use a named design template |
| `--brief <path>` | Consume a brief to seed design questions |
| `--iterate <session_id>` | Iterate on a prior design session |

Interactive Q&A throughout. EXEMPT from auto-proceed per CLAUDE.md.

## /improve

| Mode | Description | When to use |
|------|-------------|-------------|
| `--mode review` | Audit + identify issues, no changes | "review code", "audit docs" |
| `--mode optimize` | Measurable optimization with baselines | "optimize bundle size", "reduce latency" |
| `--mode full` | Combined review + optimize with unified report | "improve quality of X" |

| Flag | Description |
|------|-------------|
| `--baseline <ref>` | Reference baseline for diff/comparison |
| `--suppress <pattern>` | Suppress findings matching pattern |
| `--benchmark <tool>` | Run benchmarks before/after optimization |

## /helper

| Flag | Description |
|------|-------------|
| (default) | Suggest the right skill for a stated task |
| `--troubleshoot <command>` | Diagnose skill-routing or execution issues |
| `--compare` | Compare two or more skills |
| `--flags <command>` | List all flags for the named command |
| `--examples` | Show usage examples |
| `--quick` | Brief output mode |
| `--all` | Show full catalog |
| `--topic <topic>` | Filter help by topic |

---

## How to reference this registry from a SKILL.md

In SKILL.md body, instead of redefining a mode/flag inline:

```markdown
See `.claude/skills/_MODE_REGISTRY.md § /team` for all flags this skill accepts.
```

Or for a specific flag:

```markdown
`--waves N` — see `.claude/skills/_MODE_REGISTRY.md § /team` for definition.
```

## When to update this registry

- Adding a new flag to any user-facing skill: update this file in the same commit
- Removing or renaming a flag: update + add a deprecation note in the row
- This file is enforced by `tests/v12/mode-registry-coverage.test.js` (regression test added in v12.0.3)

## Out of scope

- This registry indexes USER-FACING flags only. Internal flags consumed by agents (e.g., orchestrator → planner handoff fields) are documented in `cagents-memory/_system/config/pipeline_config.yaml`.
- Skill SKILL.md prose for behaviour-defining content (what the skill DOES) stays in each SKILL.md. This registry only catalogs the DIAL (flags/modes/phases).
