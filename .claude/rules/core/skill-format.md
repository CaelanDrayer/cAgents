# SKILL.md Agent Format Specification

V8.0 agent format based on official Claude Code SKILL.md specification.

## Frontmatter Schema

```yaml
---
name: agent-name                    # Required: Unique identifier (kebab-case)
description: "Brief description"    # Required: 1-2 sentence purpose statement
tier: controller|execution|support  # Required: Agent tier classification
domain: make|grow|operate|people|serve  # Required: Super-domain
model: opus|sonnet|haiku           # Optional: Preferred model (see model_routing.yaml)
coordination_style: question_based  # Optional: For controllers only
typical_questions: [...]           # Optional: For controllers only
capabilities: [...]                # Optional: List of capabilities
tools: Read, Write, Bash, Task     # Optional: Allowed tools
color: bright_blue                 # Optional: Display color
---
```

## Required Fields

### name
- Unique identifier in kebab-case format
- Must match filename (e.g., `engineering-manager.md` -> `name: engineering-manager`)
- Used for agent routing and references

### description
- Brief, actionable description (1-2 sentences)
- Starts with role/purpose
- Explains when to use this agent
- Example: "Coordinates engineering work via question-based delegation. Use for tier 2+ engineering tasks."

### tier
- `controller`: Tier 2 agents that coordinate work through questions
- `execution`: Tier 3 agents that implement work and answer questions
- `support`: Tier 4 agents providing foundational services

### domain
- One of: `make`, `grow`, `operate`, `people`, `serve`
- Determines which planner_config.yaml is loaded

## Optional Fields

### model
- Preferred model: `opus`, `sonnet`, or `haiku`
- Overridden by model_routing.yaml scenario detection
- If omitted, uses model_routing.yaml defaults

### coordination_style (Controllers only)
- `question_based`: Uses question delegation pattern
- Controllers MUST have this field

### typical_questions (Controllers only)
- List of typical questions this controller asks
- Helps execution agents prepare for delegation

### capabilities
- List of capabilities for agent discovery
- Used by router for intelligent agent selection

### tools
- Comma-separated list of allowed tools
- Restricts tool access for security

### color
- Terminal display color for agent output
- Options: bright_white, bright_blue, bright_green, bright_yellow, bright_red, bright_cyan, bright_magenta

## Three-Tier Progressive Disclosure

### Directory Structure (High-Value Agents)

```
make/agents/engineering-manager/
├── SKILL.md                    # Tier 1 + 2: Frontmatter + Instructions
└── resources/
    ├── typical-questions.md    # Tier 3: Full question catalog
    ├── coordination-examples.md # Tier 3: Example workflows
    └── anti-patterns.md        # Tier 3: What NOT to do
```

### Loading Strategy

```yaml
loading_tiers:
  tier_1:  # Always loaded (~50 tokens)
    - frontmatter metadata
    - name, description, tier, domain

  tier_2:  # When agent activated (~200-500 tokens)
    - SKILL.md body content
    - core instructions
    - behavioral guidelines

  tier_3:  # On demand via @path (~500-2000 tokens)
    - resources/*.md files
    - detailed examples
    - comprehensive question lists
    - edge case handling
```

### @path Reference Syntax

In SKILL.md body, reference tier 3 resources:

```markdown
## Detailed Questions

See @resources/typical-questions.md for the full question catalog.

## Coordination Examples

Reference @resources/coordination-examples.md for workflow examples.
```

The `@path` syntax triggers on-demand loading when the resource is needed.

## Migration Path

### Single File Agent (Current)

```markdown
---
name: backend-developer
tier: execution
domain: make
---

# Backend Developer Agent

[Full content here - 500+ tokens]
```

### Directory Agent (V8.0)

```
make/agents/backend-developer/
├── SKILL.md (~200 tokens)
│   ---
│   name: backend-developer
│   description: "Implements backend services..."
│   tier: execution
│   domain: make
│   ---
│   # Backend Developer
│   Core instructions here.
│   See @resources/api-patterns.md for details.
│
└── resources/
    ├── api-patterns.md        # Detailed API patterns
    ├── database-examples.md   # Database interaction examples
    └── testing-guide.md       # Testing best practices
```

## Conversion Checklist

When converting agent to directory structure:

- [ ] Create `agents/{agent-name}/` directory
- [ ] Move agent content to `SKILL.md`
- [ ] Add `description` field to frontmatter
- [ ] Extract detailed content to `resources/`
- [ ] Add `@path` references in SKILL.md body
- [ ] Update plugin.json path reference
- [ ] Test agent loading
- [ ] Measure token savings

## Token Savings Target

| Agent Type | Before (tokens) | After (tokens) | Savings |
|------------|-----------------|----------------|---------|
| Controller | ~800 | ~300 | 62% |
| Execution | ~600 | ~250 | 58% |
| Support | ~400 | ~150 | 62% |

**Target: 40-60% token savings across agent catalog**

## Example: Full Controller SKILL.md

```yaml
---
name: engineering-manager
description: "Coordinates engineering work via question-based delegation. Use for tier 2+ engineering tasks requiring multi-specialist coordination."
tier: controller
domain: make
model: opus
coordination_style: question_based
typical_questions:
  - "What is the current implementation?"
  - "What are the technical constraints?"
  - "What are the key risks?"
color: bright_white
capabilities:
  - strategic_oversight
  - risk_assessment
  - team_coordination
tools: Read, Grep, Glob, Write, Bash, TodoWrite, Task
---

# Engineering Manager

Strategic leader for engineering coordination.

## Core Responsibilities

1. Risk assessment for tier 3-4 plans
2. Multi-instruction priority arbitration
3. Go/no-go decisions

See @resources/risk-framework.md for detailed assessment criteria.
See @resources/coordination-examples.md for delegation patterns.
```
