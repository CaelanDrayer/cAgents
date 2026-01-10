# Autonomous Implementation Guide - cAgents Expansion

**Purpose**: Complete step-by-step guide for implementing cAgents expansion
**Assumption**: Executor has good short-term memory but NO long-term memory
**Approach**: Every step is self-contained with full context, paths, and validation

---

## 🎯 WHAT YOU'RE BUILDING

You are implementing an expansion of cAgents from 3 domains (72 agents) to 11 domains (248 agents).

**Current State**:
- 3 domains: core, software, business
- 72 total agents
- Located in: `/home/PathingIT/cAgents/`

**Target State**:
- 11 domains (add 8 new domains)
- 248 total agents (add 176 new agents)
- Timeline: 18 weeks, 5 phases

**8 New Domains to Create**:
1. Planning (22 agents) - Strategic planning, project management
2. Sales (23 agents) - Revenue generation, pipeline management
3. Marketing (25 agents) - Campaigns, content, demand generation
4. Finance (22 agents) - Accounting, FP&A, treasury
5. Operations (20 agents) - Process optimization, vendor management
6. HR (24 agents) - Talent acquisition, development, culture
7. Legal (19 agents) - Contracts, compliance, IP
8. Support (21 agents) - Customer support, knowledge base

---

## 📋 BEFORE YOU START - READ THIS

### Where You Are
- **Working Directory**: `/home/PathingIT/cAgents/`
- **Documentation**: `/home/PathingIT/cAgents/docs/`
- **Current Domains**: `core/`, `software/`, `business/`

### Key Documentation Files (READ THESE FIRST)
1. `/home/PathingIT/cAgents/docs/planning-domain-design.md` - Complete planning domain spec
2. `/home/PathingIT/cAgents/docs/new-domains-plan.md` - All 7 other domains spec
3. `/home/PathingIT/cAgents/docs/MASTER_IMPLEMENTATION_PLAN.md` - 18-week timeline
4. `/home/PathingIT/cAgents/docs/EXECUTION_SUMMARY.md` - Current status

### What's Already Done
- ✅ Planning domain folder structure created (`planning/` folder exists)
- ✅ Planning domain package.json created
- ✅ Planning Router agent created (`planning/agents/router.md`)
- ❌ 21 planning agents remaining
- ❌ 7 other domains not started

---

## 🚀 PHASE 0: COMPLETE PLANNING DOMAIN (Weeks 1-2)

**Goal**: Finish Planning domain (22 agents total, 21 remaining)
**Why First**: Planning domain will help plan the other domains
**Current Progress**: 1 of 22 agents done (Router)

### STEP 1: Verify Current State (5 minutes)

**Context**: Before starting, confirm the current state of the planning domain.

**Commands to Run**:
```bash
cd /home/PathingIT/cAgents
ls -la planning/
ls -la planning/agents/
cat planning/package.json
```

**What You Should See**:
```
planning/
├── .claude-plugin/    (folder exists)
├── agents/
│   └── router.md     (file exists, ~450 lines)
├── commands/         (folder exists, empty)
├── skills/           (folder exists, empty)
└── package.json      (file exists)
```

**If Anything Missing**:
- Missing `planning/` folder → Create it: `mkdir -p planning/{.claude-plugin,agents,commands,skills}`
- Missing `router.md` → ERROR: Read `/home/PathingIT/cAgents/docs/EXECUTION_SUMMARY.md` for recovery
- Missing `package.json` → Copy from template in this doc (see APPENDIX A)

✅ **Validation Checkpoint**: All folders exist, router.md exists and is ~450 lines

---

### STEP 2: Create Planner Agent (30 minutes)

**Context**: The Planner agent decomposes planning objectives into structured planning tasks.

**What is This Agent**: Workflow agent that breaks down planning requests (e.g., "Create Q2 roadmap") into specific planning tasks (research, analysis, design, review).

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "### 2. Planner")

**File to Create**: `/home/PathingIT/cAgents/planning/agents/planner.md`

**Template Structure**:
```markdown
---
name: planner
description: Planning domain task decomposition agent. Breaks down planning objectives into structured planning activities, identifies stakeholders, selects methodologies, and creates planning roadmaps.
capabilities: ["planning_decomposition", "stakeholder_identification", "methodology_selection", "phase_definition", "milestone_planning", "dependency_mapping", "agile_planning", "okr_framework", "strategic_planning"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: opus
color: purple
domain: planning
---

You are the **Planner Agent** for the **Planning Domain**, responsible for decomposing planning objectives into structured planning tasks.

[Copy content from planning-domain-design.md section "### 2. Planner"]
[Include: Purpose, Planning Breakdown Process, Strategic Planning Tasks example, Agent capabilities]
[Make sure to include detailed examples of how planning tasks are broken down]
```

