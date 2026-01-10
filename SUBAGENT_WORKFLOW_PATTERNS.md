# Subagent Workflow Patterns
## Encouraging Specialized Subagent Spawning for Modular Task Execution

This guide establishes patterns for agents to spawn specialized subagents for discrete tasks, creating modular, composable workflows.

---

## Core Philosophy

**Agents should delegate to specialized subagents rather than doing everything themselves.**

### Before (Monolithic)
```markdown
## Responsibilities
- Review code for bugs
- Check performance issues
- Validate security
- Optimize slow code
- Fix all issues found
```

### After (Subagent-Oriented)
```markdown
## Workflow Orchestration

When reviewing code, **spawn specialized subagents**:

1. **Use the code-reviewer subagent** to identify bugs and code smells
2. **Use the performance-analyzer subagent** to find performance bottlenecks
3. **Use the security-analyst subagent** to detect vulnerabilities
4. **Then use the optimizer subagent** to fix performance issues
5. **Finally use the security-specialist subagent** to remediate security flaws

Each subagent produces focused outputs that feed into the next stage.
```

---

## Subagent Descriptor Pattern

### Standard Format

```markdown
**Use the {subagent-name} subagent** to {specific task}

Examples:
- Use the data-analyst subagent to extract metrics from the database
- Use the frontend-developer subagent to implement the UI components
- Use the test-coverage-validator subagent to ensure 80%+ coverage
```

### Chaining Pattern

```markdown
**First**, use the {subagent-A} subagent to {task-A}
**Then**, use the {subagent-B} subagent to {task-B}
**Finally**, use the {subagent-C} subagent to {task-C}

Example:
- First, use the architect subagent to design the API schema
- Then, use the backend-developer subagent to implement the endpoints
- Finally, use the qa-lead subagent to create integration tests
```

### Conditional Pattern

```markdown
**If {condition}**, use the {subagent-X} subagent to {task-X}
**Otherwise**, use the {subagent-Y} subagent to {task-Y}

Example:
- If performance issues detected, use the performance-analyzer subagent to profile the code
- Otherwise, use the code-standards-auditor subagent to check style compliance
```

### Parallel Pattern

**Pattern 1**: Spawn in parallel: {subagent-A}, {subagent-B}, {subagent-C}

```markdown
Spawn in parallel:
- Use the frontend-lead subagent to coordinate UI implementation
- Use the backend-lead subagent to coordinate API development
- Use the devops-lead subagent to prepare deployment infrastructure

Then aggregate all outputs into the release package
```

**Pattern 2**: Research/Analyze {topic-A}, {topic-B}, and {topic-C} in parallel using separate subagents

```markdown
Research the authentication, database, and API modules in parallel using separate subagents:
- Use the security-specialist subagent to research authentication best practices
- Use the dba subagent to research database schema design
- Use the architect subagent to research API architecture patterns

Then synthesize findings into unified design document
```

**Pattern 3**: Execute {task-type} for {modules-A-B-C} using parallel subagents

```markdown
Implement core features in parallel using specialized subagents:
- Use the frontend-developer subagent to implement user interface
- Use the backend-developer subagent to implement business logic
- Use the dba subagent to implement data persistence layer

Then integrate all three layers
```

---

## Updated Agent Patterns

### Pattern 1: Orchestrator Agent (Coordinates Subagents)

