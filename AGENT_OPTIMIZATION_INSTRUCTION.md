# Agent Optimization Instruction - Phases 2-4

**Trigger with**: `/trigger Execute agent optimization phases 2-4 following AGENT_OPTIMIZATION_INSTRUCTION.md`

This standalone instruction contains all context needed to execute the remaining agent optimization work.

---

## Background

**Completed**: Phase 1 (Documentation optimization)
- CLAUDE.md reduced from 1,733 → 213 lines (87.7% reduction)
- DOCUMENTATION_STANDARDS.md created with optimization principles
- ~10,500 tokens saved

**Remaining**: Phases 2-4 (Agent file optimization)
- 228 agents need optimization following established standards
- Expected ~135,000 total token savings across all phases

---

## Objective

Optimize all 228 agent files to minimize context window usage while maintaining clarity and completeness.

**Standards**: Follow `DOCUMENTATION_STANDARDS.md` principles
**Template**: Use example from `archive/docs/AGENT_OPTIMIZATION_EXAMPLE.md`

---

## Phase 2: Core Agents (9 agents)

**Target**: ~45% avg reduction, ~1,700 lines saved

### Agent List with Targets

| Agent | Location | Current | Target | Priority |
|-------|----------|---------|--------|----------|
| universal-executor-enhanced | core/agents/ | 648 | 300 | High |
| universal-executor | core/agents/ | 647 | 300 | High |
| universal-self-correct | core/agents/ | 613 | 300 | High |
| optimizer | core/agents/ | 485 | 300 | Medium |
| universal-validator | core/agents/ | 460 | 300 | Medium |
| trigger | core/agents/ | 456 | 300 | Medium |
| orchestrator | core/agents/ | 403 | 300 | Low |
| universal-planner | core/agents/ | 367 | 300 | Low |
| universal-router | core/agents/ | 299 | 250 | Low |

### Optimization Approach

For each agent:

1. **Read** current agent file
2. **Analyze** structure and identify verbose sections
3. **Apply** optimization principles:
   - Remove redundant explanations
   - Convert paragraphs → bullets
   - Limit examples to 1-2
   - Use tables for comparisons
   - Move detailed content to archive (if needed)
4. **Rewrite** using optimized template from DOCUMENTATION_STANDARDS.md
5. **Validate** meets target line count
6. **Test** agent still functions (basic check)

### Template Structure (from DOCUMENTATION_STANDARDS.md)

```markdown
---
name: agent-name
description: One-line description. Use when X.
tools: Read, Grep, Glob, Write, Edit, Bash, TodoWrite
model: sonnet
---

# {Agent Name}

**Role**: One sentence describing core responsibility

**Use When**: Bulleted list of 3-5 scenarios

## Responsibilities

- Bullet 1
- Bullet 2
- Bullet 3

## Workflow

1. Step 1
2. Step 2
3. Step 3

## Key Capabilities

- Capability 1: Brief description
- Capability 2: Brief description

## Example

Single concise example (3-5 lines max)

## Collaboration

**Consults**: agent1, agent2
**Delegates to**: agent3, agent4
**Reports to**: agent5

## Output Format

Expected output structure (if applicable)

---

**Lines**: <300 for core agents
```

---

## Phase 3: Software Agents (45 agents)

**Target**: ~50% avg reduction, ~10,000 lines saved

### Top Priority Agents (Largest First)

| Agent | Location | Current | Target | Reduction |
|-------|----------|---------|--------|-----------|
| qa-lead | software/agents/ | 1,544 | 350 | 77% ✓ TEMPLATE |
| backend-developer | software/agents/ | 894 | 400 | 55% |
| security-specialist | software/agents/ | 889 | 400 | 55% |
| architect | software/agents/ | 808 | 400 | 50% |
| tech-lead | software/agents/ | 720 | 400 | 44% |
| reviewer | software/agents/ | 654 | 350 | 46% |
| compliance | software/agents/ | 648 | 350 | 46% |
| frontend-lead | software/agents/ | 601 | 350 | 42% |
| ux-designer | software/agents/ | 589 | 350 | 41% |

**Note**: qa-lead optimization already documented in `archive/docs/AGENT_OPTIMIZATION_EXAMPLE.md` as template.

### Complete Software Agent List

Execute in order of file size (largest first):

```bash
# Get complete list sorted by size
find ./software/agents -name "*.md" -exec wc -l {} + | sort -rn
```

Target line counts:
- **Leadership agents** (ceo, cto, etc.): 300 lines max
- **Lead agents** (frontend-lead, etc.): 350 lines max
- **Developer agents**: 400 lines max
- **Specialist agents**: 350 lines max
- **QA/Intelligence agents**: 300 lines max

---

## Phase 4: Other Domain Agents (165 agents across 10 domains)

**Target**: ~45% avg reduction, ~8,000 lines saved

### Domains to Optimize

1. **Business** (18 agents) - `business/agents/`
2. **Creative** (18 agents) - `creative/agents/`
3. **Planning** (17 agents) - `planning/agents/`
4. **Sales** (18 agents) - `sales/agents/`
5. **Marketing** (22 agents) - `marketing/agents/`
6. **Finance** (17 agents) - `finance/agents/`
7. **Operations** (15 agents) - `operations/agents/`
8. **HR** (19 agents) - `hr/agents/`
9. **Legal** (14 agents) - `legal/agents/`
10. **Support** (18 agents) - `support/agents/`

### Optimization Approach

