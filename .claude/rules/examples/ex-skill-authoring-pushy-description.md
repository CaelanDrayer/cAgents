---
name: ex-skill-authoring-pushy-description
description: "Example: the Anthropic convention that the description IS the triggering mechanism — pack what-it-does + concrete trigger keywords + file-type cues + explicit NOT-for negative boundaries, because Claude under-triggers. Load when writing or tightening an agent/skill description."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-skill-authoring-pushy-description
  category: skill-authoring
  source_repo: anthropics/skills
  source_url: "https://github.com/anthropics/skills"
  applies_to:
    - cagents:planner
    - cagents:technical-writer
  demonstrates: "The description IS the trigger: what-it-does + trigger keywords + file cues + explicit NOT-for negative boundaries."
  added: "2026-07-10"
---

# Example: Pushy Description + Negative Boundaries

## Context
For a skill or agent, the `description` is the *primary triggering mechanism* — all
"when to use" info goes there, not in the body. Claude currently *under*-triggers, so
descriptions should be deliberately pushy. cAgents' 4 skills already do this; many of
the 58 agent descriptions are terse one-liners without trigger coverage or NOT-for
boundaries.

## Example

Weak (under-triggers):

```yaml
description: "How to build a dashboard."
```

Strong — packs (a) what it does, (b) trigger keywords, (c) file/artifact cues,
(d) explicit negative boundaries:

```yaml
description: "How to build a dashboard. Use this whenever the user mentions
  dashboards, data visualization, internal metrics, or wants to display any kind of
  company data, even if they don't explicitly ask for a 'dashboard'."
```

The gold standard is the document-suite `xlsx` skill's NOT-for clause:

```yaml
description: "... use any time a spreadsheet is the primary I/O. Do NOT trigger when
  the primary deliverable is a Word document, HTML report, standalone Python script,
  database pipeline, or Google Sheets API integration, even if tabular data is involved."
```

cAgents shape — apply what + trigger + NOT-for to an agent:

```yaml
description: "Coordinates engineering work via question-based delegation. Use for
  tier 2+ engineering tasks needing multi-specialist coordination — build, fix,
  refactor, migrate. NOT for: single-domain content writing (use editor) or
  cross-domain strategy (use /team strategic mode)."
```

Anthropic treats trigger quality as *measurable*: a 20-query eval (should-trigger +
should-NOT near-misses, run 3x, 60/40 train/test) selects the best description by
held-out score — not prose written once.

## Why it matters
The cheapest, highest-leverage router-accuracy improvement for the cAgents catalog:
descriptions with keywords + explicit NOT-for boundaries reduce mis-selection.
Distilled from anthropics/skills `skills/skill-creator/SKILL.md` + the `xlsx`/`docx`
descriptions.
