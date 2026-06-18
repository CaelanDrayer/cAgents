# cAgents Skill Mode & Flag Registry

Single source of truth for all skill modes, flags, and trigger phrases. Skill
SKILL.md bodies SHOULD reference this registry rather than redefining modes inline.
This prevents documentation drift across `team/`, `run/`, and the
other 3 user skills.

**Last regenerated**: 2026-05-23 (v12.9.0 — verified tables against the 4 SKILL.md bodies; no flag drift, stamp refreshed by run_big-cleanup-fix_260524_001)
**Reference pattern**: Imbad0202/academic-research-skills MODE_REGISTRY.md (Apache-2.0)

---

## /run

| Flag / Mode | Type | Description | Trigger phrases |
|-------------|------|-------------|-----------------|
| (default) | mode | Standard pipeline — orchestrator → planner → controller → validator | "run X", "fix Y", "implement Z" |
| `--mode standard` | mode | Explicit standard pipeline (same as default) | — |
| `--mode debug` | mode | Debug-focused execution with verbose logging | "debug X", "trace Y" |
| `--mode review` | mode | Audit + identify issues, no changes (v12.1.2: from absorbed /improve) | "review code", "audit docs" |
| `--mode optimize` | mode | Measurable optimization with baselines (v12.1.2: from absorbed /improve) | "optimize bundle size", "reduce latency" |
| `--mode full` | mode | Combined review + optimize with unified report (v12.1.2: from absorbed /improve) | "improve quality of X" |
| Keyword router (first word) | mode | `improve`/`review`/`audit`/`optimize` as first token auto-sets mode | "review src/auth/", "optimize bundle.js" |
| `--baseline <ref>` | flag | Reference baseline for diff/comparison (improve modes) | — |
| `--suppress <pattern>` | flag | Suppress findings matching pattern (improve modes) | — |
| `--benchmark <tool>` | flag | Run benchmarks before/after optimization (improve modes) | — |
| `--scope <path>` | flag | Restrict improve operations to a path subset | — |
| `--auto-fix` | flag | Apply atomic auto-fix during review mode | — |
| `--team` | flag | Delegate to /team for parallel multi-agent execution | "run X in parallel" |
| `--analytics` | flag | Capture execution analytics for review | "run X with metrics" |
| `--resume <session_id>` | flag | Resume an existing session at its last checkpoint | "resume run_..." |
| `--session <session_dir>` | flag | Bind to an existing session dir (used by /team; historically by /org, removed in v12.2.0 and absorbed into /team strategic mode) | — |
| `--dry-run` | flag | Show plan/wave structure without executing | "preview the plan" |
| `--interactive` | flag | Run with interactive prompts at key gates | — |
| `--quiet` | flag | Suppress non-essential progress output | — |
| `--stream` | flag | Stream output incrementally | — |
| `--skip-preflight` | flag | Skip preflight validation (advanced) | — |
| `--template <name>` | flag | Use a named workflow template | — |
| `--domain <name>` | flag | Override domain auto-detection | — |
| `--tier <N>` | flag | Override tier classification (2/3/4) | — |
| `--confidence <N>` | flag | Set confidence threshold for routing | — |
| `--brief <path>` | flag | Consume a strategic brief (typically from /team strategic mode; historically from /org, removed in v12.2.0) | — |
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
| `--strategic` | flag | Force-enable strategic mode (Wave 0/1/2 C-suite prefix) regardless of domain count | "strategic team", "cross-domain" |
| `--no-strategic` | flag | Force-disable strategic mode regardless of domain count | "skip strategic", "no C-suite" |

## /org (REMOVED in v12.2.0 — absorbed into /team strategic mode)

REMOVED. /org was absorbed into `/team` strategic mode in v12.2.0. Cross-domain
strategic requests now flow through `/team`, which auto-enables strategic mode
when `router.domain_count >= 2`. Migration mapping:

| Pre-v12.2.0 invocation | v12.2.0 replacement |
|------------------------|---------------------|
| `/org <request>` | `/team <request>` (strategic mode auto-enables for multi-domain) |
| `/org <request> --dry-run` | `/team <request> --dry-run` |
| `/org <request> --quick` | `/team <request> --no-strategic` (skip C-suite prefix) |
| `/org <request> --domains <d1,d2>` | `/team <request>` (router infers domains) |
| `/org --resume <session_id>` | `/team --resume <session_id>` |

See `## /team` section above for the full flag/mode catalog including
`--strategic` / `--no-strategic` overrides.

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

## /improve (REMOVED in v12.1.2 — folded into /run)

Removed in v12.1.2. The standalone `/improve` skill was folded into `/run`
via a keyword router. The three modes and three flags are now available
under `/run`:

- `/improve --mode review X` -> `/run review X` (or `/run X --mode review`)
- `/improve --mode optimize X` -> `/run optimize X` (or `/run X --mode optimize`)
- `/improve --mode full X` -> `/run improve X` (or `/run X --mode full`)
- `--baseline`, `--suppress`, `--benchmark`, `--scope`, `--auto-fix` flags
  remain valid on `/run` when an improve mode is active.

See `## /run` section above for the full flag/mode catalog. See
`.claude/skills/run/reference/improve-mode.md` for the keyword router
contract and mode-specific behavior.

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
