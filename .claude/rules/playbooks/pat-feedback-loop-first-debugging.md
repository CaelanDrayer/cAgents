---
paths:
  - ".claude/rules/playbooks/pat-feedback-loop-first-debugging.md"
  - ".claude/rules/core/execution.md"
  - "agents/architect.md"
  - "agents/architect/**"
  - "agents/backend-developer.md"
  - "agents/backend-developer/**"
  - "agents/data-lead.md"
  - "agents/data-lead/**"
  - "agents/devops-engineer.md"
  - "agents/devops-engineer/**"
  - "agents/frontend-developer.md"
  - "agents/frontend-developer/**"
  - "agents/qa-lead.md"
  - "agents/qa-lead/**"
  - "agents/security-engineer.md"
  - "agents/security-engineer/**"
  - "agents/tech-lead.md"
  - "agents/tech-lead/**"
  - "agents/self-correct/**"
  - ".claude/skills/act/**"
  - ".claude/hooks/**"
  - "scripts/**"
  - "tests/**"
  - "cagents-memory/sessions/**/outputs/**"
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

About 90% of debugging is the work of building a **tight** reproduction loop.
You do that work before you form any theory. A tight loop is fast, it is
deterministic, and it gives a sharp signal.

For a bug-fix work item this is a Check-0. Propose no fix until a repro command
exists, and until you have shown that command RED.

## Anti-pattern: reading code to build a theory first

> If you catch yourself reading source to construct a hypothesis before a
> reproduction command exists, STOP.

When you read the code first, you anchor on a guess. That guess then biases every
later observation toward a confirmation. Build the loop first, and let the loop
tell you where to look.

## Step 1: build the loop (10-strategy ranked ladder)

Pick the first strategy that fits. A strategy higher in the list is tighter, and
a tighter strategy is better:

```
1.  Failing unit / integration test      6.  Throwaway harness script
2.  curl / HTTP request                   7.  Property / fuzz loop
3.  CLI invocation + output snapshot      8.  Bisection harness (git bisect)
4.  Headless-browser script               9.  Differential loop (old vs new)
5.  Captured-trace replay                 10. Human-in-the-loop bash script (last resort)
```

## Step 2: establish the loop RED

Run the loop, and show that it reproduces the bug **deterministically**. Do this
before you touch the fix. A loop that fails only some of the time is not tight.
Make it deterministic first: seed the randomness, pin the clock, and isolate the
shared state.

## Step 3: hypotheses before testing (anti-anchoring)

Write **3–5 falsifiable, ranked hypotheses**. State them all BEFORE you test any
one of them. Test the cheapest one to falsify first. When you state them up
front, you do not anchor on the first idea. When you narrate one theory as you
go, you do anchor on it.

## Step 4: tagged instrumentation with mandatory cleanup

Give every piece of temporary instrumentation a unique tagged prefix. The prefix
makes that instrumentation easy to find with grep:

```
console.log("[DEBUG-a4f2] cache key =", key);   // temporary
```

Before you report DONE, grep for the tag and remove every hit:

```
grep -rn "\[DEBUG-a4f2\]" .    # must return zero hits before DONE
```

## Step 5: completion

- The loop is now GREEN. The same command that was RED now passes.
- State the hypothesis that turned out correct in the commit message or in the PR
  message. The next debugger then learns from it.

This strengthens Check 3 of `execution-self-validation.md`, which covers the
guard exit codes. You establish the guard and show it RED *before* the fix. A
guard that is only green after the fix is not enough.

## See also

- `@docs/example-store/ex-verification-feedback-loop-first-debugging.md`: the
  worked example that this playbook distills.
- `.claude/rules/core/resources/execution-self-validation.md`: Check 3, which
  covers the guard exit codes.
- `.claude/rules/core/execution.md`: the commit-before-verify pattern.
