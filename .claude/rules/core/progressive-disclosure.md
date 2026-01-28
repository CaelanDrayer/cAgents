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
domain: make
---
```

### Tier 2: Instructions (~200-500 tokens)
**Loaded when agent is activated** (spawned via Task tool).

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
## Risk Assessment

For detailed criteria, see @resources/risk-framework.md

## Examples

See @resources/examples.md for comprehensive examples.
```

The @path syntax triggers on-demand loading only when the resource is needed.

## Directory Structure

### High-Value Agents (Directory Structure)

```
make/agents/engineering-manager/
├── SKILL.md                    # Tier 1 + 2
└── resources/
    ├── risk-framework.md       # Tier 3
    ├── priority-arbitration.md # Tier 3
    └── go-no-go-checklist.md   # Tier 3
```

### Simple Agents (Single File)

```
make/agents/copywriter.md       # All tiers in one file
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
1. Agent referenced (Task tool or router)
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
wc -l make/agents/*.md | awk '$1 > 100'
```

### Step 2: Create Directory

```bash
mkdir -p make/agents/{agent-name}/resources
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

- [x] engineering-manager (converted)
- [x] architect (converted)
- [x] backend-developer (converted)
- [x] qa-lead (converted)
- [ ] creative-director (pending)
- [ ] game-designer (pending)
- [ ] campaign-manager (pending)
- [ ] marketing-strategist (pending)
- [ ] hr-manager (pending)
- [ ] customer-success-manager (pending)
