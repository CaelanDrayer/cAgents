# cAgents Modular Rules

Topic-specific rules organized for better maintainability.

## Directory Structure

```
.claude/rules/
├── core/           # Core architecture patterns
│   ├── orchestration.md       # Workflow phases and orchestration
│   ├── controllers.md         # Question-based delegation patterns
│   ├── execution.md           # Execution agent patterns
│   ├── shared-questions.md    # Universal controller question patterns
│   ├── hooks.md               # V8.0 hook system documentation
│   ├── skill-format.md        # V8.0 SKILL.md agent format spec
│   ├── progressive-disclosure.md # V8.0 three-tier loading pattern
│   ├── subagent-alignment.md  # V8.0 Task tool alignment
│   ├── teams.md               # V9.2 Team coordination patterns (built-in agent teams)
│   ├── controller-reference.md    # Detailed controller schemas and protocols
│   ├── orchestration-reference.md # Detailed orchestration schemas
│   └── version-registry.md       # Version synchronization (13 locations)
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
    ├── completion.md           # Task completion protocol
    ├── validation-framework.md # End-to-end completion traceability
    └── implicit-discovery.md   # Handling abstract requests
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

## Current Rules (24 files)

### Core (12 files)
1. **core/orchestration.md** - Workflow phases (routing -> validating)
2. **core/controllers.md** - Question-based delegation patterns
3. **core/execution.md** - Execution agent patterns
4. **core/shared-questions.md** - Universal controller question patterns
5. **core/hooks.md** - V10.0 hook system (17 event types, 4 hook types)
6. **core/skill-format.md** - V9.0 SKILL.md format (maxTurns, permissionMode, memory, opusplan)
7. **core/progressive-disclosure.md** - Three-tier loading (10/10 agents converted)
8. **core/subagent-alignment.md** - Task tool alignment patterns
9. **core/teams.md** - V9.2 Team coordination patterns (built-in agent teams)
10. **core/controller-reference.md** - Detailed controller schemas and protocols
11. **core/orchestration-reference.md** - Detailed orchestration schemas
12. **core/version-registry.md** - Version synchronization (13 locations)

### Domains (5 files)
13. **domains/engineering.md** - Engineering domain guidelines
14. **domains/grow.md** - Grow (marketing/sales) guidelines
15. **domains/operate.md** - Operate (finance/operations) guidelines
16. **domains/people.md** - People (HR/culture) guidelines
17. **domains/serve.md** - Serve (support/legal) guidelines

### Infrastructure (1 file)
18. **infrastructure/model-routing.md** - Model routing guidelines and project overrides

### Memory (2 files)
19. **memory/agent-memory.md** - Agent_Memory/ structure (V8.0: three-file pattern, waypoints)
20. **memory/agent-memory-reference.md** - Detailed memory patterns and examples

### Quality (3 files)
21. **quality/completion.md** - Task completion protocol
22. **quality/validation-framework.md** - End-to-end completion traceability
23. **quality/implicit-discovery.md** - Handling abstract requests

### Meta (1 file)
24. **README.md** - This index file

## V8.0 Additions

### hooks.md (Enhanced)
Documents all 17 Claude Code hook event types with cAgents implementations:
- SessionStart, SessionEnd, Stop, SubagentStop
- PreToolUse, PostToolUse, UserPromptSubmit
- Notification, PreCompact, PermissionRequest, Error

New hooks added:
- `session-catchup.js` - Detect and offer resume for incomplete sessions
- `eval-runner.js` - Quality evaluation runner

### subagent-alignment.md (New)
Maps cAgents agent types to Claude Code Task tool patterns:
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
