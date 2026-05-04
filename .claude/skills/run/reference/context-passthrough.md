# /run context Passthrough (REMOVED in V11.0)

**Status: REMOVED.** The `/run context show|init|update|clear` passthrough no
longer dispatches to a sibling skill. The `/context` utility skill it
dispatched to was removed in V11.0 (see [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md)).
This document is preserved as a historical record of the V10.26.9–10.26.10
contract, NOT as a live behavioral specification.

## Current Behavior (V11.0+)

`/run` no longer treats `context` as a reserved first positional token. If a
user types `/run context show`, /run will treat the entire string as a
regular request and run it through the standard enrichment pipeline (likely
producing a low-confidence plan, since "context show" is not a real
implementation request). Users SHOULD instead manage product context by
editing the YAML file directly:

```
cagents-memory/_projects/{project_hash}/product_context.yaml
```

where `{project_hash}` is the first 8 characters of
`sha256(absolute_project_root)`.

The orchestrator still READS this file during INIT-state enrichment if it
exists. See `core/agents/orchestrator/resources/product-context-loader.md`
for the unchanged read contract. Only the WRITE-side CLI (`/run context …`)
was removed.

## Historical Contract (V10.26.9 – V10.26.10, no longer enforced)

The original passthrough recognized four subcommands:

| Invocation (historical) | Historical purpose |
|------------------------|--------------------|
| `/run context show`   | Print the current `product_context.yaml`              |
| `/run context init`   | Scan project, write initial `product_context.yaml`    |
| `/run context update` | Interactively merge updates into `product_context.yaml` |
| `/run context clear`  | Remove `product_context.yaml` (keep parent directory) |

These dispatched directly to `Skill({ skill: "context", args: <subcommand> })`
without entering the `/run` state machine. The dispatch was removed in V11.0
when the `/context` skill itself was removed.

## Migration

| Old (V10.26.x)        | New (V11.0+)                                                    |
|----------------------|------------------------------------------------------------------|
| `/run context show`   | `cat cagents-memory/_projects/{hash}/product_context.yaml`      |
| `/run context init`   | Manually create the file using your project's known conventions |
| `/run context update` | Edit the file directly in your editor                           |
| `/run context clear`  | `rm cagents-memory/_projects/{hash}/product_context.yaml`       |

The data file path is unchanged. Anything that previously read the file (the
orchestrator) continues to read it. Only the write-side CLI is gone.

## Why It Was Removed

V11.0 consolidated the V10 skill catalog by removing four utility skills
(`/context`, `/debug`, `/review`, `/optimize`) whose functionality had
either moved into `/improve` (review/optimize) or `/run --mode debug`
(debug), or whose maintenance burden exceeded user demand (`/context`).
After `/context` was removed, the `/run context` passthrough had nothing
to dispatch to and was left as dead code. V11.1.4 deleted the live
dispatch block from `/run/SKILL.md` and rewrote this reference document
as a historical deprecation note.

## See Also

- [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md) — V10 -> V11 skill migration guide
- `core/agents/orchestrator/resources/product-context-loader.md` — orchestrator read contract (unchanged)
- `.claude/skills/run/SKILL.md` — parent skill; the live passthrough block was removed
