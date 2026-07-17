---
name: ex-strategy-opportunity-score-formula
description: "Example: the Dan-Olsen Opportunity Score = Importance x (1 - Satisfaction) for ranking customer problems, plus the derived ICE Impact term and the framing rule 'prioritize problems (opportunities), not features'. Load for backlog / opportunity prioritization."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-strategy-opportunity-score-formula
  category: strategy
  source_repo: phuryn/pm-skills
  source_url: "https://github.com/phuryn/pm-skills"
  applies_to:
    - cagents:product-owner
    - cagents:strategic-planner
  demonstrates: "The Dan-Olsen Opportunity Score = Importance x (1 - Satisfaction); prioritize problems (opportunities), not features."
  added: "2026-07-10"
---

# Example: Opportunity Score Formula

## Context
cAgents' `product-owner` references "Opportunity Solution Tree" by name but the
load-bearing prioritization formula underneath its second level — the Opportunity
Score — is absent from the whole catalog. This supplies it, with the framing rule the
source repeats verbatim.

## Example

**Framing rule (states it first, every time):** *"Never allow customers to design
solutions. Prioritize problems (opportunities), not features."*

**Opportunity Score** — ranks customer *problems* (opportunities), not solutions:

```
Opportunity Score = Importance x (1 - Satisfaction)      # normalized to 0-1
  Importance   = how much customers care about the outcome  (0-1)
  Satisfaction = how well current solutions meet it         (0-1)
```

High importance + low satisfaction = the biggest opportunity. A problem everyone cares
about but is already well-served (high satisfaction) scores low — don't chase it.

Feeds the initiative-level formulas:

```
ICE  = Impact x Confidence(1-10) x Ease(1-10)
       where Impact = Opportunity Score x (# customers affected)
RICE = (Reach x Impact x Confidence%) / Effort(person-months)   # ICE with Reach split out
```

Worked: outcome "reduce time-to-first-report". Opportunity "I struggle to find last
month's numbers": Importance 0.9, Satisfaction 0.3 -> Score = 0.9 x 0.7 = **0.63**
(high — pursue). Opportunity "I want a dark theme": Importance 0.4, Satisfaction 0.8
-> **0.08** (low — defer). Ideate >=3 solutions per high-score opportunity; don't
commit to the first idea.

## Why it matters
Fills a real name-exists-but-formula-missing gap (`grep "opportunity score"` returns
zero hits catalog-wide) so `product-owner` can rank opportunities quantitatively and
resist customer-designed feature lists. Distilled from phuryn/pm-skills
`pm-execution/skills/prioritization-frameworks/SKILL.md` +
`pm-product-discovery/skills/opportunity-solution-tree/SKILL.md`.