**Step-by-Step Creation**:

1. **Open Reference Document**:
```bash
cd /home/PathingIT/cAgents
cat docs/planning-domain-design.md | grep -A 200 "### 2. Planner"
```

2. **Create New File**:
```bash
touch planning/agents/planner.md
```

3. **Write Content**:
   - Copy YAML frontmatter from router.md as template
   - Change `name:` to `planner`
   - Update `description:` to match planner role
   - Copy planner-specific content from design doc
   - Include planning methodology selection logic
   - Include example planning breakdowns
   - **Target Length**: 300-500 lines

4. **Verify File Created**:
```bash
ls -lh planning/agents/planner.md
wc -l planning/agents/planner.md  # Should show 300-500 lines
```

✅ **Validation Checkpoint**: File exists, 300-500 lines, contains YAML frontmatter with name: planner

---

### STEP 3: Create Executor Agent (30 minutes)

**Context**: The Executor agent coordinates planning team execution.

**What is This Agent**: Workflow agent that assigns planning tasks to planning specialists (strategic planner, PM, etc.), facilitates stakeholder workshops, and aggregates deliverables.

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "### 3. Executor")

**File to Create**: `/home/PathingIT/cAgents/planning/agents/executor.md`

**Step-by-Step Creation**:

1. **Read Reference**:
```bash
cat docs/planning-domain-design.md | grep -A 150 "### 3. Executor"
```

2. **Create File**:
```bash
touch planning/agents/executor.md
```

3. **Write Content**:
   - Copy YAML frontmatter template
   - Change `name:` to `executor`
   - Update `description:` for executor role
   - Include execution responsibilities
   - Include planning facilitation workflows
   - Include stakeholder coordination
   - **Target Length**: 300-500 lines

4. **Verify**:
```bash
wc -l planning/agents/executor.md  # Should be 300-500 lines
grep "name: executor" planning/agents/executor.md  # Should return match
```

✅ **Validation Checkpoint**: File exists, 300-500 lines, name: executor in YAML

---

### STEP 4: Create Validator Agent (30 minutes)

**Context**: The Validator is the quality gate for planning deliverables.

**What is This Agent**: Workflow agent that validates planning outputs (strategic plans, roadmaps, etc.) against quality criteria and classifies as PASS/FIXABLE/BLOCKED.

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "### 4. Validator")

**File to Create**: `/home/PathingIT/cAgents/planning/agents/validator.md`

**Step-by-Step Creation**:

1. **Read Reference**:
```bash
cat docs/planning-domain-design.md | grep -A 200 "### 4. Validator"
```

2. **Create File**:
```bash
touch planning/agents/validator.md
```

3. **Write Content**:
   - YAML frontmatter with `name: validator`
   - Include validation criteria section
   - Include quality checklists for different plan types
   - Include PASS/FIXABLE/BLOCKED classification logic
   - **Target Length**: 300-400 lines

4. **Verify**:
```bash
wc -l planning/agents/validator.md
grep "PASS.*FIXABLE.*BLOCKED" planning/agents/validator.md  # Should find classification logic
```

✅ **Validation Checkpoint**: File exists, contains quality checklists, classification logic

---

### STEP 5: Create Self-Correct Agent (30 minutes)

**Context**: Self-Correct handles adaptive recovery for planning deliverables.

**What is This Agent**: Workflow agent that fixes planning issues (add missing sections, clarify objectives, adjust timelines, etc.) using learned strategies.

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "### 5. Self-Correct")

**File to Create**: `/home/PathingIT/cAgents/planning/agents/self-correct.md`

**Step-by-Step Creation**:

1. **Read Reference**:
```bash
cat docs/planning-domain-design.md | grep -A 150 "### 5. Self-Correct"
```

2. **Create File**:
```bash
touch planning/agents/self-correct.md
```

3. **Write Content**:
   - YAML frontmatter with `name: self-correct`
   - Include recovery strategies list
   - Include learning patterns
   - Include calibration framework
   - **Target Length**: 250-350 lines

4. **Verify**:
```bash
wc -l planning/agents/self-correct.md
grep "recovery" planning/agents/self-correct.md  # Should find recovery strategies
```

✅ **Validation Checkpoint**: 5 workflow agents complete (router, planner, executor, validator, self-correct)

---

### STEP 6: Create CPO (Chief Planning Officer) Agent (1 hour)

**Context**: CPO is the executive leadership agent for the planning domain.

