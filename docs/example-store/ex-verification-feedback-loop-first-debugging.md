---
name: ex-verification-feedback-loop-first-debugging
description: "Example: feedback-loop-first debugging. Build a fast, deterministic reproduction command that can go red BEFORE you form a hypothesis, choose from 10 ranked loop strategies, and tag temporary debug logs so cleanup is certain. Load for bug-fix work items."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-feedback-loop-first-debugging
  category: verification
  source_repo: mattpocock/skills
  source_url: "https://github.com/mattpocock/skills"
  source_commit: 49dd158d1076134a641b33efb035946536778336
  reviewed: "2026-10-15"
  applies_to:
    - cagents:backend-developer
    - cagents:qa-lead
    - cagents:self-correct
  demonstrates: "Build a tight red-capable reproduction loop BEFORE forming any hypothesis; 10 ranked loop strategies; tagged-debug-log cleanup."
  added: "2026-07-10"
---

# Example: Feedback-Loop-First Debugging

## Context
Most of debugging is the work to build a tight reproduction loop: fast,
deterministic, and with a sharp signal. Build it before any hypothesis. This gives
a cAgents bug-fix work item a Check 0. Propose no fix until a reproduction command
that can go red exists and has run.

## Example

**Anti-pattern.** You read code to build a theory before the reproduction command
exists. If you see yourself do this, stop. Code that you read first anchors you on
a guess.

Build the loop from the first strategy that fits. The list is in order of
preference, and a tighter loop is better:

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
- Minimise the repro: remove inputs and steps until each one left is needed.
- Write 3-5 FALSIFIABLE, ranked hypotheses; show them to the user BEFORE testing
  (anti-anchoring). Test the cheapest-to-falsify first.
- When you force a change to test a hypothesis, prove that the change landed
  (show the diff or the changed value) before you trust the result.
- Any temporary instrumentation gets a tagged prefix: console.log("[DEBUG-a4f2] ...").
  Before reporting DONE: `grep -rn "\[DEBUG-a4f2\]"` and remove every hit.
- Redact secrets and personal data from logs and traces that you keep or share.
- Completion: the loop is now GREEN, and the hypothesis that turned out correct is
  stated in the commit/PR message so the next debugger learns.
```

If no correct place exists to put the loop, report that as a finding. A codebase
that you cannot test at the fault is part of the bug.

## Why it matters
This makes `execution-self-validation.md` Check 3 (guard exit codes) stronger.
The guard exists and shows red before the fix, not only green after it. The
tagged debug-log convention (`[DEBUG-<hash>]`, which grep can clean) is a small
rule that `self-correct` and execution agents can adopt now. Distilled from
mattpocock/skills `skills/engineering/diagnosing-bugs/SKILL.md`.
