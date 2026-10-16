---
name: ex-skill-authoring-progressive-disclosure
description: "Example: the Anthropic three-tier progressive-disclosure model (metadata, a SKILL.md body under 500 lines, bundled resources loaded on demand) plus the scripts-as-black-box rule (run --help first, do not read the source into context). Load when you structure a SKILL.md that is growing too large."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-skill-authoring-progressive-disclosure
  category: skill-authoring
  source_repo: anthropics/skills
  source_url: "https://github.com/anthropics/skills"
  source_commit: dbd4588f9e1033efb41dad4bef2f7947c8993d44
  reviewed: "2026-10-15"
  applies_to:
    - cagents:planner
    - cagents:technical-writer
  demonstrates: "Three load tiers (metadata / body <500 lines / bundled resources) + scripts-as-black-box (--help first, don't ingest source)."
  added: "2026-07-10"
---

# Example: Progressive Disclosure + Scripts-as-Black-Box

## Context
cAgents uses three-tier disclosure in its structure. Its `skill-size-monitor`
warns at 600 lines and blocks at 900 lines. Anthropic's ideal is under 500
lines. This example shows the official discipline. It also shows the
black-box rule for scripts, which cAgents does not codify yet.

## Example

There are three load tiers. The cost goes up at each tier, so put content at the
cheapest tier that works:

```
1. Metadata (name + description)   ~100 words, ALWAYS in context.
2. SKILL.md body                   loaded when the skill triggers; <500 lines ideal.
3. Bundled resources/references/   loaded/executed ON DEMAND; effectively unlimited.
```

Rule: keep SKILL.md under 500 lines. When the body gets near that limit, add one
more level of hierarchy, with clear pointers that tell the model where to go
next. Give each reference file over 300 lines a table of contents. Point to a
reference with guidance on when to read it, not with a bare link:

```
See references/api-patterns.md for the full pattern catalog.   # weak
Load references/forms.md during Phase 2 (form-fill) only.       # strong: gated
```

The layout of bundled resources:

```
skill-name/
├── SKILL.md        (required)
├── scripts/        executable code for deterministic/repetitive tasks (BLACK BOX)
├── references/     docs loaded into context as needed, organized by variant
└── assets/         files used in output (templates, fonts, icons)
```

**Scripts are black boxes.** Run a bundled script with `--help` first. Read its
source only if the script fails and you need a custom solution. Large scripts
fill the context window and give no benefit. Organize `references/` by variant,
for example `references/{aws,gcp,azure}.md`, so only the relevant file loads.

**Length is not cruft.** Do not justify a deletion by its character count alone.
A threshold cut must remove stale instructions, not the context and the reasons
that the model needs.

## Why it matters
This supports a lower SKILL.md warning threshold in cAgents, toward 500 lines.
It also supports moving large always-loaded rules behind on-demand
`@`-references with a table of contents. Both cut the context that every agent
pays for. Distilled from anthropics/skills `skills/skill-creator/SKILL.md`,
`skills/webapp-testing/SKILL.md`, and the keep list in
`skills/claude-api/shared/prompt-audit.md`.
