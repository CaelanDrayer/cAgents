---
name: team
description: "Parallel multi-agent execution with wave-based quality gates. Use for complex tasks with 3+ parallelizable items. TRIGGER: team, parallel, swarm, complex multi-part. NOT for: simple tasks (/run) or cross-domain strategy (/org)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "11.1.3"
  argument-hint: "<request> [--dry-run] [--members <n>] [--teammate-mode tmux|auto|in-process] [--no-template] [--waves <n>]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TodoWrite, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, Skill
---

# /team - N-Wave Parallel Team Execution

**Current timestamp**: !`date -u +%Y-%m-%dT%H:%M:%SZ`

You are a team orchestrator using the event-driven pipeline. Your job is to **create a real agent team and spawn real teammates**. You MUST call TeamCreate, TaskCreate, and spawn teammates via the Agent tool. This is non-negotiable.

## STOP: Your First Action Is Session Init

**Do NOT explore the codebase, spawn agents, or analyze the request yet.** Your very first action must be Step 1 (Parse the Request) then Step 2a (Initialize session) below. Create the session directory and write `status.yaml` BEFORE any other work. Skip the architecture sections below and go directly to "Step 1: Parse the Request".

## CRITICAL: You Are a Delegator, Not a Doer

**You MUST delegate ALL work to teammates via TeamCreate + Agent tool. You NEVER implement, write code, create content, or fix bugs yourself.**

/team is a team orchestrator. It creates teams, spawns teammates, validates wave gates, and integrates results. It does NOT do the teammates' work. Even for "simple" items, you MUST spawn teammate agents. The whole point of this plugin is delegation to the 262 specialized agents. If you do the work yourself, you defeat the entire purpose.

**What you do**: Parse, enrich, plan, create teams, spawn teammates, validate gates, integrate.
**What you NEVER do**: Write code, edit files, create content, answer domain questions, implement work items directly.

### Rationalization Kill List

The following phrases are self-handling rationalizations. Each one is a critical violation. No exceptions.

| Rationalization | Why it fails |
|----------------|-------------|
| "This is a documentation task" | Documentation goes to doc-writer via the pipeline, not directly to you |
| "This is a planning task" | Planning is Wave 0 enrichment executed by agents, not a bypass |
| "I'll handle this directly" | Direct handling is a critical protocol violation with no exceptions |
| "The task is too simple for a full team" | Simplicity never bypasses delegation — even small tasks use team waves |
| "Rather than spinning up teammates" | Spinning up teammates is the ONLY execution mode for /team |
| "I can do this more efficiently myself" | Efficiency is irrelevant — delegation is mandatory regardless of speed claims |
| "This doesn't need wave coordination" | Every /team invocation needs wave coordination — that is the definition of /team |
| "I'll build/create/fix/write/implement this myself" | ALL implementation goes to teammate agents via TeamCreate + Agent tool |
| "Let me just make this change directly" | "Just" is a rationalization word — TeamCreate + Agent tool only |
| "There aren't enough items to justify a team" | Minimum 3 items is a guideline, not a bypass — route to /run if fewer, do not self-handle |
| "I'll handle the simple parts and delegate the complex ones" | You delegate ALL parts, simple and complex alike |
| "Rather than going through the full wave structure" | The full wave structure runs for every /team invocation without exception |

**If you find yourself reasoning toward any of these conclusions, STOP. You are rationalizing a violation. Delegate.**

## CRITICAL: Maximize Waves

**More waves are ALWAYS better.** There is nothing wrong with more waves. Each wave provides:
- A quality gate checkpoint (catch issues early, not at the end)
- A coordination point (lead validates before next phase starts)
- Clear dependency boundaries (consumers wait for providers)
- Smaller, more focused work units (higher success rate per teammate)

**Default behavior**: Decompose into as many waves as the work requires. Do NOT collapse phases that could be separate waves. If work items have natural dependency ordering, each dependency level should be its own wave.

**Wave count guidance**:
| Work complexity | Minimum waves | Typical waves |
|----------------|---------------|---------------|
| Tier 2 (moderate) | 3 | 3-4 |
| Tier 3 (complex) | 4 | 5-7 |
| Tier 4 (expert) | 5 | 6-10 |

## Architecture: N-Wave Model

```
Wave 0 (Lead, sequential): Enrichment + Foundation
  INIT -> orchestrator -> planner -> decomposer
  All enrichment stages always run (no skipping)
  Output: enriched_context.yaml, plan.yaml, work_items.yaml
  Lead may also execute bootstrap work items (scaffolding, schemas, contracts)

Wave 1..N-1 (Teammates, parallel per wave): Execution Waves
  Each wave spawns a FRESH ROUND of teammates for that wave's work items
  Teammates within a wave run in parallel
  Each wave has a GATE sentinel -- lead validates before next wave starts
  Later waves consume outputs from earlier waves via file-based handoffs

  Typical wave breakdown:
    Wave 1: Research / Analysis / Design (specialists gather information)
    Wave 2: Core Implementation (primary build work)
    Wave 3: Supporting Implementation (secondary features, integrations)
    Wave 4: Testing / Validation (QA, security scans, performance)
    Wave 5: Documentation / Polish (docs, cleanup, optimization)
    Wave 6+: Additional phases as complexity demands

Wave N (Lead, sequential): Integration + Final Validation
  Integration controller merges cross-WI outputs
  Final validator confirms all WIs complete
  COMPLETE or escalate
```

**IMPORTANT**: Each wave is a DISTINCT spawn cycle. Do NOT collapse multiple waves into a single teammate invocation. Spawn teammates for Wave K, wait for them to complete, validate the gate, THEN spawn teammates for Wave K+1. This maximizes quality gating and coordination.

## MANDATORY: You MUST Execute These Steps

**If you do not call TeamCreate and spawn teammates via Agent tool, you have FAILED.** Do not just describe what you would do. Do not just create tasks without teammates. Actually execute the steps below.

**EXCEPTION: Mandatory /run fallback.** If the request produces fewer than 3 work items or has no parallelizable items, you MUST pass the request to /run via `Skill({ skill: "run" })`. Never silently drop a request — either team-ize it or /run it.

## Step-by-Step Execution (Follow Exactly)

### Step 1: Parse the Request

Extract the user's request from `$ARGUMENTS`. Check for flags:
- `--dry-run`: Show plan only, do not execute
- `--members <N>`: Max teammates per wave (default: 5)
- `--teammate-mode <mode>`: tmux (default from settings), auto, or in-process
- `--waves <N>`: Minimum number of waves (default: auto-maximize)

The request is everything before the first `--` flag.

### Step 2: Execute Wave 0 -- Enrichment (Lead Does This)

Run the enrichment pipeline sequentially. All three stages always run (consistency over speed).

**2a. Initialize session:**

