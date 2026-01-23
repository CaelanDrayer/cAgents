# cAgents Modular Rules

Topic-specific rules organized for better maintainability.

## Directory Structure

```
.claude/rules/
├── core/           # Core architecture patterns
│   ├── orchestration.md    # Workflow phases and orchestration
│   ├── controllers.md      # Question-based delegation patterns
│   └── execution.md        # Execution agent guidelines
├── domains/        # Domain-specific guidelines
│   ├── engineering.md      # Engineering workflows and agents
│   ├── revenue.md          # Revenue/marketing/sales patterns
│   └── creative.md         # Creative content workflows
├── memory/         # Memory and state management
│   ├── agent-memory.md     # Agent_Memory/ structure
│   └── context-mgmt.md     # Context handling best practices
└── quality/        # Quality and completion
    ├── testing.md              # Testing conventions
    ├── validation.md           # Validation requirements
    ├── completion.md           # Task completion protocol
    └── validation-framework.md # End-to-end completion traceability
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

## Current Rules (7 files)

1. **core/orchestration.md** - Workflow phases (routing → validating)
2. **core/controllers.md** - Question-based delegation
3. **core/execution.md** - Execution agent patterns
4. **memory/agent-memory.md** - Agent_Memory/ structure
5. **quality/completion.md** - Task completion protocol
6. **quality/validation-framework.md** - End-to-end completion traceability
7. **domains/engineering.md** - Engineering domain guidelines

## Future Expansion

Add rules for:
- Additional domains (revenue, creative, finance-operations, etc.)
- Testing strategies (unit, integration, E2E)
- Validation patterns (code review, documentation review)
- Context management (token optimization, consolidation)