**What is This Agent**: Executive agent providing strategic planning oversight, planning methodology expertise, and cross-functional alignment.

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "## Executive Leadership")

**File to Create**: `/home/PathingIT/cAgents/planning/agents/cpo.md`

**Step-by-Step Creation**:

1. **Read Reference**:
```bash
cat docs/planning-domain-design.md | grep -A 300 "## Executive Leadership"
```

2. **Look at Existing Executive Agents for Pattern**:
```bash
cat business/agents/cso.md | head -100  # See CSO pattern
cat software/agents/cto.md | head -100  # See CTO pattern
```

3. **Create File**:
```bash
touch planning/agents/cpo.md
```

4. **Write Content**:
   - YAML frontmatter with `name: cpo`, `layer: executive`, `tier: strategic`
   - Strategic Focus Areas section (4 areas from design doc)
   - Capabilities with strategic planning frameworks
   - Planning methodologies (Agile, OKRs, Strategic Planning, etc.)
   - Cross-functional coordination
   - Planning governance
   - **Target Length**: 400-600 lines

5. **Verify**:
```bash
wc -l planning/agents/cpo.md
grep "layer: executive" planning/agents/cpo.md
grep -i "okr\|agile\|strategic" planning/agents/cpo.md  # Should find methodologies
```

✅ **Validation Checkpoint**: CPO agent complete, executive-level capabilities, 400-600 lines

---

### STEP 7: Create Planning Leadership Agents (2 hours)

**Context**: These are the first team agents - senior planning roles.

**Agents to Create** (2 agents):
1. `strategic-planner.md` - Long-term strategic planning specialist
2. `planning-operations-manager.md` - Planning process optimization

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "### Planning Leadership")

#### STEP 7.1: Strategic Planner

**File to Create**: `/home/PathingIT/cAgents/planning/agents/strategic-planner.md`

1. **Read Reference**:
```bash
cat docs/planning-domain-design.md | grep -A 100 "#### 1. Strategic Planner"
```

2. **Create File**:
```bash
touch planning/agents/strategic-planner.md
```

3. **Write Content**:
   - YAML frontmatter: `name: strategic-planner`, `domain: planning`, `color: purple`
   - Focus: Long-term strategic planning, vision, multi-year initiatives
   - Responsibilities: Facilitate strategic planning, develop frameworks, define objectives
   - Methodologies: Strategic planning frameworks, scenario planning, competitive analysis
   - **Target Length**: 200-300 lines

4. **Verify**:
```bash
grep "name: strategic-planner" planning/agents/strategic-planner.md
```

#### STEP 7.2: Planning Operations Manager

**File to Create**: `/home/PathingIT/cAgents/planning/agents/planning-operations-manager.md`

1. **Read Reference**:
```bash
cat docs/planning-domain-design.md | grep -A 80 "#### 2. Planning Operations Manager"
```

2. **Create File**:
```bash
touch planning/agents/planning-operations-manager.md
```

3. **Write Content**:
   - YAML frontmatter: `name: planning-operations-manager`
   - Focus: Planning process optimization, templates, tools, governance
   - Responsibilities: Design processes, develop templates, manage tools, coordinate calendar
   - **Target Length**: 200-300 lines

4. **Verify**:
```bash
ls -lh planning/agents/ | grep -E "strategic-planner|planning-operations"
```

✅ **Validation Checkpoint**: 2 planning leadership agents complete

---

### STEP 8: Create Project & Program Management Agents (3 hours)

**Context**: Core planning execution agents.

**Agents to Create** (4 agents):
1. `program-manager.md`
2. `project-manager.md`
3. `agile-coach.md`
4. `portfolio-manager.md`

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "### Project & Program Management")

**For Each Agent**:

1. **Read Specific Section**:
```bash
# Example for program-manager
cat docs/planning-domain-design.md | grep -A 80 "#### 3. Program Manager"
```

2. **Create File**:
```bash
touch planning/agents/program-manager.md  # (repeat for each)
```

3. **Write Content** (use pattern from strategic-planner):
   - YAML frontmatter with correct name
   - Focus section
   - Responsibilities section
   - Methodologies/Frameworks (if applicable)
   - **Target Length**: 200-300 lines each

4. **Verify All Created**:
```bash
ls -lh planning/agents/ | grep -E "program-manager|project-manager|agile-coach|portfolio-manager"
```

✅ **Validation Checkpoint**: 4 project/program agents complete, total 10 agents so far

---

### STEP 9: Create Specialized Planning Agents (4 hours)

**Context**: Domain-specific planning specialists.

