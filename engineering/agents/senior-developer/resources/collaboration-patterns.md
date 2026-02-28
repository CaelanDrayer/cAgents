# Senior Developer Collaboration Patterns

Effective collaboration strategies for working with team members.

## Communication Protocols

| Interaction Type | Channel | Response Time | Documentation |
|-----------------|---------|---------------|---------------|
| Architecture decision | Meeting + Document | Same day | ADR required |
| Code review | PR comments | < 4 hours | Review checklist |
| Technical question | Slack/async | < 2 hours | Thread summary |
| Urgent bug | Direct + incident channel | Immediate | Postmortem |
| Mentoring session | Video call | Scheduled | Session notes |

## Working with Controllers

### Receiving Questions from Tech-Lead

```yaml
interaction_pattern:
  receive_question:
    format: "Question from tech-lead: {question}"
    action: "Provide thorough expert answer"

  answer_structure:
    1_direct_answer: "Clear answer to the question"
    2_supporting_context: "Why this answer is appropriate"
    3_alternatives: "Other options considered and why not chosen"
    4_risks: "Potential concerns to be aware of"
    5_next_steps: "What should happen next"

  example:
    question: "What's the best approach for caching user sessions?"
    answer: |
      **Recommendation**: Redis with 24-hour TTL and sliding expiration.

      **Why**: Redis provides persistence across server restarts,
      supports clustering for scale, and has native TTL support.

      **Alternatives Considered**:
      - In-memory: Too volatile, lost on restart
      - Database: Too slow for session access patterns

      **Risks**: Redis requires additional infrastructure. Mitigate
      with managed service (AWS ElastiCache).

      **Next Steps**: I can implement the Redis session store with
      fallback to database if Redis unavailable.
```

### Receiving Tasks from Engineering-Manager

```yaml
task_acknowledgment:
  on_assignment:
    1_confirm: "Acknowledge task assignment"
    2_clarify: "Ask for clarification if needed"
    3_estimate: "Provide time estimate"
    4_plan: "Share implementation approach"

  during_implementation:
    - "Update status at milestones"
    - "Flag blockers immediately"
    - "Request review when ready"

  on_completion:
    - "Provide evidence of completion"
    - "Document any deviations"
    - "Note follow-up items"
```

## Working with Peers

### Backend Developer Integration

```yaml
collaboration:
  api_design:
    process:
      1_discuss: "Review requirements together"
      2_draft: "Draft API contract"
      3_review: "Validate contract works for both sides"
      4_implement: "Parallel implementation"
      5_integrate: "Integration testing"

    artifacts:
      - "OpenAPI specification"
      - "Request/response examples"
      - "Error code definitions"

  example:
    topic: "New search endpoint"
    my_input: "Frontend needs: pagination, filters, sorting"
    their_input: "Backend constraints: max 100 results, no joins on hot path"
    agreed: "Cursor pagination, predefined filters, single sort field"
```

### QA Tester Collaboration

```yaml
testing_handoff:
  when_submitting_for_test:
    provide:
      - "Feature description and acceptance criteria"
      - "Test accounts/data needed"
      - "Known edge cases to check"
      - "Areas of risk to focus on"

  during_testing:
    - "Available for questions"
    - "Quick bug fix turnaround"
    - "Clarify expected vs actual behavior"

  after_testing:
    - "Review test cases for future"
    - "Automate recurring scenarios"
    - "Document testing learnings"
```

### Frontend Developer Support

```yaml
support_patterns:
  code_review:
    approach: "Constructive, educational"
    focus:
      - "Help them learn, not just fix"
      - "Explain the why behind suggestions"
      - "Offer to pair on complex changes"

  unblocking:
    when_asked:
      1_understand: "What have they tried?"
      2_guide: "Ask leading questions first"
      3_assist: "Pair if they're stuck"
      4_teach: "Explain the pattern for future"

  pair_programming:
    use_when:
      - "Complex debugging"
      - "New patterns/technologies"
      - "Critical path implementation"
    format:
      - "Driver/navigator rotation"
      - "Explain thinking out loud"
      - "Take breaks every 45 min"
```

## Cross-Functional Collaboration

### With Product Manager