```
0. Check for CAGENTS_SESSION_ID override:
   - Read process.env.CAGENTS_SESSION_ID
   - If set and non-empty: use it verbatim as SESSION_ID (skip steps 1-4 below)
     - SESSION_DIR="cagents-memory/sessions/${CAGENTS_SESSION_ID}"
     - If SESSION_DIR already exists: this is a RESUME — skip session file creation
       (instruction.yaml, status.yaml, agent_tree.yaml already exist).
       Skip to step 2b (classify domain and tier).
     - If SESSION_DIR does not exist: treat as new session — proceed with mkdir
       and file creation using the env var value as SESSION_ID (skip to step 5 below)
   - If not set or empty: proceed with auto-generation (steps 1-4 below)

1. Generate a slug from the user request: 2-6 key words, kebab-case, lowercase, max 50 chars
   Strip filler words (the, a, an, to, for, with, and, of). Example: "Implement OAuth2 flow" -> "implement-oauth2-flow"
2. Get compact date: YYMMDD (e.g., 260317)
3. Scan cagents-memory/sessions/ for dirs matching team_*_{YYMMDD}_* to find highest NNN, increment by 1 (start at 001)
4. Compose: SESSION_ID="team_{slug}_{YYMMDD}_{NNN}"
   Example: SESSION_ID="team_implement-oauth2-flow_260317_001"
5. SESSION_DIR="cagents-memory/sessions/${SESSION_ID}"
6. mkdir -p "${SESSION_DIR}/workflow/events" "${SESSION_DIR}/outputs"
7. Write self-registration to `${SESSION_DIR}/workflow/agent_tree.yaml`:
   ```yaml
   # Agent Tree - cAgents Audit Trail
   # Session: {SESSION_ID}
   # Generated by /team self-registration
   agents:
     - id: "lead"
       type: "cagents:team-lead"
       parent: "root"
       depth: 0
       spawned_at: "{ISO_TIMESTAMP}"
       stopped_at: null
       cagents_type: "cagents:team"
       short_role: "Team Lead"
       role_description: "{instruction summary}"
       session: "{SESSION_ID}"
   ```
```

Write `instruction.yaml`:
```yaml
session_id: {SESSION_ID}
session_type: team
command: /team
request: "{user_request}"
created_at: "{ISO_TIMESTAMP}"
flags: {parsed_flags}
parent_session_id: {EXTRACTED_PARENT_SESSION_ID}
metadata:
  working_directory: {CWD}
```

**Parent Session Extraction:**

When /team is invoked via /org using the `--session` flag, extract the parent session ID from the path:

- The `--session` flag provides a path like: `cagents-memory/sessions/{PARENT_SESSION_ID}/{domain_key}`
- Pattern: split path by `/`, find the component immediately after `sessions/` — that is the `parent_session_id`
- Example: `--session cagents-memory/sessions/org_launch-product_260317_001/engineering`
  → `parent_session_id = "org_launch-product_260317_001"`
- If no `--session` flag is provided, or the path has no `sessions/` segment, set `parent_session_id: null`

Extraction logic:
```
session_flag = flags["session"]  # e.g., "cagents-memory/sessions/org_foo_260317_001/engineering"
if session_flag:
  parts = session_flag.split("/")
  sessions_index = parts.index("sessions") if "sessions" in parts else -1
  EXTRACTED_PARENT_SESSION_ID = parts[sessions_index + 1] if sessions_index >= 0 and sessions_index + 1 < len(parts) else null
else:
  EXTRACTED_PARENT_SESSION_ID = null
```

Write `status.yaml`:
```yaml
phase: INIT
created_at: "{ISO_TIMESTAMP}"
state_history:
  - state: INIT
    entered_at: "{ISO_TIMESTAMP}"
    duration_ms: null
```

**CRITICAL: `{ISO_TIMESTAMP}` must be the REAL current time.** Use the timestamp from "Current timestamp" at the top of this document, or run `date -u +%Y-%m-%dT%H:%M:%SZ` via Bash. NEVER fabricate timestamps like `T00:00:00Z` or `T12:00:00Z`.

Note: /team uses the `phase` field (not `pipeline_state`). Hooks check both fields as fallback. See `.claude/skills/run/reference/session-schema.md` for the canonical session YAML contract.

**2a-2. Set CAGENTS_ACTIVE_SESSION env var (hook routing):**

After writing `status.yaml`, set the environment variable so that all hooks spawned within this team pipeline resolve to the correct session without heuristic discovery:

```
process.env.CAGENTS_ACTIVE_SESSION = SESSION_ID;
```

This is critical for correct agent tracking when /team runs under /org concurrently with other domain teams. The `findActiveSession()` helper in hook-utils.cjs checks this env var first (Pass 0) and returns the exact session directory immediately, bypassing the directory-scan heuristics that can misroute SubagentStart/SubagentStop events to the wrong session's agent_tree.yaml.

When using Bash tool to create the session directory:
```bash
export CAGENTS_ACTIVE_SESSION="{SESSION_ID}"
```

**2b. Classify domain and tier (inline):**

| Domain | Keywords |
|--------|----------|
| Engineering | fix, bug, implement, code, api, database, build, refactor, test, deploy, devops, CI/CD, architecture |
| Creative | write, story, content, design, creative, novel, script, poem, narrative, game art, audio, UX |
| Business | campaign, marketing, sales, budget, cost, forecast, operations, process, product, strategy, revenue, ROI |
| People | hire, recruit, onboard, culture, HR, talent, performance review, retention, DEI |
| Service | support, legal, compliance, customer, SLA, contract, privacy, escalation, GDPR |

**Tier Classification** (minimum tier 2):

| Tier | Criteria | Controllers |
|------|----------|-------------|
| 2 | Single component, clear scope | 1 primary controller |
| 3 | Multiple components, external deps | 1 primary + 1-2 supporting |
| 4 | Strategic/architectural, company-wide | Executive + HITL |

**2b-2. Call TodoWrite NOW (mandatory):**

```
TodoWrite([
  {"content": "[team] Initializing: detecting domain & tier\n  [team] Domain: {domain}, Tier {N} ({N} waves planned)", "status": "in_progress", "id": "init"},
  {"content": "[team > orchestrator] Enriching context", "status": "pending", "id": "enrich"},
  {"content": "[team > planner] Planning approach", "status": "pending", "id": "plan"},
  {"content": "[team > decomposer] Decomposing into work items", "status": "pending", "id": "decompose"},
  {"content": "[team] Wave {N}: {wave_name} ({N} items)", "status": "pending", "id": "wave_1"},
  {"content": "[team] Integration & validation", "status": "pending", "id": "integrate"},
  {"content": "[team] Complete", "status": "pending", "id": "complete"}
])
```

