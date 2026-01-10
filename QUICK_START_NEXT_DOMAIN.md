# Quick Start: Implement Next Domain

**Current State**: Planning domain COMPLETE ✅ (94 agents total)
**Next Domain**: Sales (23 agents)
**After Sales**: Marketing, Finance, Operations, HR, Legal, Support

---

## One-Command Autonomous Execution

```bash
# Autonomously implement the next domain (Sales)
/trigger autonomously create the sales domain following the remaining domains implementation plan

# Or specify a domain
/trigger autonomously create the [finance/marketing/operations/hr/legal/support] domain
```

The system will:
1. Read the implementation plan
2. Create all agents for the domain
3. Set up integration (plugin manifest, trigger update, root configs)
4. Validate quality gates
5. Report completion

---

## Manual Step-by-Step (If Preferred)

### For Sales Domain (Next)

**1. Create folder structure** (1 min)
```bash
cd /home/PathingIT/cAgents
mkdir -p sales/{.claude-plugin,agents,commands,skills}
```

**2. Create package.json** (1 min)
```bash
cat > sales/package.json << 'EOF'
{
  "name": "@cagents/sales",
  "version": "1.0.0",
  "description": "Sales domain for revenue generation and pipeline management",
  "keywords": ["sales", "revenue", "pipeline", "forecasting", "CRM"],
  "author": "CaelanDrayer",
  "license": "MIT"
}
EOF
```

**3. Create agents** (6-8 hours)

Follow the pattern from Planning domain:
- Workflow agents (5): router, planner, executor, validator, self-correct
- Executive (1): CRO (Chief Revenue Officer)
- Team agents (17): See `docs/REMAINING_DOMAINS_IMPLEMENTATION_PLAN.md`

Use templates:
- Router: `planning/agents/router.md` as base
- Planner: `planning/agents/planner.md` as base
- Executive: `planning/agents/cpo.md` as base (adapt for CRO)
- Team agents: Follow planning team agent patterns

**Key Agent Structure**:
```yaml
---
name: agent-name
description: Brief description. Use PROACTIVELY when...
tools: Read, Grep, Glob, Bash, Edit, Write, TodoWrite
model: sonnet | opus | haiku
color: cyan
capabilities: ["capability1", "capability2", "capability3"]
---

Agent's system prompt and instructions here...
```

**Critical Elements**:
- Description must include "Use PROACTIVELY when..."
- Tools must include TodoWrite for progress tracking
- Capabilities array defines scope
- Memory ownership clearly defined
- Collaboration protocols documented

**4. Create plugin manifest** (5 min)

Create `sales/.claude-plugin/plugin.json`:
```json
{
  "name": "@cagents/sales",
  "version": "1.0.0",
  "description": "Sales domain - Revenue generation, pipeline management, and forecasting",
  "agents": [
    "./agents/router.md",
    "./agents/planner.md",
    "./agents/executor.md",
    "./agents/validator.md",
    "./agents/self-correct.md",
    "./agents/cro.md",
    "./agents/sales-engineer.md",
    "./agents/account-executive.md",
    "./agents/sales-development-rep.md",
    "./agents/customer-success-manager.md",
    "./agents/sales-operations-manager.md",
    "./agents/revenue-operations-analyst.md",
    "./agents/sales-enablement-specialist.md",
    "./agents/channel-partner-manager.md",
    "./agents/territory-manager.md",
    "./agents/sales-forecasting-analyst.md",
    "./agents/proposal-specialist.md",
    "./agents/pricing-analyst.md",
    "./agents/contract-negotiator.md",
    "./agents/crm-administrator.md",
    "./agents/sales-trainer.md",
    "./agents/competitive-intelligence-analyst.md",
    "./agents/sales-compensation-analyst.md"
  ]
}
```

Template: `planning/.claude-plugin/plugin.json`

**5. Update core integration** (10 min)

**a) Update core/agents/trigger.md** - Add to domain detection table:
```markdown
| `sales` | sales, forecast, pipeline, revenue, deal, prospect, quota, territory, CRM, win rate, conversion, funnel, lead, opportunity | "Create Q4 sales forecast", "Analyze pipeline health", "Optimize territory planning" |
```

**b) Update root package.json** - Add to workspaces array:
```json
{
  "workspaces": [
    "core",
    "software",
    "business",
    "planning",
    "sales"
  ]
}
```

**c) Update root .claude-plugin/plugin.json** - Add all 23 sales agent paths:
```json
{
  "agents": [
    "./core/agents/trigger.md",
    "./core/agents/orchestrator.md",
    "./core/agents/hitl.md",
    "./software/agents/router.md",
    ...
    "./sales/agents/router.md",
    "./sales/agents/planner.md",
    ...
    "./sales/agents/sales-compensation-analyst.md"
  ]
}
```

**6. Test** (30 min)

Run tier tests to verify domain functionality:

```bash
# Test Tier 1 (Simple - Analysis)
/trigger Analyze current sales pipeline

# Test Tier 2 (Moderate - Planning)
/trigger Create quarterly sales forecast

# Test Tier 3 (Complex - Strategy Design)
/trigger Design territory planning strategy for new market expansion

# Test Tier 4 (Expert - Full Orchestration)
/trigger Develop comprehensive annual sales strategy with multi-region expansion and RevOps transformation
```

