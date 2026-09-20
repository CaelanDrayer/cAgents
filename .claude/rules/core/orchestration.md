---
paths:
  - ".claude/skills/act/**"
  - ".claude/skills/team/**"
  - ".claude/skills/designer/**"
  - ".claude/skills/helper/**"
  - ".claude/skills/_MODE_REGISTRY.md"
  - "cagents-memory/_system/config/pipeline_config.yaml"
  - "agents/core/**"
  - "agents/coord-log-writer.md"
  - "agents/coordinator.md"
  - "agents/execution-monitor.md"
  - "agents/execution-monitor/**"
  - "agents/hitl.md"
  - "agents/hitl/**"
  - "agents/optimizer.md"
  - "agents/optimizer/**"
  - "agents/orchestrator.md"
  - "agents/orchestrator/**"
  - "agents/planner.md"
  - "agents/planner/**"
  - "agents/reviewer.md"
  - "agents/reviewer/**"
  - "agents/router.md"
  - "agents/router/**"
  - "agents/self-correct.md"
  - "agents/self-correct/**"
  - "agents/task-state.md"
  - "agents/task-state/**"
  - "agents/team-bootstrap.md"
  - "agents/team-bootstrap/**"
  - "agents/team-lead.md"
  - "agents/team-lead/**"
  - "agents/trigger.md"
  - "agents/trigger/**"
  - "agents/validator.md"
  - "agents/validator/**"
  - "agents/wave-reviewer.md"
  - "agents/wave-reviewer/**"
---

# Orchestration Patterns

This file holds the workflow orchestration guidelines for cAgents.

## v12.0.0 State-Machine Collapse

**v12.0.0 collapsed the pipeline from 7 states to 5 states.** v12.0.0 removed
the `DECOMPOSED` state and the `PROMPTS_READY` state. `cagents:planner`
absorbed their work, and it now does the decomposition inline. A controller
falls back to the standard delegation prompts. The post-v12 state machine is:

```
INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED
```

For the rationale, see Q1 of
`cagents-memory/sessions/team_v12-revamp-phase-abc_260520_002/outputs/v12-migration/revamp-design-v2.md`.
An archived session can still reference `DECOMPOSED` and `PROMPTS_READY`. Those
references stay valid for a pre-v12 artifact. Every new session uses the
5-state machine.

## Automatic State Transitions

**Never ask the user for permission to proceed between states.**

Every state transition is automatic: INIT -> ORCHESTRATED -> PLANNED ->
COORDINATED -> VALIDATED. FAIL and REVISE both route back to PLANNED, where the
controller and/or the planner re-runs with the validator feedback.

**Ask the user only in these cases**:

- A tier 4 HITL gate opens.
- An error is unrecoverable.
- A requirement is ambiguous.
- The run used all 3 revision cycles.

**Exception**: /designer is exempt from auto-proceed. It must use
AskUserQuestion at every step.

### Session Initialization First (V10.22.0)

> **DEPRECATED in V11.0**: V11.0 removed the /review, /optimize, /context, and
> /debug skills. The /review, /optimize, and /debug entries in the skill list
> below stay for archived-session back-compat. Hooks read session_type prefixes
> from the historical session directories on disk. Do not remove these values.
> For a V12+ workflow, use `/act review`, `/act optimize`, `/act improve`, or
> `/act --mode debug`. The keyword router that v12.1.2 added accepts the first
> three forms. That router also folded `/improve` into `/act`, which carried
> the name `/run` before v12. The historical
> `/improve --mode review|optimize|full` syntax no longer exists. See
> [docs/MIGRATION-V11.md](../../../docs/MIGRATION-V11.md) for migration
> guidance.

**Every skill must create its session directory and write status.yaml before
any other work.** The skills are /act, /team, and /designer. The legacy session
prefixes /org, /review, /optimize, and /debug stay for archived-session
back-compat. Create the session directory first. Do not explore the codebase,
do not spawn an agent, do not analyze, and do not research before that.

**Rationale**: Without a session directory, a hook cannot track the session.
agent_tree.yaml has no home, and an artifact has no place to go. The session
init is a prerequisite for every other operation.

**Order**: Parse the flags -> Create the session dir -> Write the metadata
files -> Begin the work.

### Task Cleanup at Terminal States

At VALIDATED, and at COMPLETE, call TaskList. Mark the completed work with
TaskUpdate. Delete each obsolete task. Never leave a stale task.

## Event-Driven Pipeline Architecture (V9.23.0)

`/act` is a state machine engine, and it reads `pipeline_config.yaml`. Each
agent writes its **primary output file**. Those files are
`enriched_context.yaml`, `plan.yaml`, `coordination_log.yaml`, and
`validation_report.yaml`. `/act` reads them at level 0 and then advances the
state.

