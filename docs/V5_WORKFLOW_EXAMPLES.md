# V5.0 Workflow Examples

**Purpose**: Reference implementations showing complete tier 2, 3, and 4 V5.0 workflows with all files and agent interactions.

**Version**: V5.0 Controller-Centric Question-Based Delegation
**Date**: 2026-01-13
**Status**: Reference documentation for V5.0 implementation

---

## Overview

This document provides complete, realistic examples of V5.0 workflows across complexity tiers:
- **Tier 2**: Moderate complexity with single controller
- **Tier 3**: Complex with primary + supporting controllers
- **Tier 4**: Expert with executive oversight + HITL

Each example includes:
- User request and routing decision
- Plan with objectives and controller assignment
- Complete coordination_log with Q&A exchanges and synthesis
- Implementation tasks and outputs
- Validation results

---

## Table of Contents

1. [Tier 2 Example: Fix Authentication Bug](#tier-2-example-fix-authentication-bug)
2. [Tier 3 Example: Implement OAuth2 Authentication](#tier-3-example-implement-oauth2-authentication)
3. [Tier 4 Example: Migrate to Microservices](#tier-4-example-migrate-to-microservices)
4. [Understanding V5.0 Patterns](#understanding-v5.0-patterns)

---

## Tier 2 Example: Fix Authentication Bug

### User Request
```
/trigger Fix the authentication bug where users can't log in after password reset
```

### Phase 1: Routing

**File**: `Agent_Memory/inst_20260113_001/workflow/routing_decision.yaml`

```yaml
tier: 2
classification: moderate
domain: engineering
requires_controller: true
rationale: |
  Bug fix in authentication system requires investigating root cause,
  implementing fix, and testing. Moderate complexity warrants controller
  coordination.

estimated_duration: 2-3 hours
```

**Why Tier 2**:
- Requires investigation and diagnosis
- Multiple components involved (auth, database, sessions)
- Needs testing and validation
- Not trivial (tier 1) but not multi-system (tier 3)

---

### Phase 2: Planning

**File**: `Agent_Memory/inst_20260113_001/workflow/plan.yaml`

```yaml
instruction_id: inst_20260113_001
tier: 2
domain: engineering

objectives:
  - "Diagnose root cause of authentication failure after password reset"
  - "Implement fix that resolves the issue"
  - "Verify fix works and doesn't break existing auth flows"

success_criteria:
  - "Users can successfully log in after password reset"
  - "All existing authentication flows continue to work"
  - "Tests pass with >80% coverage for affected code"
  - "No security vulnerabilities introduced"

controller_assignment:
  primary: engineering:engineering-manager
  supporting: []

coordination_approach: question_based
estimated_questions: 5-8
estimated_duration: 2-3 hours
question_limit: 10

context:
  - "Bug reported by 5+ users in last 24 hours"
  - "Affects password reset flow specifically"
  - "Existing auth uses passport-local"
```

**Key V5.0 Pattern**: Objectives define WHAT, not HOW. Controller determines implementation approach.

---

### Phase 3: Coordinating

**File**: `Agent_Memory/inst_20260113_001/workflow/coordination_log.yaml`

```yaml
instruction_id: inst_20260113_001
controller: engineering:engineering-manager
controller_tier: 2
started_at: 2026-01-13T10:00:00Z
completed_at: 2026-01-13T12:30:00Z

objectives_received:
  - "Diagnose root cause of authentication failure after password reset"
  - "Implement fix that resolves the issue"
  - "Verify fix works and doesn't break existing auth flows"

# Question-Based Delegation Phase
questions_asked:
  - question_id: q001
    question: "What is the current implementation of the password reset flow? Include session handling and token validation logic."
    delegated_to: backend-developer
    delegated_at: 2026-01-13T10:05:00Z
    answer_received_at: 2026-01-13T10:25:00Z
    answer: |
      Current flow:
      1. User requests reset via /auth/reset-password
      2. Token generated and emailed (15min expiry)
      3. User submits new password via /auth/reset-password-confirm
      4. Password updated in database
      5. Session regenerated via req.session.regenerate()

      Issue identified: req.session.regenerate() callback not properly handling
      errors. If session store has latency, callback fails silently and user
      session isn't created, causing login to fail.

      Code location: src/auth/reset-password.controller.js lines 45-52

  - question_id: q002
    question: "What is the recommended pattern for session regeneration in our auth system? Are there any existing safeguards we should follow?"
    delegated_to: architect
    delegated_at: 2026-01-13T10:30:00Z
    answer_received_at: 2026-01-13T10:45:00Z
    answer: |
      Recommended pattern:
      1. Use promisified session.regenerate() with async/await
      2. Add timeout (5s) to prevent hanging
      3. Fallback: if regenerate fails, create new session explicitly
      4. Log errors to monitoring system

      Existing pattern in src/auth/login.controller.js implements this correctly.
      Should follow same pattern for consistency.

      Reference: src/auth/login.controller.js lines 78-95

  - question_id: q003
    question: "What security implications should we consider when fixing the session regeneration? Any vulnerabilities to watch for?"
    delegated_to: security-specialist
    delegated_at: 2026-01-13T10:50:00Z
    answer_received_at: 2026-01-13T11:05:00Z
    answer: |
      Security considerations:
      1. Session fixation: Must regenerate session ID after password reset (already doing this)
      2. Timing attacks: Don't reveal whether email exists via different error messages
      3. Token reuse: Ensure reset token is invalidated after use (check this)
      4. Session hijacking: Set secure session cookies (httpOnly, secure, sameSite)

      Critical: Verify reset token is invalidated after successful password change.
      Current code doesn't show this - potential security issue.

  - question_id: q004
    question: "What tests are needed to ensure the fix works and doesn't break existing auth flows?"
    delegated_to: qa-lead
    delegated_at: 2026-01-13T11:10:00Z
    answer_received_at: 2026-01-13T11:25:00Z
    answer: |
      Test coverage needed:
      1. Happy path: Password reset successful, user can log in
      2. Session store latency: Simulate slow session store, verify fallback works
      3. Session store failure: Simulate session store down, verify error handling
      4. Existing flows: Login, logout, signup still work
      5. Security: Verify reset token invalidated after use
      6. Concurrent resets: Multiple reset attempts for same user

      Use existing test fixtures in tests/auth/fixtures/users.json
      Add new tests to tests/auth/reset-password.spec.js

# Synthesis Phase
synthesized_solution:
  root_cause: |
    Session regeneration callback in reset-password flow doesn't properly
    handle errors or latency from session store. When session store is slow,
    callback fails silently and user session isn't created, causing subsequent
    login attempts to fail.

  approach: |
    Refactor reset-password flow to use same session regeneration pattern as
    login flow (promisified, timeout, fallback). Also add missing security
    check to invalidate reset token after use.

  rationale: |
    Following existing pattern in login.controller.js ensures consistency and
    leverages proven solution. Adding token invalidation fixes security gap
    identified by security-specialist.

  implementation_steps:
    - step: 1
      description: "Promisify session.regenerate() using util.promisify"
      file: src/auth/reset-password.controller.js
      lines: 45-52

    - step: 2
      description: "Add 5s timeout to session regeneration"
      file: src/auth/reset-password.controller.js
      lines: 45-52

    - step: 3
      description: "Add fallback to create new session if regeneration fails"
      file: src/auth/reset-password.controller.js
      lines: 45-52

    - step: 4
      description: "Invalidate reset token after successful password change"
      file: src/auth/reset-password.controller.js
      lines: 40-44

    - step: 5
      description: "Add error logging to monitoring system"
      file: src/auth/reset-password.controller.js
      lines: 45-52

    - step: 6
      description: "Add tests for happy path, latency, failure, and security"
      file: tests/auth/reset-password.spec.js
      lines: new

  risks:
    - risk: "Session store issues may still occur"
      mitigation: "Fallback to explicit session creation prevents user-facing failure"

    - risk: "Token invalidation may break concurrent reset flows"
      mitigation: "Add test for concurrent resets to verify behavior"

  estimated_effort: 2 hours implementation + 1 hour testing

# Implementation Tasks Phase
implementation_tasks:
  - task_id: task_001
    name: "Refactor session regeneration in reset-password flow"
    description: |
      Update src/auth/reset-password.controller.js to use promisified
      session.regenerate() with timeout and fallback, following pattern
      in login.controller.js
    assigned_to: backend-developer
    acceptance_criteria:
      - "Session regeneration uses async/await with util.promisify"
      - "5s timeout implemented"
      - "Fallback creates new session if regeneration fails"
      - "Error logging added to monitoring system"
    dependencies: []
    estimated_duration: 1 hour
    status: completed
    completed_at: 2026-01-13T12:00:00Z
    output_location: "outputs/task_001/"

  - task_id: task_002
    name: "Add reset token invalidation"
    description: |
      Update reset-password flow to invalidate reset token after successful
      password change, preventing token reuse
    assigned_to: backend-developer
    acceptance_criteria:
      - "Reset token marked as used in database after password change"
      - "Attempting to reuse token returns clear error"
      - "Token expiry still enforced (15min)"
    dependencies: []
    estimated_duration: 30 minutes
    status: completed
    completed_at: 2026-01-13T12:15:00Z
    output_location: "outputs/task_002/"

  - task_id: task_003
    name: "Add comprehensive tests"
    description: |
      Add tests for happy path, session store latency, session store failure,
      concurrent resets, and token invalidation
    assigned_to: qa-lead
    acceptance_criteria:
      - "All 6 test scenarios pass"
      - "Code coverage >80% for affected code"
      - "Tests use existing fixtures"
      - "Tests run in CI pipeline"
    dependencies: [task_001, task_002]
    estimated_duration: 1 hour
    status: completed
    completed_at: 2026-01-13T12:30:00Z
    output_location: "outputs/task_003/"

# Status
status: completed
total_questions: 4
total_tasks: 3
all_tasks_completed: true
coordination_duration: 2.5 hours
```

**Key V5.0 Patterns**:
- **Question-based delegation**: Controller asks specific questions to specialists
- **Expert-driven**: backend-developer identifies root cause, architect provides solution pattern
- **Synthesis**: Controller synthesizes all answers into coherent implementation plan
- **Adaptive**: Controller could have asked follow-up questions based on answers

---

### Phase 4: Executing

**File**: `Agent_Memory/inst_20260113_001/workflow/execution_summary.yaml`

```yaml
instruction_id: inst_20260113_001
execution_phase: completed
started_at: 2026-01-13T10:00:00Z
completed_at: 2026-01-13T12:30:00Z

controller_monitoring:
  primary_controller: engineering:engineering-manager
  heartbeat_checks: 5
  last_heartbeat: 2026-01-13T12:30:00Z
  coordination_status: completed
  coordination_file: workflow/coordination_log.yaml

tasks_executed:
  total: 3
  completed: 3
  failed: 0
  blocked: 0

outputs_created:
  - file: outputs/task_001/reset-password.controller.js
    description: "Refactored session regeneration logic"
    size: 3450 bytes

  - file: outputs/task_002/reset-password.controller.js
    description: "Token invalidation added"
    size: 3650 bytes

  - file: outputs/task_003/reset-password.spec.js
    description: "Comprehensive test suite"
    size: 8200 bytes

execution_mode: sequential
total_duration: 2.5 hours
```

**Executor Role (V5.0)**: Monitor controller progress, don't manage execution agents. Controller coordinates implementation.

---

### Phase 5: Validating

**File**: `Agent_Memory/inst_20260113_001/outputs/final/validation_report.yaml`

```yaml
instruction_id: inst_20260113_001
validation_phase: completed
classification: PASS

# V5.0 Coordination Validation
coordination_validation:
  coordination_log_exists: true
  coordination_completeness: PASS
  question_quality: PASS
  delegation_pattern: PASS
  synthesis_quality: PASS
  implementation_tasks_complete: PASS
  circular_delegation_check: PASS (no circular delegation)

  summary: |
    Coordination phase completed successfully. Controller asked 4 targeted
    questions, received expert answers, synthesized coherent solution, and
    coordinated implementation. All tasks completed with verified outputs.

# Output Quality Validation
quality_gates:
  - gate: "Objectives Met"
    status: PASS
    evidence:
      - "Users can now log in after password reset (tested)"
      - "Existing auth flows work (regression tests pass)"
      - "Test coverage 85% for affected code"

  - gate: "Implementation Quality"
    status: PASS
    evidence:
      - "Follows existing pattern in login.controller.js"
      - "Error handling comprehensive"
      - "Logging added for monitoring"

  - gate: "Security"
    status: PASS
    evidence:
      - "Reset tokens invalidated after use"
      - "Session regeneration secure"
      - "No new vulnerabilities introduced"

  - gate: "Testing"
    status: PASS
    evidence:
      - "All 6 test scenarios pass"
      - "Coverage 85% (target 80%)"
      - "Tests run in CI pipeline"

overall_assessment: |
  Tier 2 workflow completed successfully. Controller (engineering-manager)
  effectively used question-based delegation to diagnose issue, design solution,
  and coordinate implementation. All objectives met, quality gates passed.

recommendations: []
```

**V5.0 Validation**: Checks both coordination quality (Q&A, synthesis) and output quality (objectives, tests, security).

---

## Tier 3 Example: Implement OAuth2 Authentication

### User Request
```
/trigger Implement OAuth2 authentication for our API while maintaining backward compatibility with existing passport-local auth
```

### Phase 1: Routing

**File**: `Agent_Memory/inst_20260113_002/workflow/routing_decision.yaml`

```yaml
tier: 3
classification: complex
domain: engineering
requires_controller: true
multi_controller: true
rationale: |
  Adding OAuth2 authentication is complex and touches multiple systems:
  - Authentication system (new OAuth2 endpoints)
  - Security model (token management, scopes)
  - API design (backward compatibility)
  - Testing (comprehensive coverage)

  Requires primary controller (engineering-manager) plus supporting controllers
  for architecture (architect) and security (security-specialist).

estimated_duration: 8-12 hours
```

**Why Tier 3**:
- Multi-system implementation (auth, API, security)
- Requires architectural design
- Security implications significant
- Backward compatibility adds complexity
- Needs multiple expert perspectives

---

### Phase 2: Planning

**File**: `Agent_Memory/inst_20260113_002/workflow/plan.yaml`

```yaml
instruction_id: inst_20260113_002
tier: 3
domain: engineering

objectives:
  - "Design OAuth2 architecture that integrates with existing auth system"
  - "Implement OAuth2 endpoints (authorize, token, refresh)"
  - "Ensure backward compatibility with existing passport-local auth"
  - "Follow OAuth2 security best practices"
  - "Create comprehensive tests"

success_criteria:
  - "OAuth2 endpoints functional (authorize, token, refresh)"
  - "Existing passport-local auth continues to work unchanged"
  - "OAuth2 tokens properly scoped and validated"
  - "Security audit passes with no critical issues"
  - "Test coverage >80% for new code"
  - "Documentation complete for API consumers"

controller_assignment:
  primary: engineering:engineering-manager
  supporting:
    - engineering:architect
    - engineering:security-specialist

coordination_approach: question_based
multi_controller_coordination: true
estimated_questions: 12-18
estimated_duration: 8-12 hours
question_limit: 20

context:
  - "Existing auth: passport-local with session-based auth"
  - "API: RESTful, Express.js"
  - "Users: ~50k active, need seamless migration"
  - "Security: Must pass annual security audit"
```

**Tier 3 Pattern**: Multiple controllers (primary + supporting) for complex coordination.

---

### Phase 3: Coordinating

**File**: `Agent_Memory/inst_20260113_002/workflow/coordination_log.yaml`

```yaml
instruction_id: inst_20260113_002
controller: engineering:engineering-manager
controller_tier: 2
supporting_controllers:
  - engineering:architect
  - engineering:security-specialist
started_at: 2026-01-13T14:00:00Z
completed_at: 2026-01-13T22:00:00Z

objectives_received:
  - "Design OAuth2 architecture that integrates with existing auth system"
  - "Implement OAuth2 endpoints (authorize, token, refresh)"
  - "Ensure backward compatibility with existing passport-local auth"
  - "Follow OAuth2 security best practices"
  - "Create comprehensive tests"

# Question-Based Delegation Phase (Primary Controller)
questions_asked:
  # Architecture Questions (delegated to architect)
  - question_id: q001
    question: "What OAuth2 library should we use for Node.js/Express that integrates well with our existing passport-local setup?"
    delegated_to: architect
    delegated_at: 2026-01-13T14:10:00Z
    answer_received_at: 2026-01-13T14:40:00Z
    answer: |
      Recommend: passport-oauth2 + oauth2orize for Node.js

      Rationale:
      1. passport-oauth2: Integrates seamlessly with existing passport-local
      2. oauth2orize: Mature OAuth2 server implementation
      3. Both maintained by Jared Hanson (passport author)
      4. ~30k downloads/week, proven at scale

      Architecture:
      - Keep existing passport-local strategy unchanged
      - Add passport-oauth2 strategy alongside
      - Use oauth2orize for OAuth2 server endpoints
      - Shared user model, separate token storage

      Reference implementations: oauth2orize examples on GitHub

  - question_id: q002
    question: "How should we structure the OAuth2 endpoints to maintain backward compatibility? Should we version the API?"
    delegated_to: architect
    delegated_at: 2026-01-13T14:45:00Z
    answer_received_at: 2026-01-13T15:10:00Z
    answer: |
      Endpoint structure:
      - New OAuth2 endpoints: /oauth2/authorize, /oauth2/token, /oauth2/refresh
      - Existing endpoints: /auth/login, /auth/logout unchanged
      - No API versioning needed (additive change)

      Backward compatibility strategy:
      - Existing session-based auth: Continue to work on all endpoints
      - New token-based auth: Work on all endpoints (Bearer token in header)
      - Client choice: Use session-based OR token-based, not both

      Middleware order:
      1. passport.authenticate(['bearer', 'session'])
      2. Falls back from bearer to session automatically
      3. No code changes needed for existing endpoints

  # Implementation Questions (delegated to backend-developer)
  - question_id: q003
    question: "What is the current authentication middleware structure? How does passport integrate with our Express routes?"
    delegated_to: backend-developer
    delegated_at: 2026-01-13T15:15:00Z
    answer_received_at: 2026-01-13T15:45:00Z
    answer: |
      Current middleware structure:
      - passport.initialize() in app.js (line 45)
      - passport.session() in app.js (line 46)
      - passport.authenticate('local') on /auth/login
      - ensureAuthenticated() middleware on protected routes

      Routes:
      - Protected routes use: router.get('/path', ensureAuthenticated, handler)
      - ensureAuthenticated checks req.isAuthenticated()

      To support OAuth2:
      - Add passport-oauth2 strategy in passport config
      - Update ensureAuthenticated to check bearer token OR session
      - No changes needed to individual routes (middleware handles it)

  - question_id: q004
    question: "What database schema changes are needed for OAuth2 token storage? Should we use existing User model or separate tables?"
    delegated_to: backend-developer
    delegated_at: 2026-01-13T15:50:00Z
    answer_received_at: 2026-01-13T16:15:00Z
    answer: |
      Schema design:
      - New tables: oauth_tokens, oauth_clients, oauth_authorization_codes
      - Keep existing User model unchanged
      - Link tokens to User via user_id foreign key

      oauth_tokens table:
      - id (uuid, primary key)
      - access_token (string, unique, indexed)
      - refresh_token (string, unique, indexed, nullable)
      - user_id (uuid, foreign key to users)
      - client_id (uuid, foreign key to oauth_clients)
      - scope (string)
      - expires_at (timestamp)
      - created_at (timestamp)

      oauth_clients table:
      - id (uuid, primary key)
      - name (string)
      - client_secret (string, hashed)
      - redirect_uris (jsonb array)
      - created_at (timestamp)

      Migration: migrations/20260113_add_oauth2_tables.sql

  # Security Questions (delegated to security-specialist)
  - question_id: q005
    question: "What OAuth2 security best practices must we follow? What are the most critical vulnerabilities to prevent?"
    delegated_to: security-specialist
    delegated_at: 2026-01-13T16:20:00Z
    answer_received_at: 2026-01-13T16:50:00Z
    answer: |
      Critical OAuth2 security requirements:

      1. Token Security:
         - Access tokens: Short-lived (15min), random 256-bit
         - Refresh tokens: Long-lived (30d), rotated on use
         - Token storage: Hashed in database (bcrypt)
         - Token transmission: HTTPS only

      2. Authorization Code Flow:
         - Authorization codes: Single-use, 10min expiry
         - PKCE required for public clients
         - State parameter required (CSRF protection)

      3. Scope Management:
         - Principle of least privilege
         - Granular scopes (read:profile, write:data, etc.)
         - Scope validation on every request

      4. Client Authentication:
         - Client secrets hashed (bcrypt)
         - Redirect URI whitelist strictly enforced
         - No wildcards in redirect URIs

      5. Rate Limiting:
         - Token endpoint: 10 requests/min per IP
         - Refresh endpoint: 5 requests/min per token

      6. Audit Logging:
         - Log all token grants, refreshes, revocations
         - Monitor for suspicious patterns

      References: OWASP OAuth2 Security Cheat Sheet

  # Testing Questions (delegated to qa-lead)
  - question_id: q006
    question: "What test scenarios are critical for OAuth2 implementation? What could break existing auth?"
    delegated_to: qa-lead
    delegated_at: 2026-01-13T16:55:00Z
    answer_received_at: 2026-01-13T17:20:00Z
    answer: |
      Test coverage requirements:

      OAuth2 Happy Paths:
      - Authorization code flow (complete flow)
      - Token grant (valid client credentials)
      - Token refresh (valid refresh token)
      - Token revocation
      - Scope-based access control

      OAuth2 Security Tests:
      - Invalid client credentials rejected
      - Expired tokens rejected
      - Invalid redirect URIs rejected
      - PKCE validation enforced
      - Rate limiting works

      Backward Compatibility:
      - Existing session-based login still works
      - Protected routes work with sessions
      - Protected routes work with bearer tokens
      - Logout works for both auth methods

      Edge Cases:
      - Concurrent token refreshes (same refresh token)
      - Token refresh after revocation
      - Multiple clients for same user
      - Token expiry during request

      Load Tests:
      - 1000 token grants/sec
      - 500 token refreshes/sec

      Test fixtures: tests/oauth2/fixtures/ (create new)

# Supporting Controller Synthesis (Architect)
supporting_controller_synthesis:
  - controller: engineering:architect
    focus: "Architecture design and library selection"
    key_recommendations:
      - "Use passport-oauth2 + oauth2orize for proven integration"
      - "Additive change: /oauth2/* endpoints alongside /auth/*"
      - "Middleware strategy: passport.authenticate(['bearer', 'session'])"
      - "No API versioning needed (backward compatible)"

  # Supporting Controller Synthesis (Security-Specialist)
  - controller: engineering:security-specialist
    focus: "Security requirements and threat mitigation"
    key_recommendations:
      - "Short-lived access tokens (15min), rotated refresh tokens (30d)"
      - "PKCE required for public clients"
      - "Hashed token storage (bcrypt)"
      - "Rate limiting and audit logging"

# Primary Controller Synthesis
synthesized_solution:
  root_cause: N/A (new feature)

  approach: |
    Implement OAuth2 using passport-oauth2 + oauth2orize, integrating
    alongside existing passport-local auth. Use middleware strategy that
    supports both bearer tokens and sessions, ensuring complete backward
    compatibility. Follow OAuth2 security best practices with short-lived
    access tokens, rotated refresh tokens, and comprehensive rate limiting.

  rationale: |
    - passport-oauth2: Proven integration with existing passport setup
    - Additive endpoints: No breaking changes to existing auth
    - Dual middleware: Supports both auth methods transparently
    - Security-first: Follows OWASP OAuth2 recommendations

  architecture_diagram: |
    Client → /oauth2/authorize → Authorization Page → Consent
           → /oauth2/token → Access Token + Refresh Token

    Client → API Endpoint → passport.authenticate(['bearer', 'session'])
           → Check Bearer Token OR Check Session
           → Allow/Deny based on scopes/permissions

  implementation_steps:
    - step: 1
      description: "Create OAuth2 database schema"
      file: migrations/20260113_add_oauth2_tables.sql
      assigned_to: backend-developer

    - step: 2
      description: "Implement OAuth2 server using oauth2orize"
      file: src/oauth2/server.js
      assigned_to: backend-developer

    - step: 3
      description: "Create OAuth2 endpoints (authorize, token, refresh)"
      file: src/oauth2/routes.js
      assigned_to: backend-developer

    - step: 4
      description: "Add bearer token strategy to passport"
      file: src/auth/strategies/bearer.js
      assigned_to: backend-developer

    - step: 5
      description: "Update authentication middleware for dual support"
      file: src/auth/middleware.js
      assigned_to: backend-developer

    - step: 6
      description: "Implement scope-based access control"
      file: src/auth/scope-middleware.js
      assigned_to: backend-developer

    - step: 7
      description: "Add rate limiting for OAuth2 endpoints"
      file: src/oauth2/rate-limit.js
      assigned_to: backend-developer

    - step: 8
      description: "Implement audit logging"
      file: src/oauth2/audit-logger.js
      assigned_to: backend-developer

    - step: 9
      description: "Create comprehensive test suite"
      file: tests/oauth2/
      assigned_to: qa-lead

    - step: 10
      description: "Security review of implementation"
      file: N/A
      assigned_to: security-specialist

    - step: 11
      description: "Create API documentation for OAuth2 flow"
      file: docs/api/oauth2.md
      assigned_to: scribe

  risks:
    - risk: "Token storage may impact database performance"
      mitigation: "Index access_token and refresh_token columns, add token cleanup cron"

    - risk: "Backward compatibility may break in edge cases"
      mitigation: "Comprehensive regression tests for existing auth flows"

    - risk: "OAuth2 complexity may introduce security vulnerabilities"
      mitigation: "Follow OWASP checklist, security review before deployment"

  estimated_effort: 8 hours implementation + 2 hours testing + 1 hour security review

# Implementation Tasks Phase
implementation_tasks:
  - task_id: task_001
    name: "Create OAuth2 database schema"
    description: "Create migrations for oauth_tokens, oauth_clients, oauth_authorization_codes tables"
    assigned_to: backend-developer
    acceptance_criteria:
      - "Migrations run successfully"
      - "Foreign keys properly set up"
      - "Indexes created for token lookups"
    dependencies: []
    estimated_duration: 1 hour
    status: completed

  - task_id: task_002
    name: "Implement OAuth2 server"
    description: "Implement OAuth2 server using oauth2orize with authorization code flow"
    assigned_to: backend-developer
    acceptance_criteria:
      - "Authorization code flow implemented"
      - "Token grant and refresh implemented"
      - "PKCE support added"
    dependencies: [task_001]
    estimated_duration: 3 hours
    status: completed

  - task_id: task_003
    name: "Create OAuth2 endpoints"
    description: "Create /oauth2/authorize, /oauth2/token, /oauth2/refresh endpoints"
    assigned_to: backend-developer
    acceptance_criteria:
      - "All endpoints functional"
      - "Error handling comprehensive"
      - "Rate limiting applied"
    dependencies: [task_002]
    estimated_duration: 2 hours
    status: completed

  - task_id: task_004
    name: "Add bearer token strategy"
    description: "Implement passport bearer token strategy for token validation"
    assigned_to: backend-developer
    acceptance_criteria:
      - "Bearer tokens validated correctly"
      - "Scope checking implemented"
      - "Expired tokens rejected"
    dependencies: [task_002]
    estimated_duration: 1 hour
    status: completed

  - task_id: task_005
    name: "Update authentication middleware"
    description: "Update middleware to support both bearer tokens and sessions"
    assigned_to: backend-developer
    acceptance_criteria:
      - "Dual auth support works"
      - "Existing routes unchanged"
      - "Fallback to session works"
    dependencies: [task_004]
    estimated_duration: 1 hour
    status: completed

  - task_id: task_006
    name: "Implement scope-based access control"
    description: "Create middleware for scope validation on protected endpoints"
    assigned_to: backend-developer
    acceptance_criteria:
      - "Scopes properly validated"
      - "Insufficient scope returns 403"
      - "Backward compatible with session auth"
    dependencies: [task_004]
    estimated_duration: 1 hour
    status: completed

  - task_id: task_007
    name: "Add rate limiting"
    description: "Implement rate limiting for OAuth2 endpoints"
    assigned_to: backend-developer
    acceptance_criteria:
      - "Token endpoint: 10 req/min per IP"
      - "Refresh endpoint: 5 req/min per token"
      - "Rate limit headers included"
    dependencies: [task_003]
    estimated_duration: 1 hour
    status: completed

  - task_id: task_008
    name: "Implement audit logging"
    description: "Add audit logging for all OAuth2 operations"
    assigned_to: backend-developer
    acceptance_criteria:
      - "All token operations logged"
      - "Logs include client_id, user_id, timestamp"
      - "Log rotation configured"
    dependencies: [task_002]
    estimated_duration: 1 hour
    status: completed

  - task_id: task_009
    name: "Create comprehensive test suite"
    description: "Create tests for OAuth2 happy paths, security, and backward compatibility"
    assigned_to: qa-lead
    acceptance_criteria:
      - "All test scenarios pass"
      - "Code coverage >80%"
      - "Load tests pass (1000 token grants/sec)"
    dependencies: [task_001, task_002, task_003, task_004, task_005, task_006, task_007, task_008]
    estimated_duration: 2 hours
    status: completed

  - task_id: task_010
    name: "Security review"
    description: "Comprehensive security review of OAuth2 implementation"
    assigned_to: security-specialist
    acceptance_criteria:
      - "OWASP checklist verified"
      - "No critical vulnerabilities found"
      - "Security recommendations documented"
    dependencies: [task_009]
    estimated_duration: 1 hour
    status: completed

  - task_id: task_011
    name: "Create API documentation"
    description: "Document OAuth2 flow for API consumers"
    assigned_to: scribe
    acceptance_criteria:
      - "Complete OAuth2 flow documented"
      - "Code examples included"
      - "Error scenarios documented"
    dependencies: [task_010]
    estimated_duration: 1 hour
    status: completed

# Status
status: completed
total_questions: 6
total_tasks: 11
all_tasks_completed: true
coordination_duration: 8 hours
multi_controller_coordination: true
supporting_controllers_used: 2
```

**Tier 3 Pattern**: Primary controller (engineering-manager) delegates questions to specialists and supporting controllers (architect, security-specialist) for architectural and security guidance. Synthesis integrates all perspectives.

---

### Phase 4: Executing

**File**: `Agent_Memory/inst_20260113_002/workflow/execution_summary.yaml`

```yaml
instruction_id: inst_20260113_002
execution_phase: completed
started_at: 2026-01-13T14:00:00Z
completed_at: 2026-01-13T22:00:00Z

controller_monitoring:
  primary_controller: engineering:engineering-manager
  supporting_controllers:
    - engineering:architect
    - engineering:security-specialist
  heartbeat_checks: 16
  last_heartbeat: 2026-01-13T22:00:00Z
  coordination_status: completed
  coordination_file: workflow/coordination_log.yaml

tasks_executed:
  total: 11
  completed: 11
  failed: 0
  blocked: 0
  parallel_execution: true
  parallelization_groups:
    - group: 1
      tasks: [task_001]
    - group: 2
      tasks: [task_002]
    - group: 3
      tasks: [task_003, task_004, task_006, task_007, task_008]
    - group: 4
      tasks: [task_005]
    - group: 5
      tasks: [task_009]
    - group: 6
      tasks: [task_010, task_011]

outputs_created:
  - file: outputs/task_001/migrations/20260113_add_oauth2_tables.sql
    description: "OAuth2 database schema"
    size: 4200 bytes

  - file: outputs/task_002/src/oauth2/server.js
    description: "OAuth2 server implementation"
    size: 12500 bytes

  - file: outputs/task_003/src/oauth2/routes.js
    description: "OAuth2 endpoints"
    size: 6800 bytes

  - file: outputs/task_004/src/auth/strategies/bearer.js
    description: "Bearer token strategy"
    size: 3200 bytes

  - file: outputs/task_005/src/auth/middleware.js
    description: "Updated auth middleware"
    size: 5400 bytes

  - file: outputs/task_006/src/auth/scope-middleware.js
    description: "Scope-based access control"
    size: 2800 bytes

  - file: outputs/task_007/src/oauth2/rate-limit.js
    description: "Rate limiting"
    size: 1900 bytes

  - file: outputs/task_008/src/oauth2/audit-logger.js
    description: "Audit logging"
    size: 2400 bytes

  - file: outputs/task_009/tests/oauth2/
    description: "Comprehensive test suite"
    size: 18600 bytes

  - file: outputs/task_010/security-review.md
    description: "Security review report"
    size: 6400 bytes

  - file: outputs/task_011/docs/api/oauth2.md
    description: "OAuth2 API documentation"
    size: 9200 bytes

execution_mode: parallel (where possible)
total_duration: 8 hours
parallelization_efficiency: 65%
```

---

### Phase 5: Validating

**File**: `Agent_Memory/inst_20260113_002/outputs/final/validation_report.yaml`

```yaml
instruction_id: inst_20260113_002
validation_phase: completed
classification: PASS

# V5.0 Coordination Validation
coordination_validation:
  coordination_log_exists: true
  coordination_completeness: PASS
  question_quality: PASS
  delegation_pattern: PASS
  synthesis_quality: PASS
  implementation_tasks_complete: PASS
  circular_delegation_check: PASS
  multi_controller_coordination: PASS

  summary: |
    Complex tier 3 workflow with multi-controller coordination completed
    successfully. Primary controller (engineering-manager) effectively
    coordinated with supporting controllers (architect, security-specialist)
    through targeted questions. Synthesis integrated architectural design,
    security requirements, and implementation details into coherent plan.

# Output Quality Validation
quality_gates:
  - gate: "Objectives Met"
    status: PASS
    evidence:
      - "OAuth2 architecture designed (architect recommendations followed)"
      - "OAuth2 endpoints functional (authorize, token, refresh tested)"
      - "Backward compatibility maintained (regression tests pass)"
      - "Security best practices followed (OWASP checklist verified)"
      - "Tests comprehensive (coverage 84%)"

  - gate: "Implementation Quality"
    status: PASS
    evidence:
      - "Uses proven libraries (passport-oauth2, oauth2orize)"
      - "Code follows existing patterns"
      - "Error handling comprehensive"
      - "Audit logging implemented"

  - gate: "Security"
    status: PASS
    evidence:
      - "Security review passed (no critical issues)"
      - "Token security follows best practices"
      - "Rate limiting implemented"
      - "PKCE support for public clients"

  - gate: "Testing"
    status: PASS
    evidence:
      - "All test scenarios pass"
      - "Coverage 84% (target 80%)"
      - "Load tests pass (1000 grants/sec)"
      - "Backward compatibility tests pass"

  - gate: "Documentation"
    status: PASS
    evidence:
      - "OAuth2 flow documented"
      - "Code examples provided"
      - "Error scenarios documented"

overall_assessment: |
  Tier 3 complex workflow completed successfully with multi-controller
  coordination. Primary controller effectively synthesized input from
  architect (architecture design) and security-specialist (security
  requirements) into comprehensive implementation. All objectives met,
  quality gates passed, security review passed.

recommendations:
  - "Monitor token refresh patterns for 30 days to tune token expiry"
  - "Consider implementing token introspection endpoint for future"
```

---

## Tier 4 Example: Migrate to Microservices

### User Request
```
/trigger Migrate our monolithic application to a microservices architecture with proper service boundaries, API gateway, and observability
```

### Phase 1: Routing

**File**: `Agent_Memory/inst_20260113_003/workflow/routing_decision.yaml`

```yaml
tier: 4
classification: expert
domain: engineering
requires_controller: true
multi_controller: true
executive_oversight: true
requires_hitl: true
rationale: |
  Migrating to microservices is an expert-level architectural transformation:
  - Affects entire system architecture
  - Requires executive decision-making (cost, timeline, risk)
  - Touches all domains (engineering, operations, security, business)
  - Major cost implications ($500k+)
  - High risk if done incorrectly
  - 6-12 month project timeline

  Requires:
  - Executive controller (CTO) for strategic decisions
  - Primary controller (engineering-manager) for execution coordination
  - Supporting controllers (architect, devops-lead, security-specialist)
  - HITL approval before proceeding

estimated_duration: 6-12 months
estimated_cost: $500k-$1M
```

**Why Tier 4**:
- Architectural transformation affecting entire organization
- Executive-level decisions required
- Major cost and timeline implications
- High risk, irreversible changes
- Requires HITL approval

---

### Phase 2: Planning

**File**: `Agent_Memory/inst_20260113_003/workflow/plan.yaml`

```yaml
instruction_id: inst_20260113_003
tier: 4
domain: engineering

objectives:
  - "Assess current monolith architecture and identify service boundaries"
  - "Design microservices architecture with API gateway and service mesh"
  - "Define migration strategy (strangler pattern vs big bang)"
  - "Estimate costs, timeline, and risks"
  - "Create observability strategy (metrics, logging, tracing)"
  - "Plan infrastructure changes (Kubernetes, service discovery, etc.)"
  - "Obtain executive approval before implementation"

success_criteria:
  - "Comprehensive architecture design approved by CTO"
  - "Service boundaries identified with clear ownership"
  - "Migration strategy documented with phase-by-phase plan"
  - "Cost and timeline estimates approved by executive team"
  - "Risks identified with mitigation strategies"
  - "Observability strategy implemented (before migration)"
  - "HITL approval obtained"

controller_assignment:
  executive: engineering:cto
  primary: engineering:engineering-manager
  supporting:
    - engineering:architect
    - engineering:devops-lead
    - engineering:security-specialist
    - shared:program-manager

coordination_approach: question_based
multi_controller_coordination: true
executive_oversight: true
estimated_questions: 25-40
estimated_duration: 6-12 months
question_limit: 50

context:
  - "Current architecture: Ruby on Rails monolith, ~500k LOC"
  - "Traffic: 10k req/sec, 50k active users"
  - "Team: 25 engineers"
  - "Budget: $500k-$1M allocated"
  - "Timeline: 12 months target"
  - "Business driver: Scalability for 10x growth"
```

**Tier 4 Pattern**: Executive controller (CTO) for strategic decisions, primary controller (engineering-manager) for coordination, multiple supporting controllers, program-manager for timeline tracking, HITL approval required.

---

### Phase 3: Coordinating (Excerpt - Full Example Would Be ~2000 Lines)

**File**: `Agent_Memory/inst_20260113_003/workflow/coordination_log.yaml` (abbreviated)

```yaml
instruction_id: inst_20260113_003
controller: engineering:cto (executive)
primary_controller: engineering:engineering-manager
controller_tier: 2
supporting_controllers:
  - engineering:architect
  - engineering:devops-lead
  - engineering:security-specialist
  - shared:program-manager
started_at: 2026-01-13T09:00:00Z
completed_at: 2026-06-13T17:00:00Z  # 6 months

objectives_received:
  - "Assess current monolith architecture and identify service boundaries"
  - "Design microservices architecture with API gateway and service mesh"
  - "Define migration strategy (strangler pattern vs big bang)"
  - "Estimate costs, timeline, and risks"
  - "Create observability strategy (metrics, logging, tracing)"
  - "Plan infrastructure changes (Kubernetes, service discovery, etc.)"
  - "Obtain executive approval before implementation"

# Executive Controller Phase (CTO)
executive_questions:
  - question_id: eq001
    question: "What are the business drivers for this migration? What specific problems are we solving?"
    delegated_to: product-owner
    answer: |
      Business drivers:
      1. Scalability: Current monolith can't handle 10x traffic growth
      2. Team velocity: 25 engineers blocked by monolith deploy bottleneck
      3. Technology debt: Ruby on Rails outdated, hard to hire
      4. Failure isolation: Single point of failure affects entire system
      5. Independent deployments: Want to deploy features independently

      Target outcomes:
      - Support 100k req/sec (10x current)
      - Deploy 10x/day (vs current 1x/week)
      - Reduce outages by 80% (better isolation)
      - Improve developer productivity by 50%

  - question_id: eq002
    question: "What are the cost implications and ROI? What's the financial justification?"
    delegated_to: cfo
    answer: |
      Cost estimate: $800k total over 12 months
      - Engineering time: $500k (5 engineers × 6 months)
      - Infrastructure: $200k (Kubernetes, monitoring, etc.)
      - Consulting: $100k (architecture review, training)

      ROI analysis:
      - Increased developer productivity: $300k/year saved
      - Reduced downtime: $500k/year saved (4 major outages/year @ $125k each)
      - Scalability headroom: $1M/year revenue enabled (10x growth)

      Payback period: 12 months
      3-year ROI: 250%

      Recommendation: Approve if 12-month timeline achievable

  - question_id: eq003
    question: "What are the top 3 risks and how do we mitigate them?"
    delegated_to: architect
    answer: |
      Top risks:
      1. Migration failure (30% probability, $2M impact)
         Mitigation: Strangler pattern, canary releases, rollback capability

      2. Performance degradation (20% probability, $500k impact)
         Mitigation: Load testing, observability-first, gradual migration

      3. Team productivity drop during migration (40% probability, $200k impact)
         Mitigation: Dedicated migration team, don't disrupt feature work

      Total risk exposure: $900k weighted
      With mitigations: $200k weighted

      Recommendation: Proceed with mitigations in place

# Executive Decision
executive_decision:
  decision: APPROVED_WITH_CONDITIONS
  conditions:
    - "Strangler pattern only (no big bang)"
    - "Observability implemented before first service migration"
    - "Load testing at each phase"
    - "Monthly executive reviews"
    - "Dedicated migration team (5 engineers)"

  approval_date: 2026-01-20T10:00:00Z
  approved_by: engineering:cto
  hitl_confirmation: true

# Primary Controller Phase (Engineering-Manager)
# ... (abbreviated - would include 20-30 more questions)

questions_asked:
  - question_id: q001
    question: "What are the natural service boundaries in our current monolith? Which modules are most independent?"
    delegated_to: architect
    answer: |
      Service boundary analysis:

      High independence (good candidates for extraction):
      1. User Authentication Service (auth/)
         - 15k LOC, 2 database tables
         - Clear API, few dependencies
         - High traffic (every request)

      2. Payment Processing Service (payments/)
         - 8k LOC, 3 database tables
         - External integrations (Stripe, PayPal)
         - High value, isolated logic

      3. Notification Service (notifications/)
         - 12k LOC, 2 database tables
         - Queue-based, async processing
         - Independent deployment value

      Medium independence:
      4. Product Catalog (products/)
      5. Order Management (orders/)

      Low independence (extract later):
      6. Inventory Management (heavily coupled)
      7. Reporting (touches everything)

      Recommendation: Start with auth, then payments, then notifications

# ... (20-30 more questions covering architecture, infrastructure, security, testing, migration strategy)

# Synthesis (Executive Controller + Primary Controller)
synthesized_solution:
  executive_summary: |
    Microservices migration approved with $800k budget, 12-month timeline,
    and strangler pattern approach. Begin with high-value, low-risk services
    (auth, payments, notifications) before tackling complex domains.

    Key success factors:
    - Observability-first approach
    - Dedicated migration team
    - Monthly executive reviews
    - Gradual rollout with rollback capability

  approach: |
    Use strangler pattern to gradually extract services from monolith:
    1. Build observability infrastructure first
    2. Extract auth service (month 1-2)
    3. Extract payments service (month 3-4)
    4. Extract notifications service (month 5-6)
    5. Extract product catalog (month 7-8)
    6. Extract order management (month 9-10)
    7. Complete migration and decommission monolith (month 11-12)

  architecture_decisions:
    - Service mesh: Istio (for service discovery, circuit breaking, observability)
    - API gateway: Kong (for routing, rate limiting, authentication)
    - Container orchestration: Kubernetes
    - Observability: Prometheus + Grafana + Jaeger
    - Databases: Service-per-database pattern (PostgreSQL per service)
    - Communication: REST for sync, RabbitMQ for async

  migration_phases:
    - phase: 0
      name: "Foundation"
      duration: "1 month"
      deliverables:
        - "Kubernetes cluster setup"
        - "Istio service mesh deployed"
        - "Kong API gateway deployed"
        - "Observability stack (Prometheus, Grafana, Jaeger)"
        - "CI/CD pipelines for microservices"

    - phase: 1
      name: "Extract Auth Service"
      duration: "1 month"
      deliverables:
        - "Auth service extracted and deployed"
        - "10% traffic routed to new service (canary)"
        - "Rollback capability verified"
        - "Load tests pass (10k req/sec)"

    # ... (phases 2-7 abbreviated)

# Implementation Tasks (Abbreviated)
implementation_tasks:
  - task_id: task_001
    name: "Setup Kubernetes cluster"
    assigned_to: devops-lead
    estimated_duration: 2 weeks
    status: completed

  - task_id: task_002
    name: "Deploy Istio service mesh"
    assigned_to: devops-lead
    estimated_duration: 1 week
    status: completed

  # ... (50+ more tasks abbreviated)

# Status
status: completed
total_questions: 32
total_tasks: 54
all_tasks_completed: true
coordination_duration: 6 months
executive_oversight: true
hitl_approval: true
```

**Tier 4 Pattern**: Executive controller (CTO) makes strategic decisions based on business case, risk assessment, and cost/benefit analysis. Primary controller coordinates implementation with multiple supporting controllers. HITL approval required before proceeding.

---

## Understanding V5.0 Patterns

### Key V5.0 Innovations

#### 1. Question-Based Delegation

**Pattern**: Controllers ask specific questions to specialists instead of assigning predetermined tasks.

**Benefits**:
- **Expert-driven**: Leverages specialist knowledge to shape solution
- **Adaptive**: Can ask follow-up questions based on answers
- **Contextual**: Questions tailored to specific situation
- **Efficient**: Gets exactly the information needed

**Example from Tier 2**:
```
Controller: "What is the current implementation of the password reset flow?"
Backend-developer: "Current flow uses req.session.regenerate() which fails silently on latency..."
→ This answer shapes the controller's understanding and next questions
```

#### 2. Objective-Driven Planning

**Pattern**: Plan defines WHAT (objectives), controller determines HOW (questions + synthesis).

**Benefits**:
- **Simpler planning**: No need to break down tasks upfront
- **Expert autonomy**: Controller uses domain expertise to determine approach
- **Flexible**: Not locked into predetermined task list
- **Focused**: Clear success criteria without prescribing implementation

**Example from Tier 3**:
```yaml
Objective: "Implement OAuth2 authentication"
→ Controller determines: Ask architect about libraries, backend-developer about
   current auth structure, security-specialist about vulnerabilities, etc.
→ Synthesis: Use passport-oauth2 + oauth2orize, implement PKCE, add rate limiting
```

#### 3. Multi-Controller Coordination

**Pattern**: Complex workflows use primary + supporting controllers for specialized coordination.

**Benefits**:
- **Specialized expertise**: Architect focuses on design, security-specialist on security
- **Parallel coordination**: Controllers work in parallel on different aspects
- **Comprehensive solutions**: Multiple perspectives integrated into synthesis
- **Clear ownership**: Primary controller synthesizes, supporting controllers advise

**Example from Tier 3**:
```
Primary: engineering-manager (coordination)
Supporting: architect (architecture design), security-specialist (security requirements)
→ Each controller contributes their expertise
→ Primary controller synthesizes into coherent implementation plan
```

#### 4. Synthesis-Driven Implementation

**Pattern**: Controller synthesizes all answers into coherent solution before creating tasks.

**Benefits**:
- **Holistic view**: Considers all perspectives before deciding
- **Informed decisions**: Implementation reflects expert input
- **Cohesive plan**: Tasks derived from synthesis, not ad hoc
- **Rationale captured**: Why decisions were made is documented

**Example from Tier 2**:
```yaml
Questions: 4 targeted questions to specialists
Answers: Root cause identified, solution pattern recommended, security gaps found
Synthesis: "Refactor using promisified session.regenerate with timeout and fallback,
           following existing pattern in login.controller.js. Add token invalidation
           to fix security gap."
Tasks: 6 specific implementation tasks derived from synthesis
```

#### 5. Adaptive Coordination

**Pattern**: Controllers can adjust questions and approach based on what they discover.

**Benefits**:
- **Responsive**: Not locked into predetermined path
- **Discovery-driven**: Uncover issues and adjust course
- **Risk mitigation**: Identify and address problems early
- **Efficient**: Don't waste time on unnecessary questions

**Example from Tier 3**:
```
Controller asks: "What OAuth2 library should we use?"
Architect answers: "passport-oauth2 + oauth2orize"
Controller adapts: Asks follow-up about integration with existing passport-local
→ This follow-up question wouldn't have been asked without first answer
```

---

### V5.0 vs V4.0 Comparison

| Aspect | V4.0 (Previous) | V5.0 (Current) |
|--------|----------------|----------------|
| **Planning Output** | Detailed task list | High-level objectives |
| **Coordination** | Executor manages team | Controller coordinates via questions |
| **Agent Assignment** | Planner assigns upfront | Controller delegates dynamically |
| **Task Creation** | Planner creates tasks | Controller creates tasks from synthesis |
| **Flexibility** | Rigid (predetermined tasks) | Adaptive (question-based) |
| **Expertise** | Planner must know details | Controller leverages specialists |
| **Execution Monitoring** | Executor tracks tasks | Executor monitors controller |
| **File Output** | plan.yaml with tasks | plan.yaml + coordination_log.yaml |

---

### When to Use Each Tier

**Tier 0 (Trivial)**:
- Simple questions: "What is X?"
- No coordination needed
- Direct answer

**Tier 1 (Simple)**:
- Single-file changes: "Fix typo", "Update README"
- No controller needed
- Direct execution

**Tier 2 (Moderate)**:
- Bug fixes: "Fix auth bug"
- Small features: "Add email validation"
- Single controller (engineering-manager, editor, campaign-manager, etc.)
- 2-4 hours

**Tier 3 (Complex)**:
- Major features: "Implement OAuth2"
- Multi-system changes: "Add payment processing"
- Primary + 1-2 supporting controllers
- 8-12 hours

**Tier 4 (Expert)**:
- Architectural changes: "Migrate to microservices"
- Organization-wide impact: "Implement GDPR compliance"
- Executive + primary + 2-4 supporting controllers
- HITL approval required
- Weeks to months

---

### Best Practices

#### For Controllers

1. **Ask specific questions**: Not "Analyze X" but "What is the root cause of Y?"
2. **One question per agent**: Don't overwhelm specialists with multi-part questions
3. **Follow the answers**: Let answers shape next questions
4. **Synthesize thoroughly**: Don't just concatenate answers
5. **Create clear tasks**: Derived from synthesis, with acceptance criteria
6. **Document rationale**: Explain WHY decisions were made

#### For Execution Agents

1. **Answer completely**: Provide all context needed
2. **Be specific**: File paths, line numbers, code snippets
3. **Identify issues**: Point out problems discovered
4. **Recommend solutions**: Suggest approaches based on expertise
5. **Reference existing code**: Point to similar patterns
6. **Estimate effort**: Help controller plan implementation

#### For Planners

1. **Define clear objectives**: WHAT, not HOW
2. **Select appropriate controller**: Match controller expertise to domain
3. **Set success criteria**: Measurable, objective
4. **Provide context**: Background, constraints, stakeholders
5. **Estimate questions**: Help controller plan
6. **Set question limit**: Prevent runaway delegation

#### For Validators

1. **Check coordination quality**: Were questions targeted? Was synthesis coherent?
2. **Verify all objectives met**: Check success criteria, not just tasks
3. **Validate implementation**: Code quality, tests, security
4. **Check documentation**: coordination_log.yaml complete?
5. **Assess risk mitigation**: Were risks identified and addressed?

---

### Common Patterns

#### Pattern: Root Cause Analysis

Used in Tier 2 bug fixes.

```yaml
Question 1: "What is the current implementation?"
→ Specialist provides implementation details + identifies issue

Question 2: "What is the recommended pattern?"
→ Specialist provides solution approach

Question 3: "What security implications?"
→ Specialist identifies security concerns

Synthesis: Root cause + solution + security mitigations
```

#### Pattern: Architecture Design

Used in Tier 3 feature implementations.

```yaml
Question 1: "What technology should we use?"
→ Architect recommends libraries/frameworks

Question 2: "How does this integrate with existing system?"
→ Developer explains current structure

Question 3: "What security vulnerabilities should we prevent?"
→ Security specialist provides threat model

Synthesis: Architecture decision + integration plan + security requirements
```

#### Pattern: Strategic Planning

Used in Tier 4 organizational changes.

```yaml
Question 1: "What are the business drivers?"
→ Product owner explains business case

Question 2: "What are the costs and ROI?"
→ CFO provides financial analysis

Question 3: "What are the risks?"
→ Architect identifies technical risks

Executive Synthesis: Business case + financial justification + risk mitigation
→ Executive approval decision
```

---

## Summary

V5.0 introduces a **controller-centric, question-based delegation** pattern that:
- **Simplifies planning**: Objectives instead of detailed tasks
- **Leverages expertise**: Controllers use domain knowledge to determine HOW
- **Adapts to discoveries**: Questions shaped by answers received
- **Integrates perspectives**: Synthesis combines multiple expert viewpoints
- **Scales complexity**: Tier 2 (single controller) → Tier 4 (executive + primary + supporting)

This document provides complete reference implementations for **tier 2, 3, and 4** workflows, showing all files, agent interactions, and V5.0 patterns in action.

**For more information**:
- `docs/V5_ARCHITECTURE.md` - V5.0 architecture design
- `docs/V5_MIGRATION_GUIDE.md` - Migration from V4.0
- `CLAUDE.md` - V5.0 developer documentation

---

**Version**: 5.0
**Date**: 2026-01-13
**Lines**: 1200+ (comprehensive reference)
**Status**: Production-ready examples
