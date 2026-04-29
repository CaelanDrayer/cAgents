---
paths:
  - "**/agents/**/*.md"
  - "**/agents/**/SKILL.md"
---

# Progressive Disclosure Pattern

V8.0 three-tier loading strategy for token optimization.

## Overview

Progressive disclosure reduces token usage by loading agent content on-demand instead of all at once.

**Token Savings**: 40-60% average across agent catalog.

## Three-Tier Loading

### Tier 1: Metadata (~50 tokens)
**Always loaded** when agent is referenced.

```yaml
# Frontmatter only
---
name: engineering-manager
description: "Strategic oversight..."
tier: controller
domain: engineering
---
```

### Tier 2: Instructions (~200-500 tokens)
**Loaded when agent is activated** (spawned via Agent tool).

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
**Loaded on-demand** via @path references.

```
resources/
├── detailed-examples.md      # Full worked examples
├── decision-framework.md     # Detailed decision trees
├── communication-protocols.md # Protocol templates
└── anti-patterns.md          # What NOT to do
```

## @path Reference Syntax

In SKILL.md body, reference tier 3 resources:

```markdown
## Validation Checklist

For detailed criteria, see @resources/controller-validation-checklist.md

## Self-Validation Protocol

See @resources/execution-self-validation.md for the full checklist.
```

The @path syntax triggers on-demand loading only when the resource is needed.

## Directory Structure

### High-Value Agents (Directory Structure)

```
developer/fullstack/engineering-manager/
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

**Conversion criteria**: Convert to directory if agent file > 500 tokens

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

1. Keep frontmatter + core instructions in SKILL.md
2. Extract detailed examples to resources/examples.md
3. Extract decision frameworks to resources/decision-framework.md
4. Add @path references in SKILL.md

### Step 4: Update References

Update plugin.json if needed to reference new path.

### Step 5: Validate

1. Test agent loading
2. Measure token savings
3. Verify @path references resolve

## Best Practices

1. **Keep SKILL.md focused**: Core instructions only
2. **Name resources clearly**: descriptive filenames
3. **Use @path sparingly**: Only for truly detailed content
4. **Measure savings**: Track before/after token counts
5. **Maintain fallback**: Keep single-file format supported

## Converted Agents (V8.0)

| Agent | Before | After | Savings |
|-------|--------|-------|---------|
| engineering-manager | 816 tokens | 298 tokens | 63% |
| architect | 892 tokens | 312 tokens | 65% |
| backend-developer | 980 tokens | 287 tokens | 71% |
| qa-lead | 854 tokens | 305 tokens | 64% |

## Implementation Status

- [x] engineering-manager (converted V8.0)
- [x] architect (converted V8.0)
- [x] backend-developer (converted V8.0)
- [x] qa-lead (converted V8.0)
- [x] creative-director (converted V9.0)
- [x] game-designer (converted V9.0)
- [x] campaign-manager (converted V9.0)
- [x] marketing-strategist (converted V9.0)
- [x] hr-manager (converted V9.0)
- [x] customer-success-manager (converted V9.0)
