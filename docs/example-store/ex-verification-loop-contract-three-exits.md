---
name: ex-verification-loop-contract-three-exits
description: "Example: write a nine-field contract before an agent loop runs, with three exits (success, failure, budget exhausted), observations that come from outside the answer, and guards for thrashing and goal drift. Covers code, research, data, content, and operations work. Load when you design or monitor a retry, revision, or improvement loop."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-loop-contract-three-exits
  category: verification
  source_repo: f/prompts.chat
  source_url: "https://github.com/f/prompts.chat"
  source_commit: bbd0529530d99fa76ab2f51809b6184ea4b625b8
  reviewed: "2026-10-15"
  applies_to:
    - cagents:execution-monitor
    - cagents:self-correct
    - cagents:operations-manager
    - cagents:coordinator
  demonstrates: "A nine-field loop contract with success, failure, and budget exits; strong observations per domain; checker preference order; thrashing and goal-drift guards."
  added: "2026-10-15"
---

# Example: Loop Contract with Three Exits

## Context
cAgents runs loops: the controller reviewer loop (max 2 rounds), the revision
loop (max 3 cycles), and `self-correct` recovery. A loop with vague fields turns
ambiguity into repeated cost. Write the contract before the loop starts, in any
domain.

## Example

```yaml
loop_contract:
  goal: "Campaign brief approved by brand and legal."   # observable end state
  inputs: "Draft brief v1 + brand guide + legal checklist"
  state: "Open findings, attempts so far, last verdict per reviewer"
  actions: "copywriter edits the brief; no publishing rights"
  observations: "Reviewer verdicts with cited checklist items"
  evaluator: "Named rubric: brand guide sections 2-4, legal checklist items 1-9"
  success: "Both reviewers PASS with a citation for each criterion"
  failure: "Same finding open after 2 fixes, or a legal blocker the writer cannot fix"
  budget: "3 rounds or 45 minutes, whichever comes first"
```

Each loop has three exits. **Success** is when evidence meets the goal.
**Failure** is when recovery no longer helps, so escalate. **Budget exhausted**
is when the loop reaches its cost or risk limit. A loop without all three can
run forever.

**Observations must come from outside the answer:**

| Work | Weak observation | Strong observation |
|---|---|---|
| Code | "I think the fix works." | A test showed the bug red; the same test and the full suite now show green. |
| Research | "This is well known." | Each claim cites a primary source with its date; conflicting sources are listed. |
| Data | "The output looks right." | A schema check passes, and a sample of rows matches the input rows. |
| Content | "The copy is good." | A named rubric scores it, every fact has a source, and every link resolves. |
| Operations | "The change is done." | A read of the target system shows the new state, and the audit log has the entry. |

**Prefer the most deterministic checker.** Use checkers in this order:

1. Exact checks (schemas, types, permissions).
2. Executable checks (tests, linters, link checks).
3. Rubric checks (an independent agent or a human with named criteria).
4. Outcome checks (real behavior over time).

A confidence score from the maker is a routing hint, not evidence.

**Guard against these loop faults:**

| Fault | Sign | Response |
|---|---|---|
| Thrashing | The loop alternates between two fixes. | Detect the repeated state. Require a new strategy, or escalate. |
| Goal drift | Local improvements replace the objective. | Read the frozen goal and the acceptance criteria again at the start of each cycle. |
| Context snowball | Each round appends everything. | Keep structured state. Rebuild only the relevant context. |
| Unsafe repetition | A small mistake repeats until it does harm. | Limit permissions, rate, spend, and blast radius. |

## Why it matters
cAgents caps its loops, but its revision routing does not name thrashing or goal
drift. A check at the start of each cycle for the frozen goal and for a repeated
state is cheap. `execution-monitor` and `self-correct` can apply it to any
domain. The weak and strong table also gives non-engineering work a concrete
evidence standard. Distilled from f/prompts.chat
`src/content/book/14a-loop-engineering.mdx` (MIT, site-authored content).
