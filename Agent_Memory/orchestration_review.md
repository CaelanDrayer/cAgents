# Orchestration Workflow Review & Critical Issues

**Review Date**: 2026-01-10
**Reviewer**: Universal Workflow Engine
**Scope**: End-to-end workflow orchestration across all domains

---

## Executive Summary

**🔴 CRITICAL ISSUE IDENTIFIED**: The business domain is **INCOMPLETE** and **CANNOT FUNCTION** as currently implemented.

### The Problem

The business domain has **18 specialized agents** (CSO, Operations Manager, Project Manager, etc.) but is **MISSING all 5 required workflow orchestration agents**:

1. ❌ **Router** - Missing (classifies complexity, assigns tiers)
2. ❌ **Planner** - Missing (breaks down tasks, creates plan)
3. ❌ **Executor** - Missing (executes tasks, coordinates team)
4. ❌ **Validator** - Missing (quality gate, validates outputs)
5. ❌ **Self-Correct** - Missing (fixes issues, adaptive recovery)

**Impact**: Business domain requests will **FAIL** at orchestration handoff because Orchestrator cannot find business-specific workflow agents.

---

## Current Orchestration Flow (As Designed)

### Universal Workflow Pipeline

```
User Request
     ↓
[1] TRIGGER (Core) ──→ Parses request, detects domain, creates instruction
     ↓                  Domain detected: "software" or "business" or "creative"
     ↓
[2] ORCHESTRATOR (Core) ──→ Reads domain from instruction.yaml
     ↓                       Signals domain-specific Router
     ↓
[3] ROUTER (Domain-Specific) ──→ Classifies complexity (tier 0-4)
     ↓                           Creates routing decision
     ↓
[4] PLANNER (Domain-Specific) ──→ Breaks down into tasks
     ↓                            Assigns to domain team agents
     ↓
[5] EXECUTOR (Domain-Specific) ──→ Executes tasks in order
     ↓                             Invokes team agents (CSO, PM, etc.)
     ↓
[6] VALIDATOR (Domain-Specific) ──→ Quality gate
     ↓                              PASS / FIXABLE / BLOCKED
     ↓
[7] SELF-CORRECT (if FIXABLE) ──→ Attempts fixes
     ↓
[8] ORCHESTRATOR ──→ Archives instruction, extracts learnings
```

### What Works (Software Domain)

✅ **Software domain is COMPLETE**:
- Core: trigger, orchestrator, hitl ✓
- Workflow: router, planner, executor, validator, self-correct ✓
- Team: 46 specialized agents (architect, developers, QA, etc.) ✓

**Example flow for "Fix the login bug"**:
1. Trigger detects domain="software"
2. Orchestrator signals software/router
3. Software router assigns tier 2
4. Software planner creates plan with tasks
5. Software executor invokes backend-developer, qa-lead
6. Software validator checks tests pass
7. Complete ✓

### What's BROKEN (Business Domain)

❌ **Business domain is INCOMPLETE**:
- Core: trigger, orchestrator, hitl ✓ (shared)
- Workflow: ❌ NO router, planner, executor, validator, self-correct
- Team: 18 specialized agents (CSO, PM, etc.) ✓

**Example flow for "Create Q4 sales forecast"** (WILL FAIL):
1. Trigger detects domain="business" ✓
2. Orchestrator signals **business/router** ❌ **DOES NOT EXIST**
3. **WORKFLOW FAILS** - Cannot proceed without router
4. User gets error or stuck workflow

---

## Root Cause Analysis

### Why This Happened

During the business domain implementation, we focused on creating **specialized business agents** (CSO, Operations Manager, Project Manager, etc.) but **forgot to create the workflow orchestration layer** that coordinates these agents.

**Analogy**: We built a company with 18 employees (CSO, CFO, managers) but no CEO or management system to coordinate their work.

### What Was Overlooked

The multi-domain architecture requires **TWO types of agents per domain**:

1. **Workflow Orchestration Agents** (5 required):
   - Router: Classifies complexity
   - Planner: Creates execution plan
   - Executor: Coordinates team execution
   - Validator: Quality checks
   - Self-Correct: Fixes issues

