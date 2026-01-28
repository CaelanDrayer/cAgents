# Model Routing Guidelines

Project-level model routing configuration for cAgents V8.0.

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

### Default Model

Set a default model for all project tasks:

```yaml
# .cagents/model_routing.yaml
default_model: sonnet  # Options: opus, sonnet, haiku
```

### Tier-Based Overrides

Override models for specific complexity tiers:

```yaml
tier_models:
  tier_0: haiku    # Trivial tasks
  tier_1: haiku    # Simple tasks
  tier_2: sonnet   # Moderate complexity
  tier_3: sonnet   # Complex tasks
  tier_4: opus     # Expert tasks (or sonnet for cost control)
```

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

# Override specific tiers
tier_models:
  tier_0: haiku
  tier_1: haiku
  tier_4: sonnet  # Don't use Opus even for complex tasks

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

Model selection follows this priority order:

1. **Project overrides** (`.cagents/model_routing.yaml`)
2. **Agent-specific overrides** (system config)
3. **Scenario detection** (think, background, longContext)
4. **Tier-based matrix** (tier 0-4)
5. **Default model** (sonnet)
6. **Fallback chain** (if primary unavailable)
7. **Cost limit enforcement** (downgrade if over budget)

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