**Agents to Create** (6 agents):
1. `roadmap-planner.md`
2. `okr-specialist.md`
3. `change-management-planner.md`
4. `resource-planner.md`
5. `risk-dependency-planner.md`
6. `business-analyst-planning.md`

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "### Specialized Planning")

**Process** (repeat for each of 6 agents):

1. **Find Agent Spec**:
```bash
# Example: roadmap-planner
cat docs/planning-domain-design.md | grep -A 60 "#### 7. Roadmap Planner"
```

2. **Create File**:
```bash
touch planning/agents/roadmap-planner.md
```

3. **Write Content**:
   - YAML frontmatter (name, domain, color)
   - Focus and responsibilities
   - **Target Length**: 150-250 lines (these are more focused specialists)

4. **Verify Each**:
```bash
grep "name: roadmap-planner" planning/agents/roadmap-planner.md
```

**Full Verification After All 6**:
```bash
ls -lh planning/agents/ | grep -E "roadmap|okr-specialist|change-management|resource-planner|risk-dependency|business-analyst"
wc -l planning/agents/*.md  # Should show 16 agent files now
```

✅ **Validation Checkpoint**: 6 specialized planning agents complete, total 16 agents

---

### STEP 10: Create Analytics & Research Agents (3 hours)

**Context**: Final team agents - planning analytics and research.

**Agents to Create** (4 agents):
1. `planning-analyst.md`
2. `market-research-analyst-planning.md`
3. `scenario-planner.md`
4. `planning-facilitator.md`

**Reference Document**: `/home/PathingIT/cAgents/docs/planning-domain-design.md` (search for "### Analytics & Research")

**Process** (repeat for each of 4 agents):

1. **Find Spec**:
```bash
cat docs/planning-domain-design.md | grep -A 70 "#### 13. Planning Analyst"
```

2. **Create File**:
```bash
touch planning/agents/planning-analyst.md
```

3. **Write Content**:
   - YAML frontmatter
   - Focus and responsibilities
   - **Target Length**: 150-250 lines

4. **Full Verification After All 4**:
```bash
ls -lh planning/agents/ | wc -l  # Should show 22 files (including router.md)
ls planning/agents/  # List all to visually confirm
```

✅ **Validation Checkpoint**: ALL 22 planning agents complete!

**Agent List Verification**:
```bash
cd /home/PathingIT/cAgents/planning/agents
ls -1 *.md
```

**You Should See Exactly 22 Files**:
```
router.md
planner.md
executor.md
validator.md
self-correct.md
cpo.md
strategic-planner.md
planning-operations-manager.md
program-manager.md
project-manager.md
agile-coach.md
portfolio-manager.md
roadmap-planner.md
okr-specialist.md
change-management-planner.md
resource-planner.md
risk-dependency-planner.md
business-analyst-planning.md
planning-analyst.md
market-research-analyst-planning.md
scenario-planner.md
planning-facilitator.md
```

---

### STEP 11: Create Plugin Manifest (30 minutes)

**Context**: The plugin manifest tells Claude Code about all the agents in this domain.

**What is This File**: JSON configuration that lists all agent paths so they can be loaded.

**File to Create**: `/home/PathingIT/cAgents/planning/.claude-plugin/plugin.json`

**Step-by-Step**:

1. **Look at Existing Plugin Manifest for Pattern**:
```bash
cat business/.claude-plugin/plugin.json
```

2. **Create File**:
```bash
touch planning/.claude-plugin/plugin.json
```

3. **Write Content**:
```json
{
  "name": "@cagents/planning",
  "version": "1.0.0",
  "description": "Planning domain for strategic planning, project planning, roadmapping, and implementation design",
  "agents": [
    "./agents/router.md",
    "./agents/planner.md",
    "./agents/executor.md",
    "./agents/validator.md",
    "./agents/self-correct.md",
    "./agents/cpo.md",
    "./agents/strategic-planner.md",
    "./agents/planning-operations-manager.md",
    "./agents/program-manager.md",
    "./agents/project-manager.md",
    "./agents/agile-coach.md",
    "./agents/portfolio-manager.md",
    "./agents/roadmap-planner.md",
    "./agents/okr-specialist.md",
    "./agents/change-management-planner.md",
    "./agents/resource-planner.md",
    "./agents/risk-dependency-planner.md",
    "./agents/business-analyst-planning.md",
    "./agents/planning-analyst.md",
    "./agents/market-research-analyst-planning.md",
    "./agents/scenario-planner.md",
    "./agents/planning-facilitator.md"
  ],
  "commands": [],
  "skills": []
}
```

