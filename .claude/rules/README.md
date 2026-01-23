# cAgents Modular Rules

Topic-specific rules organized for better maintainability.

## Directory Structure

```
.claude/rules/
├── core/           # Core architecture patterns
│   ├── orchestration.md    # Workflow phases and orchestration
│   ├── controllers.md      # Question-based delegation patterns
│   ├── execution.md        # Execution agent patterns
│   └── shared-questions.md # Universal controller question patterns
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

## Current Rules (14 files)

### Core (4 files)
1. **core/orchestration.md** - Workflow phases (routing → validating)
2. **core/controllers.md** - Question-based delegation patterns
3. **core/execution.md** - Execution agent patterns
4. **core/shared-questions.md** - Universal controller question patterns

### Domains (5 files)
5. **domains/engineering.md** - Engineering domain guidelines
6. **domains/grow.md** - Grow (marketing/sales) guidelines
7. **domains/operate.md** - Operate (finance/operations) guidelines
8. **domains/people.md** - People (HR/culture) guidelines
9. **domains/serve.md** - Serve (support/legal) guidelines

### Memory (1 file)
10. **memory/agent-memory.md** - Agent_Memory/ structure and usage

### Quality (3 files)
11. **quality/completion.md** - Task completion protocol
12. **quality/validation-framework.md** - End-to-end completion traceability
13. **quality/implicit-discovery.md** - Handling abstract requests

### Meta (1 file)
14. **README.md** - This index file

## Future Expansion

Add rules for:
- make.md - Make super-domain specifics (engineering + creative + product + game dev)
- Testing strategies (unit, integration, E2E)
- Context management (token optimization, consolidation)
