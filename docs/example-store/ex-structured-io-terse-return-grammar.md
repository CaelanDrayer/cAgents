---
name: ex-structured-io-terse-return-grammar
description: "Example: a fixed return grammar for subagent replies, with one row per hit, group headers, a zero-hit sentinel, a totals line, canned refusals, and plain prose for safety warnings. Load when a controller or a wave lead writes a Report Contract for its children."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-structured-io-terse-return-grammar
  category: structured-io
  source_repo: juliusbrussee/caveman
  source_url: "https://github.com/juliusbrussee/caveman"
  source_commit: d262ab3882952a59312ff3537cd86d894523c5ab
  reviewed: "2026-10-15"
  applies_to:
    - cagents:team-lead
    - cagents:team-bootstrap
    - cagents:wave-reviewer
    - cagents:execution-monitor
  demonstrates: "One row per hit (path:line | symbol | note of 6 words or less), group headers at 3+ rows, a 'No match.' sentinel, a totals line, canned refusals, and plain prose for security and destructive operations."
  added: "2026-10-15"
---

# Example: A Terse Return Grammar for Subagent Replies

## Context
A controller pays context for each reply from a child agent. The `/team`
Report Contract sets a limit of 12 lines, but it gives no grammar. If each
child picks its own format, the lead must read every reply in full. A fixed
grammar with sentinels lets the lead parse a reply line by line. The grammar
also supports the per-subagent context aim in `pat-context-budget-tiers.md`.

## Example

Free-form reply. The lead must read all of it to find the result:

```
I looked through the codebase and found a few places that seem related.
The main definition appears to be in the config helper, and there are
some callers in the mode tracker. I did not see any tests, but I may
have missed some. Let me know if you want me to fix anything!
```

Grammar for a locator reply. One row for each hit:

```
<path:line> | <symbol> | <note of 6 words or less>
```

- If there are 3 or more rows, group them under a one-word header:
  `Defs:`, `Refs:`, `Callers:`, `Tests:`, `Sites:`.
- If there is one hit, write one line with no header.
- If a row has no symbol, as for a plain reference, drop the second column.
- If there are no hits, write `No match.` and nothing else.
- On the last line, write the totals: `2 defs, 3 callers, 1 test file.`

```
Defs:
- docs/policy/refunds.md:14 | refund window | 30 days, retail only
- docs/policy/refunds.md:52 | exception list | lists 3 product lines
Refs:
- support/macros/refund-reply.md:8
- sales/terms/retail-2026.md:120
Tests:
- qa/policy-checks.yaml:31 | refund-window-check | 4 cases
2 defs, 2 refs, 1 test file.
```

Grammar for a review reply. One row for each finding, in file order:

```
<path:line>: <severity>: <problem>. <fix>.
```

Use plain words for the severity: `bug`, `risk`, `nit`, `question`.
Do not use emoji. cAgents output does not use them.

```
plan/budget.xlsx:B14: bug: Q3 total omits the contractor line. Add row 22 to the sum.
src/export.py:88: risk: the temp file is not removed on a failed upload. Remove it in a finally block.
copy/launch-email.md:3: question: is the 20% offer for new customers only?
totals: 1 bug, 1 risk, 1 question
```

- If there are no findings, write `No issues.` and nothing else.
- If the reviewer needs more context, append `(see L<n> in <file>)`. Do not guess.

Canned refusals. A read-only child does not argue or explain at length:

```
Asked to fix   -> Read-only. Spawn an execution agent.
Asked to design -> Read-only. Return to the controller.
```

Plain-prose exception. If a row is a security warning or a destructive
operation, write it in full sentences first. Then go back to the grammar.
A terse line must never hide a risk to data or to access.

Status block for a `/team` Report Contract:

```
status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
wi: WI-013
artifact: outputs/wave-3/task-WI-013/status.yaml
blockers: none
totals: 2 files created, 0 modified
```

The lead reads `status` and `blockers` first. If `blockers: none`, the lead
does not open the artifact before the gate.

## Why it matters
A cAgents controller or a wave lead can get many replies in one turn. A fixed
grammar keeps each reply small and lets the lead find the result without a full
read. The sentinels `No match.`, `No issues.`, and `blockers: none` make an empty
result explicit. Distilled from juliusbrussee/caveman
`agents/cavecrew-investigator.md` and `agents/cavecrew-reviewer.md`
(Apache-2.0). In this example, plain words take the place of the emoji markers for severity.