2. **Specialized Domain Agents** (domain-specific count):
   - Software: 46 agents (developers, architects, QA, etc.)
   - Business: 18 agents (CSO, PM, Operations Manager, etc.)

**We built #2 but forgot #1 for business domain.**

---

## Impact Assessment

### Severity: 🔴 CRITICAL - Workflow Broken

**What Currently Works**:
- ✅ Software domain requests work end-to-end
- ✅ Core infrastructure (trigger, orchestrator, Agent_Memory) works
- ✅ Business domain agents exist and have good content

**What Is Broken**:
- ❌ Business domain requests FAIL at orchestration handoff
- ❌ No way to route business requests (no router)
- ❌ No way to plan business tasks (no planner)
- ❌ No way to execute business workflows (no executor)
- ❌ No way to validate business outputs (no validator)
- ❌ No way to fix business issues (no self-correct)

**User Impact**:
```
User: "/trigger create Q4 sales forecast"

Expected:
1. Trigger detects domain=business ✓
2. Router classifies tier 2 ✓
3. Planner creates forecast plan ✓
4. Executor invokes Sales Ops Manager ✓
5. Validator checks completeness ✓
6. User gets sales forecast ✓

Actual:
1. Trigger detects domain=business ✓
2. Orchestrator looks for business/router ❌ NOT FOUND
3. ERROR or stuck workflow ❌
4. User gets no output ❌
```

---

## Detailed Gap Analysis

### Missing Agents in Business Domain

#### 1. Business Router ❌
**Purpose**: Classify business request complexity
**Required logic**:
- Tier 0: Simple questions ("What is...")
- Tier 1: Simple reports ("Show me Q4 revenue")
- Tier 2: Standard analysis ("Create forecast", "Analyze metrics")
- Tier 3: Strategic planning ("Design go-to-market strategy")
- Tier 4: Transformation ("Restructure sales organization")

**Unique to business**:
- Understands business terminology (forecast, pipeline, budget, strategy)
- Routes to business team agents (CSO, Sales Ops, etc.)
- Considers business timelines (quarterly, annual)

#### 2. Business Planner ❌
**Purpose**: Break down business requests into tasks
**Required logic**:
- Task decomposition for business workflows
- Assignment to business agents (CSO, Market Analyst, PM, etc.)
- Business-specific acceptance criteria (forecast accuracy, compliance)
- Timeline planning (Q1, Q2, annual cycles)

**Example plan for "Create Q4 forecast"**:
```yaml
tasks:
  - task_001: Gather historical data (Sales Ops Manager)
  - task_002: Analyze pipeline (Market Analyst)
  - task_003: Build forecast model (Data Analyst + Sales Ops)
  - task_004: Review with leadership (CSO)
  - task_005: Document assumptions (Business Analyst)
```

#### 3. Business Executor ❌
**Purpose**: Execute business tasks by invoking business agents
**Required logic**:
- Invoke business team agents (CSO, PM, Operations Manager, etc.)
- Handle business workflows (analysis, planning, reporting)
- Aggregate business outputs (reports, forecasts, strategies)
- Manage business-specific dependencies (Q4 data → forecast → leadership review)

**Difference from software executor**:
- Software executor invokes developers, runs tests, writes code
- Business executor invokes strategists, creates reports, analyzes data

#### 4. Business Validator ❌
**Purpose**: Validate business outputs meet requirements
**Required logic**:
- Business deliverable validation (forecast has all required fields)
- Business quality checks (forecast assumptions documented, data sources cited)
- Business compliance (follows corporate standards, regulatory requirements)
- Business acceptance criteria (stakeholder requirements met)

**Validation criteria examples**:
- Forecast includes revenue, costs, assumptions
- Market analysis cites data sources
- Strategic plan has SWOT, objectives, KPIs
- Budget adheres to company policies

#### 5. Business Self-Correct ❌
**Purpose**: Fix issues in business outputs
**Required logic**:
- Detect fixable business issues (missing sections, incomplete analysis)
- Invoke appropriate business agent to fix (Market Analyst to add missing data)
- Re-validate after fixes
- Learn from common business errors

