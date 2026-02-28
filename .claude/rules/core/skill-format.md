---
paths:
  - "**/agents/**/*.md"
  - "**/agents/**/SKILL.md"
  - ".claude/skills/**"
---

# SKILL.md Agent and Skill Format Specification

V9.25.0 agent/skill format based on official Claude Code SKILL.md and subagent specification.

## Frontmatter Schema

```yaml
---
name: agent-name                    # Required: Unique identifier (kebab-case)
description: "Brief description"    # Required: 1-2 sentence purpose statement
tier: controller|execution|support  # Required: Agent tier classification
domain: engineering|creative|business|growth|people|service|leadership|shared|core  # Required: Business domain
model: opus|opusplan|sonnet|haiku  # Optional: Preferred model (see model_routing.yaml)
coordination_style: question_based  # Optional: For controllers only
typical_questions: [...]           # Optional: For controllers only
capabilities: [...]                # Optional: List of capabilities
tools: ["Read", "Write", "Bash"]   # V9.0: JSON array format (not comma-separated)
color: bright_blue                 # Optional: Display color
maxTurns: 40                       # V9.0: Maximum agentic turns
permissionMode: "bypassPermissions" # V9.0: For infrastructure + controllers
memory: {"project": true}          # V9.0: Persistent memory for learning agents
disallowedTools: ["Task"]          # V9.0: For support agents (prevent delegation)
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
- One of: `engineering`, `creative`, `business`, `growth`, `people`, `service`, `leadership`, `shared`, `core`
- Determines which planner_config.yaml is loaded

## Optional Fields

### model
- Preferred model alias: `opus`, `opusplan`, `sonnet`, or `haiku`
- These aliases map to the latest Claude generation: `opus` -> Claude Opus 4.6, `sonnet` -> Claude Sonnet 4.6, `haiku` -> Claude Haiku 4.5
- `opusplan`: Claude Opus 4.6 reasoning + Claude Sonnet 4.6 execution (ideal for controllers)
- Overridden by model_routing.yaml scenario detection and environment variables
- If omitted, uses model_routing.yaml defaults

### maxTurns (V9.0)
- Maximum number of agentic turns (API round-trips)
- Infrastructure: 15-50, Controllers: 40, Execution: 30, Support: 10
- Prevents runaway agent loops

### permissionMode (V9.0)
- `"bypassPermissions"` for infrastructure and controller agents
- Execution agents omit this (need user approval for writes)
- Support agents omit this

### memory (V9.0)
- `{"project": true}` for learning agents (controllers, qa-lead, optimizer, architect)
- Enables persistent memory across sessions

### disallowedTools (V9.0)
- `["Task"]` for support agents to prevent unauthorized delegation
- Enforces tier boundaries

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
engineering/agents/engineering-manager/
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
domain: engineering
---

# Backend Developer Agent

[Full content here - 500+ tokens]
```

### Directory Agent (V8.0)

```
engineering/agents/backend-developer/
├── SKILL.md (~200 tokens)
│   ---
│   name: backend-developer
│   description: "Implements backend services..."
│   tier: execution
│   domain: engineering
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

## Skill Frontmatter (Claude Code Skills)

Skills in `.claude/skills/` use a separate frontmatter schema from agents:

```yaml
---
name: my-skill                     # Optional: Display name. Uses directory name if omitted
description: "What this skill does" # Recommended: When to use it
argument-hint: "<request> [flags]" # Optional: Autocomplete hint
disable-model-invocation: true     # Optional: Only user can invoke (default: false)
user-invocable: false              # Optional: Hide from / menu (default: true)
allowed-tools: Read, Grep, Bash    # Optional: Tool restrictions
model: opus                        # Optional: Model override
context: fork                      # Optional: Run in forked subagent context
agent: Explore                     # Optional: Subagent type when context:fork (default: general-purpose)
hooks:                             # Optional: Lifecycle hooks scoped to this skill
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---
```

### Skill Invocation Control

| Frontmatter | User can invoke | Claude can invoke | Context behavior |
|-------------|----------------|-------------------|------------------|
| (default) | Yes | Yes | Description in context, full loads on invoke |
| `disable-model-invocation: true` | Yes | No | Not in context, loads when user invokes |
| `user-invocable: false` | No | Yes | Description in context, loads when Claude invokes |

### String Substitutions in Skills

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` | Access specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`) |
| `${CLAUDE_SESSION_ID}` | Current session ID |

### Dynamic Context Injection

The `` !`command` `` syntax runs shell commands before skill content is sent to Claude:

```yaml
---
name: pr-summary
context: fork
agent: Explore
---
## PR Context
- PR diff: !`gh pr diff`
- Comments: !`gh pr view --comments`
```

Commands execute immediately and output replaces the placeholder.

### Running Skills in Subagents (context: fork)

When `context: fork` is set:
1. A new isolated context is created
2. The subagent receives skill content as its prompt
3. The `agent` field determines execution environment (model, tools, permissions)
4. Results summarized and returned to main conversation

Available agent types: `Explore` (read-only, haiku), `Plan` (read-only), `general-purpose` (all tools), or any custom subagent name.

### Skill Location Precedence

| Location | Scope | Priority |
|----------|-------|----------|
| Enterprise managed | All users in org | Highest |
| `~/.claude/skills/` | All your projects | High |
| `.claude/skills/` | This project only | Medium |
| Plugin `skills/` | Where plugin enabled | Lowest |

Skills from `--add-dir` directories are also loaded and support live change detection.

## Example: Full Controller SKILL.md

```yaml
---
name: engineering-manager
description: "Coordinates engineering work via question-based delegation. Use for tier 2+ engineering tasks requiring multi-specialist coordination."
tier: controller
domain: engineering
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