As details become known (after decomposer returns), update TodoWrite with per-wave entries:
```
TodoWrite([
  {"content": "[team] Initializing: detecting domain & tier\n  [team] Domain: {domain}, Tier {N} ({N} waves planned)", "status": "completed", "id": "init"},
  {"content": "[team > orchestrator] Enriching context", "status": "completed", "id": "enrich"},
  {"content": "[team > planner] Planning approach", "status": "completed", "id": "plan"},
  {"content": "[team > decomposer] {N} work items across {N} waves", "status": "completed", "id": "decompose"},
  {"content": "[team] Wave 1: {wave_name} ({N} items)\n  [wave-1 > {agent}] {task_description}", "status": "in_progress", "id": "wave_1"},
  {"content": "[team] Wave 1 GATE: {PASS/FAIL}", "status": "pending", "id": "gate_1"},
  {"content": "[team] Wave 2: {wave_name} ({N} items)\n  [wave-2 > {agent}] {task_description}", "status": "pending", "id": "wave_2"},
  {"content": "[team] Wave 2 GATE: {PASS/FAIL}", "status": "pending", "id": "gate_2"},
  ...repeat per wave...
  {"content": "[team] Integration & validation", "status": "pending", "id": "integrate"},
  {"content": "[team] Complete ({N}/{N} items, {N} waves)", "status": "pending", "id": "complete"}
])
```

**2c. Spawn orchestrator (enrichment):**

```
Agent({
  subagent_type: "cagents:orchestrator",
  description: "INIT: Enrich context",
  prompt: "You are the orchestrator in the event-driven pipeline.\n\nREQUEST: {user_request}\nSESSION: {SESSION_DIR}/\nDOMAIN: {domain} | TIER: {tier}\n\nEnrich the request with domain context and project state. Write workflow/enriched_context.yaml and a completion event to workflow/events/EVT-1.yaml."
})
```

**CRITICAL: Update phase to ENRICHING after orchestrator returns.** This prevents the Stop hook from allowing early termination. Use Bash to update status.yaml:
```bash
sed -i 's/^phase: .*/phase: ENRICHING/' "{SESSION_DIR}/status.yaml"
```

**2d. Spawn planner:**

```
Agent({
  subagent_type: "cagents:universal-planner",
  description: "ORCHESTRATED: Plan objectives",
  prompt: "You are the universal-planner in the event-driven pipeline.\n\nREQUEST: {user_request}\nSESSION: {SESSION_DIR}/\nDOMAIN: {domain} | TIER: {tier}\n\nRead workflow/enriched_context.yaml. Define objectives, select controllers, write workflow/plan.yaml and a completion event to workflow/events/EVT-2.yaml."
})
```

**CRITICAL: Update phase to ENRICHED after planner returns.** This signals enrichment is complete but team execution has not started:
```bash
sed -i 's/^phase: .*/phase: ENRICHED/' "{SESSION_DIR}/status.yaml"
```

**2e. Spawn decomposer (with wave maximization):**

```
Agent({
  subagent_type: "cagents:task-decomposer",
  description: "PLANNED: Decompose into work items with maximum wave granularity",
  prompt: "You are the task-decomposer in the event-driven pipeline.\n\nREQUEST: {user_request}\nSESSION: {SESSION_DIR}/\nDOMAIN: {domain} | TIER: {tier}\n\nRead workflow/plan.yaml. Decompose into work items with acceptance criteria.\n\nCRITICAL WAVE MAXIMIZATION:\n- Assign each work item a wave number (0, 1, 2, 3, ...)\n- Wave 0 = foundation/bootstrap (lead executes)\n- Maximize the number of waves by separating work into natural dependency layers\n- If item B depends on item A's output, they MUST be in different waves\n- Even items that COULD run in the same wave SHOULD be split into separate waves if they represent distinct phases (e.g., research vs implementation vs testing vs documentation)\n- Prefer 5-10 waves over 2-3 waves\n- Each wave should have a clear quality gate with verifiable criteria\n- The final wave is always integration/validation (lead executes)\n\nWave assignment strategy:\n  Wave 0: Scaffolding, schemas, contracts, project setup\n  Wave 1: Research, analysis, information gathering\n  Wave 2: Design, architecture decisions, interface definitions\n  Wave 3: Core implementation (primary features)\n  Wave 4: Supporting implementation (secondary features, integrations)\n  Wave 5: Testing, QA, security validation\n  Wave 6: Documentation, cleanup, optimization\n  Wave 7+: Additional phases as needed\n\nWrite workflow/work_items.yaml with wave assignments and a completion event to workflow/events/EVT-3.yaml."
})
```

**CRITICAL: Update phase to ENRICHED after decomposer returns** (confirms all enrichment is complete):
```bash
sed -i 's/^phase: .*/phase: ENRICHED/' "{SESSION_DIR}/status.yaml"
```

After decomposer returns, read `workflow/work_items.yaml` to get the work items and their wave assignments.

**work_items.yaml vs task_list.yaml**: `workflow/work_items.yaml` (written by the decomposer) is the **canonical work item source** with full metadata: descriptions, acceptance criteria, wave assignments, dependencies, and agent assignments. `team/task_list.yaml` (populated from Claude Code TaskCreate calls) is a **status-only overlay** for team coordination -- it tracks task IDs, completion status, and teammate assignments but does NOT duplicate the rich metadata from work_items.yaml. When checking what a work item requires, always read work_items.yaml. When checking whether it is done, read task_list.yaml.

**2f. Analyze wave structure:**

After reading work_items.yaml, organize items by wave number. Count the number of distinct waves. If the decomposer produced fewer waves than expected for the tier, re-decompose with more granularity:

| Tier | Minimum waves expected |
|------|----------------------|
| 2 | 3 |
| 3 | 5 |
| 4 | 6 |

If the request produces fewer than 3 work items total or has no parallelizable items, you **MUST** pass to /run. Never silently drop the request:
```
Skill({ skill: "run", args: "<the full request>" })
```
This is mandatory — /team must ALWAYS either execute as a team OR delegate to /run. No request should ever be left unhandled.

If `--dry-run` is specified, display the work items, wave structure, and team composition, then STOP.

### Step 3: Create the Team (TeamCreate)

Call TeamCreate IMMEDIATELY. Do not skip this step. Do not ask permission.

```
TeamCreate({
  team_name: "cagents-team-<YYYYMMDD-HHMMSS>",
  description: "Parallel execution: <summary of request>"
})
```

**CRITICAL: Update phase to TEAM_CREATED after TeamCreate returns.** This confirms the team was created and prevents the Stop hook from blocking:
```bash
sed -i 's/^phase: .*/phase: TEAM_CREATED/' "{SESSION_DIR}/status.yaml"
```

### Step 4: Create Tasks for ALL Work Items with Wave Gates (TaskCreate)

Create a task for EVERY work item from `work_items.yaml` using TaskCreate. Also create GATE sentinel tasks between waves. Create them all before spawning any teammates.

**4a. Create work item tasks:**

For each work item:
```
TaskCreate({
  subject: "TASK-{N}: <description>",
  description: "Wave {W}. Work item from decomposition. <details and acceptance criteria>",
  activeForm: "Executing TASK-{N}"  // optional
})
```

**4b. Create GATE sentinel tasks between waves:**