For each domain:

1. **List agents** in domain folder
2. **Sort by size** (largest first)
3. **Optimize each** following same process as Phase 2
4. **Target lines**:
   - Executive leadership: 300 lines
   - Domain leads: 350 lines
   - Team agents: 300-400 lines depending on complexity

---

## Optimization Principles (from DOCUMENTATION_STANDARDS.md)

### Core Principles

1. **Essential only** - Remove all nice-to-have content
2. **Bullets over paragraphs** - Dense information format
3. **1-2 examples max** - More examples → archive
4. **No redundancy** - Say it once, reference elsewhere
5. **Tables for comparisons** - More efficient than prose

### What to Remove

- Extensive explanations (keep core concepts)
- Multiple examples (keep 1-2 best)
- Redundant sections (duplicate info)
- Long code blocks (>10 lines → archive or shorten)
- Detailed how-tos (core steps only, details → archive)

### What to Keep

- Essential role/responsibilities
- Key capabilities (bulleted)
- Workflow steps (numbered, concise)
- Collaboration patterns
- Output format (if applicable)
- Single example (if helpful)

### Writing Style

❌ **Avoid**:
```markdown
In this comprehensive section, we will explore the various capabilities...
```

✅ **Prefer**:
```markdown
## Capabilities

- Code review: Security, performance, standards
- Auto-fix: Generate fixes with diffs
```

---

## Execution Workflow

### For Each Agent

1. **Read** agent file
2. **Calculate** current line count
3. **Identify** verbose sections
4. **Apply** optimization:
   - Remove redundancy
   - Paragraphs → bullets
   - Examples → 1-2 max
   - Tables for comparisons
   - Detailed content → archive (if needed)
5. **Rewrite** using template
6. **Validate** target line count met
7. **Track** in progress file

### Progress Tracking

Create `OPTIMIZATION_PROGRESS.md` to track:

```markdown
# Optimization Progress

## Phase 2: Core Agents (9 agents)

- [x] universal-executor-enhanced (648 → 300, 54% reduction)
- [x] universal-executor (647 → 300, 54% reduction)
- [ ] universal-self-correct (613 → 300, 51% target)
- [ ] optimizer (485 → 300, 38% target)
...

**Phase 2 Total**: X/9 complete, Y lines saved

## Phase 3: Software Agents (45 agents)

- [x] qa-lead (1,544 → 350, 77% reduction) ✓ TEMPLATE
- [ ] backend-developer (894 → 400, 55% target)
...

**Phase 3 Total**: X/45 complete, Y lines saved

## Phase 4: Other Domains (165 agents)

### Business Domain (18 agents)
...

**Grand Total**: X/228 agents, Y/~21,500 lines saved
```

### Commit Strategy

**After each phase**:
```bash
git add -A
git commit -m "feat: Optimize [Phase X] agents for minimal context (vX.X.X)

Phase X: [Domain] Agents Optimization Complete

Results:
- X agents optimized
- Y% average reduction
- Z lines saved (~W tokens)

Files modified:
  - [list of agent files]

Following DOCUMENTATION_STANDARDS.md principles.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

---

## Expected Results

### Phase 2 (Core Agents)
- 9 agents optimized
- ~45% avg reduction
- ~1,700 lines saved (~11,000 tokens)

### Phase 3 (Software Agents)
- 45 agents optimized
- ~50% avg reduction
- ~10,000 lines saved (~65,000 tokens)

### Phase 4 (Other Domains)
- 165 agents optimized
- ~45% avg reduction
- ~8,000 lines saved (~52,000 tokens)

### Total Impact
- 219 agents optimized (excluding 9 core infrastructure)
- ~49% overall reduction
- ~19,700 lines saved (~128,000 tokens)
- Combined with Phase 1: ~21,500 lines, ~135,000 tokens total

---

## Quality Checklist

Before marking agent as complete:

- [ ] Under target line count?
- [ ] No redundant information?
- [ ] Examples limited to 1-2?
- [ ] Bullets instead of paragraphs?
- [ ] Tables for comparisons?
- [ ] Essential information preserved?
- [ ] Collaboration section present?
- [ ] Follows template structure?
- [ ] Agent description updated (if needed)?

---

## Archive References

**Standards**: `DOCUMENTATION_STANDARDS.md`
**Example**: `archive/docs/AGENT_OPTIMIZATION_EXAMPLE.md` (qa-lead: 1,544 → 350 lines)
**Tracking**: `archive/docs/CONTEXT_OPTIMIZATION_SUMMARY.md`

---

## Success Criteria

**Phase 2**: All 9 core agents under 300 lines (250 for router)
**Phase 3**: All 45 software agents at target (300-400 lines)
**Phase 4**: All 165 other agents at target (300-400 lines)

**Overall**: ~50% reduction in agent context usage, maintaining full functionality

---

## Trigger Command

To execute this instruction:

```bash
/trigger Execute agent optimization phases 2-4 following AGENT_OPTIMIZATION_INSTRUCTION.md
```

This will:
1. Read this instruction file
2. Execute Phase 2 (core agents)
3. Execute Phase 3 (software agents)
4. Execute Phase 4 (other domain agents)
5. Track progress in OPTIMIZATION_PROGRESS.md
6. Commit after each phase
7. Report final results

**Estimated Duration**: 2-3 hours for all phases (can be done in batches)

---

**Version**: 1.0
**Created**: 2026-01-12
**Status**: Ready for execution
