# cAgents Skill Mode & Flag Registry

This file is the single source of truth for every skill mode, every flag, and
every trigger phrase. A SKILL.md body SHOULD reference this registry, and it
SHOULD NOT redefine a mode inline. This rule prevents documentation drift
across `team/`, `act/`, and the other 2 user skills.

**Last regenerated**: 2026-06-18, in v12.20.0. That bump added the Agent Modes
section for the consolidated catalog. It enumerated 30 moded agents across 8
archetypes. The int-docs wave-10 of team_consolidate-catalog_260617_001 added
that section.
**Reference pattern**: Imbad0202/academic-research-skills MODE_REGISTRY.md (Apache-2.0)

---

## /act

| Flag / Mode | Type | Description | Trigger phrases |
|-------------|------|-------------|-----------------|
| (default) | mode | Standard pipeline: orchestrator → planner → controller → validator | "run X", "fix Y", "implement Z" |
| `--mode standard` | mode | Explicit standard pipeline (same as default) | — |
| `--mode debug` | mode | Debug-focused execution with verbose logging | flag form only (`--mode debug`; NOT in the Step 1a first-word keyword router) |
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
| `--resume <session_id>` | flag | Resume an existing session at its last checkpoint | "resume act_..." |
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
| `--dry-run` | flag | Display wave structure without spawning subagents | "preview team" |
| `--members <N>` | flag | Target subagent count per wave (default 5) | — |
| `--teammate-mode auto\|tmux\|in-process` | flag | Display mode for teammates | — |
| `--waves <N>` | flag | Force minimum wave count (default per tier) | "use 8 waves" |
| `--template <id>` | flag | Use a named team template (fullstack-app, etc.) | — |
| `--no-template` | flag | Force flat execution, skip template selection | — |
| `--strategic` | flag | Force-enable strategic mode (Wave 0/1/2 C-suite prefix) regardless of domain count | "strategic team", "cross-domain" |
| `--no-strategic` | flag | Force-disable strategic mode regardless of domain count | "skip strategic", "no C-suite" |

## /org (REMOVED in v12.2.0 — absorbed into /team strategic mode)

REMOVED. `/team` strategic mode absorbed /org in v12.2.0. A cross-domain
strategic request now flows through `/team`. That skill auto-enables strategic
mode when `router.domain_count >= 2`. This is the migration mapping:

| Pre-v12.2.0 invocation | v12.2.0 replacement |
|------------------------|---------------------|
| `/org <request>` | `/team <request>` (strategic mode auto-enables for multi-domain) |
| `/org <request> --dry-run` | `/team <request> --dry-run` |
| `/org <request> --quick` | `/team <request> --no-strategic` (skip C-suite prefix) |
| `/org <request> --domains <d1,d2>` | `/team <request>` (router infers domains) |
| `/org --resume <session_id>` | `/team --resume <session_id>` |

See the `## /team` section above for the full catalog of flags and modes. That
catalog includes the `--strategic` override and the `--no-strategic` override.

## /designer

| Phase | Description |
|-------|-------------|
| Empathize | User needs, pain points, context, personas (10% of session) |
| Define | Problem statement, constraints, success criteria (10%) |
| Conceptualize | High-level concepts, mental models, framing; domain + scope selection (10%) |
| Ideation | 2-4 alternatives, trade-offs, approach selection (20%) |
| Refinement | Architecture, flows, data model, security, testing (30%) |
| Specification | User stories, specs, diagrams, checklists, validation. Readiness gate: ambiguity < 20% (20%) |

| Flag | Description |
|------|-------------|
| `--deep` | Extended Q&A with more rigorous exploration |
| `--resume <id>` | Resume an in-progress design session |
| `--template <name>` | Use a named design template |
| `--brief <path>` | Consume a brief to seed design questions |
| `--iterate <session_id>` | Iterate on a prior design session |

The session uses interactive Q&A throughout. It is exempt from auto-proceed, as CLAUDE.md states.

