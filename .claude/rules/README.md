---
paths:
  - ".claude/rules/**"
---

# cAgents Modular Rules

Topic-specific rules organized for better maintainability. Counts in this index are derived from disk at edit time:

- **Rule files**: 43 (`find .claude/rules -name '*.md' -type f | wc -l`)
- **Hook event types**: 18 (`jq -r '.hooks | keys | length' .claude/settings.json`)
- **Version-registry slots**: 16 (post-v12.2.0; was 17 in v12.1.x, was 18 in V11.0)
- **Example store** (`docs/example-store/`): a distinct set of curated few-shot exemplars (`ex-*.md` + `README.md` + `_index.yaml`) — NOT rule files. **Relocated out of `.claude/rules/` to `docs/example-store/` in v12.57.0 (REC-34)** so it no longer auto-loads into every agent's context (it was ~21K tokens on every spawn); the planner still consumes `docs/example-store/_index.yaml` by explicit path, and agent SKILLs `@`-reference the bodies on demand. Because the store now lives under `docs/` (outside the rules tree), the "Rule files" count above needs no examples exclusion.

When rule files are added, removed, or renamed, re-derive these numbers and update this header. The `scripts/ci/validate-counts.sh` CI guard verifies the load-bearing counts elsewhere in the repo (CLAUDE.md, hooks.md, settings.json, version-registry.md, docs/agents/index.md, docs/12-FACTOR-COMPLIANCE.md); this README is not in its check matrix but should still stay aligned with disk reality.

## Directory Structure

```
.claude/rules/
├── core/           # Core architecture patterns
│   ├── controllers.md             # Question-based delegation patterns
│   ├── controller-reference.md    # Detailed controller schemas and protocols
│   ├── delegation.md              # Aggressive-delegation rules
│   ├── execution.md               # Execution agent patterns
│   ├── hooks.md                   # Hook system documentation (18 event types)
│   ├── orchestration.md           # Workflow phases and orchestration
│   ├── orchestration-reference.md # Detailed orchestration schemas
│   ├── progressive-disclosure.md  # Three-tier loading pattern
│   ├── shared-questions.md        # Universal controller question patterns
│   ├── skill-format.md            # SKILL.md agent format spec
│   ├── subagent-alignment.md      # Agent tool alignment
│   ├── teams.md                   # Team coordination (built-in agent teams)
│   ├── version-registry.md        # Version synchronization (16 locations post-v12.2.0)
│   └── resources/
│       ├── controller-validation-checklist.md  # Pre/mid-execution controller checks
│       ├── execution-self-validation.md        # 5-check executor self-validation (v12.0.0)
│       └── hook-catalog.md                     # Detailed per-hook catalog
├── domains/        # Domain-specific guidelines (legacy routing overlay)
│   ├── engineering.md      # Engineering domain
│   ├── grow.md             # Business / growth domain
│   ├── operate.md          # Operations / finance
│   ├── people.md           # People domain (config-only — no SKILL.md agents)
│   └── serve.md            # Service domain
├── infrastructure/ # Infrastructure configuration
│   └── model-routing.md    # Model routing guidelines
├── memory/         # Memory and state management
│   ├── agent-memory.md           # cagents-memory/ structure and usage
│   └── agent-memory-reference.md # Detailed memory patterns and examples
├── playbooks/      # Extracted cross-agent guidance (referenced via @path)
│   ├── README.md
│   ├── pat-concurrent-session-hooks.md
│   ├── pat-context-budget-tiers.md
│   ├── pat-controller-coordination-protocol.md
│   ├── pat-cross-teammate-request.md
│   ├── pat-evidence-first-execution.md
│   ├── pat-feedback-loop-first-debugging.md
│   ├── pat-gate-taxonomy.md
│   ├── pat-graceful-degradation-depth1.md
│   ├── pat-minimal-solution-ladder.md
│   ├── pat-subagent-status-protocol.md
│   └── pat-two-stage-review.md
└── quality/        # Quality and completion
    ├── anti-slop.md             # Anti-AI-slop writing rules
    ├── completion.md            # Task completion protocol
    ├── cso-guidelines.md        # Claude Search Optimization
    ├── implicit-discovery.md    # Handling abstract requests
    ├── validation-framework.md  # End-to-end completion traceability
    └── resources/
        └── validation-checklist-active.md  # Active 5-check validation framework (renamed from validation-checklist-29.md in v12.16.0)
```

## Purpose

