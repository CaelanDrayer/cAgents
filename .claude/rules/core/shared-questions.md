---
paths:
  - "**/config/planner_config.yaml"
  - "**/config/domain_overrides.yaml"
  - "agents/planner/**"
---

# Shared Question Patterns

Standard questions used across all controllers in planner_config.yaml files.

## Universal Controller Questions

These 3 questions appear in ALL controller entries across all 15 domains:

```yaml
typical_questions:
  - "What is the current implementation of this feature?"
  - "What are the technical constraints we need to consider?"
  - "What are the key risks and dependencies?"
```

**Purpose**: Establish baseline understanding before controller coordination.

**Used by**: Controllers in engineering, creative, business, growth, people, service, leadership domains

## Rationale for Standardization

Controllers ask these questions because they need to:

1. **Understand Current State** - "What is the current implementation?"
   - Prevents rework
   - Identifies existing patterns to follow
   - Discovers integration points

2. **Identify Constraints** - "What are the technical constraints?"
   - Reveals limitations early
   - Shapes solution boundaries
   - Prevents invalid approaches

3. **Assess Risks** - "What are the key risks and dependencies?"
   - Identifies blockers before they occur
   - Establishes critical path
   - Enables risk mitigation planning

## Domain-Specific Extensions

While the 3 core questions are universal, each domain adds specialized questions:

**Engineering Domain**:
- "What architectural pattern should we use?"
- "What testing strategy is appropriate?"
- "What are the scalability requirements?"

**Creative Domain**:
- "What is the target audience and tone?"
- "What creative constraints apply?"
- "What existing assets or style guides should we follow?"

**Growth Domain** (Marketing/Sales):
- "Who is the target audience?"
- "What are the success metrics?"
- "What competitive factors apply?"

**Business Domain** (Finance/Ops):
- "What is the budget impact?"
- "What compliance requirements apply?"
- "What operational risks exist?"

**People Domain** (HR):
- "What are the role requirements?"
- "What cultural considerations apply?"
- "What change management is needed?"

**Service Domain** (Support/Legal):
- "What customer impact is expected?"
- "What legal considerations apply?"
- "What escalation paths exist?"

**Leadership Domain** (C-Suite):
- "What is the strategic business impact?"
- "Which domains are affected?"
- "What executive decisions are required?"

## Configuration Optimization Note

The current planner_config.yaml files contain these 3 questions repeated for every controller entry. Future optimization could:

1. Define shared questions once at domain level
2. Use YAML anchors/references
3. Only override when controller-specific questions differ

This would reduce planner_config.yaml files by ~60 lines each.

---

**Part of**: cAgents Controller Coordination Framework
