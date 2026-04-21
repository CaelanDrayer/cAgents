# Debug-Mode Validator Checks (V10.26.14+)

Authoritative catalog of checks the universal-validator runs when
`instruction.yaml` has `flags.mode: debug`. Checks are introduced
progressively across V10.26.14–17 so each enforcement step can be
measured in isolation before the next one lands.

## V10.26.14 — Detection Only

- **Check**: Emit `debug mode detected` into `validation_report.yaml`
  under `mode_notes:`.
- **Verification method**: `sentinel_log_line`
- **Severity**: INFO
- **Effect on verdict**: None. Standard PASS/FAIL/REVISE logic applies.

## V10.26.15 — Coordination Log Must Declare `hypotheses_tested[]`

> Placeholder. Concrete check spec lands with V10.26.15.

## V10.26.16 — Evidence Must Include a Failing-Test Artifact

> Placeholder. Concrete check spec lands with V10.26.16.

## V10.26.17 — Falsified-Hypothesis Rule + BLOCKED Verdict

> Placeholder. Concrete check spec lands with V10.26.17.

## Cross-Cutting Rules

- **Non-debug runs are unaffected**: these checks only activate when
  `flags.mode === "debug"` in instruction.yaml. Existing /run pipelines
  that do not set `--mode debug` see no behavioral change.
- **Missing instruction.yaml**: treat as standard mode (no debug checks).
- **Malformed instruction.yaml**: treat as standard mode and log a warning
  in `mode_notes:` so the user sees the fallback explicitly.
