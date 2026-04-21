---
name: debug
description: "Use when a bug defies quick fixes, when 2+ attempted fixes have failed, or when root cause is unclear. Systematic 4-phase debugging: root cause investigation, pattern analysis, hypothesis testing, implementation. TRIGGER: debug, root cause, why does this fail, can't figure out, keeps breaking, intermittent bug. NOT for: known simple fixes (/run) or code review (/review)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "10.26.33"
  argument-hint: "<bug description or error message> [--escalate] [--phase <1-4>]"
  user-invocable: "true"
  context: "none"
  agent: "false"
allowed-tools: Read, Grep, Glob, Write, Bash, TodoWrite, Skill
---

# /debug — Deprecation Shim (V10.26.18+)

**`/debug` is now a thin shim over `/run --mode debug`.** The 4-phase
debugging methodology still runs; it is delivered by the event-driven
pipeline (`/run`) with debug-mode prompt prefix (V10.26.13) and debug-mode
validator checks (V10.26.14–17). This shim preserves the `/debug` user
surface while removing the duplicated state machine.

## Deprecation Notice

Emit this notice EXACTLY ONCE per session, on the first `/debug`
invocation:

```
NOTE: /debug is a shim as of V10.26.18. It forwards to /run --mode debug.
      /debug will be removed in V11.0 — `/run --mode debug` is the
      canonical form. See .claude/skills/debug/reference/methodology.md
      for the preserved 4-phase reference.
```

The notice MUST NOT block execution. After printing it once, suppress it
for the rest of the session.

## Shim Behavior

1. **Parse arguments**: Accept the same surface as pre-V10.26.18 `/debug`.
   - Positional: `<bug description>` (required, anything before the first
     `--` flag)
   - `--escalate` (boolean, forwarded unchanged)
   - `--phase <1-4>` (string, forwarded unchanged)
2. **Build the forward request**: Compose
   `"{bug description} --mode debug [--escalate] [--phase N]"`.
3. **Invoke `/run` via the Skill tool**:
   ```
   Skill({ skill: "run", args: "{bug description} --mode debug [--escalate] [--phase N]" })
   ```
   Do NOT spawn any agents directly from this shim. `/run` owns session
   initialization, controller spawning, and validation.
4. **Return `/run`'s output verbatim** to the user. The shim adds no
   post-processing beyond the one-time deprecation notice.

## What the Shim Preserves

- **Back-compat surface**: `/debug "bug description"` still works.
- **Flag pass-through**: `--escalate` and `--phase` reach the pipeline as
  forwarded arguments.
- **Session creation**: `/run --mode debug` creates a session in the same
  `Agent_Memory/sessions/` tree (slug derived from the bug description).
- **4-phase methodology**: Controllers receive the debug-mode prompt
  prefix from `.claude/skills/run/reference/debug-mode-prompt.md` and
  apply the same Phase 1–4 workflow documented in `reference/methodology.md`.
- **Evidence discipline**: V10.26.15–17 validator checks enforce
  `hypotheses_tested[]`, failing-test artifact, and BLOCKED at 3
  falsifications — i.e. the exact checks the old `/debug` SKILL.md
  described.

## What the Shim Does NOT Do

- Create session directories (that lives in `/run` Step 2).
- Spawn controllers or execution agents.
- Write instruction.yaml, status.yaml, or agent_tree.yaml.
- Apply the 4-phase methodology directly — the pipeline controller does
  that under the debug-mode prefix.

## Removal Schedule

- **V10.26.18 (this patch)**: Shim active, notice emitted once per session.
- **V10.27.x–V10.28.x**: Shim remains; notice may become more insistent.
- **V11.0.0**: Shim file removed entirely. `/run --mode debug` is the
  only entry point.

## Reference

- 4-phase methodology: `.claude/skills/debug/reference/methodology.md`
- Controller prefix text: `.claude/skills/run/reference/debug-mode-prompt.md`
- Validator check catalog: `core/agents/universal-validator/resources/debug-mode-checks.md`

## See Also

- `/run --mode debug` — canonical debug-mode invocation (V10.26.11+)
- `/review` — proactive quality review (before bugs occur)
- `.claude/rules/quality/completion.md` — evidence requirements
