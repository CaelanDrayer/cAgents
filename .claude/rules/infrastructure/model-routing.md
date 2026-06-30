---
paths:
  - ".cagents/**"
  - "**/config/*.yaml"
  - "**/agents/**/SKILL.md"
---

# Model Routing Guidelines

Project-level model routing configuration for cAgents V9.0.

## Overview

cAgents supports project-level model routing overrides via `.cagents/model_routing.yaml`. This allows projects to customize model selection for cost control, quality requirements, or specific use cases.

## Current Claude Model Generations (Opus 4.8 / Sonnet 4.6 / Haiku 4.5)

As of June 2026, the latest Claude models are:

| Model | API ID | Context Window | Max Output | Pricing (input/output per MTok) |
|-------|--------|----------------|------------|----------------------------------|
| **Claude Opus 4.8** | `claude-opus-4-8` | 200K / 1M (beta) | 128K tokens | $5 / $25 |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | 200K / 1M (beta) | 64K tokens | $3 / $15 |
| **Claude Haiku 4.5** | `claude-haiku-4-5` | 200K | 64K tokens | $1 / $5 |

All models support text/image input, extended thinking, and adaptive thinking (except Haiku). Opus 4.8 and Sonnet 4.6 support 1M token context windows via beta header.

> **Note (CC 2.1.77)**: Opus 4.8 has a **64K default output limit** with a **128K upper bound**. The upper bound requires extended output headers. Sonnet 4.6 has a 64K maximum output.

## Configuration Location

```
your-project/
├── .cagents/
│   └── model_routing.yaml    # Project-specific overrides
└── ...
```

## Override Options

### Available Models (cAgents Aliases)

cAgents uses abstract aliases that map to the latest Claude models:

| Alias | Maps To | API ID | Best For | Notes |
|-------|---------|--------|----------|-------|
| **opus** | Claude Opus 4.8 | `claude-opus-4-8` | Complex reasoning, architecture | Highest capability, 128K max output |
| **opusplan** | Claude Opus 4.8 (plan) + Sonnet 4.6 (execute) | `claude-opus-4-8` / `claude-sonnet-4-6` | Controllers, coordination | Opus for planning/reasoning, Sonnet for execution. Ideal for controllers that reason about coordination but delegate implementation. |
| **sonnet** | Claude Sonnet 4.6 | `claude-sonnet-4-6` | Implementation, general tasks | Balanced capability and cost, 1M context support |
| **haiku** | Claude Haiku 4.5 | `claude-haiku-4-5` | Support, lightweight tasks | Fastest, lowest cost |

### The `opusplan` Model

The `opusplan` model uses a hybrid approach: Claude Opus 4.8-level reasoning for planning and coordination decisions, with Claude Sonnet 4.6-level execution for tool use and implementation. This makes it ideal for controller agents that need to reason about complex coordination but delegate all implementation to execution agents.

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

## Claude Code Model Configuration (Native)

Claude Code provides several native model configuration mechanisms:

### Model Setting Methods (Priority Order)
1. **During session**: `/model <alias|name>` to switch mid-session
2. **At startup**: `claude --model <alias|name>`
3. **Environment variable**: `ANTHROPIC_MODEL=<alias|name>`
4. **Settings file**: `"model": "opus"` in settings.json

### Claude Code Model Aliases

| Alias | Behavior |
|-------|----------|
| `default` | Depends on account type (Max/Team Premium: Opus, Pro/Team Standard: Sonnet) |
| `sonnet` | Latest Sonnet (currently Sonnet 4.6) |
| `opus` | Latest Opus (currently Opus 4.8) |
| `haiku` | Fast, efficient Haiku |
| `sonnet[1m]` | Sonnet with 1M token context window |
| `opusplan` | Opus during plan mode, Sonnet for execution |

### modelOverrides Setting (CC 2.1.73)

The `modelOverrides` setting in `settings.json` allows project-level model overrides without environment variables:

```json
{
  "modelOverrides": {
    "weakModel": "claude-haiku-4-5",
    "backgroundModel": "claude-haiku-4-5"
  }
}
```

| Key | Purpose |
|-----|---------|
| `weakModel` | Override the model used for lightweight/background tasks |
| `backgroundModel` | Override the model used for background agent operations |
| `summaryModel` | Override the model used for context summarization |

This is equivalent to `CLAUDE_CODE_SUBAGENT_MODEL` but scoped to specific model roles and configurable per-project via settings.json.

### Effort Levels (Claude Code Native)

