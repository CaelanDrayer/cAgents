---
paths:
  - ".claude/rules/**"
---

# cAgents Modular Rules

Topic-specific rules organized for better maintainability. Counts in this index are derived from disk at edit time:

- **Rule files**: 43 (`find .claude/rules -name '*.md' -type f | wc -l`)
- **Hook event types**: 18 (`jq -r '.hooks | keys | length' .claude/settings.json`)
- **Version-registry slots**: 16 (post-v12.2.0; was 17 in v12.1.x, was 18 in V11.0)
- **Example store** (`docs/example-store/`): a distinct set of curated few-shot exemplars, which are `ex-*.md` + `README.md` + `_index.yaml`. They are NOT rule files. **Relocated out of `.claude/rules/` to `docs/example-store/` in v12.57.0 (REC-34)**, so the store no longer auto-loads into every agent's context. It cost about 21K tokens on every spawn. The planner still consumes `docs/example-store/_index.yaml` by explicit path, and agent SKILLs `@`-reference the bodies on demand. The store now lives under `docs/`, outside the rules tree, so the "Rule files" count above needs no examples exclusion.

When you add, remove, or rename a rule file, re-derive these numbers and update this header. The `scripts/ci/validate-counts.sh` CI guard checks the load-bearing counts elsewhere in the repo (CLAUDE.md, hooks.md, settings.json, version-registry.md, docs/agents/index.md, docs/12-FACTOR-COMPLIANCE.md). This README is not in that check matrix, but it should still stay aligned with disk reality.

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

Claude Code loads these rules automatically. Use the `/memory` command to view the loaded rules.

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

1. **core/controllers.md**: the question-based delegation patterns.
2. **core/controller-reference.md**: the detailed controller schemas and protocols.
3. **core/delegation.md**: the aggressive-delegation rules. `/act`, `/team`, and `/designer` never do direct work.
4. **core/execution.md**: the execution agent patterns.
5. **core/hooks.md**: the hook system (18 event types, 34 .cjs files, 26 unique registered hooks + 5 dispatched sub-validators).
6. **core/orchestration.md**: the workflow phases (routing → planning → coordinating → executing → validating).
7. **core/orchestration-reference.md**: the detailed orchestration schemas.
8. **core/progressive-disclosure.md**: the three-tier SKILL.md loading pattern.
9. **core/shared-questions.md**: the universal controller question patterns.
10. **core/skill-format.md**: the SKILL.md agent/skill frontmatter specification.
11. **core/subagent-alignment.md**: the Agent tool alignment patterns.
12. **core/teams.md**: team coordination via built-in agent teams (`/team`).
13. **core/version-registry.md**: version synchronization (16 locations post-v12.2.0).
14. **core/resources/controller-validation-checklist.md**: the pre/mid-execution controller validation checks.
15. **core/resources/execution-self-validation.md**: the 5-check executor self-validation protocol (v12.0.0, reduced from 15-check).
16. **core/resources/hook-catalog.md**: the detailed per-hook catalog.

### Domains (5 files — legacy routing overlay)

17. **domains/engineering.md**: the engineering guidelines.
18. **domains/grow.md**: the growth guidelines, for marketing / sales.
19. **domains/operate.md**: the operate guidelines, for finance / operations.
20. **domains/people.md**: the people guidelines, for HR / culture. This file is config-only, and no SKILL.md agents live under `people/`.
21. **domains/serve.md**: the serve guidelines, for support / legal.

### Infrastructure (1 file)

22. **infrastructure/model-routing.md**: the model routing guidelines and the project overrides.

### Memory (2 files)

23. **memory/agent-memory.md**: the `cagents-memory/` structure, with waypoints and the three-file pattern.
24. **memory/agent-memory-reference.md**: the detailed memory patterns and examples.

### Playbooks (12 files)

25. **playbooks/README.md**: the playbook conventions and the prefix taxonomy.
26. **playbooks/pat-concurrent-session-hooks.md**: the concurrent-session hook contract pattern, with deterministic session resolution.
27. **playbooks/pat-context-budget-tiers.md**: the pattern for advisory PEAK/GOOD/DEGRADING/POOR self-monitored context bands. It takes a proactive checkpoint before forced compaction.
28. **playbooks/pat-controller-coordination-protocol.md**: the canonical 8-step controller coordination protocol pattern. We extracted it from about 42 controller SKILL.md files.
29. **playbooks/pat-cross-teammate-request.md**: LEGACY, for the experimental-named-teammate path only. It covers cross-teammate `peer_request` routing in `/team`. It is obsolete under the default subagent model, where a subagent that needs another specialty spawns that specialty downward.
30. **playbooks/pat-evidence-first-execution.md**: the pattern for specific, verifiable evidence.
31. **playbooks/pat-feedback-loop-first-debugging.md**: the pattern that builds a tight reproduction loop and shows it RED before you hypothesize. It holds a ranked repro ladder + tagged-debug cleanup.
32. **playbooks/pat-gate-taxonomy.md**: the pattern for four checkpoint types, which are Pre-flight / Revision / Escalation / Abort. It adds stall-detection rules: a flat reviewer-round finding count, and a parent gone silent after spawning children.
33. **playbooks/pat-graceful-degradation-depth1.md**: the pattern for defensive-fallback degraded execution, used when `Agent` is genuinely absent. That happens at the nesting ceiling of depth 5, or on a regressed/older harness. Repositioned in v12.17.0. Subagents normally retain `Agent` up to 5 levels deep (CC ≥ 2.1.172), and depth-1 stripping is historical.
34. **playbooks/pat-minimal-solution-ladder.md**: the minimalism pattern that counterweights aggressive decomposition (YAGNI → stdlib → native → existing dep → one-liner → minimum viable change).
35. **playbooks/pat-subagent-status-protocol.md**: the pattern for DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED status reporting.
36. **playbooks/pat-two-stage-review.md**: the pattern that puts spec-compliance review before code-quality review.

