# Frontend Lead Example Interactions

Detailed examples of frontend-lead coordination patterns.

## Example 1: New Feature Assignment

**Context**: Product requests a new dashboard widget system.

**Controller Questions**:
1. "What widget types are needed and their data requirements?"
2. "Which team members have experience with similar components?"
3. "What's the timeline and priority relative to other work?"

**Delegation**:
```yaml
assignments:
  - agent: frontend-developer
    task: "Implement widget container and lifecycle management"
    skills_matched: [react_hooks, state_management]

  - agent: ui-designer
    task: "Design widget templates and interaction patterns"
    skills_matched: [component_design, figma]

  - agent: frontend-developer-2
    task: "Build individual widget components"
    skills_matched: [react_components, typescript]
```

**Synthesis**: "Dashboard widget system planned as 3-sprint initiative. Sarah leads architecture, Mike handles individual widgets, design review in sprint 1."


## Example 3: Code Review Escalation

**Context**: PR with architectural concerns flagged by reviewer.

**Review Questions**:
1. "Does this pattern align with our component architecture?"
2. "Are there performance implications?"
3. "How does this affect testing strategy?"

**Actions**:
```yaml
review_process:
  1_gather_context:
    - Read PR changes thoroughly
    - Check related components
    - Review test coverage

  2_decision:
    options:
      - approve: "Pattern acceptable with minor changes"
      - request_changes: "Needs refactor to match architecture"
      - escalate: "Architectural decision needed from architect"

  3_feedback:
    - Specific, actionable comments
    - Code examples for suggestions
    - Link to relevant patterns
```

**Outcome**: "Requested changes: extract shared logic to custom hook, add error boundary, improve test coverage from 40% to 80%."


## Example 5: Cross-Team Dependency

**Context**: Frontend needs API changes from backend team.

**Coordination**:
```yaml
dependency_management:
  1_document:
    - Specific API requirements
    - Timeline needs
    - Fallback options

  2_communicate:
    - Direct conversation with backend lead
    - Shared ticket/document
    - Timeline agreement

  3_track:
    - Regular status check
    - Blocker escalation if needed
    - Mock API for parallel work
```

**Actions**:
1. "Created API contract document with backend-lead"
2. "Assigned frontend-developer to build with mock data"
3. "Integration milestone set for sprint mid-point"


## Example 7: Component Library Update

**Context**: Design system update requires component migration.

**Migration Planning**:
```yaml
migration_approach:
  1_audit:
    - List all component usages
    - Identify breaking changes
    - Estimate migration effort

  2_strategy:
    - Gradual migration (recommended)
    - Create compatibility layer if needed
    - Update documentation

  3_execution:
    - Start with leaf components
    - Test each migration thoroughly
    - Monitor for regressions
```

**Communication**: "Design system v3 migration: 47 component instances, 3-sprint rollout, backward compatibility maintained."


## Example 9: New Team Member Onboarding

**Context**: Junior frontend developer joining the team.

**Onboarding Plan**:
```yaml
onboarding_structure:
  week_1:
    - Environment setup
    - Codebase walkthrough
    - Pair programming on small task

  week_2:
    - Independent small task
    - Code review participation
    - Architecture documentation review

  week_3_4:
    - Medium complexity task
    - Full code review cycle
    - Team process participation

  ongoing:
    - Mentor pairing
    - Skill development goals
    - Regular 1:1s
```

**Mentorship Assignment**: "Paired with Sarah (senior) for first month. Starting task: Add unit tests to user profile component."


## Key Patterns

1. **Always assess before assigning** - Understand scope first
2. **Match skills to tasks** - Consider both capability and growth
3. **Communicate proactively** - Keep stakeholders informed
4. **Document decisions** - Create paper trail for future reference
5. **Balance workload** - Avoid overloading individuals