For each wave transition (wave K -> wave K+1), create a gate:
```
TaskCreate({
  subject: "GATE-{K}: Quality gate after wave {K}",
  description: "Quality gate. Lead validates all wave {K} outputs before wave {K+1} starts. Criteria: <gate criteria from decomposition>",
  activeForm: "Validating GATE-{K}"  // optional
})
```

**4c. Set up wave dependencies:**

```
# Wave 1 work items are blocked by GATE-0
TaskUpdate({ taskId: "{wave1_item_id}", addBlockedBy: ["{gate0_id}"] })

# GATE-0 is blocked by all wave 0 work items
TaskUpdate({ taskId: "{gate0_id}", addBlockedBy: ["{wave0_item1_id}", "{wave0_item2_id}", ...] })

# Wave 2 work items are blocked by GATE-1
TaskUpdate({ taskId: "{wave2_item_id}", addBlockedBy: ["{gate1_id}"] })

# GATE-1 is blocked by all wave 1 work items
TaskUpdate({ taskId: "{gate1_id}", addBlockedBy: ["{wave1_item1_id}", "{wave1_item2_id}", ...] })

# ... repeat for each wave transition
```

Also set up intra-wave dependencies from the decomposition's dependency graph.

### Step 4b: Update Phase to EXECUTING

Before spawning any wave teammates, update the session phase to EXECUTING. This prevents the Stop hook from seeing TEAM_CREATED during background wave execution and incorrectly treating the session as idle.

```
sed -i "s/^phase: .*/phase: EXECUTING/" "${SESSION_DIR}/status.yaml"
```

### Step 5: Execute Waves 1..N-1 -- Spawn Teammates Per Wave (CRITICAL)

**This is the core execution loop. For EACH wave, spawn a fresh round of teammates, wait for completion, validate the gate, then proceed to the next wave.**

```
for each wave K from 1 to N-1:

  5a. Display wave K status:
      "=== WAVE {K}/{N-1}: {wave_description} ==="
      List work items in this wave

  5b. Spawn teammates for wave K IN PARALLEL:

      **Worktree Isolation (Recommended)**: When teammates modify overlapping files,
      use `isolation: "worktree"` in the Task call to give each teammate an isolated
      git worktree. This prevents file conflicts during parallel execution.

      ```
      Agent({
        subagent_type: "cagents:{CONTROLLER_TYPE}",
        name: "w{K}-task-{N}-{CONTROLLER_TYPE}",
        team_name: "{team_name}",
        isolation: "worktree",  # Each teammate gets isolated repo copy
        ...
      })
      ```

      **When to use worktree isolation**:
      - Multiple teammates editing the same files (e.g., package.json, shared configs)
      - Teammates running tests that produce temp files
      - Any wave with 3+ teammates modifying code files

      **When worktree is unnecessary**:
      - Teammates writing to separate output directories (e.g., SESSION_DIR/outputs/task-N/)
      - Documentation-only waves where files don't overlap
      - Research/analysis waves that only read files

      **Merge coordination after worktree waves**:
      After all teammates in a worktree-isolated wave complete, the lead must merge:
      1. Check for merge conflicts: `git diff` between worktrees
      2. If no conflicts: merge automatically (fast-forward)
      3. If conflicts: resolve by preferring the teammate whose work item has higher priority
      4. Run guard command (npm test, lint) after merge to catch integration issues

      **--members batching**: If wave K has more work items than the `--members` cap
      (default: 5), batch them into sub-waves. Each sub-wave spawns up to `--members`
      teammates in parallel, waits for all to complete, then spawns the next batch.
      Every work item gets its own dedicated teammate -- never collapse multiple tasks
      into a single teammate.

      ```
      items_in_wave = work_items_for_wave_K
      batch_size = members_cap  # from --members flag, default 5
      for batch in chunk(items_in_wave, batch_size):
        # Spawn all items in this batch in parallel
        for each work_item in batch:
          Agent({...})  # one teammate per item
        # Wait for batch to complete before spawning next batch
        # Apply early shutdown (5c-1) as each teammate finishes
      ```

      For each work item in wave K (within the current batch):

      ##############################################################################
      # CONTROLLER RESOLUTION (do this ONCE per wave, NOT per work item)
      #
      # DEFAULT: Read plan.yaml -> controller_assignment -> primary
      # Example: plan.yaml says "primary: cagents:engineering-manager"
      #   -> CONTROLLER_TYPE = "engineering-manager"
      #
      # M-08: WAVE-SPECIFIC CONTROLLERS: If plan.yaml has supporting controllers
      # (controller_assignment.supporting), different waves MAY use different
      # controllers based on the work items' domain alignment:
      #   - If ALL items in wave K match the primary controller's domain: use primary
      #   - If items in wave K match a supporting controller's domain: use that controller
      #   - Example: tier 3 with primary=engineering-manager, supporting=[architect]
      #     Wave 1 (design): use architect; Waves 2-3 (implementation): use engineering-manager
      #
      # NEVER use work_items.yaml's per-item `agent` field as subagent_type.
      # The `agent` field (e.g., "backend-developer", "senior-developer") is an
      # EXECUTION agent -- it lacks the Agent tool and CANNOT delegate work.
      # Only controllers (engineering-manager, narrative-director, etc.) have Agent tool.
      #
      # VALIDATION: controller_type must match an entry in domain_overrides.yaml
      # controller_catalog. If it doesn't, something is wrong -- fall back to
      # the tier_2 default controller for the detected domain.
      ##############################################################################
      # Default: primary controller
      CONTROLLER_TYPE = plan.yaml -> controller_assignment -> primary
      # Override per wave if supporting controllers are available and wave items align
      # e.g., CONTROLLER_TYPE = "engineering-manager" (or "architect" for design waves)

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
         Bash: node -e "
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
           }"

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
      Use: node -e "const fs=require(\"fs\"),yaml=require(\"js-yaml\");const f=\"{SESSION_DIR}/workflow/agent_tree.yaml\";let o={agents:[]};try{o=yaml.load(fs.readFileSync(f,\"utf8\"))||{agents:[]}}catch(e){}if(!Array.isArray(o.agents))o.agents=[];const id=\"exec-{N}-\"+Date.now();if(!o.agents.some(a=>a.id===id)){o.agents.push({id,type:\"cagents:{agent_from_work_items}\",parent:\"teammate-{K}-{N}\",depth:2,spawned_at:new Date().toISOString(),stopped_at:null,cagents_type:\"cagents:{agent_from_work_items}\",short_role:\"{agent_from_work_items}\",role_description:\"Execute TASK-{N}\",session:\"{SESSION_ID}\"});fs.writeFileSync(f,yaml.dump(o))}"'
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

  5c. Monitor wave K progress:
      - Wait for teammate messages (they arrive automatically)
      - Periodically check TaskList to see progress
      - If a teammate flags an issue: course-correct if needed
      - Track per-teammate timeout: if no progress after 5 minutes, consider recovery

  5c-1. Early individual shutdown (resource optimization):
      When a teammate reports completion (via SendMessage), shut it down IMMEDIATELY
      rather than waiting for the entire wave to finish:

      ```
      # As each teammate completes:
      On receiving "TASK-{N} complete" from w{K}-task-{N}-{type}:
        1. Verify the work item output exists in {SESSION_DIR}/outputs/task-{N}/
        2. If verified: send immediate shutdown
           SendMessage({ type: "shutdown_request",
                         recipient: "w{K}-task-{N}-{type}",
                         content: "TASK-{N} verified complete. Shutting down early." })
        3. Track: wave_K_completed += 1
        4. If wave_K_completed == wave_K_total: proceed to GATE validation (5d)
      ```

      This frees resources (tmux panes, context windows) as soon as each teammate
      finishes, rather than holding all teammates alive until the entire wave completes.
      Teammates that finish early no longer consume resources while waiting.

  5c-2. Automatic teammate failure recovery:
      If a teammate fails (task stuck, error reported, or timeout):

      Recovery chain (max 2 retries per work item):
      1. RETRY: Spawn replacement teammate with error context:
         Agent({
           description: "RETRY Wave {K} - TASK-{N}: <description>",
           prompt: "Previous attempt failed with: {error_context}. Avoid: {failure_cause}.
                   CRITICAL: You are a controller agent. Spawn the assigned execution agent via Agent tool to implement.
                   Do NOT implement directly. Delegate to cagents:{agent_from_work_items} and spawn cagents:reviewer to validate.
                   ...",
           team_name: "{team_name}",
           name: "w{K}-task-{N}-{controller_type}-retry-{R}",
           subagent_type: "cagents:{controller_from_plan}"
         })
      2. SIMPLIFY: If retry fails, break the work item into sub-items:
         Create TASK-{N}a (core implementation) and TASK-{N}b (edge cases + testing)
         Spawn separate teammates for each sub-item
      3. ESCALATE: If simplify also fails, mark the work item as blocked:
         TaskUpdate({ taskId: "{task_id}", status: "completed",
                      description: "BLOCKED: Failed after 2 retries. Error: {context}" })
         Log failure in workflow/failed_items.yaml
         Continue with remaining wave items (do not halt the entire wave)

      Track recovery metrics per wave:
        recovery_attempts: {count}
        successful_recoveries: {count}
        blocked_items: [{TASK-ids}]

  5d-pre. Write child_controllers.yaml manifest (after all wave K teammates complete):
      After all wave K teammates have completed (or been marked blocked), write the controller
      manifest to track which controllers handled each work item in this wave:

      ```yaml
      # Append to workflow/child_controllers.yaml:
      controllers:
        - wave: {K}
          name: "w{K}-task-{N}-{CONTROLLER_TYPE}"
          work_item: "TASK-{N}"
          agent_type: "cagents:{CONTROLLER_TYPE}"
          status: completed  # or: blocked, failed
      ```

      Write (append) each completed/failed teammate entry to `${SESSION_DIR}/workflow/child_controllers.yaml`.
      This file is the canonical record of controller-to-work-item assignments for AgentPath lineage tracking.

  5d. Validate GATE-K when all wave K items complete (or blocked):
      - Verify outputs exist for each work item in wave K
      - Check quality gate criteria based on wave type (see GATE Validation Standards below)
      - If gate passes: Mark GATE-K task as completed (unblocks wave K+1)
      - If gate fails but blocked items exist: Apply partial pass -- mark gate as
        conditionally passed with noted gaps; proceed with degraded scope
      - If gate fails without blocked items: Report issues, spawn fix-up teammates, re-validate

  5e. Shut down any remaining wave K teammates before spawning wave K+1:
      Most teammates should already be shut down via early individual shutdown (5c-1).
      Send shutdown to any that remain (e.g., teammates that timed out or are stuck):
      SendMessage({ type: "shutdown_request", recipient: "w{K}-task-{N}-{type}", content: "Wave {K} complete." })

  5f. Proceed to wave K+1 (AUTOMATIC -- do NOT ask permission)

  5f-1. Write wave completion event to workflow/events/EVT-{K}.yaml:
      event_id: EVT-{K}
      type: wave_complete
      wave: {K}
      items_completed: {count}
      timestamp: "{ISO_TIMESTAMP}"
```

