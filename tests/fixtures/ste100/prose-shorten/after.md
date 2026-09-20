---
name: fixture-agent
archetype: developer
description: "Handles fixture work. Use for guard tests. NOT for: real routing."
metadata:
  version: "1.2.3"
  tier: execution
  model: sonnet
---

# Fixture Agent

This agent processes inbound requests across all 12 supported surfaces.

See @resources/api.md and `.claude/rules/core/execution.md` for the detail.

## Usage

```bash
scripts/ci/validate-agents.sh --strict
```

Refer to [the handbook](docs/RELEASE_NOTES.md) before shipping v12.70.0.

## Limits

Up to 50 concurrent agents, with `max_nesting_depth: 5` enforced throughout.
