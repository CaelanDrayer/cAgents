---
name: ex-review-adversarial-refutation
description: "Example: adversarial refutation for claims that must be correct. Ask 2-4 independent attempts with DIFFERENT framings, merge their located claims, then tell a second batch of agents to BREAK each claim with counter-evidence. Report only the claims that survive, and stop after 3 rounds. Load for research findings, competitive or market claims, audit findings, or any review where a false claim is expensive."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-adversarial-refutation
  category: review
  source_repo: NousResearch/hermes-agent
  source_url: "https://github.com/NousResearch/hermes-agent"
  source_commit: ca069e12239a2c8d13887ac9f983557d00bdcfd2
  applies_to:
    - cagents:scholar
    - cagents:market-research-analyst
    - cagents:strategic-planner
  demonstrates: "Independent attempts with different framings, then a refuter pass that must break each located claim; only survivors are reported; cap of 3 rounds."
  added: "2026-10-15"
  reviewed: "2026-10-15"
---

# Example: Adversarial Refutation of Claims

## Context
`ex-review-blind-dual-convergence` uses two blind reviewers who must both vote
PASS. A vote does not test a claim. This pattern adds a pass whose only job is to
break each claim with evidence. Use it when a false claim is expensive. Examples
are a market-size figure in a board memo, a finding in a literature review, or a
security finding that will trigger a fix.

## Example

```
1. Attempts: give the SAME question to 2-4 agents. Give each agent a DIFFERENT
   framing. Each agent writes one claim per line.
2. Merge: remove duplicates. Record how many attempts made each claim.
3. Refute: give a second batch of agents the sources, not the reasoning of the
   attempts. Tell them to BREAK each claim. Each refuter writes one row per claim:
   claim_idx | survives | counter_evidence
4. Report: keep only the claims that survive. Drop each refuted claim with a
   one-line reason.
5. Repeat: send only the NEW claims from a round through one more refutation.
   Stop when a round adds no survivor, or after 3 rounds.
```

**Each claim must be located and falsifiable.** A refuter can break "Segment B
grew 14% in 2025, per source S3, table 2". A refuter cannot break "the market
looks healthy". Reject a vague claim before the refutation step.

**The framings must differ.** If each attempt gets the same framing, the attempts
give one answer three times. Use framings such as "top-down from total spend",
"bottom-up from the count of buyers", and "from the revenue of competitors".

Worked round for a market-sizing brief:

```
Claim 1: "The mid-market segment is 40% of the total spend" (S2, p. 7)   agreement 2 of 3
Claim 2: "Competitor X left the segment in 2025" (S5, press release)     agreement 1 of 3
Claim 3: "Buyers renew each year at a rate of 90%" (S1, survey)          agreement 3 of 3

Refuter rows:
1 | survives | S2 p. 7 states 38-42%; the claim is in range
2 | refuted  | S6 shows a new product from X in the segment in 2026
3 | refuted  | the S1 survey sampled 40 current customers only; churned buyers were excluded

Report: Claim 1 only. Claim 2 dropped: newer counter-evidence. Claim 3 dropped: biased sample.
```

**Refute your own premises too.** If you give the agents a rule such as "all
small vendors use reseller channels", tell them to refute that rule with evidence
before they act on it.

**Record each drop.** Each dropped claim keeps its counter-evidence on disk. Each
reported claim went through refutation. A reviewer can then audit both lists.

## Why it matters
cAgents research and strategy agents can report a claim that one source supports
and another source contradicts. This pattern makes them try to break each claim
before the claim enters a deliverable. It complements the two-vote rule in
`ex-review-blind-dual-convergence`, and it fits a `/team` review wave.

Distilled from NousResearch/hermes-agent
`optional-skills/autonomous-ai-agents/dynamic-workflow/SKILL.md`, in the section
on adversarial convergence. The text is a paraphrase.
