# Shared Question Patterns

Standard questions used across all controllers in planner_config.yaml files.

## Universal Controller Questions

These 3 questions appear in ALL controller entries across all 5 super-domains:

```yaml
typical_questions:
  - "What is the current implementation of this feature?"
  - "What are the technical constraints we need to consider?"
  - "What are the key risks and dependencies?"
```

**Purpose**: Establish baseline understanding before controller coordination.

**Used by**: 21 controllers in make, 8 in grow, 6 in operate, 4 in people, 5 in serve

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

**Make Domain** (Engineering):
- "What architectural pattern should we use?"
- "What testing strategy is appropriate?"
- "What are the scalability requirements?"

**Grow Domain** (Marketing/Sales):
- "Who is the target audience?"
- "What are the success metrics?"
- "What competitive factors apply?"

**Operate Domain** (Finance/Ops):
- "What is the budget impact?"
- "What compliance requirements apply?"
- "What operational risks exist?"

**People Domain** (HR):
- "What are the role requirements?"
- "What cultural considerations apply?"
- "What change management is needed?"

**Serve Domain** (Support/Legal):
- "What customer impact is expected?"
- "What legal considerations apply?"
- "What escalation paths exist?"

## Configuration Optimization Note

The current planner_config.yaml files contain these 3 questions repeated for every controller entry (63 total occurrences in make/config alone). Future optimization could:

1. Define shared questions once at domain level
2. Use YAML anchors/references
3. Only override when controller-specific questions differ

This would reduce planner_config.yaml files by ~60 lines each.

---

**Part of**: cAgents Controller Coordination Framework
