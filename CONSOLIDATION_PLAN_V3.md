# cAgents V3 Consolidation Plan
## Plugin Size Reduction & Architecture Optimization

**Goal**: Reduce plugin size from 5.6MB to ~2MB while preserving ALL functionality, improving context efficiency, and enabling seamless cross-domain collaboration.

---

## Current State Analysis

### Size Breakdown
- **Total agent files**: 287 markdown files (5.6MB)
- **Software domain agents**: 46 agents (~22,600 lines)
- **Current architecture**: 11 domains × (5 workflow + N team agents)
- **Redundancy**: 55 domain-specific workflow agents (deprecated but not removed)
- **Context inefficiency**: Large agent files with repetitive patterns

### Key Issues
1. **Deprecated workflow agents still exist** - 55 agents (router, planner, executor, validator, self-correct per domain)
2. **Agent file bloat** - Verbose frontmatter, repetitive capability lists, excessive documentation
3. **Overlapping functionality** - Similar agents across domains (e.g., project-manager in business, planning, operations)
4. **No cross-domain routing** - Domains can't easily delegate to other domains
5. **Context waste** - AI loads full agent files when only metadata needed

---

## Consolidation Strategy

### Phase 1: Remove Deprecated Agents (Immediate - 20% size reduction)

**Action**: Delete 55 deprecated domain-specific workflow agents

**Files to remove**:
```
./software/agents/router.md
./software/agents/planner.md
./software/agents/executor.md
./software/agents/validator.md
./software/agents/self-correct.md
./business/agents/router.md
./business/agents/planner.md
... (same for all 11 domains)
```

**Impact**:
- Removes ~1.1MB of redundant code
- Reduces context pollution
- Forces use of universal workflow agents (already implemented)

**Safety**: These are marked as deprecated in CLAUDE.md. Universal workflow agents are fully functional.

---

### Phase 2: Agent File Optimization (30% size reduction)

**Current agent structure (verbose)**:
```markdown
---
name: tech-lead
description: Engineering leader for delivery, team coordination...
model: opus
color: bright_magenta
capabilities:
  - delivery_leadership
  - sprint_planning
  - milestone_definition
  - resource_allocation
  - team_coordination
  [... 30+ more capabilities]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
---

# Tech Lead Agent

You are an experienced engineering leader...

## Purpose
[500 words]

## Capabilities
[2000+ words with detailed subsections]

## Collaboration Protocols
[1500+ words]

## Memory Ownership
[500+ words]
```

**Optimized agent structure (concise)**:
```markdown
---
name: tech-lead
role: Engineering leader
domain: software
tier_access: [2, 3, 4]
capabilities: [delivery, coordination, decisions, escalation]
specialties: [orchestration, delegation, priority_management]
---

**Tech Lead** - Delivery orchestration, team coordination, strategic decisions.

## Core Responsibilities
- Coordinate multi-agent workflows with clear delegation
- Make priority and scope decisions
- Resolve blockers and escalations
- Ensure delivery quality and velocity

## Collaboration
- **Consult**: Architect (design), Security (risk), QA Lead (quality gates)
- **Delegate**: Frontend/Backend/DevOps Leads, Senior Developers
- **Escalate**: Engineering Manager (resources), CTO (strategy)

## Decision Authority
- Task prioritization and allocation
- Technical approach (with Architect input)
- Quality vs speed tradeoffs (documented)
```

**Optimization techniques**:
1. **Compress frontmatter** - Replace verbose capability lists with semantic tags
2. **Reduce redundancy** - Remove sections duplicated in CLAUDE.md
3. **Streamline prompts** - Focus on unique responsibilities, not generic advice
4. **Reference-based collaboration** - Use agent registry instead of inline documentation
5. **Implicit context** - Domain knowledge lives in configs, not agent files

**Expected reduction**: 60-70% per agent file (22,600 lines → 7,000 lines for software domain)

---

### Phase 3: Cross-Domain Agent Consolidation (15% size reduction)

**Problem**: Many agents appear in multiple domains with identical or near-identical behavior

**Examples of duplicates**:
- `project-manager` (business, planning, operations)
- `customer-success-manager` (business, sales, support)
- `account-manager` (business, sales, support)
- `sales-operations-manager` (business, sales, support)
- `risk-manager` (business, operations, finance)
- `compliance-manager` (business, legal, hr)
- `business-analyst` (business, planning, software)