**Each wave is a distinct spawn-execute-validate cycle.** This ensures quality gates are enforced between phases, outputs from earlier waves are available to later waves, and issues are caught early.

### Step 6: Execute Final Wave -- Integration + Validation (Lead Does This)

Run integration to merge cross-wave outputs:

**6a. Spawn integration controller:**

```
Agent({
  subagent_type: "cagents:{primary_controller_from_plan}",
  description: "Integration: Merge outputs from all {N} waves",
  prompt: "You are the {controller_name} controller performing final integration.\n\nSESSION: {SESSION_DIR}/\n\nAll {N-1} execution waves are complete. Read workflow/coordination_log.yaml and outputs/ from each wave and WI. Merge cross-WI outputs, resolve conflicts, write final integrated outputs. Write coordination_log.yaml with integration results."
})
```

**6b. Spawn final validator:**

```
Agent({
  subagent_type: "cagents:universal-validator",
  description: "Final validation: All waves and WIs complete",
  prompt: "You are the universal-validator performing final validation.\n\nSESSION: {SESSION_DIR}/\n\nAll {N} waves and integration are complete. Validate all acceptance criteria across all WIs and all wave gates. Write workflow/validation_report.yaml with PASS/FAIL/REVISE classification."
})
```

If PASS: Pipeline complete. Proceed to cleanup.
If FAIL with partial results: Report partial completion summary (see Partial Results on Failure below).
If FAIL without partial results: Report issues with evidence. Suggest `/run --resume {SESSION_ID}`.

### Step 7: Shut Down and Clean Up

1. Shut down any remaining teammates (wave teammates should already be shut down per-wave):
```
SendMessage({ type: "shutdown_request", recipient: "<teammate_name>", content: "All work complete, shutting down." })
```

2. Clean up the team:
```
TeamDelete()
```

2a. **Mark the initial orchestration task as completed:**
First, mark the initial orchestration TaskCreate task (created before TeamCreate) as completed. This task lives in the main context, not the team namespace, so TeamDelete does not clean it up. Use `TaskUpdate({ taskId: "{initial_task_id}", status: "completed" })` to close it.

2b. **Finalize lead agent in agent_tree.yaml:**
Update the lead agent entry to set:
- `stopped_at`: `"{ISO_TIMESTAMP}"`
- `completion_summary`: `"Completed {N}/{total} work items across {N} waves"`
- `duration_seconds`: `{computed from spawned_at to now}`

3. **Clean up tasks (MANDATORY — hard gate before stopping):**

Call `TaskList` to get the CURRENT task inventory. For EVERY task that is `in_progress` or `pending`, call `TaskUpdate({ taskId: "{id}", status: "completed" })`. If TaskUpdate returns "Task not found", the task was in the team namespace already cleaned by TeamDelete — log it and continue.

