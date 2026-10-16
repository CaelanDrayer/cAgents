---
name: ex-skill-authoring-override-precedence
description: "Example: give a skill, rule, or spawn brief a short list of named override conditions and one tie-break principle: the harder constraint wins and the shape stays. Load when you write layered instructions that can conflict, such as a line cap against an evidence rule."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-skill-authoring-override-precedence
  category: skill-authoring
  source_repo: ayghri/i-have-adhd
  source_url: "https://github.com/ayghri/i-have-adhd"
  source_commit: 1ecea1993b7fce257ffbd686c070948b5e07eda6
  reviewed: "2026-10-15"
  applies_to:
    - cagents:team-bootstrap
    - cagents:team-lead
    - cagents:optimizer
    - cagents:editor
  demonstrates: "Named override list plus one tie-break: the harder constraint wins, the shape stays; presentation rules never limit analysis."
  added: "2026-10-15"
---

# Example: Override Conditions with One Tie-Break Principle

## Context
A cAgents subagent gets instructions from many layers. These layers are the
harness system prompt, CLAUDE.md, a rules file, the agent body, the spawn brief,
and a Report Contract. Each layer is correct alone. Two layers can conflict.
A common conflict is a 12-line report cap against a rule that requires
`file:line` evidence. Today the precedence is implicit, so each agent guesses.

Use this pattern when you write a skill, a rule, a policy, or a spawn brief that
sets a default shape. The pattern also applies outside engineering. An HR policy
or a style guide has the same problem when a default meets a hard requirement.

## Example

Without a precedence clause, the brief has only defaults:

```
Report Contract: at most 12 lines, each at most 15 words.
```

A subagent with 9 evidence paths and a blocker must now choose. It drops
evidence to fit the cap, or it breaks the cap with no rule to say that it may.

With a precedence clause, the brief names the exceptions and the tie-break:

```
Report Contract: at most 12 lines, each at most 15 words.

When the defaults give way:
1. A destructive or irreversible step is next. Ask for confirmation first.
   Safety wins over brevity.
2. The request has two valid readings. Ask one short question. Do not guess.
3. The cap would delete the answer. Example: 9 evidence paths do not fit.
   Write the evidence to status.yaml and cite that one path in the report.
4. A higher layer requires an action. The harness or CLAUDE.md outranks this
   brief. Do the work. Do not ask "do you want me to do it?"

Tie-break for every other conflict: the harder constraint wins, and the shape
stays. A presentation rule controls only what you show. It never limits what
you analyze, search, or keep.
```

Three properties make the clause work:

| Property | What it does |
|---|---|
| Named conditions | Each override has a trigger the agent can check, not a judgment call. |
| One principle | New conflicts resolve without a new rule for each case. |
| Scope limit on style | A cap on output shape cannot cause lost work or lost facts. |

Keep the list short. Four to six conditions is enough. If the list grows past
that, the default fails too often. Fix the default.

The scope limit stops the loss of data. A display cap of 5 items must not
make the agent discard item 6. The agent keeps item 6 and shows it when the
reader asks or when it becomes the next item to do.

## Why it matters
cAgents stacks rules, briefs, and Report Contracts with no stated order. A
local "when the defaults give way" section with one tie-break principle stops
the conflict at the point of use. It pairs with
`ex-skill-authoring-explain-why-not-allcaps`: give the reason, then give the
exception. Distilled from ayghri/i-have-adhd `skills/i-have-adhd/SKILL.md`,
section "When to break the rules" and rule 9, at commit 1ecea19 (MIT).
