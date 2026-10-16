---
name: ex-gates-fact-forcing-pre-hoc
description: "Example: a pre-hoc write gate that denies the first Edit, Write, or Bash on a target until the agent presents investigation facts. Includes the upstream measured result (benefit not established, extra cost confirmed) and the refinements that keep such a gate cheap. Load when you design or evaluate a write-gate hook."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-gates-fact-forcing-pre-hoc
  category: gates
  source_repo: affaan-m/ECC
  source_url: "https://github.com/affaan-m/ECC"
  source_commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29
  reviewed: "2026-10-15"
  applies_to:
    - cagents:backend-developer
    - all-controllers
  demonstrates: "Deny the first write to a target until the agent gives investigation facts; waive it for prior work; adopt it only behind its own eval."
  added: "2026-07-10"
---

# Example: Fact-Forcing Pre-Hoc Gate (GateGuard)

## Context
cAgents' evidence-first pattern asks for evidence after a change. A pre-hoc gate
asks for investigation evidence before the write. It targets a different failure:
the agent acts before it understands the target. A self-check ("Are you sure?")
gets "yes" every time. A demand for concrete facts gets more.

The upstream author ran a controlled evaluation of this gate. Read the measured
status below before you copy the design.

## Example

A PreToolUse[Write|Edit|Bash] gate denies the first attempt on a target. It asks
for facts before it allows the retry. The questions depend on the target class:

```
DENIED (first write to src/api/order.ts, target class: code). Give these facts, then retry:
  1. Callers: who imports or calls the code you will change? (cite file:line)
  2. Public surface: which exported functions or types does this change touch?
  3. Data shape: the exact field names and formats you rely on
     (redacted sample values, not guesses).
  4. Instruction: quote the actual request from the user or the work item.
```

For a prose, config, or instruction target (a SKILL.md, a YAML file, a rule
file), the code questions carry no signal. Ask about that target instead: which
readers load the file, which contract or count the edit changes, and which
instruction the edit carries out. Most cAgents writes are prose or config, so
this matters.

**Keep the gate cheap.** These waivers come from the upstream design:

- **Prior-work credit.** Waive the denial when a search in the current turn
  already covered the target. A plain `Read` does not count. A search in the
  same tool batch as the write does not count.
- **Sibling collapse.** One answered denial covers near-identical sibling
  targets in the same change.
- **Comment-only edits** pass without a denial.
- **Repetition safety.** Only the first N denials in a session (default 3) show
  the full fact block. Later denials shrink to one line, so the prompts do not
  pile up in context.

**Measured status (upstream).** A 72-session pilot showed no difference between
arms. A pre-registered confirmatory run of 96 trials did not confirm a benefit
(gate 25/48, off 18/48, McNemar p=0.210). The standing conclusion over 336
trials is "benefit not established". The cost was consistent: about 37-45% more
turns and about 40% more spend. One association held: runs that disclosed the
deciding fact had a higher pass rate. Questions aimed at code structure missed facts
that lived in external contracts.

## Why it matters
This is a template for a pre-hoc evidence gate next to cAgents' post-hoc
`pat-evidence-first-execution.md`. It could extend `write-edit-dispatch.cjs`
with an investigation receipt on an execution agent's first write to a file.
The measured result sets the adoption rule. Put the gate behind an opt-in flag.
Give it its own eval, and report its cost next to any effect. Do not cite an
unconfirmed quality gain. Distilled from affaan-m/ECC `skills/gateguard/SKILL.md`
and `docs/gateguard/question-effectiveness.md` (Standing conclusion).
