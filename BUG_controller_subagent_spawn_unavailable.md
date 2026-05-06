# Bug: Controller subagents cannot spawn execution agents (Agent tool unavailable at depth 1)

**Filed**: 2026-05-04
**Reporter**: caelandrayer@gmail.com
**Plugin version**: cAgents v11.1.5
**Severity**: High — breaks the documented controller-centric delegation pattern and trips the verify-completion-hook on every /run that should have used a controller.

---

## Summary

Controller subagents (e.g. `cagents:engineering-manager`) report
"Agent/subagent-spawn tool not available in this runtime" when `/run`
delegates to them, forcing them to self-handle execution instead of
spawning `backend-developer` + `code-reviewer` at depth 2.

## Repro

1. From a Claude Code session with cAgents v11.1.5 loaded, run:
   ```
   /run add a small new tool to <any project> and write tests for it
   ```
2. `/run` correctly spawns `cagents:engineering-manager` at depth 1.
3. The engineering-manager returns a completion summary that
   includes the literal string: *"the Agent/subagent-spawn tool was
   not available in this runtime, so the controller executed each
   work item directly"*.
4. Inspect `cagents-memory/sessions/<id>/workflow/agent_tree.yaml` —
   only depth-0 (pipeline) and depth-1 (controller, validator) agents
   appear. **No depth-2 executors/reviewers are recorded.**
5. The `verify-completion-hook` then writes
   `completion_summary.yaml` with warning:
   > "CONTROLLER SELF-HANDLING: ... no execution agents were spawned
   > (0 agents at depth >= 2 in agent_tree.yaml). Controllers MUST
   > delegate to execution agents via Agent tool — direct
   > implementation is a protocol violation."

## Reference session demonstrating the issue

```
/home/PathingIT/CWM-MCP/cagents-memory/sessions/run_count-contacts-by-type_260504_001/
├── workflow/agent_tree.yaml          # see audit_note block at the top
├── workflow/coordination_log.yaml    # see execution_mode_note block
└── completion_summary.yaml           # see warnings[0]
```

Two separate engineering-manager spawns both hit this:
- `a7c2e9e6a17ed49c3` — initial implementation (3 work items)
- `a247d709091626213` — scoped rename follow-up

Both reported the same Agent-tool-unavailable error.

## Expected behavior

`cagents:engineering-manager` (and every cagents controller agent) should
have the `Agent` tool exposed in its tool manifest so it can spawn
`backend-developer`, `code-reviewer`, etc. per the controller-centric
delegation pattern documented in `/run`.

## Likely root cause to investigate (priority order)

1. **Controller agent definition missing Agent in `tools:` frontmatter.**
   The `engineering-manager.md` (or similar) agent file in the cagents
   plugin likely declares an explicit `tools:` array that omits `Agent`.
   When `tools:` is set, Claude Code restricts the agent to only those
   tools — the default Agent tool is dropped.
2. **Agent loader / subagent harness stripping Agent from depth-1 agents**
   to prevent runaway nesting. This contradicts the documented protocol
   and should be removed (or made depth-aware so controllers retain
   Agent while leaf executors do not).
3. **A SubagentStart hook nuking Agent for non-pipeline-engine agents.**
   Audit `.claude/hooks/` for any hook that mutates the controller
   agent's tool set.

## Acceptance criteria for the fix

- [ ] After fix, re-running the repro yields `agent_tree.yaml` entries at
      depth 2 (`backend-developer`, `code-reviewer`) under the controller.
- [ ] The `verify-completion-hook` no longer emits the
      "CONTROLLER SELF-HANDLING" warning for properly delegated runs.
- [ ] The controller's stdout no longer contains the
      "Agent/subagent-spawn tool was not available" sentence.
- [ ] Existing tests for the cagents plugin continue to pass.

## Non-goals

- Don't change `/run`'s delegation prompt template — it already instructs
  controllers to spawn subagents. The bug is that controllers **can't**.
- Don't relax the verify-completion-hook check. The check is correct;
  it's flagging a real protocol violation caused by a tool-availability
  bug elsewhere.
