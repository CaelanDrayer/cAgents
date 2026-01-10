# Subagent Workflow Examples
## Real-World Scenarios Demonstrating Specialized Subagent Spawning

This document provides concrete examples of how workflows spawn specialized subagents for modular, efficient task execution.

---

## Example 1: Bug Fix Workflow

### Request
"Fix the login bug where users can't authenticate with OAuth"

### Traditional Approach (Monolithic)
```
Single agent does everything:
1. Reproduce bug
2. Diagnose root cause
3. Fix code
4. Test fix
5. Deploy
```

### Subagent-Oriented Approach

```markdown
## Workflow Execution

**Step 1**: Use the qa-lead subagent to reproduce the bug
- Identify reproduction steps
- Document expected vs actual behavior
- Output: reproduction_steps.md

**Step 2**: Use the senior-developer subagent to diagnose the root cause
- Debug OAuth callback flow
- Check token validation logic
- Identify: Token refresh endpoint returning 401
- Output: diagnosis.md

**Step 3**: Use the backend-developer subagent to implement the fix
- Fix token refresh logic in auth.py
- Add error handling for expired tokens
- Output: auth.py (fixed)

**Step 4**: Use the test-coverage-validator subagent to add regression tests
- Create test_oauth_token_refresh.py
- Test expired token scenario
- Test refresh token rotation
- Output: test_oauth_token_refresh.py

**Step 5**: Use the code-reviewer subagent to validate the fix
- Review code changes
- Verify tests cover the bug scenario
- Check for similar bugs in codebase
- Output: review_report.md (PASS)

**Step 6**: Use the devops subagent to deploy to staging
- Deploy to staging environment
- Run smoke tests
- Output: deployment_log.txt

Final result: Bug fixed, tested, reviewed, and deployed
```

**Benefits**:
- Each subagent focused on their expertise
- Steps 4 and 5 can run in parallel
- Clear accountability for each phase
- Reusable pattern for all bug fixes

---

## Example 2: Feature Development Workflow

### Request
"Implement user authentication with OAuth2 (Google, GitHub, Microsoft)"

### Subagent-Oriented Approach

```markdown
## Phase 1: Discovery & Design

**Step 1**: Use the architect subagent to design the authentication architecture
- Design OAuth2 flow
- Select Passport.js strategy
- Design token service architecture
- Output: architecture_design.md, sequence_diagrams.png

**Step 2**: Use the security-specialist subagent to review security requirements
- Identify security risks (token storage, CSRF, session fixation)
- Define security requirements
- Output: security_requirements.md

**Step 3**: Use the dba subagent to design database schema
- Users table schema
- Sessions table schema
- OAuth provider mappings table
- Output: schema.sql

## Phase 2: Parallel Implementation

**Spawn in parallel**:

**Step 4a**: Use the backend-developer subagent to implement OAuth endpoints
- POST /auth/oauth/google
- POST /auth/oauth/github
- POST /auth/oauth/microsoft
- GET /auth/oauth/callback
- Output: auth_endpoints.py

**Step 4b**: Use the frontend-developer subagent to implement OAuth UI
- OAuth provider selection buttons
- Callback handling page
- Loading states
- Error messages
- Output: OAuthLogin.tsx

**Step 4c**: Use the devops subagent to configure OAuth providers
- Register apps with Google, GitHub, Microsoft
- Configure redirect URIs
- Set up environment variables
- Output: .env.template, oauth_config.md

## Phase 3: Integration & Testing

**Step 5**: Use the backend-developer subagent to integrate token service
- JWT token generation
- Refresh token rotation
- Token validation middleware
- Output: token_service.py

**Step 6**: Use the qa-lead subagent to create end-to-end tests
- Test OAuth flow for each provider
- Test token refresh
- Test session expiry
- Output: test_oauth_e2e.py

**Step 7**: Use the security-analyst subagent to perform security review
- Penetration test OAuth flows
- Check for CSRF vulnerabilities
- Validate token security
- Output: security_review.md (3 issues found)

**Step 8**: Use the security-specialist subagent to fix security issues
- Add CSRF protection
- Implement HttpOnly cookies
- Add rate limiting
- Output: security_fixes.py

**Step 9**: Use the security-analyst subagent to re-validate
- Confirm all issues resolved
- Output: security_review_final.md (PASS)

## Phase 4: Documentation & Deployment

**Step 10**: Use the scribe subagent to create documentation
- User guide for OAuth login
- Developer setup guide
- API documentation
- Output: docs/oauth_guide.md

**Step 11**: Use the devops subagent to deploy to production
- Deploy backend services
- Deploy frontend updates
- Configure OAuth providers for production
- Output: deployment_report.md

Final result: OAuth authentication implemented, tested, secured, documented, and deployed
```