> **v12.6.0: `workflow/events/EVT-{N}.yaml` emission removed.** A pre-v12.6
> session wrote a per-state completion event to `workflow/events/EVT-{N}.yaml`,
> plus an `index.yaml`. Those files were signals for an external user interface
> only. No cAgents hook and no cAgents agent ever read them, so v12.6.0 dropped
> the emission from both `/act` and `/team`. `/act` no longer creates
> `workflow/events/` at session init. The primary output file of each agent now
> drives the state advancement on its own. An archived pre-v12.6 session keeps
> `workflow/events/` on disk for the record. See
> `.claude/skills/act/reference/state-machine-detail.md` (Historical note) and
> `orchestration-reference.md` § Event Files (historical).

### State Machine (v12.0.0)

```
INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED
                                            FAIL -> PLANNED
                                          REVISE -> PLANNED
```

### Nesting Model

```
/act (level 0) -> orchestrator, planner (level 1)
              -> controller (level 1) -> executor + reviewer (level 2, max 2 rounds, LP-27: 3→2)
              -> validator (level 1) -> PASS/FAIL/REVISE
```

### Pipeline Agents (Level 1)

- **Orchestrator** (INIT): enriched_context.yaml
- **Universal-planner** (ORCHESTRATED): plan.yaml and work_items.yaml. In
  v12.0.0 the planner absorbed task-decomposer and prompt-engineer. The planner
  now produces the decomposition inline, and a controller falls back to the
  standard delegation prompts.
- **Controller** (PLANNED): coordination_log.yaml with `schema_version: "1"`,
  which holds the executor loops and the reviewer loops
- **Universal-validator** (COORDINATED): validation_report.yaml

### Canonical File Roles

- `workflow/work_items.yaml`: the canonical source for the work item
  definitions. It holds the IDs, the descriptions, the acceptance criteria, and
  the dependencies.
- `team/task_list.yaml`: a status-only overlay of IDs, status, and assigned_to

### Handoff Documents (V10.6.0)

Each stage writes a handoff document to `workflow/handoffs/{STATE}.md`. The
document is a short summary of under 500 tokens. It holds the outputs, the
decisions, and the context for the next stage. The document is append-only, and
it survives a compaction.

See `orchestration-reference.md` for the format and the schemas.

## Revision Routing

- **FAIL**: Route to PLANNED. The controller re-runs with the validation
  feedback. v12.0.0 removed PROMPTS_READY, so FAIL no longer has a dedicated
  re-prompt stage. The controller takes the validation feedback directly from
  the existing plan.
- **REVISE**: Route to PLANNED. The planner re-decomposes the work, and then
  the controller re-runs.
- **Escalation**: After 3 cycles, escalate to the user and suggest
  `/act --resume`. v12.0.0 lowered this limit from 5 cycles.

## /team Integration

Wave 0 (lead) does all of the enrichment. Waves 1 to N (subagents) each run
`/act --session`, which detects the pre-enrichment. The final wave (lead) does
the integration and the final validation.

## Signal File Intervention

Before each state transition, the pipeline checks `sessions/{id}/signals/` for
a PAUSE file, a STOP file, or a RESUME file. See `orchestration-reference.md`
for the details.

## Plan Quality Requirements (V10.10.0)

Every plan.yaml must include these mandatory sections:

### Temporal Interrogation

Every plan must include an analysis of the implementation friction:

```yaml
temporal_analysis:
  hour_1_foundations: "What does the implementer need to know immediately?"
  hour_2_3_core: "What ambiguities will they hit during core implementation?"
  hour_4_5_integration: "What will surprise them during integration?"
  hour_6_plus_polish: "What will they wish they had planned for?"
```

### Not In Scope (Mandatory)

Every plan must record what it defers:

```yaml
not_in_scope:
  - item: "{deferred work item}"
    rationale: "{why deferred}"
    future_consideration: "{when/if to revisit}"
```

This section prevents scope creep, and it records the decisions. An empty
`not_in_scope` section is acceptable, but the section must be present.

### Diagrams

For any flow that is not trivial, a plan must include an ASCII diagram of:

- The data flows
- The state machines
- The decision trees
- The dependency graphs

A diagram is a **deliverable**, and it is not optional. A diagram makes the
thinking external, and it catches the edge cases.

### What Already Exists

Every plan must identify the existing code that solves part of a sub-problem:

```yaml
existing_code:
  - path: "{file_path}"
    relevance: "{what it already does}"
    action: "reuse|extend|replace"
```

This section prevents a redundant implementation, and it builds on the existing
work.

## Key Principles

1. **Config-driven**: The state machine reads pipeline_config.yaml.
2. **Output-file-driven**: Each agent writes its primary output file, which is
   `enriched_context.yaml`, `plan.yaml`, `coordination_log.yaml`, or
   `validation_report.yaml`. `/act` reads that file at level 0 and then
   advances the state. v12.6.0 removed the former `workflow/events/EVT-*.yaml`
   emission. See Event-Driven Pipeline Architecture above.
3. **Revision-capable**: The controller level allows 2 rounds (LP-27). The
   pipeline level allows 3 cycles.
4. **Controllers coordinate, and they do not execute**: They use question-based
   delegation.
5. **Signal-interruptible**: A PAUSE signal or a STOP signal stops the run
   before a transition.

---

## Skill Surface Reference