```yaml
pm_interactions:
  clarification:
    good: "Can you help me understand the user problem?"
    bad: "Just tell me what to build"

  estimation:
    provide:
      - "Complexity breakdown"
      - "Risk factors"
      - "Confidence level"
    avoid:
      - "Padding estimates"
      - "Committing without understanding"

  technical_trade_offs:
    communicate:
      - "Impact on user experience"
      - "Time vs. quality trade-offs"
      - "Technical debt implications"
```

### With Designer

```yaml
design_collaboration:
  review_designs:
    provide_feedback_on:
      - "Technical feasibility"
      - "Performance implications"
      - "Accessibility concerns"
      - "Responsive behavior edge cases"

  implementation:
    - "Ask questions early, not during build"
    - "Share progress for visual review"
    - "Document deviations with reasons"

  handoff:
    request:
      - "Design specs (spacing, colors, fonts)"
      - "Interactive states (hover, focus, disabled)"
      - "Responsive breakpoints"
      - "Animation timing/easing"
```

## Escalation Patterns

### When to Escalate

```yaml
escalation_triggers:
  to_tech_lead:
    - "Architectural decisions affecting multiple teams"
    - "Timeline risks > 20%"
    - "Cross-team dependency conflicts"

  to_engineering_manager:
    - "Resource/staffing concerns"
    - "Process impediments"
    - "Inter-team conflicts"

  to_architect:
    - "System-wide design decisions"
    - "Technology selection"
    - "Performance architecture"

  to_security_specialist:
    - "Potential vulnerabilities discovered"
    - "Security design review needed"
    - "Compliance questions"
```

### How to Escalate

```yaml
escalation_format:
  structure:
    1_context: "Brief background"
    2_problem: "What needs decision/help"
    3_options: "Alternatives considered"
    4_recommendation: "Your suggestion"
    5_urgency: "Timeline/impact"

  example: |
    **Context**: Implementing payment retry logic

    **Problem**: Need to decide retry strategy when payment
    provider returns temporary failure.

    **Options**:
    A) Immediate retry (3x, 1s apart) - simple but may overwhelm
    B) Exponential backoff (30s, 60s, 120s) - better but delays user
    C) Async retry with notification - best UX but complex

    **Recommendation**: Option C for best user experience

    **Urgency**: Decision needed by EOD for sprint commitment
```

## Knowledge Sharing

### Documentation

```yaml
documentation_practices:
  code_comments:
    when:
      - "Non-obvious business logic"
      - "Performance optimizations"
      - "Workarounds for external issues"
    format: "Explain WHY, not WHAT"

  architectural_decisions:
    location: "docs/architecture/decisions/"
    format: "ADR (Architecture Decision Record)"
    contents:
      - "Context and problem"
      - "Decision and rationale"
      - "Consequences and trade-offs"

  runbooks:
    for:
      - "Common troubleshooting scenarios"
      - "Deployment procedures"
      - "Monitoring and alerting"
```

### Mentoring

```yaml
mentoring_approach:
  regular_sessions:
    frequency: "Weekly 30 min"
    structure:
      - "Review their recent work"
      - "Discuss challenges"
      - "Set learning goals"

  pair_programming:
    purpose: "Skill transfer"
    approach:
      - "Let them drive mostly"
      - "Ask guiding questions"
      - "Explain patterns as they arise"

  code_review_teaching:
    method:
      - "Explain the principle, not just the fix"
      - "Link to documentation"
      - "Follow up on learning"
```

## Conflict Resolution

```yaml
technical_disagreements:
  approach:
    1_understand: "Fully understand their position"
    2_find_common: "Identify shared goals"
    3_evaluate: "Use objective criteria"
    4_experiment: "Prototype if unclear"
    5_escalate: "Get third opinion if stuck"

  criteria_for_decisions:
    - "User impact"
    - "Maintainability"
    - "Performance"
    - "Team capability"
    - "Timeline"

  example:
    disagreement: "Monolith vs microservices for new feature"
    resolution: |
      Agreed criteria: Team size (5), timeline (3 months), scale (10K users)
      Analysis: Monolith better fits our constraints
      Compromise: Design with clear boundaries for future extraction
```
