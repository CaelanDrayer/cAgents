# /run context Passthrough

Front-door dispatch contract for `/run context show|init|update|clear`.
Added V10.26.9 to restore a user-facing CLI for product context after
V10.26.6 demoted `/context` from the `/` menu.

## Contract

When `/run` parses `$ARGUMENTS`, it checks the first two positional tokens
BEFORE entering the state machine. If they match:

- token 0 == `context`
- token 1 is in the set `{show, init, update, clear}`

then `/run` treats the invocation as a passthrough and dispatches to the
`/context` Claude-invocable utility skill via the Skill tool. No session
directory is created. No orchestrator is spawned. The user sees the skill's
output directly.

## Recognized Subcommands

| Invocation | Dispatch target | Purpose |
|-----------|----------------|---------|
| `/run context show` | `Skill({ skill: "context", args: "show" })` | Print the current `product_context.yaml` |
| `/run context init` | `Skill({ skill: "context", args: "init" })` | Scan project, write initial `product_context.yaml` |
| `/run context update` | `Skill({ skill: "context", args: "update" })` | Interactively merge updates into `product_context.yaml` |
| `/run context clear` | `Skill({ skill: "context", args: "clear" })` | Remove `product_context.yaml` (keep the parent directory) |

## Data Contract

The data file path is unchanged from pre-demotion behavior:

```
cagents-memory/_projects/{project_hash}/product_context.yaml
```

where `{project_hash}` is the first 8 characters of
`sha256(absolute_project_root)`. This is the SAME path read by the
orchestrator during INIT-state enrichment (see
`core/agents/orchestrator/resources/product-context-loader.md` for the read
contract). The passthrough touches only the WRITE surface.

## Dispatch Pseudocode

```
args = parse_arguments($ARGUMENTS)
tokens = args.request.split(/\s+/)

if tokens.length >= 2 and tokens[0] == "context" and
   tokens[1] in ["show", "init", "update", "clear"]:
  subcommand = tokens[1]
  result = Skill({ skill: "context", args: subcommand })
  return result   // do NOT enter state machine

// otherwise: proceed with normal /run enrichment pipeline
```

## Why Passthrough, Not State Machine

The state machine is designed to enrich, plan, decompose, and coordinate
work items. None of those phases are relevant for context management:

- `show` is a read; it prints and exits.
- `init` / `update` / `clear` are stateless YAML writes to a single file.
- No agents need coordination. No reviewer loop is required.

Passing these through the full pipeline would waste tokens and add latency
for a sub-second YAML operation. The passthrough mirrors the `--analytics`
short-circuit in Step 1 of `/run`.

## Back-Compat Behavior

If a user types `/context show` directly:

- V10.26.6 hid `/context` from the `/` menu; the slash command will not
  autocomplete.
- If the user still types it verbatim, Claude Code routes to the
  `/context` skill (because `metadata.user-invocable: "false"` blocks the
  menu but not direct invocation).
- V10.26.10 finalizes the `/context` skill body with a pointer back to
  `/run context show` so users get the migration signal even if they
  arrive via the legacy path.

## Edge Cases

| Input | Behavior |
|-------|----------|
| `/run context` (no subcommand) | Fall through to state machine with `context` as the request text |
| `/run context foo` (unknown subcommand) | Fall through to state machine (treat as a regular request about "context foo") |
| `/run context show --quiet` | Passthrough; the `--quiet` flag is forwarded to `/context` via the args string |
| `/run --brief foo.yaml context show` | Flags parsed first; `context show` remains the request, passthrough triggers |

## Relationship to Other V10.26.6–10 Patches

- **V10.26.6** hid `/context` from the menu (frontmatter flip).
- **V10.26.7** formalized the orchestrator's READ path.
- **V10.26.8** removed `/context` from the `/helper` public catalog.
- **V10.26.9** (this file) adds the user-facing WRITE path via `/run context`.
- **V10.26.10** tightens the `/context` skill description to utility-facing
  and adds a back-compat pointer to this passthrough.

The canonical data file `cagents-memory/_projects/{hash}/product_context.yaml`
is unchanged across all five patches. That invariant is the cluster's
data-loss-prevention guarantee.

## See Also

- `.claude/skills/context/SKILL.md` — the utility skill being dispatched.
- `core/agents/orchestrator/resources/product-context-loader.md` — the
  orchestrator's READ contract.
- `.claude/skills/run/SKILL.md` — parent skill; Step 1 of the core workflow
  documents this passthrough inline.