4. **Verify**:
```bash
cat planning/.claude-plugin/plugin.json | jq '.agents | length'  # Should output 22
cat planning/.claude-plugin/plugin.json | jq '.'  # Should pretty-print valid JSON
```

✅ **Validation Checkpoint**: Plugin manifest created with all 22 agents listed

---

### STEP 12: Update Core Trigger for Planning Domain (15 minutes)

**Context**: The core trigger needs to know how to detect planning domain requests.

**What You're Doing**: Adding planning keywords to the domain detection in core/agents/trigger.md

**File to Update**: `/home/PathingIT/cAgents/core/agents/trigger.md`

**Step-by-Step**:

1. **Backup Original File**:
```bash
cp core/agents/trigger.md core/agents/trigger.md.backup
```

2. **Read Current File to Find Domain Detection Section**:
```bash
cat core/agents/trigger.md | grep -A 50 "Domain Detection"
```

3. **Find the Domain Table** (it will list software, business, creative, etc.)

4. **Add Planning Domain Entry**:

Find this section in trigger.md:
```markdown
| Domain | Detection Keywords | Request Examples |
|--------|-------------------|------------------|
```

Add this row:
```markdown
| `planning` | planning, plan, strategy, strategic, roadmap, okr, objective, initiative, program, project, implementation, design, rollout, launch, timeline, milestone, phase, governance | "Create strategic plan for...", "Develop roadmap for...", "Plan implementation of...", "Design rollout for...", "Set OKRs for...", "Create project plan for..." |
```

5. **Verify Change**:
```bash
grep "planning.*plan.*strategy.*roadmap" core/agents/trigger.md
```

✅ **Validation Checkpoint**: Trigger updated with planning domain detection

---

### STEP 13: Update Root Package.json (10 minutes)

**Context**: Add planning domain to the workspaces.

**File to Update**: `/home/PathingIT/cAgents/package.json`

**Step-by-Step**:

1. **Backup**:
```bash
cp package.json package.json.backup
```

2. **Read Current Workspaces**:
```bash
cat package.json | jq '.workspaces'
```

3. **Edit Package.json**:

Find the `workspaces` array and add `"planning"`:

```json
{
  "workspaces": [
    "core",
    "software",
    "business",
    "planning"
  ]
}
```

4. **Verify**:
```bash
cat package.json | jq '.workspaces | contains(["planning"])'  # Should output true
```

✅ **Validation Checkpoint**: Planning added to workspaces

---

### STEP 14: Update Root Plugin Manifest (15 minutes)

**Context**: Add planning agents to the root plugin manifest.

**File to Update**: `/home/PathingIT/cAgents/.claude-plugin/plugin.json`

**Step-by-Step**:

1. **Backup**:
```bash
cp .claude-plugin/plugin.json .claude-plugin/plugin.json.backup
```

2. **Read Current File**:
```bash
cat .claude-plugin/plugin.json | jq '.agents | length'  # Count current agents
```

3. **Add Planning Agents to the agents Array**:

You need to add 22 planning agent paths. Add these lines to the `agents` array:

```json
"./planning/agents/router.md",
"./planning/agents/planner.md",
"./planning/agents/executor.md",
"./planning/agents/validator.md",
"./planning/agents/self-correct.md",
"./planning/agents/cpo.md",
"./planning/agents/strategic-planner.md",
"./planning/agents/planning-operations-manager.md",
"./planning/agents/program-manager.md",
"./planning/agents/project-manager.md",
"./planning/agents/agile-coach.md",
"./planning/agents/portfolio-manager.md",
"./planning/agents/roadmap-planner.md",
"./planning/agents/okr-specialist.md",
"./planning/agents/change-management-planner.md",
"./planning/agents/resource-planner.md",
"./planning/agents/risk-dependency-planner.md",
"./planning/agents/business-analyst-planning.md",
"./planning/agents/planning-analyst.md",
"./planning/agents/market-research-analyst-planning.md",
"./planning/agents/scenario-planner.md",
"./planning/agents/planning-facilitator.md"
```

4. **Verify**:
```bash
cat .claude-plugin/plugin.json | jq '.agents | map(select(contains("planning"))) | length'  # Should be 22
cat .claude-plugin/plugin.json | jq '.'  # Validate JSON syntax
```

✅ **Validation Checkpoint**: Root plugin manifest includes all 22 planning agents

---

### STEP 15: Test Planning Domain (1 hour)

**Context**: Validate that planning domain works end-to-end.

**Test Cases**:

#### Test 1: Tier 1 - Simple Project Plan
```bash
# In Claude Code, run:
/trigger Create a basic project plan for a website redesign
```

