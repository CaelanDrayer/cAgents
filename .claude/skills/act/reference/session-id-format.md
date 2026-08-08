# Session ID Format and Generation

How /act generates session IDs and creates the session directory.

## Format

```
{command}_{slug}_{YYMMDD}_{NNN}
```

Example: `run_fix-auth-module-jwt_260317_001`

## Slug Rules

- 2-6 key words from the user request
- kebab-case, lowercase
- Max 50 chars
- Strip filler words: the, a, an, to, for, with, and, of

Example: "Fix auth module JWT" -> "fix-auth-module-jwt"

## Date Component

Compact date: `YYMMDD` (e.g., 260317 for 2026-03-17).

## Counter Component

`NNN` is a 3-digit sequence number starting at 001. To compute:

1. Scan `cagents-memory/sessions/` for dirs matching `run_*_{YYMMDD}_*`
2. Find the highest existing NNN for today's date
3. Increment by 1 (start at 001 if none found)

## CAGENTS_SESSION_ID Override

Before generating a new SESSION_ID, check `process.env.CAGENTS_SESSION_ID`:

- If set and non-empty: use it verbatim as SESSION_ID (skip generation)
  - SESSION_DIR = `$MEM/sessions/${CAGENTS_SESSION_ID}` (absolute — see anchor below)
  - If SESSION_DIR exists: this is a RESUME -- skip session file creation
  - If SESSION_DIR does not exist: treat as new session, mkdir using the env var value
- If not set or empty: proceed with auto-generation

## Session Directory Creation

**Anchor session paths to an ABSOLUTE project root, not a relative `cagents-memory/…`
literal.** A relative path resolves against the *current working directory*, and a
nested `/act` (or a `/team` subagent) can run with its cwd inside a parent session
dir — a relative write then nests a whole `cagents-memory/` tree under that session
(the CWD-leak, REC-20). Anchor once and derive everything from `$MEM`:

```
CAGENTS_ROOT="${CLAUDE_PROJECT_DIR:-$(git -C "$(pwd)" rev-parse --show-toplevel 2>/dev/null || pwd)}"
MEM="$CAGENTS_ROOT/cagents-memory"
SESSION_DIR="$MEM/sessions/${SESSION_ID}"
mkdir -p "${SESSION_DIR}/workflow" "${SESSION_DIR}/outputs"
```

## Required Initial Files

On creation, /act writes:

| File | Purpose |
|------|---------|
| `instruction.yaml` | User request + metadata |
| `status.yaml` | Pipeline state and history |
| `workflow/agent_tree.yaml` | Self-registration as root agent |

### instruction.yaml

```yaml
session_id: {SESSION_ID}
session_type: run
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

`{ISO_TIMESTAMP}` MUST be the real current time. Never fabricate timestamps like `T00:00:00Z` or `T12:00:00Z` -- these are detectable fakes that break session timeline analysis. Use `date -u +%Y-%m-%dT%H:%M:%SZ` via Bash if needed.

v12.6.0: `revision_round`, `validation_cycles`, and `state_history[].duration_ms` were external-UI-only fields and are no longer written. Track revision count in `/act`'s working state (max 3 cycles before HITL).

Note: /act uses the `pipeline_state` field (not `phase`). Hooks check both fields as fallback. See @reference/session-schema.md for the canonical session YAML contract.