**Example correction**:
```
Issue: Q4 forecast missing assumptions section
Self-Correct Action:
  1. Invoke Business Analyst
  2. Request assumptions documentation
  3. Append to forecast
  4. Re-validate with Validator
```

---

## Comparison: Software vs. Business Workflow Agents

| Agent | Software Domain | Business Domain | Status |
|-------|----------------|-----------------|--------|
| **Router** | ✅ Classifies code complexity (lines changed, dependencies, risk) | ❌ Should classify business complexity (analysis depth, stakeholder count, strategic impact) | MISSING |
| **Planner** | ✅ Creates tech tasks (implement API, write tests, deploy) | ❌ Should create business tasks (analyze data, create forecast, review with CSO) | MISSING |
| **Executor** | ✅ Invokes developers, runs tests, builds code | ❌ Should invoke business agents (CSO, Sales Ops, Market Analyst) | MISSING |
| **Validator** | ✅ Runs tests, checks code quality, security scans | ❌ Should validate business outputs (completeness, compliance, quality) | MISSING |
| **Self-Correct** | ✅ Fixes failing tests, code issues | ❌ Should fix business issues (missing data, incomplete analysis) | MISSING |

**Key Insight**: Business domain needs **similar workflow structure** as software domain, but with **business-specific logic** for routing, planning, executing, validating.

---

## Additional Orchestration Issues

### Issue 2: Cross-Domain Coordination (Design Question)

**Scenario**: Request spans multiple domains

```
User: "Implement GDPR compliance"
```

**Required agents**:
- Software compliance (technical implementation: data encryption, consent UI)
- Business compliance-manager (policy, audit, training)

**Current orchestration**:
- Trigger detects ONE primary domain
- Orchestrator routes to THAT domain only
- Other domain not engaged

**Question**: How should cross-domain requests work?

**Options**:
1. **Primary domain coordinates** - Software executor invokes business compliance-manager directly
2. **Parallel workflows** - Create 2 instructions (inst_001 for software, inst_002 for business)
3. **Orchestrator coordinates** - Orchestrator manages both domain workflows

**Recommendation**: Option 1 (primary domain coordinates) with cross-domain agent invocation capability.

### Issue 3: Agent Memory Structure (Needs Business Paths)

**Current Agent_Memory structure**:
```
Agent_Memory/
├── _communication/
│   ├── inbox/
│   │   ├── software/    # Software agents can receive messages ✓
│   │   └── core/        # Core agents can receive messages ✓
```

**Missing**:
```
│   │   ├── business/    # Business agents CANNOT receive messages ❌
```

**Impact**: Business agents cannot receive orchestrator signals or inter-agent messages.

**Fix Required**: Create business inbox folders during Agent_Memory initialization.

---

## Recommendations

### 🔴 IMMEDIATE (Critical - Blocks Business Domain)

#### 1. Create Business Workflow Agents (HIGH PRIORITY)

**Create 5 new agents in `/home/PathingIT/cAgents/business/agents/`**:

##### business/agents/router.md
- Copy software router.md structure
- Adapt tier logic for business:
  - Tier 0: Simple questions
  - Tier 1: Simple reports/dashboards
  - Tier 2: Analysis and forecasting
  - Tier 3: Strategic planning
  - Tier 4: Organizational transformation
- Business-specific templates: "sales_forecast", "market_analysis", "strategic_plan", etc.
- Route to business team agents (CSO, Sales Ops, Market Analyst, etc.)

##### business/agents/planner.md
- Copy software planner.md structure
- Adapt task decomposition for business workflows
- Assign tasks to business agents (not developers)
- Business acceptance criteria (forecast accuracy, stakeholder sign-off, compliance)
- Business-specific dependencies (data collection → analysis → review)

##### business/agents/executor.md
- Copy software executor.md structure
- Invoke business agents (CSO, Operations Manager, PM, etc.)
- Handle business outputs (reports, forecasts, strategies)
- Business-specific aggregation (compile multi-section reports)
- Timeline management (quarterly cycles, fiscal years)

##### business/agents/validator.md
- Copy software validator.md structure
- Business validation logic:
  - Completeness checks (all required sections present)
  - Quality checks (data sources cited, assumptions documented)
  - Compliance checks (adheres to corporate policies, regulatory requirements)
  - Stakeholder acceptance (meets requestor requirements)