Effort levels control Opus 4.8's adaptive reasoning:
- **low**: Faster, cheaper for straightforward tasks
- **medium**: Balanced
- **high** (default): Deeper reasoning for complex problems

Set via: `/model` slider, `CLAUDE_CODE_EFFORT_LEVEL` env var, or `effortLevel` in settings.json.

### 1M Context Window

Opus 4.8 and Sonnet 4.6 support 1M token context (beta). Standard rates up to 200K tokens, then long-context pricing. Disable with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`.

### Model Restriction (Managed)

Administrators can restrict model selection:
```json
{ "availableModels": ["sonnet", "haiku"] }
```

### Model-Specific Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_MODEL` | Override model for all requests |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Pin opus alias to specific version |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Pin sonnet alias to specific version |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Pin haiku alias to specific version |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Override model for all subagents |
| `CLAUDE_CODE_EFFORT_LEVEL` | Reasoning effort: low, medium, high |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | Revert to fixed thinking budget |
| `MAX_THINKING_TOKENS` | Fixed thinking budget (when adaptive disabled) |

### Prompt Caching

Enabled by default. Disable with:
- `DISABLE_PROMPT_CACHING=1` (all models)
- `DISABLE_PROMPT_CACHING_OPUS=1` (Opus only)
- `DISABLE_PROMPT_CACHING_SONNET=1` (Sonnet only)
- `DISABLE_PROMPT_CACHING_HAIKU=1` (Haiku only)

## KV-Cache Optimization Guidelines

Optimize prompt structure for KV-cache efficiency. When the API processes prompts, the KV-cache stores computed attention for prefix tokens. Subsequent requests sharing the same prefix reuse cached computations, reducing latency and cost.

### Principles

1. **Stable prefixes**: Keep system prompts, instructions, and static context at the TOP of prompts. These rarely change between calls and will cache effectively.

2. **Dynamic content last**: Place variable content (user input, tool results, conversation history) at the END of prompts. This maximizes the cacheable prefix length.

3. **Append-only context**: When building multi-turn context, append new information rather than restructuring. Restructuring invalidates the cache for all subsequent tokens.

4. **Consistent agent prompts**: Agent SKILL.md content forms the system prompt. Keep this stable -- avoid per-request customization of the system prompt when possible. Pass variable context as user messages instead.

### Prompt Structure for Cache Efficiency

```
[CACHEABLE - Stable prefix]
├── System instructions (SKILL.md content)
├── Rules and guidelines (.claude/rules/*.md)
├── Domain configuration (domain_overrides.yaml)
└── Static context (architecture docs, patterns)

[VARIABLE - Dynamic suffix]
├── Session-specific context (plan.yaml objectives)
├── Current work item details
├── Previous tool results
└── User's specific request
```

### Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Restructure system prompt per request | Keep system prompt identical; vary user messages |
| Embed dynamic data in agent frontmatter | Pass dynamic data as delegation prompt content |
| Shuffle instruction order between calls | Maintain consistent instruction ordering |
| Include timestamps in system context | Put timestamps in user/assistant messages only |

### Impact

With proper prompt structure:
- **Cache hit rate**: 80-95% for stable system prompts
- **Latency reduction**: ~50% for cached prefixes (time-to-first-token)
- **Cost reduction**: Cached input tokens are billed at reduced rates

### Creative Domain Model Policy

- 27 execution agents: `model: opus` (Claude Opus 4.8)
- 3 controllers: `model: opusplan` (Opus 4.8 planning mode)
- Rationale: Creative work demands highest-quality reasoning
- Team mode: Custom model frontmatter respected since Claude Code 2.1.47

## cAgents Model Selection Priority

Model selection follows this priority order (highest wins):

1. **Claude Code env vars** (`ANTHROPIC_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL`)
2. **Claude Code settings** (`model` in settings.json)
3. **Project overrides** (`.cagents/model_routing.yaml`)
4. **Agent frontmatter** (`model:` field in SKILL.md)
5. **Tier-based defaults** (tier 2-4 matrix)
6. **Scenario detection** (think, background, longContext)
7. **Default model** (sonnet)
8. **Fallback chain** (if primary unavailable)
9. **Cost limit enforcement** (downgrade if over budget)

## Validation

Project override files are validated at workflow start:

- Invalid model names are ignored with warning
- Invalid YAML syntax causes fallback to system defaults
- Cost limits are enforced after model selection

## System Config

System-level routing configuration:
`cagents-memory/_system/config/model_routing.yaml`

This file defines:
- Model definitions and capabilities
- Default tier-based matrix
- Agent type overrides
- Fallback chains
- Cost tracking settings