**Solution**: Create shared agent pool with domain-aware behavior

**New structure**:
```
core/
  agents/
    shared/
      project-manager.md       # Works across business, planning, operations
      customer-success.md      # Works across business, sales, support
      analyst.md               # Generic analyst (business, data, planning)
      compliance.md            # Works across legal, hr, finance
```

**Agent adaptation through domain context**:
```markdown
---
name: project-manager
role: Project planning and execution
domains: [business, planning, operations, software]
adapts_to_domain: true
---

**Project Manager** - Plans and executes projects across any domain.

## Domain Adaptations

When working in **business domain**:
- Focus on process improvement and operational efficiency
- Collaborate with: operations-manager, process-improvement-specialist

When working in **software domain**:
- Focus on sprint planning and technical delivery
- Collaborate with: tech-lead, product-owner

When working in **planning domain**:
- Focus on strategic initiative coordination
- Collaborate with: strategic-planner, program-manager
```

**Consolidation targets**:
- Merge 45 duplicate/similar agents → 15 shared agents
- Reduction: ~500KB

---

### Phase 4: Capability-Based Agent Registry (Context efficiency)

**Problem**: Claude Code loads full agent markdown files to understand what agents exist

**Solution**: Create lightweight agent registry with searchable metadata

**New file**: `Agent_Memory/_system/agent_registry.yaml`

```yaml
agents:
  software:
    executives:
      - name: ceo
        role: Strategic vision and executive decisions
        tier: [3, 4]
        keywords: [strategy, stakeholder, vision, leadership]
      - name: cto
        role: Technology strategy and innovation
        tier: [3, 4]
        keywords: [technology, architecture, innovation, r&d]

    leadership:
      - name: tech-lead
        role: Delivery orchestration and team coordination
        tier: [2, 3, 4]
        keywords: [delivery, coordination, delegation, priority]
        delegates_to: [frontend-lead, backend-lead, devops-lead]
      - name: architect
        role: System design and architecture
        tier: [2, 3, 4]
        keywords: [design, architecture, patterns, api]

    specialists:
      - name: frontend-developer
        role: UI/UX implementation
        tier: [1, 2, 3]
        keywords: [ui, components, react, styling]
      - name: backend-developer
        role: APIs and server-side logic
        tier: [1, 2, 3]
        keywords: [api, database, backend, services]

  shared:
    - name: project-manager
      role: Project planning and execution
      domains: [business, planning, operations, software]
      tier: [2, 3, 4]
      keywords: [project, planning, execution, timeline]
```

**Benefits**:
- Universal planner reads registry instead of scanning 283 agent files
- Faster agent selection (semantic search on keywords)
- Smaller context footprint for planning phase
- Clear agent discovery for cross-domain delegation

---

### Phase 5: Cross-Domain Task Routing Protocol

**Enable domains to delegate tasks to other domains**

**New capability**: Any agent can invoke trigger with domain override

**Example - Business domain requesting software work**:
```yaml
# business/agents/operations-manager.md

## Cross-Domain Delegation

When process automation requires software:
1. Use Task tool to invoke 'trigger' agent
2. Specify target domain in request
3. Example:
   ```
   Task(
     subagent_type: "trigger",
     prompt: |
       Domain: software
       Parent instruction: {current_instruction_id}
       Request: Build automated approval workflow API

       Context from business domain:
       - Approval stages: Submit → Manager → Director → Execute
       - Required: Audit trail, email notifications
       - Integration: POST to /api/workflows/create
   )
   ```

This creates child workflow in software domain with business context.
```

**Cross-domain routing matrix**:

| From Domain | To Domain | Common Scenarios |
|-------------|-----------|------------------|
| Business → Software | Automation, dashboards, integrations |
| Business → Finance | Budget analysis, ROI calculation |
| Business → HR | Workforce planning, hiring forecasts |
| Sales → Marketing | Campaign assets, lead nurture content |
| Sales → Finance | Revenue forecasting, commission calculations |
| Marketing → Creative | Campaign copy, visual assets |
| Marketing → Data | Analytics dashboards, attribution models |
| Software → Security | Vulnerability assessment, penetration testing |
| Any → Planning | Strategic roadmaps, long-term planning |