- PASS/FIXABLE/BLOCKED classification for business outputs

##### business/agents/self-correct.md
- Copy software self-correct.md structure
- Business correction strategies:
  - Missing sections: Invoke appropriate agent (Business Analyst, Market Analyst)
  - Incomplete data: Request data sources
  - Compliance issues: Invoke Compliance Manager
  - Format issues: Invoke Scribe
- Learning from business errors

**Estimated effort**: 6-8 hours (can adapt from software agents)

#### 2. Update business/.claude-plugin/plugin.json

Add workflow agents to agents array:

```json
{
  "agents": [
    "./agents/router.md",
    "./agents/planner.md",
    "./agents/executor.md",
    "./agents/validator.md",
    "./agents/self-correct.md",
    "./agents/cso.md",
    "./agents/business-development-manager.md",
    ...
  ]
}
```

#### 3. Update Root .claude-plugin/plugin.json

Add business workflow agents to root registry:

```json
{
  "agents": [
    ...
    "./business/agents/router.md",
    "./business/agents/planner.md",
    "./business/agents/executor.md",
    "./business/agents/validator.md",
    "./business/agents/self-correct.md",
    ...
  ]
}
```

#### 4. Create Business Inbox in Agent_Memory

Update trigger agent to create:
```
Agent_Memory/_communication/inbox/business/
```

### 🟡 MEDIUM PRIORITY (Enhancements)

#### 5. Add Cross-Domain Invocation Capability

**In software/agents/executor.md** and **business/agents/executor.md**:

Add logic to invoke agents from other domains when needed:

```yaml
cross_domain_invocation:
  enabled: true
  available_domains: ["software", "business", "creative"]

  examples:
    - task: "GDPR compliance technical implementation"
      primary_agent: "software/compliance"
      consult_agent: "business/compliance-manager-business"

    - task: "Sales dashboard implementation"
      primary_agent: "software/data-analyst"
      consult_agent: "business/sales-operations-manager"
```

#### 6. Document Domain Boundaries and Collaboration

Update CLAUDE.md with clear handoff points:
- Software → Business: When technical implementation needs business context
- Business → Software: When business analysis needs technical implementation

### 🟢 LOW PRIORITY (Future)

#### 7. Intelligence Layer for Business

Consider creating business-specific intelligence agents:
- business/pattern-recognition (identify recurring business issues)
- business/predictive-analyst (forecast business risks)
- business/learning-coordinator (learn from business decisions)

Currently, software Intelligence Layer agents could be reused, but business-specific versions might provide better value.

#### 8. QA Layer for Business

Consider business-specific QA agents:
- business/compliance-auditor (different from compliance-manager)
- business/financial-auditor (validate financial outputs)
- business/strategic-reviewer (review strategic plans)

Currently, business/quality-manager-business provides some QA, but specialized QA agents might help.

---

## Testing Plan

### After Creating Business Workflow Agents

**Test 1: Simple Business Request (Tier 1)**
```
User: "/trigger Show Q4 revenue by region"

Expected:
1. Trigger detects domain=business ✓
2. Orchestrator signals business/router ✓
3. Business router assigns tier 1 ✓
4. Business planner creates simple report task ✓
5. Business executor invokes sales-operations-manager ✓
6. Business validator checks completeness ✓
7. User gets revenue report ✓
```

**Test 2: Complex Business Request (Tier 3)**
```
User: "/trigger Design Q1 go-to-market strategy for new product"

Expected:
1. Trigger detects domain=business ✓
2. Business router assigns tier 3 (strategic planning) ✓
3. Business planner breaks down:
   - Market analysis (market-analyst)
   - Competitive positioning (cso)
   - Channel strategy (business-development-manager)
   - Pricing strategy (cfo)
   - Launch plan (project-manager)
4. Business executor coordinates all agents ✓
5. Business validator checks strategy completeness ✓
6. User gets complete go-to-market strategy ✓
```

**Test 3: Cross-Domain Request**
```
User: "/trigger Implement GDPR compliance"

Expected:
1. Trigger detects domain=software (primary) ✓
2. Software workflow executes ✓
3. Software executor recognizes need for business compliance ✓
4. Software executor invokes business/compliance-manager-business ✓
5. Both domains coordinate on deliverables ✓
6. User gets complete GDPR compliance (technical + organizational) ✓
```

