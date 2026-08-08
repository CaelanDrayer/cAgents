# Debug-Mode Validator Checks (V10.26.14+)

Authoritative catalog of checks the validator runs when
`instruction.yaml` has `flags.mode: debug`. Checks are introduced
progressively across V10.26.14–17 so each enforcement step can be
measured in isolation before the next one lands.

**Note**: This debug-mode branch is orthogonal to the `/debug` skill removed in V11.0.0 — it is driven by `/act --mode debug` and remains fully active.

## V10.26.14 — Detection Only

- **Check**: Emit `debug mode detected` into `validation_report.yaml`
  under `mode_notes:`.
- **Verification method**: `sentinel_log_line`
- **Severity**: INFO
- **Effect on verdict**: None. Standard PASS/FAIL/REVISE logic applies.

## V10.26.15 — Coordination Log Must Declare `hypotheses_tested[]`

- **Check**: `workflow/coordination_log.yaml` must contain a top-level
  `hypotheses_tested:` list with at least one entry.
- **Verification method**: `yaml_key_exists`
- **Severity**: HIGH
- **On missing/empty**: FIXABLE — emit finding
  `"Debug mode requires hypotheses_tested[] (see .claude/skills/act/reference/debug-mode-prompt.md Phase 3)"`.
- **Rationale**: The 4-phase methodology requires hypothesis testing to
  be recorded. Without the list, the controller cannot demonstrate that
  Phase 3 was executed and the validator cannot assess falsification
  counts (needed for V10.26.17).
- **Entry shape (controllers MUST write)**:
  ```yaml
  hypotheses_tested:
    - hypothesis: "…"
      test: "…"
      result: confirmed|falsified
      evidence: "…"
  ```

## V10.26.16 — Evidence Must Include a Failing-Test Artifact

- **Check**: In debug mode, at least one entry in
  `implementation_tasks[].evidence` must mention the phrase
  `failing test`, `reproduction test`, or `regression test` AND cite a
  path matching `tests/**`.
- **Verification method**: `evidence_regex_match` on the union of
  `criterion` and `result` text per evidence entry.
- **Severity**: HIGH
- **On missing**: FIXABLE — emit finding
  `"Debug mode requires a failing-test artifact in evidence (see .claude/skills/act/reference/debug-mode-prompt.md Phase 4 step 1)"`.
- **Rationale**: `/debug` Phase 4 step 1 mandates writing a failing test
  that reproduces the bug before implementing any fix. CLAUDE.md's
  bug-driven testing rule requires every bug fix to ship with a regression
  test. This check enforces both at the validator gate.
- **Regex spec** (case-insensitive):
  ```
  /(failing|reproduction|regression)\s+test.*tests\//i
  ```
- **Isolated from V10.26.15**: This check uses a distinct verification
  method (regex vs key existence), so it can be tuned without revisiting
  the hypotheses_tested[] check.

## V10.26.17 — Falsified-Hypothesis Rule + BLOCKED Verdict

- **Checks (two, evaluated in order)**:
  1. `hypotheses_tested[]` must contain at least one entry with
     `result: falsified`. Missing → FIXABLE, severity HIGH, finding:
     `"Debug mode requires at least one falsified hypothesis in hypotheses_tested[] (see .claude/skills/act/reference/debug-mode-prompt.md Phase 3)"`.
  2. If falsified count `>= 3` AND no entry has `result: confirmed`,
     emit verdict `BLOCKED`, severity CRITICAL, reason:
     `"3+ falsified hypotheses without confirmed root cause — escalate per /debug Escalation Rules"`.
- **Verification method**: `count_by_result`
- **Severity**: HIGH (check 1), CRITICAL (check 2 / BLOCKED)
- **New verdict**: `BLOCKED` is a new enum value. Pipeline routes it like
  FAIL (v12.0.0: back to PLANNED; pre-v12: back to PROMPTS_READY, a state collapsed into PLANNED in v12.0.0),
  with the falsification count annotated in the revision prompt so /act can bail out instead of retrying forever.
- **Gated**: Entirely behind `flags.mode === "debug"`. Non-debug runs
  NEVER see verdict `BLOCKED` — this is a V10.26.17 invariant and the
  regression test suite asserts it explicitly.
- **Rationale**: `/debug` Escalation Rules require halting after 3
  falsified hypotheses without a confirmed root cause. Enforcing this at
  the validator prevents runaway debug sessions.

## Cross-Cutting Rules

- **Non-debug runs are unaffected**: these checks only activate when
  `flags.mode === "debug"` in instruction.yaml. Existing /act pipelines
  that do not set `--mode debug` see no behavioral change.
- **Missing instruction.yaml**: treat as standard mode (no debug checks).
- **Malformed instruction.yaml**: treat as standard mode and log a warning
  in `mode_notes:` so the user sees the fallback explicitly.
