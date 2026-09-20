# Subagent Spawning Template

This file keeps the name `teammate-spawning-template.md` for back-compat with each @-reference. It gives the full spawn prompt template for a subagent. It also gives the self-registration block, and the details of the isolation worktree for /team.

## Spawn Mechanism: Concurrent Agent Waves (DEFAULT)

Teams are implicit from Claude Code v2.1.178. That release removed `TeamCreate` and `TeamDelete`. There is nothing to create, and there is nothing to register a team with. The DEFAULT spawn mechanism works one wave at a time. For each wave K, issue ALL of the wave-K subagent `Agent()` calls as CONCURRENT tool uses in ONE assistant message. Give each call `run_in_background: false`.

A synchronous spawn is necessary, because a subagent is background-by-default from v2.1.198. The synchronous spawn is what makes the lead receive all of the wave results together, before it validates GATE-K. On the default path a subagent needs NO `name` field and NO `team_name` field. Those are addressing fields for the experimental named-teammate path below. Each wave subagent can spawn its own subagents to depth 5, for any specialty that it needs. This path works in every harness.

### EXPERIMENTAL named-teammate option (OPTIONAL)

Two conditions open this option. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` must be set, AND the harness must support interactive agent teams. You MAY then spawn named background teammates with `Agent({ name, run_in_background: true })`. Coordinate them with `SendMessage({to: name})`. From v2.1.77, that call auto-resumes a stopped teammate by its name. Any `team_name` argument is accepted, and then it is ignored.

`teammateMode` controls the display. Its default is `in-process` from v2.1.179, and the other values are `tmux` and `iterm2`. A split pane needs tmux or iTerm2, and it belongs to the experimental path only. If the experimental feature is unavailable, fall back to the DEFAULT concurrent-Agent path above.

## Disk-Handoff Spawn Pattern (Preferred, v12.1.0+)

The per-spawn token cost sits in the context of the lead. To make that cost small, write a `spawn_brief.md` file to disk ONCE for each wave. Then give each subagent a short pointer prompt. For the brief schema and the short prompt template, see @spawn-brief-schema.md. That file also gives the token savings. The savings are about 73 percent on a run of 5 waves with 5 subagents in each wave.

In the disk-handoff pattern, the lead first writes `${SESSION_DIR}/outputs/wave-{K}/spawn_brief.md`. It does this before it spawns the subagents of the wave. It then spawns each subagent with a prompt of about 80 tokens. That prompt points to the brief, and it points to the WI row of the subagent in `work_items_wave_{K}.yaml`.

The inline template below stays for back-compat. It also stays for a wave with only 1 subagent or 2 subagents. In that case the overhead of the brief is larger than the savings.

## Full Subagent Spawn Block (Inline Pattern)

On the DEFAULT concurrent-Agent path, keep `run_in_background: false`. OMIT the `name` field and the `team_name` field. They are addressing fields for the EXPERIMENTAL named-teammate path only. Issue all of the spawn calls of a wave as concurrent tool uses in one message.

```
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",  # MUST be the controller from plan.yaml, NEVER an execution agent
  run_in_background: false,                     # DEFAULT: synchronous, so the lead collects all wave results together (v2.1.198 background-by-default)
  # NO `name` and NO `team_name` on this path. Passing `name` promotes the spawn to a
  # named background teammate and SILENTLY overrides `run_in_background: false` (ENG-OBS-7),
  # so the lead never collects the result. Named teammates belong to the EXPERIMENTAL path
  # only, which spawns with `run_in_background: true` and collects via SendMessage.
  description: "Wave {K} - Execute TASK-{N}: <short description>",
  prompt: "You are a subagent executing a work item in wave {K} of the pipeline.

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
     const id='subagent-{K}-{N}-'+Date.now();
     if(!obj.agents.some(a=>a.cagents_type==='cagents:{CONTROLLER_TYPE}'&&a.session==='{SESSION_ID}')){
       obj.agents.push({id,type:'cagents:{CONTROLLER_TYPE}',parent:'lead',depth:1,
         spawned_at:new Date().toISOString(),stopped_at:null,
         cagents_type:'cagents:{CONTROLLER_TYPE}',short_role:'{CONTROLLER_TYPE}',
         role_description:'Wave {K} subagent - TASK-{N}',session:'{SESSION_ID}'});
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
Use: node -e \"const fs=require(\\\"fs\\\"),yaml=require(\\\"js-yaml\\\");const f=\\\"{SESSION_DIR}/workflow/agent_tree.yaml\\\";let o={agents:[]};try{o=yaml.load(fs.readFileSync(f,\\\"utf8\\\"))||{agents:[]}}catch(e){}if(!Array.isArray(o.agents))o.agents=[];const id=\\\"exec-{N}-\\\"+Date.now();if(!o.agents.some(a=>a.id===id)){o.agents.push({id,type:\\\"cagents:{agent_from_work_items}\\\",parent:\\\"subagent-{K}-{N}\\\",depth:2,spawned_at:new Date().toISOString(),stopped_at:null,cagents_type:\\\"cagents:{agent_from_work_items}\\\",short_role:\\\"{agent_from_work_items}\\\",role_description:\\\"Execute TASK-{N}\\\",session:\\\"{SESSION_ID}\\\"});fs.writeFileSync(f,yaml.dump(o))}\"'
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

If two subagents change the same files, add `isolation: "worktree"` to the Agent call. For the details, see `reference/wave-execution-detail.md` § Worktree Isolation.
