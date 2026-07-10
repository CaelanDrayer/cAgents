# Advisory Validators

WARN-only static validators that surface catalog / repo hygiene issues without
ever failing CI. This directory is the plug-in point for the Phase-5 checks
(F1-F4). The runner (`scripts/ci/run-advisory.cjs`) discovers every `*.cjs`
module here, runs it, drops baseline-suppressed findings, and prints a grouped
summary. It **always exits 0** — advisory findings never block a build.

`README.md` (this file) is ignored by the runner; only `*.cjs` files are loaded.

## The validator contract

Each advisory validator is a CommonJS module at `scripts/ci/advisory/<name>.cjs`
exporting exactly this shape:

```js
module.exports = {
  meta: {
    id: 'kebab-id',              // stable identifier for this validator
    description: 'one line',      // shown in the runner summary
  },
  run() {
    // Do your own scanning here (Node built-ins only — see Standalone Contract).
    // Return a FLAT array of findings. MUST NOT throw: wrap internally and
    // return [] on any error.
    return [
      {
        ruleId: 'kebab-rule-id',       // which rule fired (used for suppression)
        severity: 'HIGH',              // 'HIGH' | 'MEDIUM' | 'LOW'
        file: 'agents/foo/SKILL.md',   // repo-relative path (or '' if N/A)
        line: 42,                      // 1-based line number, or null
        message: 'human-readable description of the finding',
      },
      // ...more findings
    ];
  },
};
```

### Rules for `run()`

- **Self-contained scanning.** `run()` does its own filesystem walk / parse
  using Node built-ins (`fs`, `path`, `child_process`) and the repo's already
  declared `js-yaml` behind a guarded require. **No new npm deps, no network.**
- **Never throws.** Wrap your logic in try/catch and return `[]` on error. The
  runner also guards each `run()` call, but a validator that fails silently (by
  returning `[]`) is preferable to one that surfaces a runner note.
- **Flat array.** Return a single-level array of finding objects. Do not nest.
- **Findings are advisory.** Nothing you return can fail CI. Severity is a hint
  for the reader, not a gate.

### Finding field reference

| Field      | Type                          | Notes                                             |
|------------|-------------------------------|---------------------------------------------------|
| `ruleId`   | string (kebab-case)           | Groups findings; the key for glob-rule suppression. |
| `severity` | `'HIGH' \| 'MEDIUM' \| 'LOW'` | Advisory only. Unknown values normalize to `LOW`. |
| `file`     | string                        | Repo-relative path, or `''` when not file-scoped. |
| `line`     | number \| null                | 1-based line, or `null`.                          |
| `message`  | string                        | One-line human-readable description.              |

## Running

```bash
node scripts/ci/run-advisory.cjs                # human summary, exit 0
node scripts/ci/run-advisory.cjs --format json  # JSON document, exit 0
bash  scripts/ci/cagents-ci.sh advisory          # via the CI runner (WARN-only stage)
```

The `advisory` stage is also included in the default `all` run as a
non-blocking stage — its result never flips the overall CI pass/fail.

### `--format json` shape

```json
{
  "validators": [ { "id", "description", "file", "findings": [...], "suppressed": [...], "note" } ],
  "findings":   [ /* active (non-suppressed) findings, flattened */ ],
  "suppressed": [ /* baseline-suppressed findings, flattened */ ],
  "counts":     { "validators": N, "findings": N, "suppressed": N, "notes": N },
  "notes":      [ { "validator", "note" } ]
}
```

## Baseline / suppression

Known-and-accepted findings are muted in `scripts/ci/validator-baseline.yaml`
(schema documented in that file). A finding is suppressed when a baseline entry
matches it either by `{ ruleId (+ optional file glob) }` or by an exact
`fingerprint`. Every suppression carries a `reason`. The matching logic lives in
`scripts/ci/lib/validator-baseline.cjs` (`loadBaseline`, `fingerprint`,
`isSuppressed`, `findSuppression`).

To pin a fingerprint for a specific finding:

```js
const { fingerprint } = require('../lib/validator-baseline.cjs');
console.log(fingerprint({ ruleId, file, message })); // 12-char hex
```

## See also

- `scripts/ci/run-advisory.cjs` — the runner/driver.
- `scripts/ci/lib/validator-baseline.cjs` — baseline + fingerprint library.
- `scripts/ci/validator-baseline.yaml` — the suppression list.
- `tests/ci/advisory-runner.test.js` — runner + baseline regression tests.
