# /improve Agent Groups (Include)

During the V10.26.24–V10.26.26 migration window, `/improve --mode review`
delegates to the canonical definitions in `/review`'s agent-groups reference
to avoid duplication. The source of truth lives at:

**@include**: [`../../review/reference/agent-groups.md`](../../review/reference/agent-groups.md)

The legacy file contains the full three-group structure, per-agent prompts,
and dependency rules. Copying it would double the maintenance cost and risk
drift between /review (until V10.26.26 shim) and /improve.

## Group Summary (for quick reference)

| Group | Timing | Agents |
|-------|--------|--------|
| 1. Structural Analysis | Parallel, independent | `cagents:architecture-reviewer`, `cagents:code-standards-auditor`, `cagents:technical-writer` |
| 2. Security & Performance | Parallel, after Group 1 | `cagents:security-engineer`, `cagents:performance-analyzer`, `cagents:test-coverage-validator` |
| 3. Specialized | Parallel, after Group 2 | `cagents:senior-developer`, `cagents:accessibility-checker`, `cagents:compliance-specialist` |

See the legacy source file for per-agent prompt templates and the conditions
that gate Group 3 (e.g. UI detection triggers `accessibility-checker`).

## Ownership Transfer

- **V10.26.24–V10.26.25**: Source of truth in
  `.claude/skills/review/reference/agent-groups.md`. This file is a pointer.
- **V10.26.26**: `/review` becomes a shim over `/improve --mode review`. The
  source file stays in the `/review` directory for one release to preserve
  back-compat.
- **V11.0**: Source-of-truth file moves to
  `.claude/skills/improve/reference/agent-groups.md`. This include file is
  replaced by the full content.

## DETECTING Contract

Each agent receives:

- `targetPath`: resolved target from SCOPING
- `baseline`: the baseline read during MEASURING
- `session_dir`: the current session's directory

Each agent writes findings to:

```
{session_dir}/workflow/detection/{group_number}/{agent_name}.yaml
```

Schema: `{findings: [{file, line, severity, confidence, category, message, suggestion}]}`.

## Dry-Run Contract

With `IMPROVE_DRY_AGENTS=1`, DETECTING writes
`{session_dir}/workflow/detection/planned_spawns.yaml`:

```yaml
planned_spawns:
  group_1: [architecture-reviewer, code-standards-auditor, technical-writer]
  group_2: [security-engineer, performance-analyzer, test-coverage-validator]
  group_3: [senior-developer, accessibility-checker, compliance-specialist]
  skipped_reason: "IMPROVE_DRY_AGENTS=1 — no agents spawned, skipping to PLANNING with empty findings"
```
