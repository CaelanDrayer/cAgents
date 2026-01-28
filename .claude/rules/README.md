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
│   └── subagent-alignment.md  # V8.0 Task tool alignment
├── domains/        # Domain-specific guidelines
│   ├── engineering.md      # Engineering workflows and agents
│   ├── grow.md             # Grow (marketing/sales) patterns
│   ├── operate.md          # Operate (finance/operations) patterns
│   ├── people.md           # People (HR/culture) patterns
│   └── serve.md            # Serve (support/legal) patterns
├── memory/         # Memory and state management
│   └── agent-memory.md     # Agent_Memory/ structure and usage
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

## Current Rules (18 files)

### Core (8 files)
1. **core/orchestration.md** - Workflow phases (routing -> validating)
2. **core/controllers.md** - Question-based delegation patterns
3. **core/execution.md** - Execution agent patterns
4. **core/shared-questions.md** - Universal controller question patterns
5. **core/hooks.md** - V8.0 hook system (12 hook types)
6. **core/skill-format.md** - V8.0 SKILL.md agent format specification
7. **core/progressive-disclosure.md** - V8.0 three-tier loading pattern
8. **core/subagent-alignment.md** - V8.0 Task tool alignment patterns

### Domains (5 files)
9. **domains/engineering.md** - Engineering domain guidelines
10. **domains/grow.md** - Grow (marketing/sales) guidelines
11. **domains/operate.md** - Operate (finance/operations) guidelines
12. **domains/people.md** - People (HR/culture) guidelines
13. **domains/serve.md** - Serve (support/legal) guidelines

### Memory (1 file)
14. **memory/agent-memory.md** - Agent_Memory/ structure (V8.0: three-file pattern, waypoints)

### Quality (3 files)
15. **quality/completion.md** - Task completion protocol
16. **quality/validation-framework.md** - End-to-end completion traceability
17. **quality/implicit-discovery.md** - Handling abstract requests

### Meta (1 file)
18. **README.md** - This index file

## V8.0 Additions

### hooks.md (Enhanced)
Documents all 12 Claude Code hook types with cAgents implementations:
- SessionStart, SessionEnd, Stop, SubagentStop
- PreToolUse, PostToolUse, UserPromptSubmit
- Notification, PreCompact, PermissionRequest, Error, ContextOverflow

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
- `.claude/hooks/session-catchup.js` - Session recovery
- `.claude/hooks/pre-compact-save.js` - State preservation
- `.claude/hooks/verify-completion.js` - Completion verification
- `.claude/hooks/eval-runner.js` - Quality evaluation

### Metrics & Evals
- `Agent_Memory/_system/metrics/` - Workflow metrics
- `Agent_Memory/_system/evals/` - Quality evaluation framework

**Token Savings**: 40-60% average across agent catalog via progressive disclosure
