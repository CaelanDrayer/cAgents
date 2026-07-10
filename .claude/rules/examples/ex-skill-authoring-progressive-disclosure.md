---
name: ex-skill-authoring-progressive-disclosure
description: "Example: the Anthropic three-tier progressive-disclosure model (metadata / SKILL.md body <500 lines / bundled resources loaded on demand) plus the scripts-as-black-box rule (--help first, don't ingest source into context). Load when structuring a SKILL.md that is growing too large."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-skill-authoring-progressive-disclosure
  category: skill-authoring
  source_repo: anthropics/skills
  source_url: "https://github.com/anthropics/skills"
  applies_to:
    - cagents:planner
    - cagents:technical-writer
  demonstrates: "Three load tiers (metadata / body <500 lines / bundled resources) + scripts-as-black-box (--help first, don't ingest source)."
  added: "2026-07-10"
---

# Example: Progressive Disclosure + Scripts-as-Black-Box

## Context
cAgents already uses three-tier disclosure structurally, but its `skill-size-monitor`
warns at 600 / blocks at 900 lines — laxer than Anthropic's <500-line *ideal*. This
example shows the official discipline and the black-box-scripts rule cAgents does not
yet codify.

## Example

Three load tiers (cost rises per tier — put content at the cheapest tier that works):

```
1. Metadata (name + description)   ~100 words, ALWAYS in context.
2. SKILL.md body                   loaded when the skill triggers; <500 lines ideal.
3. Bundled resources/references/   loaded/executed ON DEMAND; effectively unlimited.
```

Rule: *"Keep SKILL.md under 500 lines; if you're approaching this limit, add an
additional layer of hierarchy along with clear pointers about where the model should
go next."* For any reference file >300 lines, include a table of contents. Point to it
with *when-to-read* guidance, not just a bare link:

```
See references/api-patterns.md for the full pattern catalog.   # weak
Load references/forms.md during Phase 2 (form-fill) only.       # strong — gated
```

Bundled-resource taxonomy:

```
skill-name/
├── SKILL.md        (required)
├── scripts/        executable code for deterministic/repetitive tasks (BLACK BOX)
├── references/     docs loaded into context as needed, organized by variant
└── assets/         files used in output (templates, fonts, icons)
```

**Scripts are black boxes** (webapp-testing states it directly): "Always run scripts
with `--help` first. DO NOT read the source until you try running the script first and
find that a customized solution is absolutely necessary. These scripts can be very
large and thus pollute your context window." Organize `references/` by variant
(`references/{aws,gcp,azure}.md`, `reference/{node,python}_mcp_server.md`) so only the
relevant file loads.

## Why it matters
Directly informs lowering cAgents' SKILL.md warn threshold toward 500 and pushing
large always-loaded rules behind on-demand `@`-references with TOCs — cutting the
context every agent pays. Distilled from anthropics/skills `skills/skill-creator/SKILL.md`
+ `webapp-testing/SKILL.md`.
