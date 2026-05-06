# Detailed Command Flow

Step-by-step execution detail for `/org` — argument parsing, session initialization, routing, pre-execution research, completion, and session directory layout.

## Step 1: Parse Arguments

Parse `$ARGUMENTS` for:
- **Flags**: `--dry-run`, `--quick` (skip deliberation for single-domain)
- **Value flags**: `--domains <d1,d2,...>` (force domain scope), `--resume <session_id>`
- **Instruction**: Everything before the first `--` flag

See `flags.md` for the complete flag reference.

## Step 2: Initialize Session (INIT)

### 2a. Create Session

```
0. Check for CAGENTS_SESSION_ID override:
   - Read process.env.CAGENTS_SESSION_ID
   - If set and non-empty: use it verbatim as SESSION_ID (skip steps 1-4 below)
     - SESSION_DIR="cagents-memory/sessions/${CAGENTS_SESSION_ID}"
     - If SESSION_DIR already exists: this is a RESUME — skip session file creation
       (instruction.yaml, status.yaml, agent_tree.yaml already exist).
       Skip to step 2b (TaskCreate).
     - If SESSION_DIR does not exist: treat as new session — proceed with mkdir
       and file creation using the env var value as SESSION_ID (skip to step 5 below)
   - If not set or empty: proceed with auto-generation (steps 1-4 below)

1. Generate a slug from the user instruction: 2-6 key words, kebab-case, lowercase, max 50 chars
   Strip filler words (the, a, an, to, for, with, and, of). Example: "Launch new product" -> "launch-new-product"
2. Get compact date: YYMMDD (e.g., 260317)
3. Scan cagents-memory/sessions/ for dirs matching org_*_{YYMMDD}_* to find highest NNN, increment by 1 (start at 001)
4. Compose: SESSION_ID="org_{slug}_{YYMMDD}_{NNN}"
   Example: SESSION_ID="org_launch-new-product_260317_001"
5. SESSION_DIR="cagents-memory/sessions/${SESSION_ID}"
6. mkdir -p "${SESSION_DIR}/workflow/events" "${SESSION_DIR}/outputs" "${SESSION_DIR}/domain_analyses" "${SESSION_DIR}/objections"
7. Write self-registration to `${SESSION_DIR}/workflow/agent_tree.yaml`:
   agents:
     - id: "ceo"
       type: "cagents:ceo"
       parent: "root"
       depth: 0
       spawned_at: "{ISO_TIMESTAMP}"
       stopped_at: null
       cagents_type: "cagents:ceo"
       short_role: "CEO"
       role_description: "{instruction summary}"
       session: "{SESSION_ID}"
```

Write `instruction.yaml`:
```yaml
session_id: {SESSION_ID}
session_type: org
command: /org
request: "{user_instruction}"
created_at: "{ISO_TIMESTAMP}"
flags: {parsed_flags}
parent_session_id: null
metadata:
  working_directory: {CWD}
```

Write `status.yaml`:
```yaml
pipeline_state: INIT
created_at: "{ISO_TIMESTAMP}"
state_history:
  - state: INIT
    entered_at: "{ISO_TIMESTAMP}"
    duration_ms: null
```

**CRITICAL: `{ISO_TIMESTAMP}` must be the REAL current time.** Use the timestamp from "Current timestamp" at the top of the SKILL.md, or run `date -u +%Y-%m-%dT%H:%M:%SZ` via Bash. NEVER fabricate timestamps like `T00:00:00Z` or `T12:00:00Z`.

Note: /org uses the `pipeline_state` field (not `phase`). Hooks check both fields as fallback. See `.claude/skills/run/reference/session-schema.md` for the canonical session YAML contract.

**State casing**: Always use lowercase for `pipeline_state` values in `status.yaml` (e.g., `complete` not `COMPLETE`). The `normalizePipelineState` function handles legacy uppercase but new sessions should use lowercase.

**State transition protocol**: At every state transition, /org MUST:
1. Compute `duration_ms` for the previous `state_history` entry (ms between its `entered_at` and now)
2. Append new `state_history` entry with `entered_at: now`, `duration_ms: null`
3. Update `pipeline_state` to the new state
4. Write completion summary at COMPLETE state (even on partial completion)

### 2b. Call TaskCreate (interactive Claude Code)

TaskCreate is the preferred interactive tool. The TodoWrite alternative shown below is the SDK / non-interactive equivalent only.

Interactive seed example:
```
TaskCreate({ subject: "[org] Routing: analyzing domains & scope", description: "INIT phase" })
TaskCreate({ subject: "[org] C-suite Wave 1: analyzing independent domains" })
TaskCreate({ subject: "[org] C-suite Wave 2: cross-domain review" })
TaskCreate({ subject: "[org] Drafting strategic brief & objection review" })
TaskCreate({ subject: "[org] Strategic brief finalized" })
TaskCreate({ subject: "[org > team] Executing domain work" })
TaskCreate({ subject: "[org] Integrating domain outputs" })
TaskCreate({ subject: "[org] Complete" })
```

