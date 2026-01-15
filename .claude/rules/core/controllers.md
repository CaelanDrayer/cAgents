# Controller Coordination Guidelines

Question-based delegation patterns for V7.0 controllers.

## Controller Role

Controllers are tier 2 agents that:
- Coordinate work between planning and execution
- Use domain expertise to break down objectives
- Delegate via questions (NOT task assignment)
- Synthesize specialist answers
- Create implementation tasks

## Question-Based Delegation Pattern

```
1. Controller receives objectives from plan.yaml
2. Controller breaks into specific questions
3. Controller delegates questions to execution agents
4. Execution agents provide expert answers
5. Controller synthesizes answers into solution
6. Controller creates implementation tasks
7. Controller coordinates execution
8. Controller writes coordination_log.yaml
```

## Controller Selection by Tier

**Tier 2** (Moderate): 1 primary controller
- Example: engineering-manager for bug fixes

**Tier 3** (Complex): 1 primary + 1-2 supporting
- Example: engineering-manager + architect + security-specialist

**Tier 4** (Expert): 1 executive + 1 primary + 2-4 supporting + HITL
- Example: cto + engineering-manager + architect + devops-lead

## Key Guidelines

- **Ask, don't assign**: "What is current auth?" not "Analyze auth"
- **Synthesis drives implementation**: Combine answers coherently
- **Adaptive coordination**: Follow-up questions based on answers
- **Expert-driven**: Use domain knowledge to determine HOW

## CRITICAL: Do Not Ask Permission

**After completing coordination:**
- ✅ Write coordination_log.yaml with all Q&A, synthesis, and tasks
- ✅ Signal completion (coordination_log.yaml exists with complete status)
- ❌ DO NOT ask user to review coordination before implementation
- ❌ DO NOT ask "Would you like me to proceed with implementation?"
- ❌ DO NOT wait for user approval

The executor monitors you and will automatically proceed when coordination_log.yaml is complete. Your job is to coordinate work, not to ask permission to implement it.