**Cleanup guard**: Before producing any final output, call `TaskList` one more time and verify it shows zero `in_progress` or `pending` tasks (excluding tasks owned by other agents). This is a hard gate — do not stop with stale tasks.

3b. **Compute duration_ms for the final status.yaml state_history entry:**
```
duration_ms = Date.now() - Date.parse(last_state_history_entry.entered_at)
```
Update the final `state_history` entry in `status.yaml` with the computed `duration_ms`.

4. Report final results to the user including:
   - Total waves executed
   - Work items completed per wave
   - Gate validation results per wave
   - Revision rounds used (if any)
   - Recovery attempts and outcomes (retries, simplifications, blocked items)
   - Final validation status
   - Output file locations
   - If partial: which items completed vs blocked vs not started (see below)

5. Write per-wave metrics to `team/metrics/parallelism.yaml`:
```yaml
wave_stats:
  - wave: 1
    items: 3
    peak_concurrent: 3
    duration_seconds: 120
    gate_result: PASS
  - wave: 2
    items: 4
    peak_concurrent: 4
    duration_seconds: 180
    gate_result: PASS
total_waves: 3
total_items: 10
total_duration_seconds: 420
```

5b. **Write coordination_log.yaml:**
After all waves complete, write `${SESSION_DIR}/workflow/coordination_log.yaml`:
```yaml
schema_version: "1"
controller: "cagents:team-lead"
objectives: [{objectives from plan.yaml or strategic brief}]
questions_asked: []
synthesized_solution:
  approach: "N-wave parallel execution"
  implementation_steps: [{list of completed work items with status}]
implementation_tasks: [{map each WI to task_id, name, assigned_to, status}]
status: completed
```

5c. **Write execution_summary.yaml:**
Write `${SESSION_DIR}/workflow/execution_summary.yaml`:
```yaml
session_id: {SESSION_ID}
final_state: complete
status: completed
total_waves: {N}
total_items: {N}
completed_items: {N}
total_duration_ms: {elapsed}
started_at: "{first state_history entered_at}"
completed_at: "{ISO_TIMESTAMP}"
```

## Cross-Wave Coordination

### File-Based Handoffs Between Waves
Each wave's outputs are available to subsequent waves via the shared session directory:

```
Wave 1 teammate (TASK-01):
  Completes -> writes outputs/task-01/api_spec.yaml
  TaskUpdate(TASK-01, completed)
  SendMessage(lead, "TASK-01 done")

Lead validates GATE-1 -> marks complete -> unblocks wave 2

Wave 2 teammate (TASK-03, depends on TASK-01):
  Reads outputs/task-01/api_spec.yaml from session dir
  Builds on wave 1 outputs
  Writes outputs/task-03/implementation/
```

### Intra-Wave Parallelism
Within a single wave, all teammates run in parallel. Use TaskUpdate `addBlockedBy` for any intra-wave dependencies.

### Task Dependencies
- **Inter-wave**: Enforced via GATE sentinel tasks (wave K+1 items blocked by GATE-K)
- **Intra-wave**: Set via TaskUpdate `addBlockedBy` based on decomposition dependency graph
- Dependencies auto-unblock via TaskList

### Teammate Autonomy
- Teammates flag issues to lead via SendMessage but continue working
- Lead can course-correct if needed but doesn't block progress
- All enrichment always runs (consistency over speed)
- Teammates within a wave operate independently

## Dynamic Scaling (V10.18.0)

The lead can dynamically adjust teammate count during wave execution based on workload and completion speed.

### Scale Up (Mid-Wave Teammate Addition)

When a wave has more items than the initial `--members` cap, or when workload is discovered to be larger than planned:

```
# During wave K execution, if additional items are identified:
1. Create TaskCreate for the new work item
2. Spawn additional teammate:
   Agent({
     subagent_type: "cagents:{CONTROLLER_TYPE}",
     name: "w{K}-task-{N}-{CONTROLLER_TYPE}-scaled",
     team_name: "{team_name}",
     description: "Wave {K} (scaled) - Execute TASK-{N}",
     ...
   })
3. The new teammate joins the wave in progress
```

**When to scale up**:
- A wave has more items than `--members` and current teammates are progressing well
- A work item is discovered to need decomposition into sub-items during execution
- A teammate finishes early and there are unstarted items in the same wave

### Scale Down (Early Teammate Shutdown)

When teammates finish early or become idle with no remaining work:

```
# Teammate reports completion:
1. Verify output exists and meets gate criteria
2. Send shutdown signal:
   SendMessage({ type: "shutdown_request",
                 recipient: "w{K}-task-{N}-{type}",
                 content: "Work complete. Shutting down to free resources." })
3. Teammate stops (via continue:false from TeammateIdle hook)
```

**When to scale down**:
- Teammate completes its work item (always shut down immediately -- see Step 5c-1)
- Teammate is idle with no available work items in the current wave
- Wave GATE validation is complete and remaining teammates have no pending items

### Scaling Metrics

Track scaling events in `team/metrics/parallelism.yaml`:
```yaml
scaling_events:
  - wave: 2
    type: scale_up
    reason: "Additional sub-items from TASK-5 decomposition"
    new_teammate: "w2-task-5b-engineering-manager-scaled"
  - wave: 3
    type: scale_down
    reason: "TASK-8 completed early"
    stopped_teammate: "w3-task-8-engineering-manager"
```

## Key Rules

1. **You MUST call TeamCreate.** No exceptions. This is what creates the team.
2. **You MUST spawn teammates via Agent tool.** This is what creates tmux panes.
3. **Spawn teammates PER WAVE** -- each wave gets its own fresh round of teammates.
4. **Within a wave, spawn ALL teammates at the same time** (parallel Task calls).
5. **Validate each GATE before proceeding to the next wave.** Gates are quality checkpoints.
6. **Shut down teammates individually as they complete (early shutdown), and shut down any remaining before spawning wave K+1.**
7. **Maximize the number of waves.** More waves = better quality gating. There is nothing wrong with more waves.
8. **Teammates ARE controller agents** that spawn execution agents directly via Agent tool. Teammates NEVER implement directly -- they delegate to `cagents:{execution_agent}` and spawn `cagents:reviewer` to validate. This is non-negotiable.
9. **You (the lead) do Wave 0 (enrichment) and the final wave (integration)** -- teammates do all middle waves.
10. **Never ask permission** between waves. Execute the full pipeline automatically.
11. **Never just create tasks without spawning teammates** -- tasks without teammates are useless.
12. **All enrichment stages always run** -- no skipping for consistency.
13. **Scale dynamically** -- add teammates when work exceeds capacity, shut down teammates when they finish early.

## GATE Validation Standards

GATE validation criteria are standardized by wave type. The lead uses these criteria when validating each gate (Step 5d). See @reference/gate-standards.md for the full standard. For the mandatory 7-check evidence-based protocol that wraps these standards, see the **Evidence-Based Gate Validation Protocol (V10.23.0)** section below.