**Parallel execution**:
- Steps 4a, 4b, 4c run simultaneously (3x speedup)
- Step 7 finds issues, Step 8 fixes them, Step 9 validates
- Clear handoffs between specialized subagents

---

## Example 3: Performance Optimization Workflow

### Request
"The /api/users endpoint is too slow - optimize it"

### Subagent-Oriented Approach

```markdown
## Step 1: Use the performance-analyzer subagent to profile the endpoint
- Run load tests on /api/users
- Measure response times (p50, p95, p99)
- Identify bottlenecks
- Finding: Database query taking 800ms
- Output: performance_profile.md

## Step 2: Use the dba subagent to analyze the database query
- Explain query execution plan
- Identify missing indexes
- Check for N+1 queries
- Finding: Missing index on users.email, N+1 query for user roles
- Output: query_analysis.md

## Step 3: Use the dba subagent to optimize database queries
- Add index on users.email
- Refactor to use JOIN instead of N+1 queries
- Output: migration_add_email_index.sql, optimized_queries.sql

## Step 4: Use the backend-developer subagent to implement query optimizations
- Update /api/users endpoint to use optimized query
- Add eager loading for user roles
- Output: users_api.py (optimized)

## Step 5: Use the performance-analyzer subagent to validate improvements
- Re-run load tests
- Measure new response times
- Result: p95 reduced from 800ms to 45ms (18x improvement)
- Output: performance_validation.md (PASS)

## Step 6: Use the scribe subagent to document the optimization
- Document the performance issue
- Document the solution
- Create runbook for similar issues
- Output: performance_optimization_runbook.md

Final result: 18x performance improvement, documented and validated
```

**Conditional branching**:
- If Step 1 found algorithm issue → Use senior-developer subagent
- If Step 1 found database issue → Use dba subagent (actual path taken)
- If Step 1 found network issue → Use devops subagent

---

## Example 4: Comprehensive Code Review Workflow

### Request
"Review the pull request for the new payment processing feature"

### Subagent-Oriented Approach

```markdown
## Multi-Dimensional Review (9 Subagents in Parallel)

**Spawn in parallel**:

**Review 1**: Use the architecture-reviewer subagent
- Check system design patterns
- Validate component boundaries
- Review dependency management
- Output: architecture_review.md (Score: 92/100, PASS)

**Review 2**: Use the code-standards-auditor subagent
- Check coding style (PEP8)
- Verify naming conventions
- Review code organization
- Output: code_quality_review.md (Score: 88/100, PASS)

**Review 3**: Use the security-analyst subagent
- Check for SQL injection risks
- Validate input sanitization
- Review authentication/authorization
- Output: security_review.md (3 medium-severity issues found)

**Review 4**: Use the performance-analyzer subagent
- Profile payment processing logic
- Check for inefficient algorithms
- Review database query patterns
- Output: performance_review.md (Score: 95/100, PASS)

**Review 5**: Use the test-coverage-validator subagent
- Calculate test coverage (82%)
- Check edge cases tested
- Review mock strategies
- Output: test_coverage_review.md (PASS)

**Review 6**: Use the documentation-reviewer subagent
- Verify API docs complete
- Check inline comments
- Review README updates
- Output: documentation_review.md (API docs incomplete)

**Review 7**: Use the dependency-auditor subagent
- Check dependency versions
- Run npm audit
- Verify license compatibility
- Output: dependency_review.md (PASS)

**Review 8**: Use the accessibility-checker subagent
- Test keyboard navigation
- Verify screen reader support
- Check color contrast
- Output: accessibility_review.md (Keyboard nav broken)

**Review 9**: Use the qa-compliance-officer subagent
- Verify PCI-DSS compliance
- Check audit trail implementation
- Review data handling
- Output: compliance_review.md (PASS)

## Aggregated Results

```yaml
overall_status: FIXABLE
reviews_passed: 7/9
reviews_failed: 0/9
reviews_fixable: 2/9