---

## Orchestration Flow Verification

### Current State: BROKEN for Business

```
Request: "Create Q4 sales forecast"
     ↓
[CORE] Trigger
  ✅ Parses request
  ✅ Detects domain = "business"
  ✅ Creates Agent_Memory/inst_20260110_003/
  ✅ Writes instruction.yaml with domain: business
     ↓
[CORE] Orchestrator
  ✅ Reads instruction.yaml
  ✅ Sees domain = "business"
  ❌ Looks for business/router → NOT FOUND
  ❌ WORKFLOW FAILS
     ↓
ERROR: Cannot find business domain router agent
User gets: No output or error message
```

### Target State: WORKING for Business (After Fix)

```
Request: "Create Q4 sales forecast"
     ↓
[CORE] Trigger
  ✅ Parses request
  ✅ Detects domain = "business"
  ✅ Creates Agent_Memory/inst_20260110_003/
  ✅ Writes instruction.yaml with domain: business
     ↓
[CORE] Orchestrator
  ✅ Reads instruction.yaml
  ✅ Sees domain = "business"
  ✅ Signals business/router
     ↓
[BUSINESS] Router
  ✅ Classifies as tier 2 (forecast = standard analysis)
  ✅ Writes decisions/router.yaml
     ↓
[CORE] Orchestrator
  ✅ Detects routing complete
  ✅ Signals business/planner
     ↓
[BUSINESS] Planner
  ✅ Reads instruction and tier
  ✅ Creates plan:
      - task_001: Gather historical data (sales-operations-manager)
      - task_002: Analyze pipeline (market-analyst)
      - task_003: Build forecast model (sales-operations-manager)
      - task_004: Review assumptions (business-analyst)
  ✅ Writes workflow/plan.yaml
     ↓
[CORE] Orchestrator
  ✅ Detects planning complete
  ✅ Signals business/executor
     ↓
[BUSINESS] Executor
  ✅ Reads plan
  ✅ Executes task_001: Invokes sales-operations-manager
      → Analyzes historical data, creates data summary
  ✅ Executes task_002: Invokes market-analyst
      → Analyzes market trends, pipeline health
  ✅ Executes task_003: Invokes sales-operations-manager
      → Builds forecast model with assumptions
  ✅ Executes task_004: Invokes business-analyst
      → Documents assumptions and methodology
  ✅ Aggregates all outputs into final forecast report
  ✅ Writes outputs/final/Q4_sales_forecast.md
     ↓
[CORE] Orchestrator
  ✅ Detects execution complete
  ✅ Signals business/validator
     ↓
[BUSINESS] Validator
  ✅ Reads forecast output
  ✅ Checks completeness (revenue, costs, assumptions present)
  ✅ Checks quality (data sources cited, methodology documented)
  ✅ Classifies result: PASS
  ✅ Writes validation report
     ↓
[CORE] Orchestrator
  ✅ Detects validation PASS
  ✅ Archives instruction
  ✅ Extracts learnings
     ↓
User receives: Complete Q4 sales forecast with all sections ✅
```

---

## Conclusion

**Current Status**: 🔴 **BUSINESS DOMAIN IS BROKEN**

The business domain cannot function because it's missing all 5 required workflow orchestration agents. This is a **critical blocker** that prevents any business domain requests from working.

**Required Action**: **IMMEDIATELY create 5 business workflow agents** (router, planner, executor, validator, self-correct) adapted from software domain templates.

**Estimated Effort**: 6-8 hours to create, test, and integrate.

**Priority**: **CRITICAL** - Without these agents, the business domain is non-functional decorative content.

The good news: The business team agents (18 agents) are well-designed and comprehensive. We just need to add the orchestration layer to make them work together.

---

**Next Steps**:
1. Create business/agents/router.md
2. Create business/agents/planner.md
3. Create business/agents/executor.md
4. Create business/agents/validator.md
5. Create business/agents/self-correct.md
6. Update plugin manifests
7. Test with business requests
8. Document cross-domain collaboration patterns