As work progresses, TaskUpdate to `in_progress` then `completed`. Use the parent>child format (`[org > {csuite}] {domain} domain analysis`) when spawning agents.

**CRITICAL: Never use state machine names (INIT, ANALYZED, etc.) or `/org CEO` as task subjects.** Describe the work being done.

```
# BAD — exposes state names, uses slash prefix:
TaskCreate({ subject: "[/org CEO] INIT: Analyze instruction and route" })
TaskCreate({ subject: "[/org CEO] ANALYZED: C-suite domain analysis" })

# GOOD — describes the work being done:
TaskCreate({ subject: "[org] Routing: analyzing domains & scope" })
TaskCreate({ subject: "[org > cto] Engineering domain analysis" })
TaskCreate({ subject: "[org > team] Executing engineering domain" })
```

## Step 3: CEO Routing Decision (INIT -> route)

### 3a. Identify Touched Domains

| Domain Key | C-Suite | Agent Dir | Keywords |
|-----------|---------|-----------|----------|
| engineering | CTO | engineering/ | fix, bug, implement, code, api, database, build, refactor, test, deploy, architecture, devops, CI/CD |
| creative | CCO | creative/ | write, story, content, design, creative, novel, script, poem, narrative, game art, audio, UX |
| business | CPO/CRO/CFO/COO | business/ | campaign, marketing, sales, budget, cost, forecast, operations, process, product, strategy, revenue, ROI |
| people | CHRO | people/ | hire, recruit, onboard, culture, HR, talent, performance review, team, retention, DEI |
| service | General Counsel | service/ | support, legal, compliance, customer, SLA, contract, privacy, escalation, GDPR |
| science | CTO | science/ | research, experiment, hypothesis, methodology, data collection, peer review, laboratory, scientific, analysis, study |
| health | CHRO | health/ | wellness, medical, health, symptom, treatment, fitness, mental health, therapy, nutrition, clinical |
| education | CPO | education/ | learn, teach, curriculum, lesson, course, student, pedagogy, training, assessment, educational, instructional |
| personal | CHRO | personal/ | personal development, self-improvement, goals, habits, productivity, life coaching, career planning, personal growth |
| arts | CCO | arts/ | painting, drawing, sculpture, performance, gallery, exhibition, artistic, fine arts, visual art, craft |
| trades | COO | trades/ | plumbing, electrical, carpentry, HVAC, welding, construction, installation, repair, tools, safety, tradespeople |

**Multi-C-Suite for Business domain**: The business domain consolidates product, growth, finance, and operations. When business is touched, activate the most relevant C-suite agent(s) based on keywords:
- Product/strategy keywords -> CPO
- Sales/marketing/growth keywords -> CRO
- Finance/budget/cost keywords -> CFO
- Operations/process keywords -> COO
- Multiple sub-areas -> activate multiple C-suite agents for the same domain

See `csuite-mapping.md` for detailed mapping.

### 3b. Route Based on Scope

```
1 domain + simple scope:
  -> Strategic brief + Skill("run", "--brief {brief_path}")
  -> Skip to BRIEFED state (brief only, no deliberation)

1 domain + complex scope:
  -> Strategic brief + Skill("team", "--session {session_dir}")
  -> Skip to BRIEFED state (brief only, no deliberation)

2+ domains OR cross-domain keywords:
  -> Full hierarchy (C-suite analysis -> deliberation -> sequential /team)
  -> Proceed to ANALYZED state
```

Write `routing_decision.yaml`:
```yaml
domains_touched: [{domain_key}: {csuite}]
route: full_hierarchy | single_team | single_run
rationale: "{why this route}"
```

**If single domain route**: Generate a strategic_brief.yaml with CEO framing, then invoke /run or /team directly. Skip to BRIEFED state.

**If full hierarchy**: Proceed to Step 3c.

## Step 3c: Pre-Execution Research

Before spawning C-suite agents, spawn lightweight research subagents to gather concrete facts about the actual project state. This grounds C-suite analyses in real data rather than instruction-text interpretation alone.

### 3c-1. Identify Research Areas from Routing Decision

Based on `routing_decision.yaml` domains and the instruction, identify what needs researching:

| Domain Touched | Research Agent | Research Focus |
|---------------|---------------|----------------|
| engineering | `cagents:backend-developer` or domain specialist | Existing codebase architecture, current implementations, technical constraints |
| creative | `cagents:copywriter` or domain specialist | Existing content patterns, brand guidelines, style conventions |
| business | `cagents:data-analyst` | Relevant metrics, KPIs, financial data, market context |
| people | `cagents:hr-manager` | Current org structure, team composition, role requirements |
| service | `cagents:customer-success-manager` | Current support patterns, SLAs, compliance requirements |

Always spawn at least one general codebase research agent to provide foundational context.

### 3c-2. Spawn Research Subagents in Parallel

