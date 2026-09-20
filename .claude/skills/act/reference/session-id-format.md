# Session ID Format and Generation

This file explains how /act generates a session ID, and how it then creates the session directory.

## Format

```
{command}_{slug}_{YYMMDD}_{NNN}
```

Example: `act_fix-auth-module-jwt_260317_001`

## Slug Rules

- Use 2 to 6 key words from the user request
- Write the slug in kebab-case, and in lowercase
- Keep the slug to 50 characters or fewer
- Strip the filler words: the, a, an, to, for, with, and, of

Example: "Fix auth module JWT" -> "fix-auth-module-jwt"

## Date Component

Use the compact date form `YYMMDD`. For example, 260317 stands for 2026-03-17.

## Counter Component

`NNN` is a sequence number of 3 digits, and it starts at 001. Compute it like
this:

1. Scan `cagents-memory/sessions/` for the directories that match `act_*_{YYMMDD}_*`
2. Find the highest NNN that already exists for today's date
3. Increment that number by 1. If you find no directory, start at 001

## CAGENTS_SESSION_ID Override

Before you generate a new SESSION_ID, check `process.env.CAGENTS_SESSION_ID`:

- If the variable is set and not empty: use it verbatim as the SESSION_ID, and
  generate nothing
  - SESSION_DIR = `$MEM/sessions/${CAGENTS_SESSION_ID}`. That path is absolute.
    See the anchor below.
  - If SESSION_DIR exists: this run is a RESUME, so create no session file
  - If SESSION_DIR does not exist: treat the run as a new session, and mkdir
    with the value of the env var
- If the variable is not set, or if it is empty: go on with the auto-generation

## Session Directory Creation

**Anchor session paths to an absolute project root, not to a relative `cagents-memory/…`
literal.** A relative path resolves against the *current working directory*. A
nested `/act` run can hold its cwd inside a parent session directory, and a
`/team` subagent can do the same. A relative write then nests a whole
`cagents-memory/` tree under that session. This fault is the CWD-leak, REC-20.
Anchor once, and derive everything from `$MEM`:

```
CAGENTS_ROOT="${CLAUDE_PROJECT_DIR:-$(git -C "$(pwd)" rev-parse --show-toplevel 2>/dev/null || pwd)}"
MEM="$CAGENTS_ROOT/cagents-memory"
SESSION_DIR="$MEM/sessions/${SESSION_ID}"
mkdir -p "${SESSION_DIR}/workflow" "${SESSION_DIR}/outputs"
```

## Required Initial Files

At creation time, /act writes these three files:

| File | Purpose |
|------|---------|
| `instruction.yaml` | User request + metadata |
| `status.yaml` | Pipeline state and history |
| `workflow/agent_tree.yaml` | Self-registration as root agent |

### instruction.yaml

```yaml
session_id: {SESSION_ID}
session_type: act
command: /act
request: "{user_request}"
created_at: "{ISO_TIMESTAMP}"
flags: {parsed_flags}
parent_session_id: {PARENT_SESSION_ID or null}
metadata:
  working_directory: {CWD}
```

### status.yaml

```yaml
pipeline_state: INIT
created_at: "{ISO_TIMESTAMP}"
state_history:
  - state: INIT
    entered_at: "{ISO_TIMESTAMP}"
```

`{ISO_TIMESTAMP}` MUST be the real current time. Never fabricate a timestamp such as `T00:00:00Z` or `T12:00:00Z`. These are detectable fakes, and they break the analysis of the session timeline. If you need the value, get it with `date -u +%Y-%m-%dT%H:%M:%SZ` in Bash.

v12.6.0 note: `revision_round`, `validation_cycles` and `state_history[].duration_ms` served an external UI only. The pipeline no longer writes them. Track the revision count in the working state of `/act`, and allow a maximum of 3 cycles before HITL.

/act uses the `pipeline_state` field, and it does not use `phase`. The hooks check both of those fields as a fallback. See @reference/session-schema.md for the canonical session YAML contract.
