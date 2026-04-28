---
paths:
  - ".claude/rules/**"
---

# cAgents Modular Rules

Topic-specific rules organized for better maintainability.

## Directory Structure

```
.claude/rules/
├── core/           # Core architecture patterns
│   ├── orchestration.md           # Workflow phases and orchestration
│   ├── controllers.md             # Question-based delegation patterns
│   ├── execution.md               # Execution agent patterns
│   ├── shared-questions.md        # Universal controller question patterns
│   ├── hooks.md                   # Hook system documentation (19 event types)
│   ├── skill-format.md            # SKILL.md agent format spec (V10.22.5)
│   ├── progressive-disclosure.md  # Three-tier loading pattern
│   ├── subagent-alignment.md      # Agent tool alignment
│   ├── teams.md                   # Team coordination (built-in agent teams)
│   ├── controller-reference.md    # Detailed controller schemas and protocols
│   ├── orchestration-reference.md # Detailed orchestration schemas
│   ├── version-registry.md        # Version synchronization (17 locations)
│   └── resources/
│       ├── controller-validation-checklist.md  # Pre/mid-execution controller checks
│       └── execution-self-validation.md        # 15-check executor self-validation
├── domains/        # Domain-specific guidelines
│   ├── engineering.md      # Engineering domain (engineering/)
│   ├── grow.md             # Business domain (business/, growth/)
│   ├── operate.md          # Operations/Finance within business domain
│   ├── people.md           # People domain (people/)
│   └── serve.md            # Service domain (service/)
├── infrastructure/ # Infrastructure configuration
│   └── model-routing.md    # Model routing guidelines
├── memory/         # Memory and state management
│   ├── agent-memory.md           # Agent_Memory/ structure and usage
│   └── agent-memory-reference.md # Detailed memory patterns and examples
└── quality/        # Quality and completion
    ├── completion.md            # Task completion protocol
    ├── validation-framework.md  # End-to-end completion traceability
    ├── implicit-discovery.md    # Handling abstract requests
    ├── cso-guidelines.md        # Claude Search Optimization
    ├── anti-slop.md             # Anti-AI-slop writing rules
    └── resources/
        └── validation-checklist-29.md  # 29-check validation framework
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
  - "core/agents/**/*.md"
  - "shared/agents/**/*.md"
---

# Agent Development Rules

Rules here apply only when working in agent directories.
```

## Import Syntax

Import rules into CLAUDE.md or other docs:

```markdown
See @.claude/rules/core/orchestration.md for workflow patterns.
```

## Current Rules (29 files)

### Core (14 files)
1. **core/orchestration.md** - Workflow phases (routing -> validating)
2. **core/controllers.md** - Question-based delegation patterns
3. **core/execution.md** - Execution agent patterns
4. **core/shared-questions.md** - Universal controller question patterns
5. **core/hooks.md** - V10.18 hook system (19 event types of 24 supported, 4 hook types)
6. **core/skill-format.md** - V10.22.5 SKILL.md format (maxTurns, permissionMode, memory, opusplan, vibe, allowed-tools)
7. **core/progressive-disclosure.md** - Three-tier loading pattern
8. **core/subagent-alignment.md** - Agent tool alignment patterns
9. **core/teams.md** - V9.2+ team coordination patterns (built-in agent teams)
10. **core/controller-reference.md** - Detailed controller schemas and protocols
11. **core/orchestration-reference.md** - Detailed orchestration schemas
12. **core/version-registry.md** - Version synchronization (17 locations in V11.0)
13. **core/resources/controller-validation-checklist.md** - Pre/mid-execution controller validation checks
14. **core/resources/execution-self-validation.md** - 15-check executor self-validation protocol

### Domains (5 files)
15. **domains/engineering.md** - Engineering domain guidelines
16. **domains/grow.md** - Grow (marketing/sales) guidelines
17. **domains/operate.md** - Operate (finance/operations) guidelines
18. **domains/people.md** - People (HR/culture) guidelines
19. **domains/serve.md** - Serve (support/legal) guidelines

