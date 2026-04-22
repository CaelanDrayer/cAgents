# /improve Flag Catalog (Preview)

V10.26.21 ships the `--mode` parser. Detailed flag tables land in V10.26.25
when `--mode review` reaches feature-parity with legacy `/review`.

## Mode Selector (V10.26.21)

| Flag | Values | Default | Notes |
|------|--------|---------|-------|
| `--mode` | `review` \| `optimize` \| `full` | `review` | Selects the state-machine branch. |

Unknown values are rejected with a usage message. See the "Argument Handling"
section of SKILL.md for the rejection format.

## Review-Mode Flags

Canonical inventory (ported from the legacy `/review` skill; source of
truth as of V11.0):

- `--focus <area>`
- `--auto-fix` / `--auto-fix safe`
- `--severity <level>`
- `--mode paranoid|quick|security|pre-merge` (legacy review modes; sub-flag of
  `--mode review` in /improve)
- `--baseline`
- `--suppress <finding-id>`
- `--profile <name>`
- `--show-confidence`
- `--run-tests`
- `--rollback-on-failure`
- `--critical-first`
- `--pr-context`
- `--git-hotspots`
- `--scope <target>`

## Optimize-Mode Flags (Ported from /optimize in Cluster 5)

Placeholder. See `.claude/skills/optimize/SKILL.md` for the current surface
until Cluster 5 migrates it.
