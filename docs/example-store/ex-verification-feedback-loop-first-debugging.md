---
name: ex-verification-feedback-loop-first-debugging
description: "Example: feedback-loop-first debugging — build a tight, fast, red-capable reproduction command BEFORE forming any hypothesis, choosing from 10 ranked loop strategies, and tag temporary debug logs for guaranteed cleanup. Load for bug-fix work items."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-feedback-loop-first-debugging
  category: verification
  source_repo: mattpocock/skills
  source_url: "https://github.com/mattpocock/skills"
  applies_to:
    - cagents:backend-developer
    - cagents:qa-lead
    - cagents:self-correct
  demonstrates: "Build a tight red-capable reproduction loop BEFORE forming any hypothesis; 10 ranked loop strategies; tagged-debug-log cleanup."
  added: "2026-07-10"
---

# Example: Feedback-Loop-First Debugging

## Context
90% of debugging is building a **tight** (fast, deterministic, sharp-signal)
reproduction loop before any hypothesis. This gives a cAgents bug-fix work item a
Check-0: no fix is proposed until a red-capable repro command exists and has been run.

## Example

**Anti-pattern**: "If you catch yourself reading code to build a theory before this
repro command exists, STOP." Reading code first anchors you on a guess.

Build the loop from the first strategy that fits (preference order — tighter is better):

```
1. Failing unit/integration test        6. Throwaway harness script
2. curl / HTTP request                   7. Property/fuzz loop
3. CLI invocation + output snapshot      8. Bisection harness (git bisect)
4. Headless-browser script               9. Differential loop (old vs new)
5. Captured-trace replay                 10. HITL bash script (last resort)
```

Then:

```
- Establish the loop RED (reproduces the bug deterministically). Show it red.
- Write 3-5 FALSIFIABLE, ranked hypotheses; show them to the user BEFORE testing
  (anti-anchoring). Test the cheapest-to-falsify first.
- Any temporary instrumentation gets a tagged prefix: console.log("[DEBUG-a4f2] ...").
  Before reporting DONE: `grep -rn "\[DEBUG-a4f2\]"` and remove every hit.
- Completion: the loop is now GREEN, and the hypothesis that turned out correct is
  stated in the commit/PR message so the next debugger learns.
```

## Why it matters
Strengthens `execution-self-validation.md` Check 3 (guard exit codes): the guard is
established and shown *red before* the fix, not just green after. The tagged-debug-log
convention (`[DEBUG-<hash>]`, grep-cleanable) is a small, immediately-adoptable rule
for `self-correct` and execution agents. Distilled from mattpocock/skills
`skills/engineering/diagnosing-bugs/SKILL.md`.