### Infrastructure (1 file)
20. **infrastructure/model-routing.md** - Model routing guidelines and project overrides

### Memory (2 files)
21. **memory/agent-memory.md** - Agent_Memory/ structure (three-file pattern, waypoints)
22. **memory/agent-memory-reference.md** - Detailed memory patterns and examples

### Quality (6 files)
23. **quality/completion.md** - Task completion protocol (V10.22.0: red flags, rationalization counters, fresh evidence)
24. **quality/validation-framework.md** - End-to-end completion traceability
25. **quality/implicit-discovery.md** - Handling abstract requests
26. **quality/cso-guidelines.md** - Claude Search Optimization for agent descriptions
27. **quality/anti-slop.md** - Anti-AI-slop writing rules (V10.22.1)
28. **quality/resources/validation-checklist-29.md** - 29-check four-phase validation framework

### Meta (1 file)
29. **README.md** - This index file

## V11.0 Skill Catalog

The rules in this directory support the six V11.0 skills. Skills `/review`, `/optimize`, `/context`, and `/debug` were **removed in V11.0** — see `docs/MIGRATION-V11.md` for replacements.

| Skill | Replaces (V11 removal) | Purpose |
|-------|------------------------|---------|
| `/run` | `/context`, `/debug` (via `--mode debug`) | Single-domain task execution |
| `/team` | — | Parallel multi-agent execution with wave-based gates |
| `/org` | — | Cross-domain C-suite strategic coordination |
| `/designer` | — | Interactive design exploration via Q&A |
| `/improve` | `/review`, `/optimize` (via `--mode review\|optimize\|full`) | Unified review + optimize engine |
| `/helper` | — | Command guide and skill recommender |

## V8.0 Additions

### hooks.md (Enhanced)
Documents all 22 Claude Code hook event types with cAgents implementations:
- SessionStart, SessionEnd, Stop, StopFailure, SubagentStop
- PreToolUse, PostToolUse, UserPromptSubmit
- Notification, PreCompact, PostCompact, PermissionRequest
- InstructionsLoaded, Elicitation, ElicitationResult

New hooks added:
- `session-catchup.js` - Detect and offer resume for incomplete sessions
- `eval-runner.js` - Quality evaluation runner

### subagent-alignment.md (New)
Maps cAgents agent types to Claude Code Agent tool patterns:
- Domain-qualified agent references (`make:backend-developer`)
- Prompt templates for delegation
- Best practices for agent selection

### agent-memory.md (Enhanced)
Adds V8.0 session management features:
- **Three-file pattern**: task_plan.md, findings.md, progress.md (60-80% context savings)
- **Waypoints**: Checkpoint snapshots for pause/resume
- **Metrics**: ROI and workflow tracking
- **Evals**: Quality evaluation framework

## V8.0 Infrastructure

### Scripts
- `scripts/init_agent.js` - Initialize new agents with SKILL.md structure
- `scripts/validate_agent.js` - Validate agent configuration
- `scripts/ci/cagents-ci.sh` - CI runner for quality gates
- `scripts/ci/run-evals.sh` - Evaluation runner
- `scripts/ci/check-quality.sh` - Pre-commit quality checks

### Hooks
- `.claude/hooks/session-catchup.cjs` - Session recovery
- `.claude/hooks/pre-compact-save.cjs` - State preservation
- `.claude/hooks/verify-completion.cjs` - Completion verification
- `.claude/hooks/eval-runner.cjs` - Quality evaluation (CLI tool)
- `.claude/hooks/secret-detection.cjs` - Secret detection for Write/Edit
- `.claude/hooks/notification.cjs` - Status notification logging

### Metrics & Evals
- `Agent_Memory/_system/metrics/` - Workflow metrics
- `Agent_Memory/_system/evals/` - Quality evaluation framework

**Token Savings**: 40-60% average across agent catalog via progressive disclosure