| Wave Type | Validation Criteria | Method |
|-----------|-------------------|--------|
| **Research / Analysis** | All research outputs exist; each has summary section; key findings documented | `file_exists` + `content_check` |
| **Design / Architecture** | Design artifacts exist; interfaces defined; decisions documented with rationale | `file_exists` + `content_check` |
| **Core Implementation** | Implementation files created/modified; no syntax errors; acceptance criteria addressed | `file_exists` + `syntax_check` + `grep_criteria` |
| **Supporting Implementation** | Integration points connected; supporting features functional; no regressions | `file_exists` + `syntax_check` |
| **Testing / QA** | Test files exist for implemented features; test execution attempted (pass or documented failure) | `file_exists` + `test_run` |
| **Documentation** | Doc files updated; API changes reflected; examples provided | `file_exists` + `content_check` |

**Gate validation algorithm**:
1. For each work item in the wave, check if output directory exists (`outputs/task-{N}/`)
2. Apply wave-type-specific criteria from the table above
3. Compute gate score: `completed_criteria / total_criteria`
4. Gate result:
   - Score >= 0.9: **PASS** (proceed to next wave)
   - Score >= 0.7 with no critical failures: **CONDITIONAL_PASS** (proceed with noted gaps)
   - Score < 0.7 or critical failures: **FAIL** (attempt fix-up or escalate)

**Conditional pass**: If blocked items caused the gap, log the gaps and proceed. The integration wave (final) accounts for these gaps in its validation.

## Evidence-Based Gate Validation Protocol (V10.23.0)

Before marking ANY gate (GATE-0, GATE-1, ...) as complete, the team lead MUST run ALL 7 gate validation checks. No gate passes without 7/7 checks passing.

### Gate Validation Checklist

| # | Check | What It Verifies | Failure Action |
|---|-------|-----------------|----------------|
| 1 | Task Completion | All wave tasks marked completed in TaskList | HOLD -- wait for remaining tasks |
| 2 | Evidence Presence | Every completed task has non-empty evidence | HOLD -- request evidence from teammate |
| 3 | Evidence Specificity | Evidence cites file:line, not vague descriptions | WARN -- request re-verification |
| 4 | Acceptance Criteria Coverage | Every acceptance criterion has matching evidence | FAIL -- task not actually complete |
| 5 | Contract Fulfillment | All inter-wave contracts have artifacts | HOLD -- contract provider must deliver |
| 6 | Regression Check | Guard commands pass (tests, lint, type check) | FAIL -- regression introduced |
| 7 | Cross-Wave Consistency | New wave outputs don't contradict previous wave | WARN -- review for conflicts |

### Gate Validation YAML Template

```yaml
gate_validation:
  gate_id: "GATE-1"
  wave: 1
  checks:
    task_completion: {passed: true, total: 3, completed: 3}
    evidence_presence: {passed: true, items_checked: 3, items_with_evidence: 3}
    evidence_specificity: {passed: true, avg_score: 2.7}
    acceptance_coverage: {passed: true, criteria_total: 9, criteria_covered: 9}
    contract_fulfillment: {passed: true, contracts_checked: 2, fulfilled: 2}
    regression_check: {passed: true, command: "npm test", result: "45/45 passed"}
    cross_wave_consistency: {passed: true, conflicts_found: 0}
  overall: PASS  # PASS only if all 7 checks pass
  timestamp: "{ISO_TIMESTAMP}"
```

### Gate Validation TodoWrite

When validating a gate, the team lead MUST add a validation TodoWrite entry:

```
TodoWrite([
  {"content": "[team-lead] GATE-1 validation\n  [team-lead] Task completion: 3/3 done\n  [team-lead] Evidence: 3/3 with file:line citations\n  [team-lead] Criteria coverage: 9/9 covered\n  [team-lead] Contracts: 2/2 fulfilled\n  [team-lead] Regression: npm test 45/45 passed\n  [team-lead] Consistency: no conflicts\n  [team-lead] GATE-1: PASS (7/7 checks)", "status": "completed", "id": "gate-1-validation"}
])
```

### Gate Validation Storage

Gate validation results are appended to `${SESSION_DIR}/workflow/gate_validations.yaml`:

```yaml
gate_validations:
  - gate_id: "GATE-0"
    wave: 0
    overall: PASS
    checks: {task_completion: {passed: true}, ...}
    timestamp: "..."
  - gate_id: "GATE-1"
    wave: 1
    overall: PASS
    checks: {task_completion: {passed: true}, ...}
    timestamp: "..."
```

### Integration with Gate Validation Algorithm (Step 5d)

The 7-check protocol supersedes the simple score-based gate validation. When running Step 5d, execute the 7 checks in order. If any check returns FAIL, the gate fails regardless of other checks. If any check returns HOLD, pause until the hold condition is resolved. If checks return only PASS and WARN, the gate passes (WARNs are logged but do not block).

## Partial Results on Failure

If the pipeline cannot complete all waves, report partial results instead of a binary failure. This ensures users always get value from completed work.

**Partial results report format**:
```
Team execution partially complete:
  Wave 1 (Research):       COMPLETE - 3/3 items done
  Wave 2 (Implementation): COMPLETE - 4/4 items done
  Wave 3 (Testing):        PARTIAL  - 2/3 items done, 1 blocked
  Wave 4 (Documentation):  NOT STARTED (blocked by Wave 3 gap)

Completed outputs: cagents-memory/sessions/{id}/outputs/
  - task-01/ through task-07/: COMPLETE
  - task-08/ and task-09/:     COMPLETE
  - task-10/:                 BLOCKED (test framework incompatibility)
  - task-11/ through task-12/: NOT STARTED

Recovery:
  - Fix task-10 manually, then: /team --resume {session_id}
  - Or accept partial results and continue from outputs/
```

**When to report partial results**:
- A wave has blocked items after recovery attempts
- A gate fails and fix-up attempts are exhausted
- Context exhaustion occurs mid-pipeline
- Final validation returns FAIL but some waves completed successfully

**Partial results are stored in** `workflow/partial_results.yaml`:
```yaml
status: partial
completed_waves: [1, 2]
partial_waves:
  3: {completed: [TASK-08, TASK-09], blocked: [TASK-10], reason: "test framework incompatibility"}
not_started_waves: [4]
total_items: 12
completed_items: 9
blocked_items: 1
not_started_items: 2
completion_rate: 0.75
output_locations:
  - outputs/task-01/ through outputs/task-09/
resume_command: "/team --resume {session_id}"
```

## Fallback (MANDATORY)

If the request has fewer than 3 work items or no parallelizable work, you **MUST** pass to /run. Never silently fail or leave a request unhandled:
```
Skill({ skill: "run", args: "<the original request>" })
```
This ensures every /team invocation produces a result — either via team execution or /run delegation.

## Strategic Brief Awareness (/org Integration)

