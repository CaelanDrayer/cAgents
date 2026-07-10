---
name: ex-gates-deterministic-candidate-selection
description: "Example: a deterministic, LLM-free gate selects which candidates deserve expensive sub-agent investigation before any fan-out, binds each investigation to named files (never grep-the-repo), and reports every skipped candidate with its exact hold-back reason. Load when a planner/controller is choosing what to spend executor budget on."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-gates-deterministic-candidate-selection
  category: gates
  source_repo: vercel-labs/agent-skills
  source_url: "https://github.com/vercel-labs/agent-skills"
  applies_to:
    - cagents:planner
    - all-controllers
    - cagents:executor
  demonstrates: "A pure/LLM-free gate picks investigation candidates from evidence (not LLM judgment), each investigation reads only the files its candidate names, and every skipped candidate is surfaced with a reason in a 'Not investigated' trust section."
  added: "2026-07-10"
allowed-tools: Read Grep Glob
---

# Example: Deterministic Candidate Gate + Surface-What-You-Skipped

## Context
cAgents decomposition is LLM-driven and biases toward aggressive fan-out. This example distills
vercel-optimize's counterweight: a mechanical gate decides *what is worth an executor* before
any spawn, each spawn is scope-bound to named files, and the report tells the user what was
considered and deliberately skipped. Use it in the planner (candidate selection) and in
controller pre-execution before spawning executors.

## Example

Three of vercel-optimize's four doctrine rules are a reusable gate pattern:

**1. Evidence before investigation.** *"Never read a source file without a signal pointing at
it."* Without this, the agent defaults to "grep the repo for known anti-patterns and complain"
— noisy, low-impact work untied to any real signal.

**2. A deterministic, LLM-free gate.** `gate-investigations.mjs` is pure JS: same input →
byte-identical output. Each candidate kind encodes its threshold as a function:

```
gate(signals) -> Candidate[]     // e.g. cacheHitRate < 0.2 AND requests > 10k  => candidate

output shape:
  toLaunch: [ {question, files:[...], evidence} ]   // worth an executor
  gated:    [ {candidate, reason} ]                  // skipped/covered/disqualified
  budget:   { max: 6, mode: "diversity-guarded" }    // cap the fan-out
```

*"The agent never decides 'should I look at this?' via LLM judgment. The threshold is
mechanical. This eliminates the failure mode where the agent investigates things it shouldn't
and recommends fixes for things that don't need them."*

**3. Candidate-bound scope.** A candidate carries `files: ['src/app/api/products/route.ts']`;
the executor reads ONLY that file and its import chain. The rule, verbatim:

```
If you find yourself wanting to grep the whole codebase, stop and re-read the
candidate's `question`. If the question doesn't constrain the search, the candidate
is malformed -- log it as `gated` and skip. Do NOT compensate with a wider search.
```

**Surface what you skipped.** Every `gated` candidate appears in a user-facing **"Not
investigated in this run"** section with the exact reason (cache hit rate below threshold, p95
already healthy, cold-path, no route mapping). *"This is the user-facing trust mechanism: you
see what we considered and chose to skip, and why."*

cAgents mapping:
- **Planner**: before emitting 30 work items, run a cheap deterministic pre-gate — which
  candidate items actually have a fact/metric backing them? Emit the rest as `gated` with a
  reason rather than as speculative work items.
- **Controller**: bind each executor prompt to the specific files its work item names (already
  the delegation-prompt norm); if an executor reaches for repo-wide grep, the work item is
  malformed — mark it `gated`, don't widen scope.
- **Report**: add a "Not investigated in this run" block to `validation_report.yaml`, the
  deliberate-skip sibling of the existing dead-letter list.

## Why it matters
Caps wasted executor/token budget and hallucinated work items by making candidate selection
mechanical and scope explicit, and buys user trust cheaply by naming what was skipped and why.
Complements `ex-gates-fact-forcing-pre-hoc` (a write-gate) with a *selection* gate. Distilled
from vercel-labs/agent-skills `skills/vercel-optimize/references/doctrine.md` (Rules 1-3) +
`lib/gates/`.
