---
name: ex-structured-io-pre-send-shape-check
description: "Example: a pre-send check for a final report or a customer reply. Cut the announcement, the recap, the sidebar, and the empty hedge, then make sure the first line and the last line alone tell the reader what happened and what to do next. Load when you write a completion summary, a wave report, or a reply to a user."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-structured-io-pre-send-shape-check
  category: structured-io
  source_repo: ayghri/i-have-adhd
  source_url: "https://github.com/ayghri/i-have-adhd"
  source_commit: 1ecea1993b7fce257ffbd686c070948b5e07eda6
  reviewed: "2026-10-15"
  applies_to:
    - cagents:team-lead
    - cagents:coord-log-writer
    - cagents:support-director
    - cagents:customer-success-manager
    - cagents:editor
  demonstrates: "Five cuts before send, then a first-line and last-line test; keep hedges that carry real uncertainty; restate step N of M."
  added: "2026-10-15"
---

# Example: Pre-Send Shape Check for Reports and Replies

## Context
A /team Report Contract caps the size of a reply. It does not set the shape. A
12-line reply can still open with "I have now finished the task" and close
with a recap. The reader must then scan the middle to find the outcome.

Use this check on any text that a person or a lead agent reads to decide the
next step. Examples are a subagent report, the /act completion summary, a
support reply to a customer, and an account update. The check is separate from
`ex-structured-io-schema-role-contract`, which fixes the fields. It is also
separate from `ex-structured-io-terse-return-grammar`, which fixes the row
format of a search result. This check fixes the order of a report and removes
noise.

## Example

Run five cuts, then one test.

| Cut | Remove | Keep |
|---|---|---|
| 1 | A first sentence that announces the work: "I will now summarize..." | The outcome |
| 2 | A last sentence that recaps or asks "anything else?" | One next action |
| 3 | A "by the way" sidebar | Put it in a separate, later question |
| 4 | A hedge with no information: "perhaps", "could possibly" | A hedge that states real doubt |
| 5 | An idiom: "circle back", "on the same page" | The literal action |

The test: read only the first line and the last line. Do they tell the reader
(a) what happened and (b) what to do next? If not, move the outcome up and the
action down. Then send.

Before the check, a wave report:

```
I have completed my work on WI-007. Overall things went well. I looked at the
three digests and wrote the files. By the way, the index also looks stale.
Let me know if there is anything else you need!
```

After the check:

```
DONE WI-007: 2 new exemplars, evidence in outputs/wave-3/task-WI-007/status.yaml
Files: docs/example-store/ex-a.md, docs/example-store/ex-b.md
Wave 3 of 5. Next: WI-017 adds 2 index entries. Blockers: none.
```

A customer reply follows the same shape:

```
Your export works again. The fix went live at 14:10 UTC.
Cause: a timeout on files over 2 GB. We raised the limit to 10 GB.
Next: run the export again. If it fails, reply with the job ID.
```

Two rules keep the check honest:

1. **Restate the position.** Write "step 3 of 5" or "wave 3 of 5" in each
   update. The reader does not keep that state between messages.
2. **Keep the real hedge.** Cut 4 removes only empty hedges. If the evidence
   does not identify a cause, say so. Do not invent a cause to fill a
   "cause, then fix" template.

Rule 2 comes from measured data. In the upstream eval run, the style skill lost
points on a partial-success case. The grader found that a reply stated a cause
with no evidence. The fixed "cause, then fix" shape was the likely reason.

## Why it matters
The first-line and last-line test is a shape rule that a reviewer can check
fast. It fits the /team Report Contract, the /act final summary, and customer
replies with no new schema. Distilled from ayghri/i-have-adhd
`skills/i-have-adhd/SKILL.md`, sections "Pre-send check" and rules 1, 3, 5, and 8,
plus `evals/RESULTS.md`, at commit 1ecea19 (MIT).