issues_found:
  security:
    - XSS vulnerability in payment form (Medium)
    - Missing CSRF token validation (Medium)
    - Weak password requirements (Low)

  documentation:
    - API endpoint /api/payments not documented
    - Payment webhook handler undocumented

  accessibility:
    - Keyboard navigation broken in payment modal
    - Submit button not keyboard accessible

required_fixes: 6
```

## Fix Phase (Sequential)

**Step 10**: Use the security-specialist subagent to fix security issues
- Add input sanitization for payment form
- Implement CSRF token validation
- Strengthen password requirements
- Output: security_fixes.py

**Step 11**: Use the scribe subagent to complete documentation
- Document /api/payments endpoint
- Document webhook handler
- Update API reference
- Output: api_docs_updated.md

**Step 12**: Use the frontend-developer subagent to fix accessibility
- Fix keyboard navigation in payment modal
- Make submit button keyboard accessible
- Add ARIA labels
- Output: PaymentModal.tsx (fixed)

## Re-validation (Parallel)

**Step 13**: Use the security-analyst subagent to re-validate security
- Confirm all 3 issues resolved
- Output: security_review_final.md (PASS)

**Step 14**: Use the documentation-reviewer subagent to re-validate docs
- Confirm API docs complete
- Output: documentation_review_final.md (PASS)

**Step 15**: Use the accessibility-checker subagent to re-validate a11y
- Confirm keyboard navigation fixed
- Output: accessibility_review_final.md (PASS)

Final result: All 9 review dimensions passed, PR approved for merge
```

**Benefits**:
- 9 specialized reviewers run in parallel (9x speedup)
- Each reviewer focused on their expertise
- Issues found early, fixed systematically
- Clear re-validation process

---

## Example 5: Cross-Domain Workflow

### Request
"Analyze the business impact of automating our invoice approval process"

### Subagent-Oriented Approach

```markdown
## Domain: Business (Parent)

**Step 1**: Use the business-analyst subagent to document current process
- Map current manual process
- Identify pain points
- Estimate time spent
- Output: current_process_analysis.md
  - Current cost: $2,000/month (10 hours/week @ $50/hour)
  - Average approval time: 5-7 days
  - Error rate: 8% (manual data entry errors)

**Step 2**: Use the process-improvement-specialist subagent to design automated workflow
- Design automated approval workflow
- Define business rules
- Identify integration points
- Output: automated_workflow_design.md
  - 4-stage approval: Submit → Manager → Finance → Payment
  - Email notifications at each stage
  - Audit trail requirement

## Cross-Domain Delegation: Business → Finance

**Step 3**: Use the finance:financial-analyst subagent to calculate ROI
```yaml
delegation:
  from_domain: business
  to_domain: finance
  subagent: financial-analyst
  task: Calculate ROI for invoice automation

context:
  - Current cost: $2,000/month
  - Automation cost: $500 one-time + $100/month SaaS
  - Time horizon: 3 years
  - Error cost reduction: $200/month (8% error rate)