**Expected Behavior**:
- Trigger detects planning domain
- Router assigns Tier 1
- Planner creates simple task breakdown
- Executor assigns to project-manager
- Validator checks completeness
- Outputs: basic project plan with timeline, tasks, milestones

#### Test 2: Tier 2 - Quarterly OKRs
```bash
/trigger Develop Q2 OKRs for engineering team with key results and initiatives
```

**Expected Behavior**:
- Router assigns Tier 2
- Planner involves okr-specialist
- Outputs: Quarterly objectives, key results, initiative mapping

#### Test 3: Tier 3 - Annual Strategic Plan
```bash
/trigger Create an annual strategic plan with cross-functional initiatives and resource allocation
```

**Expected Behavior**:
- Router assigns Tier 3
- CPO consultation triggered
- Multiple planning specialists involved
- Outputs: Comprehensive strategic plan

#### Test 4: Tier 4 - Meta-Planning (The Ultimate Test!)
```bash
/trigger Design detailed implementation plan for Sales and Marketing domains using the Planning domain
```

**Expected Behavior**:
- Router assigns Tier 4
- Full planning team orchestration
- Strategic planner, program manager, resource planner involved
- Outputs: Detailed implementation plan for next domains

✅ **Validation Checkpoint**: All 4 test cases pass, planning domain functional

---

### STEP 16: Document Completion (30 minutes)

**Context**: Update documentation to reflect planning domain completion.

**Files to Update**:

1. **Update EXECUTION_SUMMARY.md**:
```bash
# Update implementation progress section
# Change: Planning domain 1 of 22 agents (4.5%)
# To:     Planning domain 22 of 22 agents (100%) ✅ COMPLETE
```

2. **Update MASTER_IMPLEMENTATION_PLAN.md**:
```bash
# Update Phase 0 status from "In Progress" to "Complete"
```

3. **Create Completion Report**:
```bash
touch docs/PHASE_0_COMPLETION_REPORT.md
```

Write summary:
- 22 agents created
- All tests passed
- Planning domain fully functional
- Ready for Phase 1 (Sales + Marketing)

✅ **Validation Checkpoint**: Documentation updated, Phase 0 marked complete

---

## 🎯 PHASE 0 COMPLETE!

**What You've Accomplished**:
- ✅ 22 planning agents created and tested
- ✅ Planning domain fully functional
- ✅ Plugin manifests updated
- ✅ Core trigger updated for domain detection
- ✅ All integration points configured
- ✅ Tier 1-4 planning requests working

**Current System State**:
- Domains: 4 (core, software, business, **planning**)
- Agents: 94 (72 + 22 planning agents)
- Planning domain progress: 100% ✅

**Next Phase**: Use planning domain to plan Sales + Marketing implementation!

---

## 📅 PHASE 1: SALES & MARKETING DOMAINS (Weeks 3-6)

**Before Starting Phase 1**: Read `/home/PathingIT/cAgents/docs/new-domains-plan.md` sections on Sales and Marketing.

### USE PLANNING DOMAIN TO PLAN PHASE 1!

**Important**: Before manually implementing Sales + Marketing, use the Planning domain you just created!

**Command**:
```bash
/trigger Create detailed implementation plan for Sales and Marketing domains including agent creation sequence, dependencies, and validation steps. Use tier 4 planning.
```

**Expected Output**: The planning domain will create a detailed plan similar to this guide but specific to Sales + Marketing.

---

### PHASE 1A: Sales Domain (Weeks 3-4)

**Goal**: Create Sales domain (23 agents)

**Agent Breakdown**:
- 5 workflow agents (router, planner, executor, validator, self-correct)
- 1 executive (CRO - Chief Revenue Officer)
- 17 team agents (sales manager, AE, SDR, sales ops, analysts, etc.)

