# Implicit Requirement Discovery

When users provide abstract requests, the system fills in the blanks on their behalf.

## The Abstraction Ladder

Requests come at different abstraction levels. The more abstract, the more we must extrapolate:

```
Level 5 (Most Abstract): "Make it better"
Level 4 (Goal-Oriented):  "Improve user experience"
Level 3 (Domain-Aware):   "Fix the onboarding flow"
Level 2 (Specific):       "Add a progress indicator to signup"
Level 1 (Detailed):       "Add a 5-step progress bar in SignupForm.tsx"
```

## Abstraction Level Detection

**Level 5 - Pure Outcome** (most extrapolation needed):
- Pattern: Vague verbs, no specifics
- Examples: "do thing", "make it work", "fix it", "make it better"
- System must determine: WHAT, WHERE, HOW, WHY, WHO, WHEN

**Level 4 - Goal-Oriented**:
- Pattern: Outcome specified, no method
- Examples: "improve performance", "increase conversions", "reduce errors"
- System must determine: WHERE, HOW, metrics, approach

**Level 3 - Domain-Aware**:
- Pattern: Domain clear, method unclear
- Examples: "fix the login", "update the dashboard", "refactor auth"
- System must determine: HOW, specifics, acceptance criteria

**Level 2 - Specific Task**:
- Pattern: Task clear, details unclear
- Examples: "add caching to API", "create user settings page"
- System must determine: details, edge cases, testing

**Level 1 - Detailed Instruction**:
- Pattern: Full specification provided
- Examples: "Add a 5-step progress bar to SignupForm.tsx using Tailwind"
- System confirms: validate feasibility, check conflicts

## The Unsaid Framework

For every request, systematically discover what the user DIDN'T say:

### 1. Pre-Work (Before Starting)

**What user says**: "Add authentication"
**What user didn't say**:

```yaml
unsaid_pre_work:
  understanding:
    - "What is the current state?" # Context gathering
    - "What constraints exist?" # Limitations
    - "What has been tried before?" # History
    - "Who will use this?" # Stakeholders

  planning:
    - "What does success look like?" # Success definition
    - "What is the scope?" # Boundaries
    - "What is NOT included?" # Exclusions
    - "What is the priority order?" # Sequencing

  decision_making:
    - "What approach should we use?" # Method selection
    - "What trade-offs are acceptable?" # Constraints
    - "What patterns should we follow?" # Consistency
```

### 2. During Work (Execution)

```yaml
unsaid_during_work:
  quality:
    - "How thoroughly should this be done?" # Depth
    - "What level of polish is expected?" # Quality bar
    - "What edge cases matter?" # Robustness

  integration:
    - "What existing code is affected?" # Impact
    - "What needs to stay compatible?" # Compatibility
    - "What dependencies are involved?" # Connections

  safety:
    - "What could go wrong?" # Risk identification
    - "What shouldn't break?" # Regression prevention
    - "What data needs protecting?" # Security
```

### 3. Post-Work (Completion)

```yaml
unsaid_post_work:
  verification:
    - "How do we know it works?" # Testing
    - "What evidence proves completion?" # Validation
    - "Who needs to approve this?" # Sign-off

  documentation:
    - "Who needs to know about this?" # Communication
    - "What should be documented?" # Records
    - "What changes need tracking?" # Change log

  maintenance:
    - "How will this be maintained?" # Sustainability
    - "What monitoring is needed?" # Observability
    - "What happens if it fails?" # Failure handling
```

## Domain-Specific Unsaid Patterns

### Engineering Requests

**User says**: "Fix the bug"
**User didn't say**:

```yaml
engineering_unsaid:
  pre:
    - Reproduce the bug first
    - Understand root cause before fixing
    - Check if others reported similar issues
    - Identify affected systems

  during:
    - Write tests that fail before fix
    - Follow existing code patterns
    - Consider performance impact
    - Handle edge cases
    - Add logging for debugging

  post:
    - Verify fix doesn't break other things
    - Update relevant documentation
    - Consider monitoring/alerting
    - Plan for rollback if needed
```

### Creative Requests

**User says**: "Write a story"
**User didn't say**:

```yaml
creative_unsaid:
  pre:
    - Genre and tone
    - Target audience
    - Length and format
    - Style references

  during:
    - Character development
    - Plot structure
    - Pacing and tension
    - Dialogue authenticity
    - Consistency of voice

  post:
    - Editing and revision
    - Beta reader feedback
    - Format for delivery
    - Rights and attribution
```

### Business/Operations Requests

**User says**: "Create a budget"
**User didn't say**:

```yaml
business_unsaid:
  pre:
    - Time period covered
    - Historical data to reference
    - Stakeholder requirements
    - Approval process

  during:
    - Categories and line items
    - Assumptions and projections
    - Contingency planning
    - Variance thresholds

  post:
    - Review cycle
    - Update frequency
    - Reporting format
    - Escalation triggers
```

## Implementation: The Extrapolation Engine

### Step 1: Classify Abstraction Level

