---
name: ex-strategy-north-star-validator
description: "Example: a North Star Metric procedure — classify the business into one of three games (Attention/Transaction/Productivity) BEFORE proposing a metric, validate any candidate against 7 fixed criteria, and check it against an explicit 'NSM is NOT' exclusion list. Load when defining a north-star or headline metric."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-strategy-north-star-validator
  category: strategy
  source_repo: phuryn/pm-skills
  source_url: "https://github.com/phuryn/pm-skills"
  applies_to:
    - cagents:product-owner
    - cagents:marketing-strategist
    - cagents:market-research-analyst
  demonstrates: "Classify the business (Attention/Transaction/Productivity) then validate any NSM candidate against 7 criteria + an 'NSM is NOT' list."
  added: "2026-07-10"
---

# Example: North Star Metric Validator

## Context
cAgents references "north star metric" in a couple of resource files but has no
procedure — agents are left to "pick a good metric" unstructured. This gives
`product-owner` (okr mode) and `marketing-strategist` (growth mode) a
classify-then-validate procedure.

## Example

**Step 1 — classify the business into exactly one of three games first:**

| Game | The metric captures | Examples |
|------|---------------------|----------|
| Attention | time/engagement captured | social feeds, streaming |
| Transaction | value exchanged | marketplaces, e-commerce |
| Productivity | work accomplished | SaaS tools, dev platforms |

**Step 2 — validate the candidate NSM against 7 criteria** (all must hold):
Easy to Understand · Customer-Centric · reflects Sustainable Value · Vision-Aligned ·
Quantitative · Actionable · a Leading Indicator (not lagging).

**Step 3 — reject if it hits the "NSM is NOT" list:**

```
- NOT multiple metrics (it is ONE number; the 3-5 inputs are a "constellation" below it)
- NOT revenue / LTV (must be customer-centric value, not the company's take)
- NOT an OKR (an OKR is time-boxed; the NSM is durable)
- NOT a strategy (though CHOOSING one is a strategic act)
```

Worked: a Productivity-game SaaS -> candidate "Weekly Active Teams that shipped >=1
deploy" passes all 7 and dodges the NOT-list (customer-centric, leading, one number).
"MRR" fails (not customer-centric, it's the company's take).

## Why it matters
Gives cAgents' product/marketing agents a copy-pasteable classification-then-validation
procedure instead of "pick a good metric", with a NOT-list that catches the common
revenue/OKR confusions. Distilled from phuryn/pm-skills
`pm-marketing-growth/skills/north-star-metric/SKILL.md`.