```
# General codebase research (always runs)
Agent({
  subagent_type: "general-purpose",
  description: "Research: Codebase analysis for {instruction_summary}",
  prompt: "You are a research agent gathering concrete project facts BEFORE strategic analysis.

INSTRUCTION: {user_instruction}
SESSION: {SESSION_DIR}/

Use Grep, Glob, and Read tools to investigate the actual project state relevant to this instruction. Focus on:
1. Existing implementations related to the instruction
2. File structure and architecture patterns
3. Dependencies and integration points
4. Current state of areas that will be changed

Write your findings to:
{SESSION_DIR}/domain_analyses/research_codebase.yaml

Format:
  research_area: codebase_analysis
  files_examined: [{list of key files read}]
  findings:
    - area: '{topic}'
      current_state: '{what exists now}'
      relevant_files: [{paths}]
      constraints: ['{any constraints discovered}']
  summary: '{one paragraph summary of key findings}'
"
})

# Domain-specific research (per touched domain)
Agent({
  subagent_type: "cagents:{domain_research_agent}",
  description: "Research: {domain_key} domain analysis for {instruction_summary}",
  prompt: "You are a domain research agent gathering concrete facts about {domain_key}.

INSTRUCTION: {user_instruction}
SESSION: {SESSION_DIR}/

Use Grep, Glob, and Read tools to investigate the actual project state for the {domain_key} domain. Focus on domain-specific concerns.

Write your findings to:
{SESSION_DIR}/domain_analyses/research_{domain_key}.yaml
"
})
```

### 3c-3. After All Research Agents Return

Read all `domain_analyses/research_*.yaml` files. These will be passed as additional context to C-suite agents in Step 4.

Proceed to Step 4.

## Step 9: Complete (INTEGRATED -> COMPLETE)

### 9a. Write Completion Summary

Compute `duration_ms` for the final `state_history` entry before writing the COMPLETE state to `status.yaml`.

```yaml
session_id: {SESSION_ID}
route: full_hierarchy|single_team|single_run
domains_executed: [{domain_keys}]
csuite_spawned: [{agent_names}]
deliberation_rounds: 1
escalations_handled: {count}
user_escalations: {count}
final_status: complete|partial
outputs: [{paths}]
```

### 9a-1. Finalize CEO Agent in agent_tree.yaml

Update the CEO agent entry to set:
- `stopped_at: "{ISO_TIMESTAMP}"`
- `completion_summary: "Orchestrated {N} domains, {N} C-suite agents, strategic brief + execution"`
- `duration_seconds: {computed from spawned_at to now}`

Write state transition event to `workflow/events/EVT-{N}.yaml`:
```yaml
event_id: EVT-{N}
type: state_transition
state: complete
agent: cagents:ceo
timestamp: "{ISO_TIMESTAMP}"
outputs_produced: [integration_report.yaml, execution_summary.yaml]
```

### 9b. Update Final Tasks

Update each TaskCreate entry to `completed` via TaskUpdate. Use the parent>child format with completion detail (e.g., "[org > team] Executing {domain} domain — {N}/{total} items complete").

### 9c. Clean Up Tasks (MANDATORY — Hard Gate Before Stopping)

Call `TaskList` to get the CURRENT task inventory. Do NOT rely on task IDs remembered from earlier in the session — IDs may have shifted after Skill invocations (e.g., after a TeamDelete inside /team, the active namespace may change and previously-known IDs may no longer resolve). For EVERY task that is `in_progress` or `pending`, call `TaskUpdate({ taskId: "{id}", status: "completed" })`. If TaskUpdate returns "Task not found", the task was in a different namespace (expected after TeamDelete) — log it and continue.

**Cleanup guard**: Before producing any final output or stopping, call `TaskList` one more time and verify it shows zero `in_progress` tasks. If any remain, mark them completed. This is a hard gate — do not stop with stale tasks.

### 9c-1. Write `execution_summary.yaml`

```yaml
session_id: {SESSION_ID}
final_state: complete
status: completed
route: {route from routing_decision}
domains_executed: [{domain_keys}]
csuite_spawned: [{agent_names}]
total_duration_ms: {elapsed}
started_at: "{first state_history entered_at}"
completed_at: "{ISO_TIMESTAMP}"
```

### 9d. Report to User

Summarize what was accomplished across all domains, key decisions made during deliberation, any escalations handled, and where outputs can be found.

## Session Directory Layout

```
cagents-memory/sessions/org_{timestamp}/
+-- instruction.yaml
+-- status.yaml
+-- routing_decision.yaml
+-- domain_dependencies.yaml
+-- strategic_brief_draft.yaml
+-- strategic_brief.yaml
+-- domain_analyses/
|   +-- domain_analysis_engineering.yaml
|   +-- domain_analysis_creative.yaml
|   +-- domain_analysis_business.yaml
|   +-- domain_analysis_people.yaml
|   +-- domain_analysis_service.yaml
+-- objections/
|   +-- objections_cto.yaml
|   +-- objections_cco.yaml
|   +-- objections_cpo.yaml
|   +-- ...
+-- {domain_key}/               # /team session per domain
|   +-- workflow/
|   +-- outputs/
+-- integration_report.yaml
+-- workflow/
    +-- agent_tree.yaml
    +-- events/
```