### Quality (6 files)

37. **quality/anti-slop.md**: the anti-AI-slop writing rules.
38. **quality/completion.md**: the task completion protocol, with evidence-first rules and red-flag detection.
39. **quality/cso-guidelines.md**: Claude Search Optimization for agent descriptions.
40. **quality/implicit-discovery.md**: how to handle an abstract request.
41. **quality/validation-framework.md**: end-to-end completion traceability.
42. **quality/resources/validation-checklist-active.md**: the active 5-check cross-cutting validation framework. The v12.16.0 pass renamed it from `validation-checklist-29.md`, so that the filename matches its content. The 24 aspirational checks moved to `docs/FUTURE_VALIDATION_FRAMEWORK.md` in v12.x.

### Meta (1 file)

43. **README.md**: this index file.

## Current Skill Catalog (v12.2.0+)

The rules in this directory support the four current skills that cAgents ships. Release v12.1.2 folded `/improve` into `/act`, which was formerly `/run`, through a first-word keyword router (`/act improve|review|audit|optimize ...`). Release v12.2.0 removed `/org`, and absorbed its cross-domain C-suite coordination work into `/team` strategic mode. That mode auto-enables when `router.domain_count >= 2`. Override it with `--strategic` / `--no-strategic`. See `docs/MIGRATION-V11.md` and the v12.1.2 / v12.2.0 CHANGELOG entries.

| Skill | Purpose |
|-------|---------|
| `/act` | Single-domain task execution. Improve modes via keyword router: `/act improve X` → `--mode full`; `/act review X` or `/act audit X` → `--mode review`; `/act optimize X` → `--mode optimize`. |
| `/team` | Parallel multi-agent execution with wave-based quality gates. Auto-enables strategic mode for cross-domain requests (12 leadership agents act as Wave 0/1 subagents). |
| `/designer` | Interactive design exploration via guided Q&A (exempt from auto-proceed). |
| `/helper` | Command guide and skill recommender. |

Removed/folded skills (do not appear as current):

- `/improve`: folded into the `/act` keyword router (v12.1.2). Use `/act improve ...`, `/act review ...`, `/act audit ...`, `/act optimize ...`.
- `/org`: removed in v12.2.0. Use `/team <cross-domain request>` (auto-strategic) or `/team <request> --strategic`.
- `/review`, `/optimize`, `/context`, `/debug`: removed in V11.0. See `docs/MIGRATION-V11.md` for replacements.

## Hook System Snapshot

`core/hooks.md` is the canonical source. Summary: `.claude/settings.json` registers 18 distinct hook event types. `.claude/hooks/` holds 34 `.cjs` files: 26 unique registered hooks + 5 dispatched sub-validators + `hook-utils.cjs` + `run-hook.cjs` launcher + `bash-guard-evaluator.cjs` library. `write-edit-dispatch.cjs` and `agent-dispatch.cjs` run the 5 dispatched sub-validators. All hooks use the `createHook()` factory. Some events are not currently used by cAgents, such as `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`, `Elicitation`, and `ElicitationResult`. They remain available for user-defined hooks.

## Infrastructure References

### Scripts (validation / sync)

- `scripts/sync-versions.sh` updates the 16 version-registry locations.
- `scripts/ci/validate-agents.sh` validates the flat `agents/<name>.md` catalog.
- `scripts/ci/cagents-ci.sh` is the quality-gate CI runner, and it includes the tiny-bump guard.
- `scripts/ci/validate-agents.sh` also does agent frontmatter and archetype validation.
- `scripts/ci/validate-counts.sh` is the disk-derived counts guard (P1-5; checks CLAUDE.md, hooks.md, settings.json, version-registry.md, docs/agents/index.md, docs/12-FACTOR-COMPLIANCE.md).

### Memory & Evals

- `cagents-memory/_system/metrics/` holds the workflow metrics.
- `cagents-memory/_system/evals/` holds the quality evaluation framework.
- `cagents-memory/_knowledge/` holds the cross-session learnings: patterns, calibration, and post-mortems.

**Token Savings**: progressive disclosure saves 40-60% on average across the active agent catalog. See `CLAUDE.md` for the current agent count, which is derived from `jq -r '.agents | length' .claude-plugin/plugin.json`. Progressive disclosure has three tiers. Tier-1 frontmatter always loads. Tier-2 loads the SKILL.md body on activation. Tier-3 loads `resources/` files on demand via `@path`.
