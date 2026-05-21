# Gate Check Protocol — Detailed Reference

Full check-by-check guidance for `cagents:wave-reviewer`. See parent SKILL.md for the summary table.

## Check 1 — Task Completion

**Method**: Read `${SESSION_DIR}/team/task_list.yaml` (or equivalent status overlay). For every work item id in `workflow/work_items_wave_{K}.yaml`, confirm `status: completed`.

**Failure (HOLD)**: One or more wave WIs still `pending` or `in_progress`. Do NOT mark the gate FAIL — the wave isn't done yet. Reply with HOLD and list incomplete IDs.

## Check 2 — Evidence Presence

**Method**: For each completed WI, locate its evidence (look in `outputs/wave-{K}/task-{N}/self-validation.yaml` or `coordination_log.yaml` entries). Reject empty/null/whitespace evidence and placeholders like "TBD", "TODO", "pending".

**Failure (HOLD)**: WI marked completed but evidence absent. Lead should re-spawn the teammate for evidence.

## Check 3 — Evidence Specificity

**Method**: Score each evidence string on the 1-3 scale:
- 1 = vague ("works", "tested", "looks good")
- 2 = some specificity (file path or command name only)
- 3 = high specificity (file:line, test count, metric)

Average across all WIs in the wave. Threshold: avg >= 2.0 for PASS.

**Failure (WARN)**: avg < 2.0 — log the low-specificity items but proceed.

## Check 4 — Acceptance Criteria Coverage

**Method**: For each WI, read `workflow/work_items_wave_{K}.yaml` row N's `acceptance_criteria[]`. For each criterion, search the WI's evidence for a matching statement. Use `verification_method` as the matching heuristic:
- `file_exists`: confirm the cited path exists on disk
- `file_contains`: grep the cited pattern from the cited file
- `test_result`: confirm test output excerpt with PASS line
- `metric_check`: confirm before/after metric in evidence

**Failure (FAIL)**: Any criterion lacks matching evidence — the WI is not actually complete.

## Check 5 — Contract Fulfillment

**Method**: Read `workflow/contracts.yaml` (if exists). For every contract whose `established_in: {K}`, verify the listed `artifacts[]` paths exist on disk under `outputs/`.

**Failure (HOLD)**: Contract provider hasn't delivered. Wait for the provider WI to land its artifact.

**Skip**: If `contracts.yaml` doesn't exist or has no entries for this wave, mark check as `skipped: true, passed: true`.

## Check 6 — Regression Guards

**Method**: Look up the guard command(s) for this wave type in `cagents-memory/_system/config/team/wave-guards.yaml`. If not present, run wave-type defaults:
- implementation/testing waves: `npm test` (or `pytest`, detected from repo root)
- research/design waves: skip (no code to regress)
- documentation waves: link-check or markdown-lint if available

Capture exit code and output excerpt (first/last 5 lines).

**Failure (FAIL)**: Exit code != 0. Include the relevant output lines in the verdict.

## Check 7 — Cross-Wave Consistency

**Method**: Read summaries of prior wave outputs (`outputs/wave-{K-1}/*/self-validation.yaml summary fields`). Look for contradictions with current wave's outputs (e.g., wave 1 declares "uses bcrypt", wave 2 implements scrypt). Use Grep for known conflict markers (TODO/FIXME/inconsistency) in new outputs.

**Failure (WARN)**: Possible contradiction surfaced — log specifics. Do not block the gate; integration wave will resolve.

## Severity Matrix

| Check Result | Action |
|---|---|
| 7 PASS | overall: PASS |
| ≥1 FAIL | overall: FAIL — lead should re-run wave or escalate |
| ≥1 HOLD, 0 FAIL | overall: HOLD (returned to lead, gate not marked) |
| ≥1 WARN, 0 FAIL, 0 HOLD | overall: CONDITIONAL_PASS — proceed but log |

## Self-Validation

Before writing the gate_validations YAML, self-validate using the 5-check protocol (see `.claude/rules/core/resources/execution-self-validation.md`): evidence freshness, file existence, guard exit codes, git state, file:line accuracy. Include `self_validation:` block in the YAML if any check fails.
