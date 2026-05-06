# Teammate Spawning Template

Full teammate spawn prompt template, self-registration block, and isolation/worktree details for /team.

## Full Teammate Spawn Block

```
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",  # MUST be the controller from plan.yaml, NEVER an execution agent
  name: "w{K}-task-{N}-{CONTROLLER_TYPE}",
  team_name: "{team_name}",
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
