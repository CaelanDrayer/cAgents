# Frontend Team Assignment Algorithm

Systematic approach to task assignment based on skills, availability, and growth.

## Skill Matrix

Track team capabilities across key frontend areas:

```yaml
skill_categories:
  core_frontend:
    - react_fundamentals
    - typescript
    - css_styling
    - responsive_design
    - browser_apis

  advanced_patterns:
    - state_management
    - performance_optimization
    - testing_strategies
    - accessibility
    - security

  specialized:
    - animation_motion
    - data_visualization
    - real_time_features
    - mobile_responsive
    - seo_optimization

  tooling:
    - build_systems
    - ci_cd
    - monitoring
    - debugging
```

## Skill Level Definitions

```yaml
skill_levels:
  1_learning:
    description: "Currently learning, needs guidance"
    assignment: "Pair with expert, simple tasks only"

  2_developing:
    description: "Can complete with some support"
    assignment: "Moderate tasks, code review focus"

  3_proficient:
    description: "Independently effective"
    assignment: "Standard tasks, can mentor level 1-2"

  4_expert:
    description: "Deep expertise, can architect"
    assignment: "Complex tasks, architectural decisions"

  5_master:
    description: "Industry-recognized expertise"
    assignment: "Innovation, training, strategy"
```

## Assignment Algorithm

```yaml
assignment_process:
  step_1_task_analysis:
    inputs:
      - task_description
      - complexity_estimate
      - deadline
      - dependencies
    outputs:
      - required_skills: [skill_1, skill_2]
      - minimum_level: 3
      - ideal_level: 4

  step_2_candidate_scoring:
    for_each_team_member:
      skill_score:
        formula: "avg(member_skill_levels for required_skills)"
        weight: 0.4

      availability_score:
        formula: "1 - (current_workload / max_capacity)"
        weight: 0.3

      growth_score:
        formula: "if task_stretches_skills then 0.8 else 0.5"
        weight: 0.2

      context_score:
        formula: "familiarity_with_codebase_area / 5"
        weight: 0.1

      total: "sum(score * weight)"

  step_3_selection:
    rules:
      - "Select highest total score"
      - "Minimum skill threshold must be met"
      - "Availability must be > 0.2"
      - "Consider deadline urgency"

  step_4_adjustment:
    manual_overrides:
      - "Team member explicitly requested"
      - "Strategic skill development"
      - "Load balancing across sprint"
```

## Example Scoring

**Task**: Implement complex data table with virtualization

```yaml
task_requirements:
  skills_needed:
    - react_fundamentals: 4
    - performance_optimization: 4
    - typescript: 3
  deadline: "5 days"
  complexity: "high"

candidates:
  alice:
    skills: {react: 5, perf: 4, ts: 4}
    workload: 60%
    context: "Worked on tables before"
    scores:
      skill: 0.4 * 4.3 = 1.72
      availability: 0.3 * 0.4 = 0.12
      growth: 0.2 * 0.5 = 0.10
      context: 0.1 * 0.8 = 0.08
      total: 2.02

  bob:
    skills: {react: 4, perf: 3, ts: 5}
    workload: 30%
    context: "New to this area"
    scores:
      skill: 0.4 * 4.0 = 1.60
      availability: 0.3 * 0.7 = 0.21
      growth: 0.2 * 0.8 = 0.16
      context: 0.1 * 0.2 = 0.02
      total: 1.99

selection: "Alice (2.02 > 1.99), but consider Bob for growth"
```

## Capacity Management

```yaml
capacity_tracking:
  per_developer:
    max_story_points: 13  # Per sprint
    current_committed: 8
    available: 5

  team_totals:
    total_capacity: 52
    committed: 45
    buffer: 7  # For bugs and interrupts

  alerts:
    overloaded: "Individual > 100% capacity"
    underutilized: "Individual < 50% capacity"
    team_risk: "Team > 90% committed"
```

## Workload Balancing

```yaml
balance_rules:
  max_concurrent_tasks: 3
  max_complexity_per_person: 2  # High complexity tasks

  distribution_goals:
    - "No single point of failure"
    - "Knowledge sharing across areas"
    - "Growth opportunities distributed"

  rebalance_triggers:
    - "New urgent work arrives"
    - "Task takes longer than estimated"
    - "Team member unavailable"
    - "Dependencies delayed"
```

## Assignment Anti-Patterns

```yaml
anti_patterns:
  hero_syndrome:
    symptom: "Same person always gets critical tasks"
    risk: "Bus factor, burnout"
    fix: "Intentional knowledge sharing"

  comfort_zone:
    symptom: "People only work in familiar areas"
    risk: "Stagnation, narrow expertise"
    fix: "Stretch assignments with support"

  deadline_panic:
    symptom: "Rush assignments without proper matching"
    risk: "Quality issues, rework"
    fix: "Maintain assignment discipline"

  unbalanced_load:
    symptom: "Some overloaded, others idle"
    risk: "Burnout, inefficiency"
    fix: "Weekly capacity reviews"
```

## Growth-Oriented Assignment

```yaml
growth_framework:
  skill_gap_identification:
    - "Compare current skills to team needs"
    - "Identify individual growth goals"
    - "Find stretch opportunities"

  stretch_assignment_rules:
    - "One level above current skill"
    - "Pair with expert mentor"
    - "Allow extra time (1.5x estimate)"
    - "Provide explicit success criteria"

  tracking:
    - "Document skill progression"
    - "Celebrate growth milestones"
    - "Adjust future assignments"
```

## Assignment Communication

When making assignments, communicate:

```yaml
assignment_announcement:
  to_assignee:
    - "Why you were selected"
    - "Expected outcome and timeline"
    - "Resources and support available"
    - "How to escalate blockers"

  to_team:
    - "Task ownership clarity"
    - "Dependencies and touchpoints"
    - "Timeline and milestones"

  documentation:
    - "Update task management system"
    - "Record assignment rationale"
    - "Set up progress tracking"
```