## /improve (REMOVED in v12.1.2 — folded into /act, which was then named `run`)

Removed in v12.1.2. A keyword router folded the standalone `/improve` skill
into `/act`, which carried the name `run` at that time. The three modes and three
flags are now available under `/act`:

- `/improve --mode review X` -> `/act review X` (or `/act X --mode review`)
- `/improve --mode optimize X` -> `/act optimize X` (or `/act X --mode optimize`)
- `/improve --mode full X` -> `/act improve X` (or `/act X --mode full`)
- `--baseline`, `--suppress`, `--benchmark`, `--scope`, `--auto-fix` flags
  remain valid on `/act` when an improve mode is active.

See the `## /act` section above for the full catalog of flags and modes. See
`.claude/skills/act/reference/improve-mode.md` for the keyword router
contract, and for the mode-specific behavior.

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

In a SKILL.md body, do not redefine a mode or a flag inline. Write this instead:

```markdown
See `.claude/skills/_MODE_REGISTRY.md § /team` for all flags this skill accepts.
```

For one specific flag, write this:

```markdown
`--waves N` — see `.claude/skills/_MODE_REGISTRY.md § /team` for definition.
```

## When to update this registry

- When you add a new flag to a user-facing skill, update this file in the same commit
- When you remove or rename a flag, update this file and add a deprecation note in the row
- `tests/v12/mode-registry-coverage.test.js` enforces this file. That regression test was added in v12.0.3

## Out of scope

- This registry indexes the user-facing flags only. An internal flag that an agent consumes lives in `cagents-memory/_system/config/pipeline_config.yaml`. The orchestrator-to-planner handoff fields are one example.
- The behaviour-defining prose of a skill stays in its own SKILL.md. That SKILL.md says what the skill does. This registry catalogs the DIAL only, which is the flags, the modes and the phases.

---

## Agent Modes

The agent modes enumerate the `metadata.supported_modes` of every consolidated agent in the v12.20.0 catalog. Sometimes a survivor agent absorbed an old agent. The survivor then exposes the capabilities of that old agent through `mode=<value>` in the invocation. An agent with no mode listed here is single-purpose, and it has no `mode` flag.

**How to use**: pass `mode=<value>` in the Agent invocation prompt. The planner or the controller can set `metadata.mode` instead. It derives that value from the absorbed-agent name in the routing aliases.

### Developer archetype (8 agents)

| Survivor agent | Modes (absorbed agents → mode) |
|---|---|
| `backend-developer` | `database` (dba), `engine` (engine-developer), `game` (game-programmer) |
| `frontend-developer` | `ux` (ux-designer) |
| `tech-lead` | `implement` (senior-developer), `backend-lead` (backend-lead), `frontend-lead` (frontend-lead) |
| `architect` | — (no absorbed modes) |
| `data-lead` | `analyze` (data-analyst) |
| `devops-engineer` | `coordinate` (infrastructure-lead), `profile` (performance-analyzer) |
| `security-engineer` | `coordinate` (security-lead), `owasp-audit` (security-owasp) |
| `qa-lead` | `code-review` (code-reviewer), `standards-audit` (code-standards-auditor), `a11y` (accessibility-checker), `playwright` (playwright-test-engineer) |

### Operator archetype (8 agents)

| Survivor agent | Modes (absorbed agents → mode) |
|---|---|
| `operations-manager` | `agile` (agile-coach), `project` (program-project-manager), `procurement` (procurement-specialist), `supply-chain` (supply-chain-manager), `quality-mgmt` (quality-manager). REC-26 (v12.56.0): `scribe`→technical-writer, `finance`→cfo/data-scientist |
| `marketing-strategist` | `brand` (brand-manager), `creative-direction` (creative-director), `growth` (growth-marketer), `ops` (marketing-ops-specialist), `partnership` (partnership-marketing-manager) |
| `marketing-analyst` | `seo` (seo-specialist) |
| `sales-strategist` | `rep` (sales-rep), `enablement` (sales-enablement-specialist), `revops` (revenue-operations-manager) |
| `hr-manager` | `hrbp` (hr-business-partner), `recruit` (talent-recruiter), `learning` (learning-specialist), `onboarding` (onboarding-specialist) |
| `support-director` | `agent` (support-agent), `support-ops` (support-operations-manager), `escalation` (escalation-manager), `customer-success` (customer-success-manager), `account` (account-manager), `advocacy` (customer-advocacy-manager), `relationship` (relationship-manager), `community` (community-manager) |
| `customer-success-manager` | `onboarding`, `adoption`, `retention` (native modes, no absorbed agents) |
| `technical-writer` | — (no absorbed modes) |

