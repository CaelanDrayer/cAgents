---
paths:
  - "**/agents/**/*.md"
  - "**/agents/*.md"
---

# Progressive Disclosure Pattern

This file describes the V8.0 three-tier loading strategy. The strategy reduces
the number of tokens that an agent costs.

## Overview

Progressive disclosure reduces the token usage of an agent. It loads the
content of the agent on demand. It does not load all of the content at one
time.

**Token savings**: 40-60% on average across the agent catalog.

## Three-Tier Loading

### Tier 1: Metadata (~50 tokens)

Claude Code always loads tier 1 when a caller references the agent.

```yaml
# Frontmatter only
---
name: tech-lead
archetype: developer
branch: fullstack
description: "Strategic oversight..."
metadata:
  tier: controller
---
```

> The v11.1.0 schema in `skill-format.md` sets the position of each field. An
> agent declares `archetype:` at the top level. An agent with a 3-level
> archetype also declares `branch:` at the top level. An agent puts `tier:`
> inside `metadata:`. The v11.1.0 schema removed the top-level `domain:` field,
> and `validate-agents.sh` rejects that field.

### Tier 2: Instructions (~200-500 tokens)

Claude Code loads tier 2 when the Agent tool spawns the agent.

```markdown
# Agent Name

Core instructions and responsibilities.

## Core Responsibilities
1. Primary task
2. Secondary task

## Key Principles
- Principle 1
- Principle 2
```

### Tier 3: Resources (~500-2000 tokens)

Claude Code loads tier 3 on demand, through an @path reference.

```
resources/
├── detailed-examples.md      # Full worked examples
├── decision-framework.md     # Detailed decision trees
├── communication-protocols.md # Protocol templates
└── anti-patterns.md          # What NOT to do
```

## @path Reference Syntax

In the body of a SKILL.md file, reference a tier 3 resource:

```markdown
## Validation Checklist

For detailed criteria, see @resources/controller-validation-checklist.md

## Self-Validation Protocol

See @resources/execution-self-validation.md for the full checklist.
```

The @path syntax loads the resource only when the agent needs it.

## Directory Structure

### High-Value Agents (Directory Structure)

```
developer/fullstack/tech-lead/
├── SKILL.md                    # Tier 1 + 2
└── resources/
    ├── risk-framework.md       # Tier 3
    ├── priority-arbitration.md # Tier 3
    └── go-no-go-checklist.md   # Tier 3
```

### Simple Agents (Single File)

```
writer/copywriter/SKILL.md       # All tiers in one file
```

**Conversion criteria**: If the file of the agent is more than 500 tokens,
convert it to a directory.

## Token Savings by Agent Type

| Agent Type | Before (tokens) | After (tokens) | Savings |
|------------|-----------------|----------------|---------|
| Controller | ~800 | ~300 | 62% |
| Execution | ~600 | ~250 | 58% |
| Support | ~400 | ~150 | 62% |

## Loading Algorithm

```
1. Agent referenced (Agent tool or router)
   → Load Tier 1 (frontmatter) [~50 tokens]

2. Agent selected for activation
   → Load Tier 2 (SKILL.md body) [~200-500 tokens]

3. Agent requests specific resource
   → Load Tier 3 (resources/*.md) [~500-2000 tokens]
```

## Migration Guide

### Step 1: Identify Candidates

```bash
# Find agents > 500 tokens (lines * ~5 tokens/line)
wc -l developer/**/*.md | awk '$1 > 100'
```

### Step 2: Create Directory

```bash
mkdir -p developer/{branch}/{agent-name}/resources
```

### Step 3: Split Content

1. Keep the frontmatter and the core instructions in SKILL.md.
2. Move the detailed examples to resources/examples.md.
3. Move the decision frameworks to resources/decision-framework.md.
4. Add an @path reference in SKILL.md for each moved file.

### Step 4: Update References

If the path of the agent changed, update plugin.json to point to the new path.

### Step 5: Validate

1. Do a test of the agent load.
2. Measure the token savings.
3. Make sure that each @path reference resolves.

## Best Practices

1. **Keep the SKILL.md file focused**: Put only the core instructions in it.
2. **Name each resource clearly**: Use a filename that describes the content.
3. **Use @path for detailed content only**: Keep the short content in the body
   of the SKILL.md file.
4. **Measure the savings**: Record the token count before the change and the
   token count after it.
5. **Keep the fallback**: cAgents continues to support the single-file format.

## Converted Agents (V8.0)

| Agent | Before | After | Savings |
|-------|--------|-------|---------|
| tech-lead | 816 tokens | 298 tokens | 63% |
| architect | 892 tokens | 312 tokens | 65% |
| backend-developer | 980 tokens | 287 tokens | 71% |
| qa-lead | 854 tokens | 305 tokens | 64% |

## Implementation Status

- [x] tech-lead (converted V8.0)
- [x] architect (converted V8.0)
- [x] backend-developer (converted V8.0)
- [x] qa-lead (converted V8.0)
- [x] creative-director (converted V9.0)
- [x] game-designer (converted V9.0)
- [x] campaign-manager (converted V9.0; absorbed into marketing-strategist in
  v12)
- [x] marketing-strategist (converted V9.0)
- [x] hr-manager (converted V9.0)
- [x] customer-success-manager (converted V9.0)