```markdown
---
name: tech-lead
role: Engineering orchestrator
---

**Tech Lead** - Coordinates specialized subagents to deliver complex features.

## Subagent Orchestration Strategy

For complex implementations, **spawn specialized subagents** rather than implementing directly:

### Discovery Phase
1. **Use the architect subagent** to design the technical approach
2. **Use the risk-assessment subagent** to identify potential issues
3. **Use the dependency-analyzer subagent** to map external dependencies

### Implementation Phase
4. **Spawn in parallel**:
   - Use the frontend-lead subagent to coordinate UI work
   - Use the backend-lead subagent to coordinate API work
   - Use the devops-lead subagent to prepare infrastructure

### Quality Phase
5. **Use the qa-lead subagent** to create comprehensive test plan
6. **Use the security-lead subagent** to perform security review
7. **Use the performance-analyzer subagent** to validate performance targets

### Delivery Phase
8. **Use the scribe subagent** to create deployment documentation
9. **Use the devops subagent** to execute the deployment
10. **Use the sysadmin subagent** to monitor production health

## When to Spawn Subagents

**Always spawn subagents** for:
- Specialized technical work (architecture, security, performance)
- Domain expertise (frontend, backend, data, infrastructure)
- Quality assurance (testing, review, validation)
- Documentation and knowledge transfer

**Do NOT spawn subagents** for:
- Simple coordination tasks
- Reading status from Agent_Memory
- Making priority decisions (your core responsibility)
```

---

### Pattern 2: Specialist Agent (Spawns Sub-Specialists)

```markdown
---
name: backend-lead
role: Backend team coordinator
---

**Backend Lead** - Coordinates backend subagents for API and service development.

## Subagent Delegation

For backend work, **delegate to specialized backend subagents**:

### API Development
- **Use the backend-developer subagent** to implement REST endpoints
- **Use the dba subagent** to design database schemas
- **Use the data-analyst subagent** to optimize query performance

### Service Architecture
- **Use the architect subagent** to design service boundaries
- **Use the senior-developer subagent** to implement core business logic
- **Use the devops subagent** to containerize services

### Quality & Security
- **Use the security-specialist subagent** to review authentication/authorization
- **Use the performance-analyzer subagent** to load test endpoints
- **Use the test-coverage-validator subagent** to ensure test coverage

## Subagent Workflow Example

**Task**: Implement user authentication API

**Step 1**: Use the architect subagent to design:
  - JWT token strategy
  - Refresh token mechanism
  - Session management approach

**Step 2**: Use the dba subagent to create:
  - Users table schema
  - Sessions table schema
  - Database indexes for performance

**Step 3**: Use the backend-developer subagent to implement:
  - POST /auth/login endpoint
  - POST /auth/refresh endpoint
  - POST /auth/logout endpoint

**Step 4**: Use the security-specialist subagent to validate:
  - Password hashing (bcrypt)
  - Token signing (HMAC-SHA256)
  - Rate limiting for auth endpoints

**Step 5**: Use the test-coverage-validator subagent to ensure:
  - Unit tests for all auth logic
  - Integration tests for auth flows
  - 90%+ code coverage
```

---

### Pattern 3: Executor Agent (Spawns Worker Subagents)

```markdown
---
name: universal-executor
role: Task execution coordinator
---

**Universal Executor** - Spawns appropriate subagents based on task requirements.

## Dynamic Subagent Spawning

For each task in the execution plan:

### Step 1: Analyze Task Requirements
- Read task type, required skills, domain
- Identify best subagent for the task

### Step 2: Spawn Specialized Subagent
```yaml
task_type: implementation
required_skills: [react, typescript, ui]
decision: Use the frontend-developer subagent

task_type: architecture
required_skills: [system_design, api]
decision: Use the architect subagent

task_type: validation
required_skills: [security, penetration_testing]
decision: Use the security-analyst subagent
```

### Step 3: Monitor Subagent Progress
- Track subagent status in Agent_Memory
- Collect outputs as they complete
- Handle errors and escalations

## Subagent Invocation Pattern

For each task:

```python
# Read task details
task = read_task_from_pending(task_id)

# Determine appropriate subagent
subagent = select_subagent(
    task_type=task['type'],
    required_skills=task['skills'],
    domain=task['domain']
)

# Spawn subagent with task context
result = Task(
    subagent_type=subagent,
    prompt=f"""
        Execute task: {task['description']}

        Context:
        {task['context']}

        Acceptance criteria:
        {task['acceptance_criteria']}

        Outputs should be written to:
        Agent_Memory/{instruction_id}/outputs/task_{task_id}/
    """
)

