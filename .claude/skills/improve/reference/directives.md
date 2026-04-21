# /improve — 12 Prime Directives for VALIDATING

Ported in V10.26.25 from `.claude/skills/review/reference/quality-gates.md`
(source of truth until V11.0). These directives gate the REPORTING step;
all 12 must return PASS for the run verdict to be PASS.

## The 12 Directives

| # | Directive | Evidence |
|---|-----------|----------|
| D1 | No critical findings unresolved | `workflow/findings.yaml.counts.critical == 0` |
| D2 | No high-severity security findings unresolved | Filter `findings.yaml` where `severity: high` AND `category: security` |
| D3 | Test suite passes (if tests exist) | `npm test` or `pytest` output in `workflow/guard_results.yaml` |
| D4 | Type check passes (if applicable) | `tsc --noEmit` or language equivalent |
| D5 | Lint passes (if applicable) | `npm run lint` / `ruff check` / language equivalent |
| D6 | No new file:line regressions vs baseline | Diff `findings.yaml` against `baseline.yaml.suppressed_findings` |
| D7 | Quality score does not drop more than 5 points vs baseline | `score.delta >= -5` |
| D8 | Applied fixes did not introduce new findings | Re-scan diff of applied fixes; findings count before vs after |
| D9 | Rolled-back fixes documented with reason | Every `status: rolled_back` in `auto_fixes_applied.yaml` has `reason` |
| D10 | Dead-letter items escalated in report | Every `status: dead_letter` surfaces in `final_report.md` |
| D11 | Baseline-suppressed findings not re-surfaced silently | Suppressed finding IDs are logged even when filtered from report |
| D12 | Evidence chain complete | Every finding has non-empty `file`, `line`, `message`, and `suggestion` |

## Quality Gate Formula

```
score = max(0, 100 - 20*critical_count - 10*high_count - 5*medium_count - 1*low_count)
verdict = PASS if (score >= baseline_score - 5) AND (all D1-D12 PASS) else FAIL
```

## Failure Handling

- Any FAIL among D1-D12 → overall verdict FAIL, but REPORTING still runs
  to produce the diagnostic report.
- Score drop > 5 points → D7 fails → FAIL verdict.
- Missing guard commands (no test suite, no linter) → directive skipped,
  recorded as "N/A" not FAIL.

## Source of Truth

Until V11.0, the canonical quality-gate spec lives at
`.claude/skills/review/reference/quality-gates.md`. V10.26.25 ports the
directive summary here so `/improve` can be read standalone; the formula
and gate thresholds stay identical.
