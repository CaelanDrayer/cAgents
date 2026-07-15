# Teammate Spawning Template

Full teammate spawn prompt template, self-registration block, and isolation/worktree details for /team.

## Spawn Mechanism: Concurrent Agent Waves (DEFAULT)

Teams are implicit since Claude Code v2.1.178 — `TeamCreate`/`TeamDelete` were removed; there is nothing to create and nothing to register a team with. The DEFAULT spawn mechanism is: for each wave K, issue ALL wave-K teammate `Agent()` calls as CONCURRENT tool uses in ONE assistant message, each with `run_in_background: false`. Synchronous spawning (`run_in_background: false`) is required because subagents are background-by-default since v2.1.198 — it is what makes the lead receive all wave results together before validating GATE-K. On the default path a teammate needs NO `name` and NO `team_name` field; those are addressing fields for the experimental named-teammate path below. This path works in every harness.

### EXPERIMENTAL named-teammate option (OPTIONAL)

Only when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` AND the harness supports interactive agent teams, you MAY instead spawn named background teammates with `Agent({ name, run_in_background: true })` and coordinate via `SendMessage({to: name})` (auto-resumes a stopped teammate by name, v2.1.77). Any `team_name` argument is accepted-but-ignored. `teammateMode` (default `in-process` since v2.1.179; or `tmux`/`iterm2`) controls display; panes require tmux/iTerm2 and are experimental-only. If the experimental feature is unavailable, fall back to the DEFAULT concurrent-Agent path above.

## Disk-Handoff Spawn Pattern (Preferred, v12.1.0+)

To minimize per-spawn token cost in the lead's context, write a per-wave `spawn_brief.md` to disk ONCE per wave and pass each teammate a short pointer prompt. See @spawn-brief-schema.md for the brief schema, short prompt template, and token savings (~73% on a 5-wave × 5-teammate run).

When using the disk-handoff pattern, the lead writes `${SESSION_DIR}/outputs/wave-{K}/spawn_brief.md` before spawning the wave's teammates, then spawns each teammate with a ~80-token prompt that points to the brief plus the teammate's WI row in `work_items_wave_{K}.yaml`.

The inline template below is preserved for back-compat and for cases where a wave has only 1-2 teammates (where the brief overhead exceeds savings).

## Full Teammate Spawn Block (Inline Pattern)

On the DEFAULT concurrent-Agent path, keep `run_in_background: false` and OMIT the `name` / `team_name` fields (they are addressing fields for the EXPERIMENTAL named-teammate path only). Issue all of a wave's spawn calls as concurrent tool uses in one message.

```
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",  # MUST be the controller from plan.yaml, NEVER an execution agent
  run_in_background: false,                     # DEFAULT: synchronous, so the lead collects all wave results together (v2.1.198 background-by-default)
  name: "w{K}-task-{N}-{CONTROLLER_TYPE}",      # EXPERIMENTAL named-teammate path only — omit on the default path
  team_name: "{team_name}",                     # EXPERIMENTAL only — accepted-but-ignored (teams are implicit since v2.1.178)
  description: "Wave {K} - Execute TASK-{N}: <short description>",
  prompt: "You are a teammate executing a work item in wave {K} of the pipeline.

WORK ITEM: TASK-{N}: <full description>
WAVE: {K} of {total_waves}
ACCEPTANCE CRITERIA: <criteria>
SESSION DIR: {SESSION_DIR}  (contains enriched_context.yaml, plan.yaml, work_items.yaml)
OUTPUTS FROM PREVIOUS WAVES: {SESSION_DIR}/outputs/  (read artifacts from earlier waves)
EXECUTION AGENT TO SPAWN: {agent_from_work_items}  (delegate to this agent via Agent tool)

CRITICAL: You are a CONTROLLER agent. Your job is to coordinate execution, NOT implement directly.
Spawn the execution agent below via Agent tool, then spawn a reviewer to validate.
Direct implementation without delegating to execution agents is a violation of the team protocol.