# Track subagent result
update_task_status(task_id, result)
```

## When to Spawn Which Subagent

**Use the architect subagent** when:
- Task requires system design
- Making architectural decisions
- Evaluating technical approaches

**Use the {domain}-developer subagent** when:
- Task requires code implementation
- Building features or fixing bugs
- Domain: frontend, backend, data, etc.

**Use the {qa-type} subagent** when:
- Task requires quality validation
- Types: test-coverage, code-review, security, performance

**Use the {lead} subagent** when:
- Task requires coordinating multiple developers
- Leads: frontend-lead, backend-lead, devops-lead

**Use the scribe subagent** when:
- Task requires documentation
- Creating guides, specs, or runbooks
```

---

### Pattern 4: Review Agent (Spawns Review Subagents)

```markdown
---
name: reviewer
role: Comprehensive code review orchestrator
---

**Reviewer** - Spawns 9 specialized QA subagents for multi-dimensional code review.

## Multi-Phase Subagent Review

### Phase 1: Architecture Review
**Use the architecture-reviewer subagent** to validate:
- System design patterns
- Component boundaries
- Dependency management
- Architectural consistency

### Phase 2: Code Quality Review
**Use the code-standards-auditor subagent** to check:
- Coding style compliance
- Naming conventions
- Code organization
- Best practices adherence

### Phase 3: Security Review
**Use the security-analyst subagent** to detect:
- OWASP Top 10 vulnerabilities
- Authentication/authorization flaws
- Data exposure risks
- Injection vulnerabilities

### Phase 4: Performance Review
**Use the performance-analyzer subagent** to identify:
- Algorithmic inefficiencies
- Database query optimization
- Memory leaks
- Network bottlenecks

### Phase 5: Test Coverage Review
**Use the test-coverage-validator subagent** to ensure:
- Unit test coverage ≥ 80%
- Integration test coverage
- Edge cases tested
- Mocking strategies appropriate

### Phase 6: Documentation Review
**Use the documentation-reviewer subagent** to validate:
- API documentation complete
- Code comments where needed
- README updated
- Migration guides provided

### Phase 7: Dependency Review
**Use the dependency-auditor subagent** to check:
- Dependency versions current
- Known vulnerabilities (npm audit, snyk)
- License compatibility
- Dependency bloat

### Phase 8: Accessibility Review
**Use the accessibility-checker subagent** to verify:
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios

### Phase 9: Compliance Review
**Use the qa-compliance-officer subagent** to confirm:
- Regulatory requirements met
- Privacy policies followed
- Data handling compliant
- Audit trails present

## Aggregated Report

After all 9 subagents complete:

```yaml
review_results:
  architecture: PASS (score: 95/100)
  code_quality: PASS (score: 88/100)
  security: FIXABLE (3 medium-severity issues)
  performance: PASS (score: 92/100)
  test_coverage: PASS (84% coverage)
  documentation: FIXABLE (API docs incomplete)
  dependencies: PASS (all up-to-date)
  accessibility: FAIL (keyboard nav broken)
  compliance: PASS (GDPR compliant)

overall: FIXABLE
required_fixes:
  - Security: Fix XSS in search input (security-specialist subagent)
  - Documentation: Complete API docs (scribe subagent)
  - Accessibility: Fix keyboard navigation (frontend-developer subagent)
```

**Then spawn fix subagents**:
1. Use the security-specialist subagent to fix XSS vulnerability
2. Use the scribe subagent to complete API documentation
3. Use the frontend-developer subagent to fix keyboard navigation

**Finally**, re-run affected review subagents to confirm fixes.
```

---

### Pattern 5: Planning Agent (Spawns Analysis Subagents)