Modular rules enable:
- **Topic-specific organization**: Find rules by topic, not by scrolling
- **Focused maintenance**: Update one topic without touching others
- **Path-specific rules**: Apply rules conditionally using YAML frontmatter
- **Reduced CLAUDE.md size**: Import rules instead of inline documentation

## Usage

Rules are automatically loaded by Claude Code. Use `/memory` command to view loaded rules.

## Path-Specific Rules

Add YAML frontmatter to apply rules conditionally:

```markdown
---
paths:
  - "core/**/*.md"
  - "analyst/**/*.md"
---

# Agent Development Rules

Rules here apply only when working in agent directories.
```

## Import Syntax

Import rules into CLAUDE.md or other docs:

```markdown
See @.claude/rules/core/orchestration.md for workflow patterns.
```

## Current Rules (43 files)

### Core (16 files)

1. **core/controllers.md** — Question-based delegation patterns
2. **core/controller-reference.md** — Detailed controller schemas and protocols
3. **core/delegation.md** — Aggressive-delegation rules (`/run`, `/team`, `/designer` never do direct work)
4. **core/execution.md** — Execution agent patterns
5. **core/hooks.md** — Hook system (18 event types, 33 .cjs files, 25 unique registered hooks + 5 dispatched sub-validators)
6. **core/orchestration.md** — Workflow phases (routing → planning → coordinating → executing → validating)
7. **core/orchestration-reference.md** — Detailed orchestration schemas
8. **core/progressive-disclosure.md** — Three-tier SKILL.md loading pattern
9. **core/shared-questions.md** — Universal controller question patterns
10. **core/skill-format.md** — SKILL.md agent/skill frontmatter specification
11. **core/subagent-alignment.md** — Agent tool alignment patterns
12. **core/teams.md** — Team coordination via built-in agent teams (`/team`)
13. **core/version-registry.md** — Version synchronization (16 locations post-v12.2.0)
14. **core/resources/controller-validation-checklist.md** — Pre/mid-execution controller validation checks
15. **core/resources/execution-self-validation.md** — 5-check executor self-validation protocol (v12.0.0; reduced from 15-check)
16. **core/resources/hook-catalog.md** — Detailed per-hook catalog

### Domains (5 files — legacy routing overlay)

17. **domains/engineering.md** — Engineering guidelines
18. **domains/grow.md** — Growth (marketing / sales) guidelines
19. **domains/operate.md** — Operate (finance / operations) guidelines
20. **domains/people.md** — People (HR / culture) guidelines (config-only; no SKILL.md agents under `people/`)
21. **domains/serve.md** — Serve (support / legal) guidelines

### Infrastructure (1 file)

22. **infrastructure/model-routing.md** — Model routing guidelines and project overrides

### Memory (2 files)

23. **memory/agent-memory.md** — `cagents-memory/` structure (waypoints, three-file pattern)
24. **memory/agent-memory-reference.md** — Detailed memory patterns and examples

### Playbooks (12 files)

25. **playbooks/README.md** — Playbook conventions and prefix taxonomy
26. **playbooks/pat-concurrent-session-hooks.md** — Pattern: concurrent-session hook contract (deterministic session resolution)
27. **playbooks/pat-context-budget-tiers.md** — Pattern: advisory PEAK/GOOD/DEGRADING/POOR self-monitored context bands (proactive checkpoint before forced compaction)
28. **playbooks/pat-controller-coordination-protocol.md** — Pattern: canonical 8-step controller coordination protocol (extracted from ~42 controller SKILL.md files)
29. **playbooks/pat-cross-teammate-request.md** — LEGACY (experimental-named-teammate path only): cross-teammate `peer_request` routing in `/team`; obsolete under the default subagent model, where a subagent needing another specialty spawns it downward.
30. **playbooks/pat-evidence-first-execution.md** — Pattern: specific, verifiable evidence
31. **playbooks/pat-feedback-loop-first-debugging.md** — Pattern: build a tight reproduction loop and show it RED before hypothesizing; ranked repro ladder + tagged-debug cleanup
32. **playbooks/pat-gate-taxonomy.md** — Pattern: four checkpoint types (Pre-flight / Revision / Escalation / Abort) + stall-detection rule
33. **playbooks/pat-graceful-degradation-depth1.md** — Pattern: defensive-fallback degraded execution when `Agent` is genuinely absent (nesting ceiling at depth 5, or a regressed/older harness). Repositioned in v12.17.0 — subagents normally retain `Agent` up to 5 levels deep (CC ≥ 2.1.172); depth-1 stripping is historical.
34. **playbooks/pat-minimal-solution-ladder.md** — Pattern: minimalism counterweight to aggressive decomposition (YAGNI → stdlib → native → existing dep → one-liner → minimum viable change)
35. **playbooks/pat-subagent-status-protocol.md** — Pattern: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED status reporting
36. **playbooks/pat-two-stage-review.md** — Pattern: spec-compliance review before code-quality review