### Advisor archetype (4 agents)

| Survivor agent | Modes (absorbed agents → mode) |
|---|---|
| `academic-advisor` | `tutor` (academic-tutor) |
| `medical-advisor` | `mental-health` (mental-health-advisor) |
| `general-counsel` | `corporate` (corporate-counsel), `compliance` (compliance-manager), `privacy` (privacy-officer), `legal-ops` (legal-operations-manager) |
| `life-coach` | `career` (career-counselor), `finance` (personal-finance-advisor) |

### Analyst archetype (5 agents)

| Survivor agent | Modes (absorbed agents → mode) |
|---|---|
| `data-scientist` | `stats` (statistician), `forecast` (predictive-analyst), `bi` (bi-specialist), `perf-metrics` (performance-analyst) |
| `market-research-analyst` | `business-research` (business-researcher), `competitive` (competitive-intelligence-analyst), `requirements` (business-analyst) |
| `scholar` | `citation-graph` (citation-graph-analyzer), `methodology` (methodology-critic), `science-coord` (science-coordinator) |
| `social-scientist` | `history` (historian), `linguistics` (linguist), `politics` (political-analyst), `psychology` (psychologist) |
| `translator` | — (no absorbed modes) |

### Creator archetype (3 agents)

| Survivor agent | Modes (absorbed agents → mode) |
|---|---|
| `visual-artist` | `concept` (concept-artist), `photography` (photographer) |
| `composer` | `scoring`, `adaptive`, `orchestration` (absorbed music-composer; REC-27 split from film-director, v12.55.0) |

### Writer archetype (4 agents)

| Survivor agent | Modes (absorbed agents → mode) |
|---|---|
| `narrative-director` | `architecture` (story-architect), `reading-experience` (narrative-designer), `plot` (plot-developer) |
| `editor` | `copy` (copywriter) |
| `worldbuilder` | `character` (character-designer), `dialogue` (dialogue-specialist) |
| `ai-writing-editor` | `detect` (ai-writing-detector), `rewrite` (ai-writing-rewriter), `both` (default one-pass gate) |

### Strategist archetype (3 agents)

| Survivor agent | Modes (absorbed agents → mode) |
|---|---|
| `product-owner` | `roadmap` (roadmap-planner), `okr` (okr-specialist) |
| `strategic-planner` | `portfolio` (portfolio-manager), `scenario` (scenario-planner) |
| `game-designer` | `production` (game-producer) |

### Core archetype (16 agents)

| Survivor agent | Modes (absorbed agents → mode) |
|---|---|
| `task-state` | `merge` (task-merger) |
| `coordinator` | — |
| `coord-log-writer` | — |
| `executor` | — |
| `hitl` | — |
| `optimizer` | — |
| `orchestrator` | — |
| `planner` | — |
| `reviewer` | — |
| `router` | — |
| `self-correct` | — |
| `team-lead` | — |
| `team` | — |
| `trigger` | — |
| `validator` | — |
| `wave-reviewer` | — |

> The leadership archetype agents have no absorbed modes. They are ceo, cto,
> cfo, cmo, coo, chro, cco, cro and cpo. Each one is a single-purpose C-suite
> agent, and `/team` strategic mode uses it directly. The v12.20.0 bump removed
> CSO, CLO and VP-Engineering.
