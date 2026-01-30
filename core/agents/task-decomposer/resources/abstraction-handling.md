# Handling Abstract Requests

When users provide vague requests, fill in the blanks systematically.

## Example: "Make it faster"

```yaml
# Step 1: Classify abstraction
abstraction_level: 5  # Pure outcome, most abstract

# Step 2: Discover WHAT
discovery_what:
  action: Analyze codebase for performance indicators
  search:
    - Grep for slow queries, N+1 patterns
    - Check for missing indexes
    - Find unoptimized loops
    - Identify large payload responses
  result: "3 slow API endpoints, 2 heavy database queries identified"

# Step 3: Discover WHERE
discovery_where:
  action: Profile and measure
  result: "/api/users (2.3s), /api/reports (4.1s), dashboard query (1.8s)"

# Step 4: Discover HOW
discovery_how:
  action: Check existing patterns, constraints
  result: "Caching available (Redis), can optimize queries, lazy loading possible"

# Step 5: Fill in unsaid
unsaid_pre:
  - Establish baseline metrics
  - Define acceptable performance (SLAs)
  - Review existing performance tests

unsaid_during:
  - Measure before/after each change
  - Test under realistic load
  - Check for regressions

unsaid_post:
  - Document optimizations
  - Add performance monitoring
  - Set alerting thresholds
```

## Example: "Fix the bug"

```yaml
# Step 1: Classify abstraction
abstraction_level: 4  # Goal-oriented (fix), but WHAT bug?

# Step 2: Discover WHAT bug
discovery_what:
  action: Check recent activity
  search:
    - Recent error logs
    - Recent bug reports/issues
    - Recent code changes
    - User complaints
  result: "Login timeout not handled - users stuck on loading screen"

# Step 3: Fill in unsaid
unsaid_pre:
  - Reproduce the bug
  - Identify root cause (not just symptom)
  - Check for similar issues

unsaid_during:
  - Write failing test first
  - Fix root cause
  - Handle edge cases
  - Add logging

unsaid_post:
  - Verify fix
  - Run regression tests
  - Update error handling docs
  - Consider monitoring
```

## Example: "Add a feature"

```yaml
# Step 1: Classify abstraction
abstraction_level: 4  # Goal-oriented, but WHAT feature?

# Step 2: Interactive or infer
if interactive_mode:
  ask_user: "What feature would you like to add?"
else:
  infer_from_context:
    - Check recent discussions in code comments
    - Look for TODO comments
    - Check issues/tickets
    - Analyze usage patterns
```

## Discovery Questions by Abstraction Level

### Level 5 (Most Abstract)
- WHAT specifically needs to change?
- WHAT is the target/subject?
- WHAT does success look like?

### Level 4 (Goal-Oriented)
- WHERE should the improvement happen?
- HOW do we measure success?
- WHAT metrics define the goal?

### Level 3 (Domain-Aware)
- HOW should we implement this?
- WHAT are the specific requirements?
- WHAT acceptance criteria apply?

### Level 2 (Specific Task)
- WHAT details are missing?
- WHAT edge cases exist?
- WHAT testing is needed?

### Level 1 (Detailed)
- Is this feasible as specified?
- Are there conflicts with existing code?
- Validate and proceed