Task(
  subagent_type="finance:financial-analyst",
  prompt="""
    Calculate ROI for invoice approval automation:

    Current state:
    - Manual processing: $2,000/month
    - Error costs: $200/month
    - Total: $2,200/month

    Automated state:
    - One-time cost: $500
    - Monthly SaaS: $100/month
    - Savings: $2,100/month

    Deliverables:
    - ROI calculation
    - Payback period
    - 3-year NPV
    - Sensitivity analysis
  """
)
```

**Output from finance domain**:
- ROI: 840% over 3 years
- Payback period: 0.24 months (7.2 days!)
- NPV (3-year): $64,700
- Output: roi_analysis.yaml

## Cross-Domain Delegation: Business → Software

**Step 4**: Use the software:architect subagent to design automation system
```yaml
delegation:
  from_domain: business
  to_domain: software
  subagent: architect
  task: Design technical architecture for invoice automation

context:
  - Workflow stages: 4 (from Step 2)
  - Integration: Existing accounting system
  - Volume: ~200 invoices/month
  - Users: 25 approvers

Task(
  subagent_type="software:architect",
  prompt="""
    Design invoice approval automation system:

    Requirements:
    - 4-stage workflow (Submit → Manager → Finance → Payment)
    - Email notifications
    - Integration with QuickBooks
    - Audit trail (compliance requirement)
    - Mobile approval support

    Deliverables:
    - System architecture diagram
    - API design
    - Database schema
    - Technology recommendations
  """
)
```

**Output from software domain**:
- Architecture: RESTful API + React admin UI + PostgreSQL
- Tech stack: Node.js, Express, React, PostgreSQL
- Estimated effort: 120 hours (3 weeks)
- Estimated cost: $12,000 (blended rate $100/hour)
- Output: system_architecture.md

## Back to Business Domain

**Step 5**: Use the business-analyst subagent to create business case
- Aggregate inputs from Steps 1-4
- Calculate total cost (one-time + 3-year)
  - Development: $12,000
  - Infrastructure: $500
  - SaaS: $3,600 (3 years)
  - Total: $16,100
- Calculate benefits (3-year savings)
  - Labor savings: $72,000
  - Error reduction: $7,200
  - Faster approval (opportunity cost): $15,000
  - Total benefits: $94,200
- Net benefit: $78,100
- Output: business_case.md

**Step 6**: Use the operations-manager subagent to create implementation plan
- Phase 1: Requirements & design (1 week)
- Phase 2: Development (3 weeks)
- Phase 3: Testing & training (1 week)
- Phase 4: Rollout (1 week)
- Total timeline: 6 weeks
- Output: implementation_plan.md

Final result: Complete business case with ROI analysis, technical architecture, and implementation plan
```

**Cross-domain collaboration**:
- Business domain owns the workflow
- Finance domain provides ROI analysis
- Software domain provides technical design
- Results aggregated back to business domain
- Clear handoffs and context passing

---

## Example 6: Content Creation Workflow (Marketing → Creative)

### Request
"Create a product launch email campaign for our new AI analytics platform"

### Subagent-Oriented Approach

```markdown
## Domain: Marketing (Parent)

**Step 1**: Use the marketing-strategist subagent to define campaign strategy
- Target audience: Data analysts, engineering leaders
- Key message: "AI-powered insights in minutes"
- Campaign goals: 1000 trial signups
- Output: campaign_strategy.md

**Step 2**: Use the demand-generation-manager subagent to plan email sequence
- Email 1: Announcement (launch day)
- Email 2: Feature deep-dive (day 3)
- Email 3: Customer success story (day 7)
- Email 4: Limited-time trial offer (day 10)
- Email 5: Last chance reminder (day 14)
- Output: email_sequence_plan.md

## Cross-Domain Delegation: Marketing → Creative

**Step 3**: Use the creative:copywriter subagent to write email sequence
```yaml
delegation:
  from_domain: marketing
  to_domain: creative
  subagent: copywriter
  task: Write 5-email product launch sequence

