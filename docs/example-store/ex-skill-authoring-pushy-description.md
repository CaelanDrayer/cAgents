---
name: ex-skill-authoring-pushy-description
description: "Example: the Anthropic convention that the description is the trigger. Pack what it does, intent categories, artifact cues, and explicit NOT-for boundaries, because Claude under-triggers. Includes the limits on pushiness. Load when you write or tighten an agent or skill description."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-skill-authoring-pushy-description
  category: skill-authoring
  source_repo: anthropics/skills
  source_url: "https://github.com/anthropics/skills"
  source_commit: dbd4588f9e1033efb41dad4bef2f7947c8993d44
  reviewed: "2026-10-15"
  applies_to:
    - cagents:planner
    - cagents:technical-writer
  demonstrates: "The description IS the trigger: what-it-does + trigger keywords + file cues + explicit NOT-for negative boundaries."
  added: "2026-07-10"
---

# Example: Pushy Description + Negative Boundaries

## Context
For a skill or an agent, the `description` is the main trigger. Put all "when to
use" information there, not in the body. Claude under-triggers, so write the
description to be a little pushy. The 4 cAgents skills do this. Some of the 60
agent descriptions are short one-liners with no trigger coverage and no NOT-for
boundary.

## Example

Weak (under-triggers):

```yaml
description: "How to build a dashboard."
```

Strong. It packs (a) what it does, (b) intent categories, (c) artifact cues:

```yaml
description: "How to build a dashboard. Use this whenever the user mentions
  dashboards, data visualization, internal metrics, or wants to display any kind of
  company data, even if they don't explicitly ask for a 'dashboard'."
```

Add (d), an explicit negative boundary. The upstream spreadsheet skill names the
near-miss deliverables that must not trigger it. They are a word-processor
document, an HTML report, a standalone script, a database pipeline, and a
hosted-sheet API integration. It names them even when the request has tabular data.

The cAgents shape applies what + trigger + NOT-for to an agent:

```yaml
description: "Coordinates engineering work via question-based delegation. Use for
  tier 2+ engineering tasks needing multi-specialist coordination: build, fix,
  refactor, migrate. NOT for: single-domain content writing (use editor) or
  cross-domain strategy (use /team strategic mode)."
```

Anthropic measures trigger quality. A 20-query eval selects the best description
by held-out score. The queries are should-trigger cases and should-not near
misses. Each query runs 3 times, with a 60/40 train and test split.

## Limits
Pushy has limits. Upstream added these in its prompt-audit guide:

1. **Name intent categories, not synonyms.** A trigger list that grows one
   phrase for each missed trigger is cruft. Replace near-synonym lists with a
   short set of intent categories plus the NOT-for clause.
2. **Tune urgency with a trigger eval, not by feel.** Calibrated urgency is
   correct in a description. Boosters such as "CRITICAL: you MUST use this tool
   when..." now cause over-triggering.
3. **Obey the packaging limits.** Keep the description at 1,024 characters or
   less. Do not put "claude" or "anthropic" in the name.

## Why it matters
Better descriptions are the cheapest improvement to router accuracy in the
cAgents catalog. Keywords and explicit NOT-for boundaries reduce mis-selection.
The limits stop the opposite fault, a description that fires on everything.
Distilled from anthropics/skills `skills/skill-creator/SKILL.md`,
`skills/claude-api/shared/prompt-audit.md` (Groups 2 and 3), and the `xlsx`
description (paraphrased).