```markdown
---
name: universal-planner
role: Task decomposition orchestrator
---

**Universal Planner** - Spawns analysis subagents to inform planning decisions.

## Subagent-Informed Planning

Before creating execution plan, **gather intelligence via subagents**:

### Step 1: Requirements Analysis
**Use the business-analyst subagent** to:
- Gather stakeholder requirements
- Define acceptance criteria
- Identify constraints and risks

### Step 2: Technical Feasibility
**Use the architect subagent** to:
- Assess technical approach options
- Identify architectural dependencies
- Estimate technical complexity

### Step 3: Risk Assessment
**Use the risk-assessment subagent** to:
- Identify potential failure points
- Assess security vulnerabilities
- Evaluate performance risks

### Step 4: Dependency Analysis
**Use the dependency-analyzer subagent** to:
- Map external dependencies
- Identify blocking dependencies
- Create dependency graph

### Step 5: Resource Estimation
**Use the {domain}-lead subagent** to:
- Estimate team capacity
- Identify skill gaps
- Allocate agent resources

## Planning with Subagent Insights

After gathering subagent intelligence:

```yaml
instruction: "Implement OAuth2 authentication"

subagent_insights:
  business_analyst:
    requirements:
      - Support Google, GitHub, Microsoft providers
      - Session timeout: 30 minutes
      - Refresh token rotation

  architect:
    approach: "Use Passport.js with custom token service"
    complexity: "Moderate - existing patterns available"
    dependencies: ["passport", "jsonwebtoken"]

  risk_assessment:
    high_risk:
      - Token leakage if not stored securely
      - Session fixation attacks
    mitigation:
      - HttpOnly cookies for tokens
      - CSRF protection required

  dependency_analyzer:
    external_deps:
      - Passport.js (stable, well-maintained)
      - jsonwebtoken (industry standard)
    internal_deps:
      - User service (ready)
      - Session storage (needs implementation)

execution_plan:
  - task: Implement session storage service
    subagent: backend-developer
    depends_on: []

  - task: Configure Passport.js strategies
    subagent: backend-developer
    depends_on: [session_storage]

  - task: Implement token refresh logic
    subagent: senior-developer
    depends_on: [passport_config]

  - task: Add CSRF protection
    subagent: security-specialist
    depends_on: [token_refresh]

  - task: Create OAuth callback handlers
    subagent: backend-developer
    depends_on: [passport_config]

  - task: Implement frontend OAuth flow
    subagent: frontend-developer
    depends_on: [oauth_callbacks]

  - task: Security review
    subagent: security-analyst
    depends_on: [all_implementation]
```

Each task explicitly spawns the appropriate subagent.
```

---

## Implementation: Updating Agent Files

### Template for Adding Subagent Patterns

```markdown
## Subagent Workflow

### When to Spawn Subagents

**Spawn specialized subagents** when:
- Task requires expertise outside your primary domain
- Quality assurance needed (testing, review, validation)
- Parallel work streams would accelerate delivery
- Modular decomposition improves maintainability

### How to Spawn Subagents

```python
# Option 1: Single subagent
Task(
    subagent_type="{subagent-name}",
    prompt="""
        {Specific task description}

        Context: {relevant context}
        Acceptance criteria: {what defines success}
        Outputs: {where to write results}
    """
)

# Option 2: Sequential subagents
Task(subagent_type="architect", prompt="Design API schema")
# Wait for result
Task(subagent_type="backend-developer", prompt="Implement API from schema")
# Wait for result
Task(subagent_type="qa-lead", prompt="Create integration tests")

# Option 3: Parallel subagents (spawn all at once)
results = [
    Task(subagent_type="frontend-lead", prompt="Coordinate UI work"),
    Task(subagent_type="backend-lead", prompt="Coordinate API work"),
    Task(subagent_type="devops-lead", prompt="Prepare deployment")
]
# Aggregate results from all three
```

### Subagent Invocation Examples

**Example 1**: Bug fix workflow
```markdown
1. Use the senior-developer subagent to reproduce and diagnose the bug
2. Then use the backend-developer subagent to implement the fix
3. Then use the test-coverage-validator subagent to add regression tests
4. Finally use the code-reviewer subagent to validate the fix
```

**Example 2**: Feature development
```markdown
1. Use the architect subagent to design the feature architecture
2. Then spawn in parallel:
   - Use the frontend-developer subagent to build UI components
   - Use the backend-developer subagent to create API endpoints
   - Use the dba subagent to design database schema
