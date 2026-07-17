---
name: pat-feedback-loop-first-debugging
description: "Pattern: for any bug-fix work item, build a tight (fast, deterministic, sharp-signal) reproduction loop and show it RED before hypothesizing; walk a 10-strategy ranked ladder for the loop; state 3-5 falsifiable ranked hypotheses before testing any; tag temporary instrumentation [DEBUG-<hash>] and grep-clean it before reporting DONE."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "execution agents, self-correct"
  applies_to:
    - cagents:backend-developer
    - cagents:frontend-developer
    - cagents:self-correct
allowed-tools: Read Grep Glob Bash
---

# Pattern: Feedback-Loop-First Debugging

Roughly 90% of debugging is building a **tight** reproduction loop before forming
any theory. Tight = fast, deterministic, and sharp-signal. For a bug-fix work
item this is a Check-0: no fix is proposed until a repro command exists and has
been shown RED.

## Anti-pattern: reading code to build a theory first

> If you catch yourself reading source to construct a hypothesis before a
> reproduction command exists, STOP.

Reading code first anchors you on a guess and biases every later observation
toward confirming it. Build the loop first; let the loop tell you where to look.

## Step 1 — build the loop (10-strategy ranked ladder)

Pick the first strategy that fits. Tighter (higher) is better:

```
1.  Failing unit / integration test      6.  Throwaway harness script
2.  curl / HTTP request                   7.  Property / fuzz loop
3.  CLI invocation + output snapshot      8.  Bisection harness (git bisect)
4.  Headless-browser script               9.  Differential loop (old vs new)
5.  Captured-trace replay                 10. Human-in-the-loop bash script (last resort)
```

## Step 2 — establish the loop RED

Run the loop and show it reproduces the bug **deterministically** before touching
the fix. A loop that only sometimes fails is not tight — make it deterministic
first (seed randomness, pin the clock, isolate shared state).

## Step 3 — hypotheses before testing (anti-anchoring)

Write **3–5 falsifiable, ranked hypotheses** and state them BEFORE testing any of
them. Test the cheapest-to-falsify first. Stating them up front (rather than
narrating one theory as you go) prevents anchoring on the first idea.

## Step 4 — tagged instrumentation with mandatory cleanup

Any temporary instrumentation gets a unique tagged prefix so it is greppable:

```
console.log("[DEBUG-a4f2] cache key =", key);   // temporary
```

Before reporting DONE, grep for the tag and remove every hit:

```
grep -rn "\[DEBUG-a4f2\]" .    # must return zero hits before DONE
```

## Step 5 — completion

- The loop is now GREEN — the same command that was RED now passes.
- The hypothesis that turned out correct is stated in the commit / PR message so
  the next debugger learns from it.

This strengthens `execution-self-validation.md` Check 3 (guard exit codes): the
guard is established and shown RED *before* the fix, not merely green after.

## See also

- `@docs/example-store/ex-verification-feedback-loop-first-debugging.md` — worked example this playbook distills.
- `.claude/rules/core/resources/execution-self-validation.md` — Check 3 (guard exit codes).
- `.claude/rules/core/execution.md` — commit-before-verify pattern.
