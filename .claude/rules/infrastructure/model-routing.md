---
paths:
  - ".cagents/**"
  - "**/config/*.yaml"
  - "**/agents/*.md"
---

# Model Routing Guidelines

This file gives the project-level model routing configuration for cAgents V9.0.

## Overview

cAgents supports project-level model routing overrides. You declare them in
`.cagents/model_routing.yaml`. A project can then customize its model selection
for cost control, for a quality need, or for a specific use case.

## Current Claude Model Set

These four ids are the complete set declared in `model_routing.yaml`. They are
sourced from the `claude-api` skill, recorded in `outputs/model-ids.md` of
session `act_ste100-concise-writing_260910_001`.

| Display name | API ID |
|---|---|
| Claude Fable 5 | `claude-fable-5` |
| Claude Opus 5 | `claude-opus-5` |
| Claude Sonnet 5 | `claude-sonnet-5` |
| Claude Haiku 4.5 | `claude-haiku-4-5` |

These ids are alias-form and complete as written. Never append a date suffix.
There is no Haiku 5, so `claude-haiku-4-5` is both the alias and the current
generation for that tier.

Context-window and pricing figures are deliberately omitted here, matching
`model_routing.yaml`. The provenance artifact records them for Fable 5 only.
Read them there rather than reconstructing them.

## Configuration Location

```
your-project/
├── .cagents/
│   └── model_routing.yaml    # Project-specific overrides
└── ...
```

## Override Options

### Available Models (cAgents Aliases)

`model_routing.yaml` defines five aliases. Four resolve to an API model id.
`opusplan` does not.

| Alias | Maps to | API ID | Best for |
|---|---|---|---|
| **fable** | Claude Fable 5 | `claude-fable-5` | Pipeline planning, architecture decisions |
| **opus** | Claude Opus 5 | `claude-opus-5` | Executive oversight, risk assessment |
| **opusplan** | Claude Code harness alias | none (`id: null`) | Controllers, coordination |
| **sonnet** | Claude Sonnet 5 | `claude-sonnet-5` | Execution, implementation, documentation |
| **haiku** | Claude Haiku 4.5 | `claude-haiku-4-5` | Background operations, simple lookups |

No agent in the 60-agent catalog declares `haiku`. That entry exists so the
background scenario has a defined target.

### What selects a model

`metadata.model` in an agent file is an advisory record of intent. The readers
of that key are the two linters, `scripts/lint-agents.sh` and
`scripts/validate_agent.cjs`, and the catalog generator
`scripts/generate-catalog.sh`. A maintenance writer,
`scripts/update-agent-frontmatter.cjs`, also writes the key.

Claude Code reads a top-level `model:` key in the frontmatter. No agent in the
60-agent catalog declares one, so the loader gets no model value from a cAgents
agent file.

The `model` parameter of the Agent tool selects the model at spawn time. The
agent that spawns passes that parameter. `model-routing-advisor.cjs` checks the
parameter against `metadata.tier` and prints an advisory warning when the two
disagree. The hook never blocks a spawn.

A change to `metadata.model` in an agent file does not change which model
runs. To change the model, pass a different `model` value to
the Agent tool.

The canonical allowlist is `opus, opusplan, sonnet, haiku, fable, inherit`.
Three places enforce it:

- `scripts/lint-agents.sh`, Check 23
- `scripts/validate_agent.cjs`
- `tests/regressions/model-allowlist-drift.test.js`, which pins the two lists
  together and fails when an agent declares a model outside the list

### The `fable` tier

`fable` is the frontier tier. Exactly three agents use it:

- **orchestrator** (moves from `opus`)
- **planner** (moves from `opus`)
- **architect** (moves from `opusplan`, per decision D2)

No other agent uses `fable`. The set is a fixed list, not a category to infer
from. Do not add a fourth agent on judgement. Further candidates are reviewed
under WI-034, whose default is no change.

> **Resolved.** `fable` is a valid frontmatter alias for `model:`, and Claude
> Code documents it with `sonnet`, `opus`, and `haiku`. cAgents nests the key
> under `metadata:`, and the agent loader reads only a top-level `model:` key.
> The loader therefore ignores this declaration, which records intent only. The
> Agent tool's `model` parameter selects the model at spawn time, as "What
> selects a model" above explains. `model-routing-advisor.cjs` exempts these
> three agent names from the tier advisory, so a spawn with `fable` gives no
> warning for them. CI rejects a `model:` value outside the allowlist:
> `scripts/lint-agents.sh` Check 23 and
> `tests/regressions/model-allowlist-drift.test.js` run that check.

### The `opusplan` harness alias

`opusplan` is a **Claude Code harness alias, not an API model id.** You cannot
call it. It carries `id: null` in `model_routing.yaml`.