**Expected Results**:
- Trigger detects `sales` domain correctly
- Router classifies tier accurately
- Planner creates domain-appropriate task breakdown
- Executor invokes correct sales team agents
- Validator checks sales-specific criteria
- Outputs saved to Agent_Memory folder

---

## Domain Implementation Order

Follow this order for optimal dependencies:

1. ✅ Planning (COMPLETE)
2. **Sales** ← YOU ARE HERE
3. Marketing (leverages Sales for lead handoff)
4. Finance (provides budget data for all domains)
5. Operations (provides process frameworks)
6. HR (provides workforce planning)
7. Legal (provides compliance framework)
8. Support (integrates with all customer-facing domains)

---

## Quality Checklist Per Domain

Before moving to next domain, verify:

**Agent Creation**:
- [ ] All agents created (5 workflow + 1 exec + N team)
- [ ] All agents have valid YAML frontmatter
- [ ] All agents follow domain pattern

**Integration**:
- [ ] Plugin manifest created with all agents
- [ ] Core trigger updated with domain row
- [ ] Root package.json includes workspace
- [ ] Root plugin includes all agents

**Testing**:
- [ ] Tier 1 test passes
- [ ] Tier 2 test passes
- [ ] Tier 3 test passes
- [ ] Router classification accurate

---

## Progress Tracking

**Completed**: 4/11 domains (36%)
- ✅ Core (3 agents)
- ✅ Software (46 agents)
- ✅ Business (23 agents)
- ✅ Planning (22 agents)

**Remaining**: 7/11 domains (64%)
- ⏳ Sales (23 agents) ← NEXT
- ⏳ Marketing (25 agents)
- ⏳ Finance (22 agents)
- ⏳ Operations (20 agents)
- ⏳ HR (24 agents)
- ⏳ Legal (19 agents)
- ⏳ Support (21 agents)

**Agent Progress**: 94/248 (38% complete, 154 remaining)

---

## Estimated Time to Complete

**Per Domain**: 8-12 hours (with autonomous execution)
**7 Remaining Domains**: 56-84 hours total work
**With Staggered Approach**: 14-16 weeks calendar time
**With Focused Execution**: 2-3 weeks if continuous

---

## Key Reference Documents

1. `docs/REMAINING_DOMAINS_IMPLEMENTATION_PLAN.md` - Complete implementation plan for all remaining domains
2. `docs/new-domains-plan.md` - Detailed agent specifications for each domain
3. `docs/MASTER_IMPLEMENTATION_PLAN.md` - Full project timeline and milestones
4. `planning/agents/*.md` - Planning domain agents as templates
5. `planning/.claude-plugin/plugin.json` - Plugin manifest template
6. `CLAUDE.md` - Project overview and architecture guide
7. `README.md` - User-facing documentation

---

## Troubleshooting Common Issues

### Agent Not Recognized
**Symptom**: "Agent X not found" error
**Fix**:
1. Verify agent path in `.claude-plugin/plugin.json`
2. Check YAML frontmatter is valid
3. Ensure file ends with `.md`
4. Restart Claude Code: `claude --plugin-dir .`

### Domain Not Detected
**Symptom**: Trigger routes to wrong domain
**Fix**:
1. Check `core/agents/trigger.md` domain table has your keywords
2. Verify keywords are unique to your domain
3. Test with explicit domain-specific terms

### Router Classification Wrong
**Symptom**: Tasks assigned to wrong tier
**Fix**:
1. Review router complexity criteria in `{domain}/agents/router.md`
2. Check if task matches template patterns
3. Adjust router decision logic if needed

### Memory Folder Not Created
**Symptom**: Agent_Memory folder missing
**Fix**:
1. Trigger should auto-create on first use
2. Manually create: `mkdir -p Agent_Memory/_system`
3. Check write permissions on project directory

### Validation Fails Repeatedly
**Symptom**: Validator keeps returning FIXABLE
**Fix**:
1. Check acceptance criteria in plan
2. Review validator's quality checks
3. Verify self-correct has appropriate strategies
4. Consider HITL escalation if truly blocked

---

## Pro Tips

**Speed Up Development**:
- Copy and adapt existing domain rather than starting from scratch
- Use Planning domain as best reference (most recent, most polished)
- Batch-create similar agents (e.g., all team agents in one session)

**Quality Assurance**:
- Test each tier before moving to implementation
- Verify TodoWrite updates appear during execution
- Check Agent_Memory files are created correctly
- Run /reviewer on completed agents

**Agent Design**:
- Keep prompts focused and specific
- Define clear capabilities boundaries
- Include collaboration protocols (when to consult, review, delegate)
- Add memory ownership sections (which folders/files agent manages)

**Integration Testing**:
- Test cross-domain workflows (e.g., Sales → Finance handoff)
- Verify HITL escalation works for complex decisions
- Check that domain-specific outputs match expected formats

---

**Next Command**:
```bash
/trigger autonomously create the sales domain
```

Let the system handle it end-to-end! 🚀