SELF-REGISTRATION (belt-and-suspenders agent tree tracking):
Immediately after reading this prompt, write your own entry to {SESSION_DIR}/workflow/agent_tree.yaml
using the Bash tool. This ensures you appear in the agent tree even if the SubagentStart hook
failed to resolve the session. Use this YAML append command:
   Bash: node -e \"
     const fs=require('fs'),yaml=require('js-yaml'),path=require('path');
     const treeFile='{SESSION_DIR}/workflow/agent_tree.yaml';
     let obj={agents:[]};
     try{obj=yaml.load(fs.readFileSync(treeFile,'utf8'))||{agents:[]}}catch(e){}
     if(!Array.isArray(obj.agents))obj.agents=[];
     const id='teammate-{K}-{N}-'+Date.now();
     if(!obj.agents.some(a=>a.cagents_type==='cagents:{CONTROLLER_TYPE}'&&a.session==='{SESSION_ID}')){
       obj.agents.push({id,type:'cagents:{CONTROLLER_TYPE}',parent:'lead',depth:1,
         spawned_at:new Date().toISOString(),stopped_at:null,
         cagents_type:'cagents:{CONTROLLER_TYPE}',short_role:'{CONTROLLER_TYPE}',
         role_description:'Wave {K} teammate - TASK-{N}',session:'{SESSION_ID}'});
       fs.writeFileSync(treeFile,yaml.dump(obj));
     }\"

INSTRUCTIONS:
1. Read outputs from previous waves if your work item depends on them
2. Write your self-registration entry to {SESSION_DIR}/workflow/agent_tree.yaml (see above)
3. Spawn the execution agent to implement the work item:
   Agent({
     subagent_type: 'cagents:{agent_from_work_items}',
     description: 'Implement TASK-{N}: {short_description}',
     prompt: 'Implement TASK-{N}: {description}. Acceptance criteria: {criteria}. Write outputs to {SESSION_DIR}/outputs/task-{N}/

SESSION_DIR: {SESSION_DIR}
SESSION_ID: {SESSION_ID}

SELF-REGISTRATION: After starting work, append your own entry to {SESSION_DIR}/workflow/agent_tree.yaml so the SubagentStart hook can resolve you even when CAGENTS_ACTIVE_SESSION is not inherited.
Use: node -e \"const fs=require(\\\"fs\\\"),yaml=require(\\\"js-yaml\\\");const f=\\\"{SESSION_DIR}/workflow/agent_tree.yaml\\\";let o={agents:[]};try{o=yaml.load(fs.readFileSync(f,\\\"utf8\\\"))||{agents:[]}}catch(e){}if(!Array.isArray(o.agents))o.agents=[];const id=\\\"exec-{N}-\\\"+Date.now();if(!o.agents.some(a=>a.id===id)){o.agents.push({id,type:\\\"cagents:{agent_from_work_items}\\\",parent:\\\"teammate-{K}-{N}\\\",depth:2,spawned_at:new Date().toISOString(),stopped_at:null,cagents_type:\\\"cagents:{agent_from_work_items}\\\",short_role:\\\"{agent_from_work_items}\\\",role_description:\\\"Execute TASK-{N}\\\",session:\\\"{SESSION_ID}\\\"});fs.writeFileSync(f,yaml.dump(o))}\"'
   })
4. After execution agent returns, spawn a reviewer to validate:
   Agent({
     subagent_type: 'cagents:reviewer',
     description: 'Review TASK-{N}',
     prompt: 'Review implementation of TASK-{N}. Acceptance criteria: {criteria}. Output: PASS or REVISE with feedback.

SESSION_DIR: {SESSION_DIR}
SESSION_ID: {SESSION_ID}'
   })
5. If REVISE: re-spawn execution agent with feedback (max 3 rounds)
6. Write outputs to {SESSION_DIR}/outputs/task-{N}/
7. If issues arise: flag to lead via SendMessage but continue working
8. On completion:
   TaskUpdate({ taskId: '{task_id}', status: 'completed' })
   SendMessage({ type: 'message', recipient: '{lead_name}', content: 'TASK-{N} complete. <summary>', summary: 'TASK-{N} done' })"
})
```

## Worktree Isolation

Add `isolation: "worktree"` to the Agent call when teammates modify overlapping files. See `reference/wave-execution-detail.md` § Worktree Isolation for details.
