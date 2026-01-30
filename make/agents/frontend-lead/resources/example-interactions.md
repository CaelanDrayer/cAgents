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

---

## Example 2: Performance Crisis

**Context**: Page load times increased 3x after recent deployment.

**Immediate Actions**:
1. Roll back if critical path affected
2. Identify regression source
3. Assign investigation

**Questions**:
1. "What changed in the last deployment?"
2. "Which components are rendering slowly?"
3. "Are there new network requests or large bundles?"

**Delegation**:
```yaml
investigation:
  - agent: frontend-developer
    task: "Profile React renders and identify heavy components"

  - agent: performance-engineer
    task: "Analyze bundle size changes and network waterfall"
```

**Resolution**: "Found 2MB unoptimized image and missing React.memo on list items. Hotfix deployed, load time back to baseline."

---

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

---

## Example 4: Sprint Planning

**Context**: Planning frontend work for upcoming sprint.

**Planning Process**:
```yaml
sprint_planning:
  1_review_backlog:
    - Prioritize by product value
    - Estimate complexity
    - Identify dependencies

  2_capacity_check:
    - Team availability (PTO, meetings)
    - Skill requirements per task
    - Carryover from previous sprint

  3_assignment:
    - Match skills to tasks
    - Balance workload
    - Consider growth opportunities

  4_commitments:
    - Sprint goal alignment
    - Risk identification
    - Communication plan
```

**Output**: "Sprint 23 committed: 3 features, 2 bug fixes, 1 tech debt item. 85% capacity utilized, Alex primary on auth feature."

---

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

---

## Example 6: Accessibility Audit Response

**Context**: Accessibility audit found 15 WCAG violations.

**Triage**:
```yaml
accessibility_triage:
  critical:  # Fix immediately
    - Missing alt text on functional images
    - Keyboard traps
    - Missing form labels

  high:  # Fix this sprint
    - Color contrast issues
    - Missing focus indicators
    - Screen reader announcements

  medium:  # Plan for next sprint
    - ARIA improvements
    - Skip navigation links
    - Heading hierarchy
```

**Delegation**:
- "accessibility-specialist: Review fixes for correctness"
- "frontend-developer-1: Fix critical issues"
- "frontend-developer-2: Address high priority items"

---

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

---

## Example 8: Technical Debt Prioritization

**Context**: Quarterly tech debt review session.

**Evaluation Framework**:
```yaml
tech_debt_scoring:
  impact:
    developer_velocity: 0.4
    bug_frequency: 0.3
    performance: 0.2
    security: 0.1

  effort:
    small: "< 2 days"
    medium: "2-5 days"
    large: "> 5 days"

  priority:
    formula: "impact_score / effort_days"
    threshold: 0.5  # Minimum for inclusion
```

**Decision**: "Prioritized: 1) Replace legacy state management (high impact, medium effort), 2) Consolidate API clients (medium impact, small effort)."

---

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

---

## Example 10: Production Incident Response

**Context**: Users reporting blank screen on checkout page.

**Response Protocol**:
```yaml
incident_response:
  1_assess:  # First 5 minutes
    - Check error monitoring
    - Verify reproduction
    - Determine scope

  2_contain:  # Next 10 minutes
    - Roll back if clear culprit
    - Feature flag if available
    - Communicate status

  3_resolve:  # Until fixed
    - Root cause investigation
    - Fix implementation
    - Thorough testing

  4_postmortem:  # After resolution
    - Timeline documentation
    - Root cause analysis
    - Prevention measures
```

**Actions Taken**:
1. "Identified: Third-party script blocking render"
2. "Hotfix: Made script loading async"
3. "Postmortem scheduled for Friday"

---

## Key Patterns

1. **Always assess before assigning** - Understand scope first
2. **Match skills to tasks** - Consider both capability and growth
3. **Communicate proactively** - Keep stakeholders informed
4. **Document decisions** - Create paper trail for future reference
5. **Balance workload** - Avoid overloading individuals