```yaml
abstraction_classification:
  input: "user_request"

  signals:
    level_5:  # Most abstract
      - No nouns (just verbs)
      - Vague qualifiers ("better", "more", "fix")
      - No domain keywords

    level_4:  # Goal-oriented
      - Outcome words ("improve", "increase", "reduce")
      - No specific target mentioned

    level_3:  # Domain-aware
      - Domain nouns present ("login", "dashboard", "API")
      - No method specified

    level_2:  # Specific
      - Task + target clear
      - Missing implementation details

    level_1:  # Detailed
      - Full specification provided
      - File names, technologies mentioned
```

### Step 2: Apply Unsaid Framework

```yaml
extrapolation_process:
  for each abstraction_level:
    if level >= 4:
      # Must determine WHAT
      generate_what_questions:
        - "What specifically needs to change?"
        - "What is the target/subject?"
        - "What does success look like?"

    if level >= 3:
      # Must determine HOW
      generate_how_questions:
        - "What approach should we use?"
        - "What patterns exist?"
        - "What constraints apply?"

    if level >= 2:
      # Must determine DETAILS
      generate_detail_questions:
        - "What edge cases exist?"
        - "What testing is needed?"
        - "What documentation is required?"

    always:
      # Must determine IMPLICIT
      apply_domain_unsaid_patterns
      apply_pre_during_post_framework
```

### Step 3: Generate Filled-In Requirements

```yaml
filled_in_requirements:
  explicit:
    - "What user actually said"

  extrapolated:
    - "What we determined they need (WHAT)"
    - "Approach we've chosen (HOW)"
    - "Details we've specified (SPECIFICS)"

  implicit:
    - "Pre-work requirements (understanding, planning)"
    - "Quality requirements (testing, security)"
    - "Post-work requirements (docs, monitoring)"

  assumptions:
    - "Assumptions we're making"
    - "Can be overridden by user"
```

## Examples

### Example 1: Most Abstract

**User says**: "Make it faster"

**System extrapolates**:
```yaml
extrapolation:
  abstraction_level: 5

  what:
    question: "What specifically needs to be faster?"
    discovery: Analyze codebase for performance indicators
    result: "API response times, page load, database queries"

  where:
    question: "Which parts are slow?"
    discovery: Run profiling, check metrics
    result: "3 slow endpoints identified, 2 heavy queries"

  how:
    question: "What optimization approach?"
    discovery: Check existing patterns, constraints
    result: "Caching, query optimization, lazy loading"

  implicit_pre:
    - Establish baseline metrics
    - Identify performance requirements (SLAs)
    - Review existing performance tests

  implicit_during:
    - Measure before/after each change
    - Test under realistic load
    - Check for regressions

  implicit_post:
    - Document optimizations made
    - Add performance monitoring
    - Create alerting thresholds
```

### Example 2: Goal-Oriented

**User says**: "Improve user onboarding"

**System extrapolates**:
```yaml
extrapolation:
  abstraction_level: 4

  what:
    given: "onboarding" (domain noun present)
    discover: Current onboarding flow, pain points, metrics

  metrics:
    question: "How do we measure improvement?"
    discovery: Check analytics, talk to PM docs
    result: "Completion rate, time-to-value, drop-off points"

  scope:
    question: "What parts of onboarding?"
    discovery: Map current flow
    result: "Signup, first-run experience, tutorial, first value"

  implicit:
    - User research (what do users struggle with?)
    - Competitive analysis (how do others do it?)
    - A/B testing plan (how to validate?)
    - Rollout strategy (phased or all-at-once?)
```

### Example 3: Domain-Aware

**User says**: "Fix the login"

**System extrapolates**:
```yaml
extrapolation:
  abstraction_level: 3

  what:
    given: "login" (specific feature)
    discover: What's broken about login?

  investigation:
    - Check recent error logs
    - Review recent login-related changes
    - Check user reports/tickets
    - Test login flow manually

  scope:
    discovered: "Session timeout not handled gracefully"

  implicit:
    - Reproduce issue first
    - Fix root cause not symptom
    - Add tests preventing regression
    - Update error handling
    - Consider UX of error messages
```

## Integration with Decomposition

The extrapolation results feed into the decomposition process:

```yaml
decomposition_integration:
  # User's explicit request becomes first objective
  explicit_objective: "{what user said}"

  # Extrapolated WHAT/HOW become work items
  extrapolated_work_items:
    - Understanding phase (from pre-work unsaid)
    - Core implementation (from explicit request)
    - Quality assurance (from during-work unsaid)
    - Completion tasks (from post-work unsaid)

  # Implicit requirements become acceptance criteria
  implicit_criteria:
    - Testing requirements
    - Documentation requirements
    - Security requirements
    - Compatibility requirements
```

## Key Principles

1. **Assume nothing** - If user didn't say it, we must discover it
2. **Err on the side of more** - Better to plan for implicit needs than miss them
3. **Make assumptions explicit** - Document what we assumed and why
4. **Allow override** - User can always say "skip X" or "I don't need Y"
5. **Context is king** - Use codebase, history, and patterns to inform extrapolation
6. **Quality is implicit** - Testing, security, docs are always needed unless explicitly excluded

---

**Part of**: cAgents Implicit Requirement Discovery
