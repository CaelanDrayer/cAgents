# Creating Agents

## Quick Start

1. Choose tier (controller or execution) and domain
2. Create `{domain}/agents/{agent-name}/SKILL.md`
3. Add to `{domain}/.claude-plugin/plugin.json`
4. Add to root `.claude-plugin/plugin.json`
5. Validate: `bash scripts/ci/validate-agents.sh`

## Agent SKILL.md Format

```markdown
---
name: my-agent
tier: execution
domain: engineering
answers_questions:
  - "What is the implementation approach for X?"
executes_tasks:
  - "Implement feature X"
---

# My Agent

Description of what the agent does.

## Capabilities

- Capability 1
- Capability 2

## Typical Tasks

- Task type 1
- Task type 2
```

## Frontmatter Fields

### Required
| Field | Description | Example |
|-------|-------------|---------|
| `name` | Agent identifier | `backend-developer` |
| `tier` | Agent tier | `controller`, `execution`, `support`, `executive` |

### Controller-Specific
| Field | Description |
|-------|-------------|
| `coordination_style` | `question_based` |
| `typical_questions` | Questions this controller asks |

### Execution-Specific
| Field | Description |
|-------|-------------|
| `answers_questions` | Questions this agent answers |
| `executes_tasks` | Tasks this agent performs |

## Tier Guidelines

### Controller (Tier 2)
- Coordinates work via question-based delegation
- NEVER does direct work
- Synthesizes answers from specialists
- Spawns execution agents via Task tool

### Execution (Tier 3)
- Answers questions with domain expertise
- Executes specific implementation tasks
- Provides concrete, verifiable evidence

### Support (Tier 4)
- Foundational services used by other agents
- Utility functions across domains

## Validation

```bash
bash scripts/ci/validate-agents.sh                    # All domains
bash scripts/ci/validate-agents.sh --domain engineering  # Single domain
bash scripts/ci/validate-agents.sh --strict             # Fail on warnings
```