A grep over the whole `claude-api` skill bundle returns zero hits for
`opusplan`. No `claude-opusplan-*` string exists, and none may be invented.

The config can name the two ids that the harness composes:
`claude-opus-5` for the planning turn, `claude-sonnet-5` for execution turns.
No cAgents code path parses `planning_model` or `execution_model`. The harness
does not read the cAgents agent files either, because cAgents nests `model:`
under `metadata:`.

**Controller assignment is unchanged.** The 24 controllers that declared
`opusplan` keep it, with exactly one named exception: `architect` moves to
`fable` per decision D2. That leaves 23 controllers on `opusplan`. Those 23
declarations have the same advisory status as `fable`. The intent stands, and
the routing is not wired.

### Context Window Options

The `[1m]` context window option gives a 1M token context for a large codebase:
- Use it when you work with 50+ files or 100K+ tokens of context
- The Sonnet models and the Haiku models support it
- The cost per request is higher, because the context is extended
- Configure it in `.cagents/model_routing.yaml`, or in the agent frontmatter

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
| Tier 4 | high | Maximum reasoning, full review of every part |

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
  architect: fable            # Frontier tier for architecture decisions
  backend-developer: sonnet   # Standard for implementation
  technical-writer: sonnet    # Standard for documentation
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

Claude Code gives you several native model configuration mechanisms:

### Model Setting Methods (Priority Order)
1. **During session**: `/model <alias|name>` to switch mid-session
2. **At startup**: `claude --model <alias|name>`
3. **Environment variable**: `ANTHROPIC_MODEL=<alias|name>`
4. **Settings file**: `"model": "opus"` in settings.json

### Claude Code Model Aliases

| Alias | Behavior |
|-------|----------|
| `default` | Depends on account type (Max/Team Premium: Opus, Pro/Team Standard: Sonnet) |
| `sonnet` | Latest Sonnet (currently Sonnet 5) |
| `opus` | Latest Opus (currently Opus 5) |
| `haiku` | Fast, efficient Haiku |
| `sonnet[1m]` | Sonnet with 1M token context window |
| `opusplan` | Opus during plan mode, Sonnet for execution |

### modelOverrides Setting (CC 2.1.73)

The `modelOverrides` setting in `settings.json` gives you project-level model
overrides. You need no environment variable:

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

This setting is equivalent to `CLAUDE_CODE_SUBAGENT_MODEL`. It is scoped to
specific model roles, and you configure it for each project in settings.json.

### Effort Levels (Claude Code Native)

Effort levels control Opus 4.8's adaptive reasoning:
- **low**: Faster, cheaper for straightforward tasks
- **medium**: Balanced
- **high** (default): Deeper reasoning for complex problems

Set the effort level in one of three places: the `/model` slider, the
`CLAUDE_CODE_EFFORT_LEVEL` environment variable, or `effortLevel` in
settings.json.

### 1M Context Window

Opus 4.8 and Sonnet 4.6 support a 1M token context in beta. The standard rates
apply up to 200K tokens, and the long-context pricing applies after that.
Disable the option with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`.

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

Optimize the structure of your prompt for KV-cache efficiency. When the API
processes a prompt, the KV-cache stores the computed attention for the prefix
tokens. A later request with the same prefix reuses those cached computations.
The reuse lowers the latency and the cost.

### Principles

1. **Stable prefixes**: keep the system prompts, the instructions, and the
   static context at the TOP of a prompt. These parts change little between
   calls, so they cache well.

2. **Dynamic content last**: place the variable content at the END of a prompt.
   The user input, the tool results, and the conversation history are variable
   content. This order makes the cacheable prefix as long as possible.

3. **Append-only context**: when you build a multi-turn context, append the new
   information. Do not restructure the context. A restructure invalidates the
   cache for every token after the change.

4. **Consistent agent prompts**: the content of the agent SKILL.md forms the
   system prompt. Keep that content stable. Do not customize the system prompt
   for each request. Pass the variable context as user messages instead.

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

- 27 execution agents: `model: opus` (Claude Opus 5)
- 3 controllers: `model: opusplan` (Opus planning mode)
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

> **Known gap**: `model_routing.yaml` applies `agent_overrides` at its own step
> 3 and defines no precedence against agent frontmatter. The two disagree today
> for the six executive controllers.

## Validation

cAgents validates each project override file at workflow start:

- An invalid model name is ignored, and a warning goes to the log
- Invalid YAML syntax causes a fallback to the system defaults
- The cost limits are enforced after the model selection

## System Config

System-level routing configuration:
`cagents-memory/_system/config/model_routing.yaml`

This file defines:
- Model definitions and capabilities
- Default tier-based matrix
- Agent type overrides
- Fallback chains
- Cost tracking settings