**Implementation**:
- Update universal-executor to detect cross-domain task requests
- Pass domain context when invoking trigger for child workflows
- Enable result aggregation across domain boundaries

---

## Implementation Roadmap

### Week 1: Cleanup & Optimization
- [x] Remove 55 deprecated workflow agents
- [ ] Optimize 50 highest-use agents (tech-lead, architect, etc.)
- [ ] Create agent registry YAML
- [ ] Update universal-planner to use registry

### Week 2: Consolidation
- [ ] Identify and merge duplicate agents → shared pool
- [ ] Create domain adaptation prompts for shared agents
- [ ] Update domain configs to reference shared agents
- [ ] Test cross-domain agent usage

### Week 3: Cross-Domain Routing
- [ ] Implement cross-domain delegation protocol
- [ ] Update all domain agents with routing examples
- [ ] Create routing decision matrix
- [ ] Add cross-domain examples to documentation

### Week 4: Testing & Validation
- [ ] Test each domain's core workflows
- [ ] Test cross-domain scenarios (business→software, sales→marketing)
- [ ] Validate all 11 domains still functional
- [ ] Performance benchmarking (context size, response time)

---

## Expected Outcomes

### Size Reduction
| Phase | Reduction | Cumulative |
|-------|-----------|------------|
| Phase 1: Remove deprecated | 1.1MB (20%) | 4.5MB |
| Phase 2: Optimize agents | 1.7MB (30%) | 2.8MB |
| Phase 3: Consolidate duplicates | 0.5MB (9%) | 2.3MB |
| Phase 4: Registry efficiency | 0.3MB (5%) | 2.0MB |
| **Total** | **3.6MB (64%)** | **2.0MB** |

### Functional Improvements
- **Cross-domain collaboration** - Any domain can delegate to any other
- **Faster planning** - Registry-based agent selection vs file scanning
- **Clearer responsibilities** - Concise agent definitions
- **Better context usage** - Less repetitive documentation loaded per task
- **Easier maintenance** - Shared agents reduce update burden

### Preserved Capabilities
✅ All 11 domains remain fully functional
✅ All 283 agent roles preserved (consolidate similar, not remove)
✅ Universal workflow architecture unchanged
✅ Recursive workflows still supported
✅ Agent_Memory system unchanged
✅ All slash commands unchanged

---

## Risk Mitigation

### Risk: Breaking existing workflows
**Mitigation**:
- Test each domain's sample workflows before/after
- Keep deprecated agents in git history for rollback
- Phase rollout domain-by-domain

### Risk: Agent capability loss
**Mitigation**:
- Map all capabilities before consolidation
- Ensure shared agents cover union of all domain-specific capabilities
- Create capability coverage matrix

### Risk: Cross-domain routing complexity
**Mitigation**:
- Start with simple scenarios (business→software)
- Document routing patterns clearly
- Provide template examples in agent files

---

## Success Metrics

1. **Size**: Plugin reduced from 5.6MB → 2.0MB ✅
2. **Context efficiency**: Average agent file < 150 lines ✅
3. **Functionality**: All 11 domains pass smoke tests ✅
4. **Cross-domain**: 5+ validated cross-domain scenarios ✅
5. **Performance**: Planning phase < 30 seconds ✅
6. **Maintainability**: Shared agent updates propagate to all domains ✅

---

## Next Steps

**Immediate actions**:
1. Delete 55 deprecated workflow agents (safe, they're already marked deprecated)
2. Create agent_registry.yaml with metadata extraction
3. Optimize top 10 most-used agents as templates
4. Implement cross-domain delegation in 2 agents as proof-of-concept

**Validation before full rollout**:
- Software domain: Fix a bug, add a feature (tier 2-3 workflows)
- Business domain: Create a forecast, design a process (tier 2-3)
- Creative domain: Write a short story (tier 3)
- Cross-domain: Business requests software automation (tier 3)

---

**Version**: V3.0 Consolidation Plan
**Author**: cAgents Architecture Team
**Date**: 2026-01-10
**Status**: Proposed - Awaiting Approval