### Quality (6 files)

37. **quality/anti-slop.md** — Anti-AI-slop writing rules
38. **quality/completion.md** — Task completion protocol (evidence-first, red-flag detection)
39. **quality/cso-guidelines.md** — Claude Search Optimization for agent descriptions
40. **quality/implicit-discovery.md** — Handling abstract requests
41. **quality/validation-framework.md** — End-to-end completion traceability
42. **quality/resources/validation-checklist-active.md** — Active 5-check cross-cutting validation framework (renamed from `validation-checklist-29.md` in v12.16.0 so the filename matches its content; the 24 aspirational checks moved to `docs/FUTURE_VALIDATION_FRAMEWORK.md` in v12.x)

### Meta (1 file)

43. **README.md** — This index file

## Current Skill Catalog (v12.2.0+)

The rules in this directory support the four current skills shipped by cAgents. `/improve` was folded into `/run` via a first-word keyword router in v12.1.2 (`/run improve|review|audit|optimize ...`). `/org` was removed in v12.2.0 and its cross-domain C-suite coordination work absorbed into `/team` strategic mode (auto-enabled when `router.domain_count >= 2`; override with `--strategic` / `--no-strategic`). See `docs/MIGRATION-V11.md` and the v12.1.2 / v12.2.0 CHANGELOG entries.

| Skill | Purpose |
|-------|---------|
| `/run` | Single-domain task execution. Improve modes via keyword router: `/run improve X` → `--mode full`; `/run review X` or `/run audit X` → `--mode review`; `/run optimize X` → `--mode optimize`. |
| `/team` | Parallel multi-agent execution with wave-based quality gates. Auto-enables strategic mode for cross-domain requests (12 leadership agents act as Wave 0/1 subagents). |
| `/designer` | Interactive design exploration via guided Q&A (exempt from auto-proceed). |
| `/helper` | Command guide and skill recommender. |

Removed/folded skills (do not appear as current):

- `/improve` — folded into `/run` keyword router (v12.1.2). Use `/run improve ...`, `/run review ...`, `/run audit ...`, `/run optimize ...`.
- `/org` — removed (v12.2.0). Use `/team <cross-domain request>` (auto-strategic) or `/team <request> --strategic`.
- `/review`, `/optimize`, `/context`, `/debug` — removed in V11.0. See `docs/MIGRATION-V11.md` for replacements.

## Hook System Snapshot

`core/hooks.md` is the canonical source. Summary: 18 distinct hook event types registered in `.claude/settings.json`; 33 `.cjs` files under `.claude/hooks/` (25 unique registered hooks + 5 dispatched sub-validators run by `write-edit-dispatch.cjs` + `agent-dispatch.cjs` + `hook-utils.cjs` + `run-hook.cjs` launcher + `bash-guard-evaluator.cjs` library). All hooks use the `createHook()` factory. Events not currently used by cAgents (e.g., `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`, `Elicitation`, `ElicitationResult`) remain available for user-defined hooks.

## Infrastructure References

### Scripts (validation / sync)

- `scripts/sync-versions.sh` — Update the 16 version-registry locations
- `scripts/sync-agents.sh` — Rebuild `.claude-plugin/plugin.json` agent list
- `scripts/ci/cagents-ci.sh` — Quality-gate CI runner (includes tiny-bump guard)
- `scripts/ci/validate-agents.sh` — Agent frontmatter and archetype validation
- `scripts/ci/validate-counts.sh` — Disk-derived counts guard (P1-5; checks CLAUDE.md, hooks.md, settings.json, version-registry.md, docs/agents/index.md, docs/12-FACTOR-COMPLIANCE.md)

### Memory & Evals

- `cagents-memory/_system/metrics/` — Workflow metrics
- `cagents-memory/_system/evals/` — Quality evaluation framework
- `cagents-memory/_knowledge/` — Cross-session learnings (patterns, calibration, post-mortems)

**Token Savings**: 40-60% average across the active agent catalog (see `CLAUDE.md` for the current count, derived from `jq -r '.agents | length' .claude-plugin/plugin.json`) via progressive disclosure (tier-1 frontmatter always loaded; tier-2 SKILL.md body on activation; tier-3 `resources/` files on demand via `@path`).
