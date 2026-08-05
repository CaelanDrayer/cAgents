# Spawn Brief Schema — Per-Wave Disk-Handoff Spawn Prompts

Reduces per-subagent spawn prompt token cost from ~600 tokens to ~80 tokens by writing the shared wave context to disk ONCE per wave and passing each subagent a pointer.

## The Problem (CI-3 from enriched_context)

`teammate-spawning-template.md` is the prompt template each Agent() call inlines. With 5-7 subagents per wave × 5-7 waves, the lead's tool-call history accumulates 25-49 large spawn prompts, each carrying repeated role boilerplate, self-registration scripts, and shared session paths. That bloat lives in the lead's context for the entire run.

## The Solution

For each wave K, the lead writes ONE `spawn_brief.md` file containing the role description, shared context, acceptance envelope, and self-validation instructions. Each subagent spawn then passes a short prompt that points to the brief plus the subagent's specific WI row.

## Brief File Location

`${SESSION_DIR}/outputs/wave-{K}/spawn_brief.md`

Written once per wave before any subagent is spawned.

## Brief Schema

```markdown
# Wave {K} Spawn Brief

## Role
You are a subagent executing work in wave {K} of the pipeline. Your job is to deliver ONE work item, self-validate, and write outputs. The lead reads only your capped report — see Report Contract below.

## Shared Context
- SESSION_DIR: {SESSION_DIR}
- SESSION_ID: {SESSION_ID}
- Wave: {K} of {total_waves}
- Total WIs this wave: {N}
- Prior-wave outputs to read (if needed): {SESSION_DIR}/outputs/wave-{K-1}/
- Plan: {SESSION_DIR}/workflow/plan.yaml
- Per-wave WIs: {SESSION_DIR}/workflow/work_items_wave_{K}.yaml

## Acceptance Envelope
Each WI has acceptance_criteria in work_items_wave_{K}.yaml. You MUST address every criterion with file:line evidence in your self-validation.

## Report Contract
What you return to the lead MUST be at most 12 lines, each at most 15 words. Put full detail in `${SESSION_DIR}/outputs/wave-{K}/task-{N}/` and cite the path; never inline the content. Report: status, WI id, one-sentence outcome, artifact path, and any blocker or concern. No narrative, no recap of what you read, no restatement of the acceptance criteria.

## Self-Validation Instructions
Before reporting DONE, run the 5 hook-verifiable checks from `.claude/rules/core/resources/execution-self-validation.md`:
1. Evidence freshness (timestamps after work_item.started_at)
2. File existence (every claimed path exists)
3. Guard exit codes (test/lint/typecheck = 0 if run)
4. Git state (matches actual git status)
5. File:line accuracy (citations match actual line content)

Write the result to `${SESSION_DIR}/outputs/wave-{K}/task-{N}/self-validation.yaml` with `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` and full self_validation block.

## Tool Availability Note
On CC ≥ 2.1.172 the Agent tool is normally present on your surface (subagents spawn subagents up to 5 levels deep), so delegate as usual. Only if the Agent tool is verifiably absent — at the nesting ceiling, or a regressed/older harness — gracefully degrade to direct execution using Read/Write/Edit/Bash (see `.claude/rules/core/teams.md` § Nesting-Ceiling Degradation). Do NOT report BLOCKED for a missing Agent tool — verify it is actually absent, then execute the work yourself and self-validate.

## Self-Registration (agent tree)
Append your entry to `${SESSION_DIR}/workflow/agent_tree.yaml` on start. See `.claude/skills/team/reference/teammate-spawning-template.md` § Self-Registration for the snippet.
```

## Short Spawn Prompt (per subagent)

The lead spawns each subagent with this ~80-token prompt (`run_in_background: false` on the default path):

```javascript
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",
  run_in_background: false,                    // DEFAULT: synchronous, lead collects results together
  name: "w{K}-task-{N}-{CONTROLLER_TYPE}",     // EXPERIMENTAL named-teammate path only — omit on the default path
  team_name: "{team_name}",                    // EXPERIMENTAL only — accepted-but-ignored (teams are implicit)
  description: "Wave {K} — TASK-{N}: {short_description}",
  prompt: `Read {SESSION_DIR}/outputs/wave-{K}/spawn_brief.md for role and acceptance envelope.
Your WI: {SESSION_DIR}/workflow/work_items_wave_{K}.yaml row {N}.
Execute, self-validate, write to outputs/wave-{K}/task-{N}/.
On done: TaskUpdate({taskId:'{task_id}', status:'completed'}). Return at most 12 lines, at most 15 words each, per the brief's Report Contract.`
})
```

## Required Fields per WI Row

In `work_items_wave_{K}.yaml`, each row must carry these fields (so the spawn prompt doesn't need to inline them):

```yaml
- id: WI-N
  title: "..."
  description: "..."
  assigned_to: cagents:{agent}
  acceptance_criteria: [...]
  dependencies: [...]
  task_id: "{TaskCreate-returned id}"
```

## Comparison: Before vs After

| Metric | Before (inline template) | After (spawn brief) |
|--------|--------------------------|---------------------|
| Per-spawn prompt tokens | ~600 | ~80 |
| Per-wave brief writes | 0 | 1 |
| Tokens saved per spawn | — | ~520 |
| 5-wave × 5-subagent run | ~15K spawn tokens | ~2K spawn tokens + 5×(~400 brief) = ~4K |
| Net savings | — | ~11K (~73%) |

## Schema Required Fields

```yaml
brief_schema:
  required_sections:
    - role                        # 1 paragraph
    - shared_context              # SESSION_DIR, SESSION_ID, wave, prior outputs, plan, per-wave WIs
    - acceptance_envelope         # pointer to per-WI acceptance_criteria
    - report_contract              # 12-line / 15-word return cap
    - self_validation_instructions # 5-check protocol pointer
  optional_sections:
    - wave_specific_constraints   # e.g., "only modify files under src/auth/"
    - integration_points          # downstream waves that consume this wave's output
    - shutdown_instructions       # when to TaskUpdate completed + SendMessage
```
