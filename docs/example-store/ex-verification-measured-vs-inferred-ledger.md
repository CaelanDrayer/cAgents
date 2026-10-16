---
name: ex-verification-measured-vs-inferred-ledger
description: "Example: keep measured, inferred, and verified numbers in separate ledgers, never add or relabel them, treat an empty result as no signal, and publish the conditions where the change loses. Load when an agent reports savings, impact, performance, or any other quantitative claim."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-measured-vs-inferred-ledger
  category: verification
  source_repo: juliusbrussee/caveman
  source_url: "https://github.com/juliusbrussee/caveman"
  source_commit: d262ab3882952a59312ff3537cd86d894523c5ab
  reviewed: "2026-10-15"
  applies_to:
    - cagents:optimizer
    - cagents:validator
    - cagents:data-scientist
    - cagents:marketing-analyst
    - cagents:cfo
  demonstrates: "Keep measured, inferred, and verified figures in separate ledgers; never add or relabel them; an empty result is no signal, not zero; publish the conditions where the change is net-negative."
  added: "2026-10-15"
---

# Example: Separate Ledgers for Measured, Inferred, and Verified Numbers

## Context
Use this pattern when an agent reports a number that supports a decision.
Examples are token savings from an optimizer pass, the lift of a campaign, the
cost of a migration, and the effect size in a study. CLAUDE.md already says
that MEASURED and ESTIMATE figures must never be conflated. This example shows
the report shape that makes the rule easy to obey and easy to check.

## Example

Weak report. The figures are of three kinds, but the report adds them into one
total:

```
Savings from the prompt rewrite: 62% fewer tokens.
  - 41% from the benchmark run
  - 21% expected from cache reuse
No regressions found.
```

The reader cannot tell which part was observed. "No regressions found" can mean
that the check ran and found nothing, or that the check did not run.

Strong report. Each figure goes in one ledger, with its method and its sample:

```
## Measured        (observed on this repo state, method and n stated)
| Metric                 | Value  | n  | Method                   | Source            |
| Output tokens, median  | -8%    | 20 | paired A/B, same tasks   | evals/run-03.json |
| Billed cost, total     | +0.1%  | 20 | provider usage export    | billing-0915.csv  |

## Inferred        (a model or an assumption, not observed)
| Claim                  | Value  | Basis                                      |
| Cache reuse effect     | -5%?   | assumed hit rate 0.6, not yet measured     |

## Verified        (inferred earlier, then confirmed by a later measurement)
| Claim                  | Value  | Confirmed by                               |
| (none)                 |        |                                            |

## No signal
- Regression check on long sessions: 0 rows returned for the window 09-01..09-14.
  This is no signal. It is not proof of zero regressions.

## When this loses
- Short tasks: the fixed prompt overhead is larger than the output cut.
- Per-request billing: a shorter reply costs the same request.

## Unproven
- Quality equivalence. No fidelity review is on record.
```

Rules for the ledgers:

1. Never add a figure from one ledger to a figure from a different ledger.
2. Never move a figure to a different ledger without new evidence. An inferred
   figure goes to "Verified" only when a later measurement confirms it.
   This meaning of "verified" is a cAgents reading. Upstream, "verified" is a
   separate ledger of recorded savings. Both keep the bucket apart.
3. If a query returns no rows, write "no signal" and state the window. Do not
   write "zero".
4. Cite the run id, the file, or the exact time window for each measured row.
   Do not claim a cause from an aggregate alone.
5. Always include "When this loses". If you cannot name a condition, write
   "not tested" in that section.
6. If an old report used a fixed estimate as a measurement, mark the old value
   as an estimate. Do not delete the history.

Validator check. Reject the report if one of these is true:

- A total includes figures from two or more ledgers.
- A measured row has no method, no n, or no source.
- The report shows an empty result as zero.
- The "When this loses" section is missing.

## Why it matters
cAgents agents report numbers in every domain: token savings, conversion lift,
budget variance, and research effect sizes. A blended total hides the inferred
part and makes the change look better than the evidence shows. Separate ledgers
give the validator a mechanical check. They also show the user which part of
the claim has evidence. Distilled from juliusbrussee/caveman
`docs/HONEST-NUMBERS.md` and `skills/caveman-evidence-review/SKILL.md` (Apache-2.0).