> This section came verbatim from `CLAUDE.md` § Skills (Commands), so it loads
> when you work on a skill and not in every session. The one-line description
> of each skill stays resident in the frontmatter of its `SKILL.md` file. This
> section gives the detail behind those descriptions.

### /act - Event-Driven Pipeline Engine

`/act` is a state machine loop, and it reads pipeline_config.yaml. The
enrichment is sequential: the orchestrator runs first, and then the planner
runs. The planner produces the decomposition and the delegation prompts inline.
The execution nests a controller, an executor, and a reviewer. The revision
routing handles FAIL and REVISE. The pipeline adapts, so the tier 2 fast path
skips the orchestrator. `/act` displays the domain and the tier for
confirmation, and `--analytics` reports the execution analytics. A controller
falls back to the standard delegation prompts when the planner skips the prompt
assembly.

```bash
/act Fix auth bug              # -> Engineering (tier 2: tech-lead)
/act Write fantasy story       # -> Creative (tier 2: narrative-director)
/act Plan Q4 campaign          # -> Business (tier 3: marketing-strategist)
/act Design game mechanics     # -> Business (tier 2: game-designer)
```

Skill: `.claude/skills/act/SKILL.md` + `reference/`

### /team - N-Wave Parallel Team Execution

`/team` runs an N-wave pipeline: **Wave 0 (lead: enrichment) -> Wave 1..N-1
(subagents: per-wave spawn, parallel within wave) -> Wave N (lead:
integration)**. It maximizes the number of waves for quality gating.

**Default execution model (concurrent-Agent waves)**: For each wave, the lead
spawns all of the wave-K subagents as concurrent `Agent()` calls in one
message. The calls are synchronous, with `run_in_background: false`. That flag
is explicit, because a subagent is background-by-default in CC v2.1.198. The
lead then collects the results together, validates GATE, and proceeds.

Parallelism has two sources. The first source is the concurrent per-wave
subagent calls. The second source is each subagent, because a subagent spawns
its own subagents down to depth 5. A subagent that needs another specialty
spawns that specialty downward. It does not route sideways through the lead.

Teams are implicit. CC v2.1.178 removed the `TeamCreate` tool and the
`TeamDelete` tool, so there is nothing to create and nothing to delete, and the
cleanup is automatic at session end. Each wave subagent is a controller. It
spawns its own execution agents and its own reviewer, and it nests to depth 5.

An optional experimental path uses named background teammates with tmux panes
or iTerm2 panes. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` gates that path. When
the path is unavailable, `/team` falls back to the default. For tier 3 and
above, the execution time falls by 40-60%. Each wave type has its own GATE
validation standard, and `/team` returns the partial results on a failure.

**Strategic Mode**: For a cross-domain request, where
`router.domain_count >= 2`, `/team` enables strategic mode automatically. Wave
0 and Wave 1 run the C-suite analysis with 9 leadership agents. Wave 2
synthesizes the brief. Wave 3 to Wave N dispatch the work per domain. Override
the mode with `--strategic` or with `--no-strategic`. See
`.claude/skills/team/reference/strategic-mode.md`.

```bash
/team Implement OAuth2 authentication           # Single-domain team execution (5-7 waves)
/team Launch new product with campaign          # Cross-domain: auto-strategic mode
/team Build feature --dry-run --waves 8 / --strategic   # preview / force waves / force strategic
/act Build feature --team                       # Team mode via flag
```

Config: `settings.json`. The `teammateMode` default is `in-process` since CC
v2.1.179. The `tmux` panes and the `auto` panes belong to the experimental path
only. See `docs/TEAM_MODE.md`.

### /designer, /helper

Each skill has a `SKILL.md` file and a `reference/` directory with the detailed
docs. Use `/helper` for guidance.

Highlights:

- **/designer**:
  - Subagent-delegated question preparation. A research agent builds a
    context-rich question list for each phase in advance.
  - An inline controller pattern. The controller selects, reorders, skips, and
    adapts the questions.
  - Phase overlap. The research for the next phase begins during the current
    phase.
  - A follow-up research dispatch.
  - A graceful fallback.
  - 28 behavioral rules.
- **Improve modes inside /act**: The keyword router folds `/improve` into
  `/act`, and it reads the first word. `/act improve X` -> `--mode full`.
  `/act review X` or `/act audit X` -> `--mode review`. `/act optimize X` ->
  `--mode optimize`. The review baselines (`--baseline`, `--suppress`), the
  benchmark integration (`--benchmark`), the pattern-effectiveness tracking,
  and the atomic rollback helper stay available as flags on `/act`. See
  `.claude/skills/act/reference/improve-mode.md` for the contract of the
  keyword router.
- **/helper**:
  - A troubleshooting mode (`--troubleshoot`).
  - The comparison matrices.
  - The migration catalog.
  - The strategic-mode migration guidance (`/org X` → `/team X`).

---

## See Also

- **orchestration-reference.md** - Schemas, event files, handoff format, signal
  protocol (path-conditional)
- **controllers.md** - Question-based delegation patterns
- **completion.md** - Task completion protocol