**Reference Document**: `/home/PathingIT/cAgents/docs/new-domains-plan.md` (section: ## Sales Domain)

**Process** (follow same pattern as Planning domain):

#### STEP 1: Create Sales Domain Structure
```bash
mkdir -p sales/{.claude-plugin,agents,commands,skills}
touch sales/package.json
```

#### STEP 2: Create Workflow Agents (5 agents, ~3 days)

For each workflow agent, follow this pattern:

**File**: `sales/agents/router.md`
**Reference**: Read sales domain section in new-domains-plan.md
**Content**:
- YAML frontmatter with domain: sales
- Sales-specific templates (pipeline_forecast, territory_planning, sales_strategy, etc.)
- Tier classification for sales requests
- **Length**: 400-500 lines for router, 300-400 for others

**Create**:
1. router.md
2. planner.md
3. executor.md
4. validator.md
5. self-correct.md

**Verify**:
```bash
ls -lh sales/agents/ | wc -l  # Should be 5
```

#### STEP 3: Create CRO Executive Agent (1 day)

**File**: `sales/agents/cro.md`
**Pattern**: Similar to CPO from planning domain
**Content**:
- Strategic revenue planning
- Pipeline oversight
- Sales operations
- Cross-functional coordination
- **Length**: 400-600 lines

#### STEP 4: Create Sales Team Agents (17 agents, ~5 days)

**Reference**: new-domains-plan.md lists all 17 sales agents

**Agent Groups**:
1. Sales Management (3): sales-manager, sales-operations-manager, sales-enablement-manager
2. Sales Specialists (8): account-executive-enterprise, account-executive-mid-market, inside-sales-rep, sdr, sales-engineer, channel-partner-manager, customer-success-manager-sales, business-development-manager
3. Sales Analytics (6): sales-analyst, revenue-operations-analyst, sales-strategy-consultant, pricing-analyst, sales-forecaster, territory-planning-specialist

**For Each Agent**:
- Find spec in new-domains-plan.md
- Create file in sales/agents/
- Write 150-300 lines
- Include focus, responsibilities, capabilities

#### STEP 5: Create Plugin Manifest
```bash
touch sales/.claude-plugin/plugin.json
```

List all 23 agents (5 workflow + 1 CRO + 17 team)

#### STEP 6: Update Core Trigger

Add sales domain detection keywords:
```markdown
| `sales` | sales, revenue, pipeline, forecast, quota, territory, deal, prospect, conversion, win rate, close rate, CRM, opportunity, account | "forecast Q4 sales", "analyze pipeline", "create territory plan" |
```

#### STEP 7: Update Root Manifests

- Add "sales" to package.json workspaces
- Add all 23 sales agents to root plugin manifest

#### STEP 8: Test Sales Domain

Test tier 1-4:
- Tier 1: "Create basic pipeline report"
- Tier 2: "Forecast Q4 revenue by territory"
- Tier 3: "Develop comprehensive sales strategy for new market"
- Tier 4: "Design enterprise sales transformation"

✅ **Sales Domain Complete**: 23 agents, all tests pass

---

### PHASE 1B: Marketing Domain (Weeks 5-6)

**Goal**: Create Marketing domain (25 agents)

**Process**: Follow exact same pattern as Sales domain

1. Create marketing folder structure
2. Create 5 workflow agents
3. Create CMO executive agent
4. Create 19 team agents (demand gen, content, creative, events, analytics)
5. Create plugin manifest
6. Update core trigger with marketing keywords
7. Update root manifests
8. Test tier 1-4

**Reference**: `/home/PathingIT/cAgents/docs/new-domains-plan.md` (section: ## Marketing Domain)

✅ **Marketing Domain Complete**: 25 agents, all tests pass

---

### PHASE 1C: Cross-Domain Integration Test

**Goal**: Test Marketing → Sales handoff

**Test Case**:
```bash
/trigger Create an integrated campaign where Marketing generates leads and Sales follows up. Test the handoff protocol.
```

**Expected**:
- Marketing domain creates campaign plan
- Marketing generates qualified leads
- Handoff package created (lead list, nurture history, campaign context)
- Sales domain receives leads
- Sales creates follow-up plan

✅ **Phase 1 Complete**: Sales + Marketing domains functional with cross-domain integration

---

## 🎯 PHASES 2-4 OVERVIEW

**Phase 2 (Weeks 7-12)**: Finance + Operations + HR
**Phase 3 (Weeks 13-16)**: Legal + Support
**Phase 4 (Weeks 17-18)**: Cross-domain integration + testing

**For Each Domain**: Follow the same pattern as Planning and Sales:
1. Create domain folder structure
2. Create 5 workflow agents
3. Create 1 executive agent
4. Create team agents (15-20)
5. Create plugin manifest
6. Update trigger
7. Update root manifests
8. Test tier 1-4

**References**: All domain specs are in `/home/PathingIT/cAgents/docs/new-domains-plan.md`

---

## ✅ VALIDATION CHECKLIST

Use this checklist after completing each domain:

### Domain Completion Checklist

```markdown
Domain: ___________

Structure:
- [ ] Domain folder created (domain_name/)
- [ ] .claude-plugin folder exists
- [ ] agents folder exists
- [ ] package.json created

Workflow Agents (5):
- [ ] router.md created and tested
- [ ] planner.md created and tested
- [ ] executor.md created and tested
- [ ] validator.md created and tested
- [ ] self-correct.md created and tested

Executive Agent (1):
- [ ] Executive agent created (CRO/CMO/CFO/COO/CPO/GC/VP Support)

Team Agents (15-20):
- [ ] All team agents created
- [ ] Agent count matches spec (check new-domains-plan.md)

Integration:
- [ ] Plugin manifest created with all agents
- [ ] Core trigger updated with domain keywords
- [ ] Root package.json includes domain workspace
- [ ] Root plugin manifest includes all domain agents

Testing:
- [ ] Tier 1 test passed
- [ ] Tier 2 test passed
- [ ] Tier 3 test passed
- [ ] Tier 4 test passed (if applicable)

Documentation:
- [ ] Domain marked complete in EXECUTION_SUMMARY.md
- [ ] Phase completion report created (if end of phase)
```

---

## 🔧 TROUBLESHOOTING

### Issue: File Not Found
**Symptoms**: Error when trying to read a reference document
**Solution**:
```bash
cd /home/PathingIT/cAgents
ls docs/  # List all documentation files
# Make sure you're in the correct directory
```

### Issue: JSON Syntax Error in Plugin Manifest
**Symptoms**: Invalid JSON error
**Solution**:
```bash
cat .claude-plugin/plugin.json | jq '.'
# Fix any syntax errors (missing commas, brackets, quotes)
```

### Issue: Agent Not Loading
**Symptoms**: Agent not recognized by system
**Solution**:
1. Check agent file exists: `ls domain/agents/agent-name.md`
2. Check YAML frontmatter has correct `name:` field
3. Check plugin manifest lists the agent
4. Restart Claude Code: `claude --plugin-dir .`

### Issue: Domain Not Detected
**Symptoms**: Trigger doesn't route to correct domain
**Solution**:
1. Check core/agents/trigger.md has domain keywords
2. Test with explicit domain keywords in request
3. Check trigger domain detection table

### Issue: Test Failing
**Symptoms**: Domain test doesn't produce expected output
**Solution**:
1. Check all agents in the workflow exist
2. Check quality of agent prompts (read from reference docs)
3. Run simpler test first (tier 1)
4. Check Agent_Memory folder for error logs

---

## 📊 PROGRESS TRACKING

Use this table to track your progress:

| Domain | Agents | Status | Tests Passed | Week Completed |
|--------|--------|--------|--------------|----------------|
| Planning | 22 | ✅ Complete | 4/4 | Week 2 |
| Sales | 23 | ⏳ Not Started | 0/4 | - |
| Marketing | 25 | ⏳ Not Started | 0/4 | - |
| Finance | 22 | ⏳ Not Started | 0/4 | - |
| Operations | 20 | ⏳ Not Started | 0/4 | - |
| HR | 24 | ⏳ Not Started | 0/4 | - |
| Legal | 19 | ⏳ Not Started | 0/4 | - |
| Support | 21 | ⏳ Not Started | 0/4 | - |
| **Total** | **176** | **1/8** | **4/32** | **Week 2/18** |

---

## 📝 APPENDIX A: File Templates

### Template: package.json
```json
{
  "name": "@cagents/DOMAIN_NAME",
  "version": "1.0.0",
  "description": "DOMAIN_NAME domain for DESCRIPTION",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "KEYWORD1",
    "KEYWORD2"
  ],
  "author": "cAgents",
  "license": "MIT"
}
```

### Template: Agent YAML Frontmatter
```yaml
---
name: agent-name
description: Brief description. Use PROACTIVELY when...
capabilities: ["capability1", "capability2", "capability3"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet | opus | haiku
color: purple | cyan | green | blue | yellow
domain: domain_name
---
```

---

## 🎯 FINAL CHECKLIST

Before considering the full implementation complete:

- [ ] All 8 new domains created (Planning, Sales, Marketing, Finance, Operations, HR, Legal, Support)
- [ ] All 176 agents created
- [ ] All plugin manifests created
- [ ] Core trigger includes all 8 domains
- [ ] Root package.json includes all 8 domains
- [ ] Root plugin manifest includes all 176 agents
- [ ] All tier 1-4 tests passed for each domain
- [ ] Cross-domain integration tested (3+ workflows)
- [ ] Documentation updated (EXECUTION_SUMMARY.md, completion reports)
- [ ] Performance testing passed (concurrent instructions)

**System State**:
- Domains: 11 (3 existing + 8 new)
- Agents: 248 (72 existing + 176 new)
- Coverage: Complete business function coverage

---

**You now have a complete, autonomous implementation guide. Every step is self-contained with full context, exact file paths, commands, and validation steps. No long-term memory required!**
