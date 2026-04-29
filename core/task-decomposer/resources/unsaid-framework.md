# The Unsaid Framework

Discover what users DIDN'T say but need.

## The Three Phases

### Pre-Work (Before Starting)

What must be understood before beginning?

```yaml
unsaid_pre_work:
  understanding:
    - "What is the current state?"
    - "What constraints exist?"
    - "What has been tried before?"
    - "Who will use this?"

  planning:
    - "What does success look like?"
    - "What is the scope?"
    - "What is NOT included?"
    - "What is the priority order?"

  decision_making:
    - "What approach should we use?"
    - "What trade-offs are acceptable?"
    - "What patterns should we follow?"
```

### During-Work (Execution)

What quality/safety concerns apply during execution?

```yaml
unsaid_during_work:
  quality:
    - "How thoroughly should this be done?"
    - "What level of polish is expected?"
    - "What edge cases matter?"

  integration:
    - "What existing code is affected?"
    - "What needs to stay compatible?"
    - "What dependencies are involved?"

  safety:
    - "What could go wrong?"
    - "What shouldn't break?"
    - "What data needs protecting?"
```

### Post-Work (Completion)

What must happen after the core work?

```yaml
unsaid_post_work:
  verification:
    - "How do we know it works?"
    - "What evidence proves completion?"
    - "Who needs to approve this?"

  documentation:
    - "Who needs to know about this?"
    - "What should be documented?"
    - "What changes need tracking?"

  maintenance:
    - "How will this be maintained?"
    - "What monitoring is needed?"
    - "What happens if it fails?"
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

## Integration with Decomposition

The extrapolation results feed into work items:

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

1. **Assume nothing** - If user didn't say it, discover it
2. **Err on more** - Better to plan for implicit needs than miss them
3. **Make assumptions explicit** - Document what we assumed and why
4. **Allow override** - User can always say "skip X" or "I don't need Y"
5. **Context is king** - Use codebase, history, and patterns to inform
6. **Quality is implicit** - Testing, security, docs always needed unless excluded
