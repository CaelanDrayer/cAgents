# Model Routing Guidelines

Project-level model routing configuration for cAgents V9.0.

## Overview

cAgents supports project-level model routing overrides via `.cagents/model_routing.yaml`. This allows projects to customize model selection for cost control, quality requirements, or specific use cases.

## Configuration Location

```
your-project/
├── .cagents/
│   └── model_routing.yaml    # Project-specific overrides
└── ...
```

## Override Options

### Available Models

| Model | ID | Best For | Notes |
|-------|----|----------|-------|
| **opus** | `opus` | Complex reasoning, architecture | Highest capability |
| **opusplan** | `opusplan` | Controllers, coordination | Opus for planning/reasoning, Sonnet for execution. Ideal for controllers that reason about coordination but delegate implementation. |
| **sonnet** | `sonnet` | Implementation, general tasks | Balanced capability and cost |
| **haiku** | `haiku` | Support, lightweight tasks | Fastest, lowest cost |

### The `opusplan` Model

The `opusplan` model uses a hybrid approach: Opus-level reasoning for planning and coordination decisions, with Sonnet-level execution for tool use and implementation. This makes it ideal for controller agents that need to reason about complex coordination but delegate all implementation to execution agents.

**Default assignment**: All controller agents with `model: opus` are set to `opusplan`. Infrastructure agents like the optimizer also use `opusplan`.

### Context Window Options

The `[1m]` context window option enables 1M token context for large codebases:
- Use when working with 50+ files or 100K+ tokens of context
- Supported by Sonnet and Haiku models
- Higher cost per request due to extended context
- Configure via `.cagents/model_routing.yaml` or agent frontmatter

### Default Model

Set a default model for all project tasks:

```yaml
# .cagents/model_routing.yaml
default_model: sonnet  # Options: opus, opusplan, sonnet, haiku
```

### Tier-Based Overrides

Override models for specific complexity tiers:

```yaml
tier_models:
  tier_2: sonnet   # Moderate complexity (minimum tier)
  tier_3: sonnet   # Complex tasks
  tier_4: opus     # Expert tasks (or sonnet for cost control)
```

### Effort Level Mapping

Each tier maps to an effort level that influences model behavior:

| Tier | Effort Level | Description |
|------|-------------|-------------|
| Tier 2 | medium | Moderate reasoning, balanced speed/quality |
| Tier 3 | high | Deep reasoning, thorough analysis |
| Tier 4 | high | Maximum reasoning, comprehensive review |

### Scenario-Based Overrides

Override models for specific execution scenarios:

```yaml
scenario_models:
  think: opus           # Complex reasoning
  background: haiku     # Lightweight operations
  longContext: sonnet   # Large context handling
  default: sonnet       # Standard operations
```

### Agent-Specific Overrides

Override models for specific agents:

```yaml
agent_models:
  architect: opus           # Always use Opus for architecture
  backend-developer: sonnet # Standard for implementation
  scribe: haiku             # Lightweight for support tasks
```

### Cost Limits

Set project-specific cost controls:

```yaml
cost_limits:
  max_cost_per_session: 5.00    # USD per workflow session
  max_cost_per_request: 2.00    # USD per API request
  daily_budget: 20.00           # USD daily limit
```

### Model Restrictions

Force model boundaries:

```yaml
# Never use Opus (strict cost control)
disable_opus: true

# Never use Haiku (quality floor)
disable_haiku: true
```

## Complete Example

```yaml
# .cagents/model_routing.yaml
# Project: Cost-sensitive development environment

# Default to Sonnet for balanced performance
default_model: sonnet

# Override specific tiers (minimum tier 2)
tier_models:
  tier_2: sonnet   # Moderate tasks
  tier_4: sonnet   # Don't use Opus even for complex tasks

# Keep Opus for architecture decisions only
agent_models:
  architect: opus

# Cost controls
cost_limits:
  max_cost_per_session: 5.00
  daily_budget: 20.00

# Never use Opus for general tasks
disable_opus: true
```

## Selection Priority

Model selection follows this priority order (highest wins):

1. **Environment variable `CLAUDE_MODEL`** (absolute override)
2. **Environment variable `CLAUDE_AGENT_MODEL`** (agent-specific override)
3. **Project overrides** (`.cagents/model_routing.yaml`)
4. **Agent frontmatter** (`model:` field in SKILL.md)
5. **Tier-based defaults** (tier 2-4 matrix)
6. **Scenario detection** (think, background, longContext)
7. **Default model** (sonnet)
8. **Fallback chain** (if primary unavailable)
9. **Cost limit enforcement** (downgrade if over budget)

### Environment Variable Priority

Environment variables take absolute precedence over all other configuration:

```bash
# Override ALL agents to use a specific model
export CLAUDE_MODEL=sonnet

# Override only subagent model selection
export CLAUDE_AGENT_MODEL=haiku
```

`CLAUDE_MODEL` overrides everything including agent frontmatter. `CLAUDE_AGENT_MODEL` overrides only subagent (Task tool) model selection but not the main agent.

## Validation

Project override files are validated at workflow start:

- Invalid model names are ignored with warning
- Invalid YAML syntax causes fallback to system defaults
- Cost limits are enforced after model selection

## System Config

System-level routing configuration:
`Agent_Memory/_system/config/model_routing.yaml`

This file defines:
- Model definitions and capabilities
- Default tier-based matrix
- Agent type overrides
- Fallback chains
- Cost tracking settings