context:
  - Product: AI-powered analytics platform
  - Audience: Data analysts, engineering leaders
  - Tone: Professional, innovative, data-driven
  - Key message: "AI-powered insights in minutes"
  - Sequence plan: (from Step 2)

Task(
  subagent_type="creative:copywriter",
  prompt="""
    Write 5-email product launch sequence:

    Email 1 (Announcement):
    - Subject line (A/B test variants)
    - Preview text
    - Body (300 words)
    - CTA: Start free trial

    Email 2 (Feature deep-dive):
    - Subject line
    - Body (400 words)
    - Feature highlights with examples
    - CTA: Watch demo

    [... specifications for emails 3-5]

    Deliverables:
    - 5 complete emails (subject + body + CTA)
    - A/B test variants for subject lines
    - Total: ~2000 words
  """
)
```

**Output from creative domain**:
- 5 complete emails written
- 2 subject line variants per email (A/B testing)
- Engaging copy with data-driven language
- Output: email_sequence_content.md

## Back to Marketing Domain

**Step 4**: Use the email-marketing-specialist subagent to implement campaign
- Set up email sequence in marketing automation (HubSpot)
- Configure A/B tests for subject lines
- Set up tracking links and UTM parameters
- Schedule emails
- Output: campaign_implementation_log.md

**Step 5**: Use the marketing-analyst subagent to define success metrics
- Open rate target: 25%
- Click-through rate target: 8%
- Trial signup conversion target: 5%
- Total signups target: 1000
- Output: success_metrics.yaml

**Step 6**: Use the demand-generation-manager subagent to execute campaign
- Launch email sequence
- Monitor real-time metrics
- Adjust send times based on engagement
- Output: campaign_execution_report.md

Final result: Complete 5-email campaign with professional copy, implemented and launched
```

**Domain collaboration**:
- Marketing domain defines strategy and metrics
- Creative domain writes compelling copy
- Marketing domain implements and executes
- Expertise from both domains combined

---

## Key Patterns Demonstrated

### Pattern 1: Sequential Subagents
```
Step 1 → Use subagent-A to gather data
Step 2 → Use subagent-B to analyze data (uses Step 1 output)
Step 3 → Use subagent-C to make decision (uses Step 2 output)
```

### Pattern 2: Parallel Subagents
```
Spawn in parallel:
- Use subagent-A for task-A
- Use subagent-B for task-B
- Use subagent-C for task-C

Aggregate all results
```

### Pattern 3: Conditional Subagents
```
Use subagent-analyzer to identify problem type

If type == X:
    Use subagent-X-specialist
Elif type == Y:
    Use subagent-Y-specialist
Else:
    Use subagent-generalist
```

### Pattern 4: Review-Fix-Revalidate
```
Use reviewer-subagent to find issues
If issues found:
    Use fixer-subagent to resolve issues
    Use reviewer-subagent again to confirm
```

### Pattern 5: Cross-Domain Delegation
```
Parent domain: business
Child workflow: Use software:architect subagent
Result: Aggregate back to parent domain
```

---

## Benefits Summary

| Benefit | Example Demonstration |
|---------|----------------------|
| **Modularity** | Example 1: Each phase handled by specialized subagent |
| **Parallelization** | Example 4: 9 reviewers run simultaneously |
| **Specialization** | Example 2: 11 different specialists involved |
| **Cross-domain** | Example 5: Business→Finance→Software collaboration |
| **Reusability** | Pattern templates work across all examples |
| **Clarity** | Explicit "Use the X subagent to Y" language |

---

**Implementation**: These patterns are now embedded in:
- `universal-executor.md` - Subagent spawning logic
- `CLAUDE.md` - Architecture overview
- `SUBAGENT_WORKFLOW_PATTERNS.md` - Detailed patterns
- This file - Concrete examples

**Adoption**: All future workflows should use this subagent-oriented approach for modularity, parallelization, and specialization.
