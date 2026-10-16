---
name: ex-verification-coverage-ledger
description: "Example: a coverage ledger for a validation or audit gate. 'The checks found nothing' is not the same as 'the inputs were inspected'. Each required input that the gate could not read or interpret is a ledger event, and a fatal event blocks a complete PASS. Each check category with zero findings is reported as not covered, never as passed in silence. Load when you design a validator, a wave gate, or a compliance audit report."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-coverage-ledger
  category: verification
  source_repo: NVIDIA/SkillSpector
  source_url: "https://github.com/NVIDIA/SkillSpector"
  source_commit: 4c52fbb83bbca0dd13f2685453c9b661d8c95bf8
  applies_to:
    - cagents:validator
    - cagents:wave-reviewer
    - cagents:general-counsel
  demonstrates: "No findings is not PASS: each unread or uninterpretable required input is a ledger event that blocks a complete PASS, and each empty category is reported as not covered."
  added: "2026-10-15"
  reviewed: "2026-10-15"
---

# Example: Coverage Ledger, Where "No Findings" Is Not "PASS"

## Context
A cAgents gate can return PASS because it found no failures. That PASS is false if
the gate did not read all of its inputs. Examples are an artifact that was
missing, a file in a format that the gate cannot parse, or a check that ran out of
budget. The same fault occurs outside code. A compliance review that skipped two
contracts can still report "no issues found".

## Example

Keep a ledger next to the findings. The ledger records what the gate inspected,
not what it found. Each required input gets one of these states:

| State | Meaning | Effect on the verdict |
|-------|---------|-----------------------|
| `inspected` | the gate read and interpreted the input | none |
| `partial` | the gate read only part of it, for example because of a size limit | the verdict cannot be a complete PASS |
| `unsupported` | the input is required, but the gate cannot interpret its format | fatal: no complete PASS |
| `missing` | a required input does not exist | fatal: no complete PASS |
| `budget_exhausted` | the check stopped before it finished | fatal: no complete PASS |

Rules:

1. Decide the list of required inputs BEFORE you run any check. Use the acceptance
   criteria, the wave outputs, or the list of documents in scope.
2. A fatal event downgrades PASS to REVISE, or to CAUTION in an audit report. It
   never turns into a finding, and you do not invent a finding to explain it.
3. Map each check category to a fixed list. If a category has zero findings,
   report it as "not covered, check again". Zero findings is a valid result, but
   the report must state it.
4. Keep the score honest. Do not raise a score because a fatal event removed
   an input from the count.

Worked ledger for a wave gate:

```yaml
coverage_ledger:
  required_inputs: 6
  events:
    - input: outputs/wave-2/task-WI-004/status.yaml
      state: inspected
    - input: outputs/wave-2/task-WI-006/digest.md
      state: missing          # fatal
    - input: outputs/wave-2/task-WI-007/report.pdf
      state: unsupported      # fatal: the gate reads only text
  categories:
    evidence_presence: {findings: 0, covered: true}
    regression_check:  {findings: 0, covered: false, note: "not covered, check again"}
verdict: REVISE   # 0 failures, but 2 fatal coverage events
```

The same ledger for a privacy compliance review:

```
Scope: 12 vendor contracts. Inspected: 10. Scanned images with no text layer: 2 (fatal).
Categories: data transfer 3 findings; retention 1 finding; breach notice 0 findings (not covered, check again).
Verdict: CAUTION. The review cannot report "no issues" for the 2 unread contracts.
```

## Why it matters
The cAgents validator, the wave-reviewer 7-check, and a general-counsel audit can
each return a confident PASS on incomplete input today. A coverage ledger makes
skipped input a recorded event, not a silent pass. It pairs with the
prose-of-absence guard in `pat-evidence-first-execution.md`.

Distilled from NVIDIA/SkillSpector `docs/scan-completeness.md` and
`src/skillspector/inspection_ledger.py`. Upstream license: Apache-2.0. The text is
a paraphrase, and it copies no upstream code. The "not covered" rule for empty
categories also appears in phuryn/pm-skills
`pm-ai-shipping/commands/security-audit-static.md` at commit `c68487d7`.
