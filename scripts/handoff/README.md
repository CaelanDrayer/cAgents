# File-handoff helpers

Small, self-contained convenience scripts that mechanically back the
"delegation prompt under 300 tokens" rule (see
`.claude/rules/core/controllers.md` § Context-Efficient Question Delegation).
Instead of pasting a whole `work_items.yaml` or a full diff into a delegation /
review prompt, a controller (or team lead) can extract just the relevant slice
to a uniquely-named file and hand the sub-agent a path to read in one call.

These are convenience helpers, **not** load-bearing pipeline code — nothing in
the `/run` or `/team` pipeline requires them. They exist so an agent that *wants*
a tight handoff artifact can produce one deterministically.

## Scripts

### `task-brief.sh`

Extract a single work-item block from a `work_items.yaml` into a
uniquely-named brief file.

```bash
scripts/handoff/task-brief.sh WI-3 path/to/work_items.yaml
# -> path/to/task-brief-WI-3-<timestamp>-<pid>.yaml   (path printed on stdout)

scripts/handoff/task-brief.sh WI-3 work_items.yaml --stdout   # print, don't write
scripts/handoff/task-brief.sh WI-3 work_items.yaml --out-dir /tmp/handoff
```

Matches the id against each list item's inline `id:` (or `task_id:`) field —
the standard cAgents `work_items.yaml` inline form (`  - id: WI-3`). Exits 1 if
the id is not found.

### `review-package.sh`

Bundle a `git diff` (optionally scoped to paths and/or refs) into a
uniquely-named file for a reviewer sub-agent. A short header (repo, refs,
paths, `--stat` summary) precedes the diff.

```bash
scripts/handoff/review-package.sh -- src/auth
# -> <repo-root>/review-package-<timestamp>-<pid>.diff   (path printed on stdout)

scripts/handoff/review-package.sh --range main..HEAD -- src/ lib/
scripts/handoff/review-package.sh --ref HEAD~3 -- packages/api
scripts/handoff/review-package.sh --staged --stdout
```

With no `--range`/`--ref`/`--staged`, diffs the working tree against `HEAD`.
Must be run inside a git work tree.

## Conventions

- `#!/usr/bin/env bash` + `set -euo pipefail`.
- `--help` on either script prints usage and exits 0.
- Output files are uniquely named (`<timestamp>-<pid>`) so concurrent calls do
  not collide, and the file path is printed on stdout for easy capture.
- Dependencies: `bash`, `git`, `awk`, `sed`, and coreutils only. No `jq`, `yq`,
  or `python`.

## See also

- `.claude/rules/core/controllers.md` — Context-Efficient Question Delegation
  (the ≤300-token prompt rule these helpers support).
- `.claude/rules/core/orchestration-reference.md` — Handoff Documents Protocol.