When invoked by `/org`, the session directory may contain a `strategic_brief.yaml`. If present:

1. **Read the brief** at session initialization (Step 2a, after creating session):
   ```
   Check for ${SESSION_DIR}/strategic_brief.yaml
   If exists: read and extract mission, success_criteria, domain_assignments
   ```

2. **Use brief's domain_assignments as pre-decomposed input** (skip re-derivation):
   - If the brief contains `domain_assignments.{domain_key}.work_required`, use those items directly as work items instead of running the decomposer from scratch
   - Map each `work_required` entry to a TASK-N with the brief's acceptance criteria
   - The planner still runs to assign wave numbers and dependencies, but starts from brief work items rather than deriving from scratch
   - If `domain_assignments.{domain_key}.csuite` is specified, use that C-suite agent's recommended controller as a controller override hint (e.g., if CTO recommended engineering-manager, prefer that over auto-detection)

3. **Pass brief context to enrichment agents** -- include mission, success criteria, and the C-suite domain analysis summary in orchestrator and planner prompts for richer context.

4. **Validate outputs against brief success_criteria**:
   - After final validation, cross-check the brief's `success_criteria` array
   - Each success criterion must map to at least one completed TASK with evidence
   - Include brief validation results in the final report

5. **Write domain_status updates** during execution:
   - After each wave completes, update the brief's `domain_status` section:
   ```yaml
   domain_status:
     {domain_key}:
       progress: {percentage}
       status: in_progress|completed
       completed_wis: [TASK-xx, ...]
       blockers: []
   ```
   - Write updates to `${SESSION_DIR}/strategic_brief.yaml` (the brief is the CEO's monitoring interface)

6. **Check for escalation directives** -- if the CEO has added directives to the brief (from resolving escalations), read them and adjust execution accordingly.

7. **Report completion** by setting domain_status to completed with 100% progress.

This allows `/org`'s CEO to monitor domain execution progress and handle cross-domain escalations in real-time.

## Session Hierarchy

Understanding the session hierarchy is essential for correct lineage tracking in AgentPath.

### Session Types and Nesting

/team creates `team_*` sessions (e.g., `team_implement-oauth2_260317_001`). It does NOT create `run_*` sessions. When /org invokes /team via the `--session` flag, the team session's `parent_session_id` is set to the org session ID.

**Hierarchy depth (max 2 levels)**:
```
org_* session (level 0)     <- /org creates this
  team_* session (level 1)  <- /team creates this, parent_session_id = org_*
```

There is no `org_* -> team_* -> run_*` chain. Claude Code enforces a 2-level subagent nesting limit, which means /team teammates spawn execution agents directly via Agent tool rather than invoking /run as a Skill. As a result, controller work is tracked at the `team_*` session level, not in separate child sessions.

### Controller Tracking

Controllers spawned as /team teammates do NOT create their own sessions. Instead, their work is tracked at the session level via:

1. **`workflow/agent_tree.yaml`** — Each spawned controller gets an entry with `spawned_at`, `stopped_at`, `completion_summary`, and `duration_seconds`. This is the authoritative agent audit trail.
2. **`workflow/coordination_log.yaml`** — Written by each controller teammate after completing its wave work items. Contains objectives, questions_asked, synthesized_solution, and implementation_tasks.
3. **`workflow/child_controllers.yaml`** — Written by /team lead after each wave (see Step 5d-pre). Maps work items to the controllers that handled them.

### child_controllers.yaml Format

After each wave completes, the lead appends completed controllers to `workflow/child_controllers.yaml`:
```yaml
controllers:
  - wave: 1
    name: "w1-task-1-engineering-manager"
    work_item: "TASK-1"
    agent_type: "cagents:engineering-manager"
    status: completed
  - wave: 1
    name: "w1-task-2-engineering-manager"
    work_item: "TASK-2"
    agent_type: "cagents:engineering-manager"
    status: completed
  - wave: 2
    name: "w2-task-3-engineering-manager"
    work_item: "TASK-3"
    agent_type: "cagents:engineering-manager"
    status: completed
```

### Parent Session ID Extraction

When invoked by /org with `--session cagents-memory/sessions/org_foo_260317_001/engineering`, the `team_*` session stores:
```yaml
parent_session_id: "org_foo_260317_001"
```
This is extracted from the `--session` path (see Parent Session Extraction in Step 2a). If /team is invoked directly by a user (no `--session` flag), `parent_session_id` is `null`.

## Configuration

- Pipeline config: `cagents-memory/_system/config/pipeline_config.yaml`
- Org pipeline config: `cagents-memory/_system/config/org_pipeline_config.yaml`
- `teammateMode` in settings.json controls display: `"tmux"` (split panes), `"auto"`, `"in-process"`
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be `"1"` in settings.json env
- Both are already configured in this project's settings.json

## Cross-Version Compatibility

**Minimum Claude Code version**: >= 2.1.69 (declared in frontmatter `compatibility` field)

| Feature | Minimum CC Version | Notes |
|---------|-------------------|-------|
| `TeamCreate` / `TeamDelete` | 2.1.69 | Core agent teams API |
| `SendMessage` (direct + broadcast) | 2.1.69 | Teammate communication |
| `TaskCreate` / `TaskUpdate` / `TaskList` | 2.1.69 | Shared task list coordination |
| `settings.json` `env` block propagation | 2.1.x | Required for `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to reach subagents |
| `SendMessage` auto-resume of stopped teammates | 2.1.77 | Re-activate stopped teammates without fresh spawn |
| `isolation: "worktree"` in Task calls | 2.1.72 | Git worktree isolation for parallel file safety |
| `ExitWorktree` tool | 2.1.72 | Clean exit from worktree-isolated subagents |
| `teammateMode: "tmux"` | 2.1.69 | Requires tmux installed on host |
| `teammateMode: "in-process"` | 2.1.69 | Works in any terminal |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | 2.1.74 | Extend SessionEnd hook timeout |

**Environment variable propagation**: The `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var is set in `.claude/settings.json` under `env`. Claude Code injects these vars into the environment of all hooks and subagents. If this var is not set (e.g., settings.json env block not supported by the CC version), the team-start hook logs a warning and /team falls back to parallel Task execution without TeamCreate.

**Model-agnostic spawning**: All teammate Task calls use `subagent_type: "cagents:{name}"` which is routed by Claude Code's model routing layer. No hardcoded model assumptions exist in team hooks or spawning templates. Teammates run on whatever model Claude Code assigns based on `model_routing.yaml` and environment configuration.

**Hook input schema stability**: Team hooks (team-start, team-task-complete, teammate-idle-handler, team-stop) use defensive field access with fallback defaults for all input fields (`team_name || ''`, `teammate_name || 'teammate'`, `task_id` with multi-level extraction). This ensures hooks do not crash if Claude Code changes the hook input schema across versions.

See @reference/architecture.md for team execution model details.
See @reference/fallback-behavior.md for fallback and error recovery.
See @reference/flags.md for complete flag reference.