3. Use the qa-lead subagent to create end-to-end tests
4. Use the reviewer subagent to perform comprehensive review
```

**Example 3**: Performance optimization
```markdown
1. Use the performance-analyzer subagent to profile and identify bottlenecks
2. Then for each bottleneck:
   - If database: Use the dba subagent to optimize queries
   - If algorithm: Use the senior-developer subagent to refactor
   - If frontend: Use the frontend-developer subagent to optimize rendering
3. Use the performance-analyzer subagent again to validate improvements
```
```

---

## Benefits of Subagent-Oriented Workflows

### 1. Modularity
- Each subagent handles one concern
- Clear inputs and outputs
- Composable workflows

### 2. Specialization
- Right expert for each task
- Deeper domain knowledge
- Higher quality outcomes

### 3. Parallelization
- Independent subagents run concurrently
- Faster overall completion
- Better resource utilization

### 4. Testability
- Each subagent's output verifiable
- Easier to debug failures
- Clear accountability

### 5. Reusability
- Subagent patterns reused across workflows
- Consistent quality standards
- Knowledge transfer through patterns

---

## Anti-Patterns to Avoid

### ❌ Monolithic Agent
```markdown
## Responsibilities
- Analyze requirements
- Design architecture
- Implement code
- Write tests
- Deploy to production
- Monitor metrics
- Fix bugs
```
**Problem**: One agent doing everything reduces specialization and parallelization.

---

### ❌ Vague Delegation
```markdown
"Handle the backend work"
```
**Problem**: Unclear which subagent, unclear task scope, unclear outputs.

**Better**:
```markdown
Use the backend-developer subagent to implement the user registration API with:
- POST /api/auth/register endpoint
- Email validation and uniqueness check
- Password hashing with bcrypt
- JWT token generation
- Output: OpenAPI spec + implementation + tests
```

---

### ❌ Sequential When Parallel Possible
```markdown
1. Use subagent-A to do task-A (wait 2 hours)
2. Use subagent-B to do task-B (wait 2 hours)
3. Use subagent-C to do task-C (wait 2 hours)
Total: 6 hours
```

**Better**:
```markdown
Spawn in parallel:
- Use subagent-A to do task-A
- Use subagent-B to do task-B
- Use subagent-C to do task-C
Total: 2 hours (3x speedup)
```

---

## Language Patterns to Use

### Encouraging Language

✅ "**Spawn the {subagent} subagent** to {task}"
✅ "**Delegate to the {subagent} subagent** for {expertise}"
✅ "**Use the {subagent} subagent** to {specific action}"
✅ "**Invoke the {subagent} subagent** when {condition}"
✅ "**Launch the {subagent} subagent** in parallel with {other subagent}"

### Workflow Language

✅ "**First**, use {subagent-A}, **then** use {subagent-B}"
✅ "**If {condition}**, spawn {subagent-X}, **otherwise** spawn {subagent-Y}"
✅ "**Spawn in parallel**: {subagent-A}, {subagent-B}, {subagent-C}"
✅ "**For each {item}**, use {subagent} to {action}"
✅ "**After {subagent-A} completes**, use {subagent-B} with its outputs"

---

## Adoption Roadmap

### Phase 1: Update Core Workflow Agents
- universal-executor
- universal-planner
- orchestrator
- reviewer (comprehensive review)

### Phase 2: Update Domain Leads
- tech-lead
- frontend-lead
- backend-lead
- qa-lead
- security-lead

### Phase 3: Update Specialist Agents
- architect
- senior-developer
- qa specialists
- security specialists

### Phase 4: Update Documentation
- CLAUDE.md
- README.md
- Example workflows

---

**Status**: Subagent pattern guide complete
**Next**: Apply these patterns to agent files systematically
**Impact**: More modular, parallel, specialized workflows
