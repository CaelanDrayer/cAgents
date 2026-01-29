# Tech Lead Example Interactions

Detailed workflow examples for tech lead coordination tasks.

## Example 1: Complex Feature Coordination

**Request**: "Coordinate the team to implement user authentication with OAuth integration"

**Tech Lead Actions**:
1. Assess scope: OAuth integration touches frontend (login UI), backend (auth endpoints), security (token handling), QA (auth testing), infrastructure (session storage)
2. Check capacity: Frontend has 2 tasks pending, Backend is available, Security has capacity, QA can start in 2 days
3. Consult Architect: "Should we use Passport.js or implement custom OAuth2 client?" → Architect recommends Passport.js
4. Consult Security: "What are the security requirements for token storage and session management?" → Security provides requirements
5. Create task breakdown: T1 (Backend: OAuth endpoints), T2 (Frontend: Login UI), T3 (Backend: Session storage), T4 (QA: Auth test suite)
6. Delegate: Backend Dev → T1, Frontend Dev → T2 (can start now), Backend Dev → T3 (after T1), QA Lead → T4 (design tests now, execute after T3)
7. Monitor: Track via TodoWrite, check-in at handoff points (T1→T2 API contract, T3→T4 test environment)
8. Coordinate: Ensure API contract agreed between frontend/backend before implementation diverges

**Outcome**: Feature delivered in 5 days with clean handoffs, no rework, all security requirements met.

---

## Example 2: Production Incident Response

**Request**: "We have a production incident affecting checkout - coordinate the response"

**Tech Lead Actions**:
1. Classify as CRITICAL priority, immediately assess impact (checkout down = revenue loss)
2. Mobilize team: Pull Backend Dev and SysAdmin, notify stakeholders of incident
3. Read error logs: Backend Dev investigates root cause, SysAdmin checks infrastructure metrics
4. Identify cause: Database connection pool exhausted (misconfiguration in recent deployment)
5. Decision: Rollback to previous version immediately (safe, proven approach vs. attempting hot-fix)
6. Execute rollback: SysAdmin executes rollback procedure, Backend Dev monitors recovery
7. Verify restoration: QA Lead runs smoke tests on checkout flow, confirms functionality restored
8. Schedule post-mortem: Set 24h post-mortem to analyze root cause, improve deployment validation
9. Document incident: Record timeline, root cause, resolution steps, action items in episodic memory
10. Communicate: Update stakeholders that incident resolved, checkout restored, post-mortem scheduled

**Outcome**: Production restored in 12 minutes, full post-mortem completed, deployment process improved.

---

## Example 3: Priority Conflict Resolution

**Request**: "Prioritize these 5 feature requests and allocate team resources"

**Features**: A) Dark mode, B) Export to PDF, C) Advanced search, D) Email notifications, E) Performance optimization

**Tech Lead Actions**:
1. Consult Product Owner: "What's the business impact and urgency for each feature?"
   - A: Nice-to-have, user request (50 votes)
   - B: Customer contract commitment (due in 2 weeks)
   - C: Medium demand (150 votes)
   - D: High demand (300 votes), retention issue
   - E: Performance degraded 30% in last month
2. Assess technical complexity:
   - A: 3 days (Frontend)
   - B: 5 days (Backend + Frontend, new library)
   - C: 8 days (Backend + Frontend, complex queries)
   - D: 4 days (Backend, email service integration)
   - E: 5 days (Backend, profiling + optimization)
3. Classify priority:
   - **CRITICAL**: B (contract commitment), E (performance issue)
   - **HIGH**: D (retention issue)
   - **MEDIUM**: C (good demand but not urgent)
   - **LOW**: A (nice-to-have)
4. Create delivery plan:
   - Week 1: E (Performance) + B (PDF Export) - parallel execution
   - Week 2: D (Email Notifications)
   - Week 3: C (Advanced Search)
   - Backlog: A (Dark Mode)
5. Allocate resources and communicate plan to Product Owner and team
6. Document prioritization rationale in decisions/ folder

**Outcome**: Clear priority order, team aligned, stakeholder expectations managed.

---

## Example 4: Technical Disagreement Mediation

**Request**: "The backend and frontend teams disagree on the API contract - mediate"

**Disagreement**: Backend wants REST with pagination, Frontend wants GraphQL with custom queries

**Tech Lead Actions**:
1. Schedule alignment meeting: Backend Dev, Frontend Dev, and Architect
2. Understand positions:
   - Backend: "REST is simpler, we already have patterns, pagination is standard"
   - Frontend: "GraphQL reduces round-trips, we need flexibility for different views"
3. Consult Architect: "What's the long-term architectural direction?"
   - Architect: "We're moving toward GraphQL for new APIs, but REST is fine for simple CRUD"
4. Assess this specific case: "Is this API simple CRUD or complex querying?"
   - Analysis: This is a reporting API with many filter combinations → complex querying
5. Evaluate trade-offs:
   - REST: Faster to implement (3 days), but frontend needs 5+ endpoints
   - GraphQL: Slower to implement (5 days), but frontend gets exactly what it needs
6. Make decision: "Use GraphQL for this API based on complexity and flexibility needs"
7. Rationale: "The 2-day implementation cost is offset by better UX and aligns with our GraphQL migration"
8. Document decision with full context and rationale
9. Support team: Pair Backend Dev with Senior Dev who has GraphQL experience

**Outcome**: Disagreement resolved, technical decision made with clear rationale, team aligned.

---

## Example 5: Refactoring vs. Feature Trade-Off

**Request**: "Assess if we should refactor the payment module now or after launch"

**Context**: Payment module is complex (800 lines, low test coverage), new feature requires changes, launch is in 3 weeks

**Tech Lead Actions**:
1. Consult Senior Developer: "How bad is the payment module? What's the refactoring scope?"
   - Senior Dev: "It's messy but functional. Refactor would take 5 days, improve testability"
2. Consult QA Lead: "What's the testing risk if we modify it without refactoring?"
   - QA: "High risk - low test coverage means relying on manual testing"
3. Assess timeline impact:
   - Option 1: Add feature without refactor → 2 days, higher bug risk
   - Option 2: Refactor then add feature → 7 days, lower bug risk
4. Calculate trade-off:
   - Launch is in 21 days, feature is needed
   - Refactor + feature = 7 days, leaves 14 days buffer → feasible
5. Consult Product Owner: "Is the 5-day delay acceptable for better quality?"
   - Product Owner: "Yes, quality is important, we have buffer"
6. Decision: "Refactor now, then add feature - better long-term decision"
7. Allocate: Senior Developer leads refactor, includes comprehensive test suite
8. Document decision and rationale

**Outcome**: Refactor completed in 5 days, feature added in 2 days, launch proceeds with improved codebase.

---

## Example 6: Security Concern Escalation

**Request**: "Senior developer escalated a security concern - evaluate and decide"

**Concern**: User input in search feature is not sanitized, potential SQL injection vulnerability

**Tech Lead Actions**:
1. Classify as HIGH priority (security issue, potential data breach)
2. Consult Security Specialist: "Assess the severity and exploitation risk"
   - Security: "HIGH severity - SQL injection confirmed, immediate fix required"
3. Assess impact: "Is this in production?"
   - Senior Dev: "Deployed to production 2 weeks ago"
4. Evaluate options:
   - Option 1: Emergency fix (sanitize input) → 2 hours, deploy immediately
   - Option 2: Comprehensive fix (parameterized queries) → 1 day
   - Option 3: Disable search feature → 10 minutes
5. Consult Security: "Which approach is safest?"
   - Security: "Option 2 is best long-term, but Option 1 is adequate for immediate mitigation"
6. Decision: "Implement Option 1 immediately, then Option 2 tomorrow"
7. Allocate: Senior Dev implements emergency fix NOW, Backend Dev implements comprehensive fix tomorrow
8. Fast-track deployment: Emergency fix deployed within 1 hour
9. Post-incident: Schedule security review of all user input handling

**Outcome**: Vulnerability patched in 1 hour, comprehensive fix deployed next day.

---

## Example 7: Sprint Planning for Complex Feature

**Request**: "Plan a 2-week sprint for the new reporting dashboard feature"

**Tech Lead Actions**:
1. Consult Product Owner: "What are the must-have vs. nice-to-have features?"
   - Must-have: Basic charts (line, bar), date filtering, export to CSV
   - Nice-to-have: Advanced charts (pie, scatter), custom date ranges, PDF export
2. Consult Architect: "Any architectural considerations for reporting?"
   - Architect: "Reports should be read-only views, consider caching, use async job for large exports"
3. Break down into tasks:
   - Backend: T1 (API endpoints), T2 (CSV export), T3 (Caching layer)
   - Frontend: T4 (Chart library), T5 (Basic charts), T6 (Date filtering), T7 (Export button)
   - QA: T8 (Test plan), T9 (Test execution)
4. Estimate effort:
   - T1: 2 days, T2: 1 day, T3: 2 days
   - T4: 1 day, T5: 3 days, T6: 1 day, T7: 1 day
   - T8: 1 day, T9: 2 days
   - Total: 14 days
5. Identify dependencies:
   - T5 depends on T1 (API) and T4 (chart library)
   - T9 depends on all dev tasks complete
6. Allocate resources:
   - Week 1: Backend (T1, T2), Frontend (T4), QA (T8)
   - Week 2: Backend (T3), Frontend (T5, T6, T7), QA (T9)
7. Create sprint backlog with acceptance criteria for each task
8. Define done criteria: All tests pass, performance benchmarks met, documentation complete

**Outcome**: Clear 2-week sprint plan, team has full context, realistic timeline with buffer.

---

## Example 8: Critical Bugs Before Release

**Request**: "QA found critical bugs 2 days before release - determine next steps"

**Bugs**: 3 critical bugs in checkout flow (payment fails intermittently, email missing, inventory not updated)

**Tech Lead Actions**:
1. Classify situation: CRITICAL (blocks release, revenue impact)
2. Assess bugs with QA:
   - Bug 1: Payment intermittent failure (race condition) - 4 hours
   - Bug 2: Email not sending (SMTP config issue) - 1 hour
   - Bug 3: Inventory not updating (transaction rollback) - 6 hours
   - Total: 11 hours (1.5 days)
3. Evaluate options:
   - Option 1: Fix all bugs, delay release by 2 days
   - Option 2: Fix Bugs 1 & 2 (critical), defer Bug 3 (manual workaround)
   - Option 3: Abort release, aim for next week
4. Consult Product Owner:
   - Product Owner: "Can we do Option 2? Manual inventory is acceptable short-term"
5. Decision: "Option 2 - fix Bugs 1 & 2 immediately, release on time, fix Bug 3 in hotfix"
6. Allocate: Senior Dev → Bug 1, Backend Dev → Bug 2, Senior Dev → Bug 3 (as hotfix)
7. Coordinate with QA: Retest Bugs 1 & 2, full regression on release day
8. Communicate plan to stakeholders

**Outcome**: Release proceeds on schedule with critical bugs fixed, Bug 3 hotfix deployed next day.

---

## Example 9: Cross-Team Dependency Conflict

**Request**: "Frontend needs API changes but Backend team is fully allocated to infrastructure migration"

**Tech Lead Actions**:
1. Assess urgency: "Is this blocking frontend work?"
   - Frontend Dev: "Yes, we need 2 new endpoints to complete user dashboard (due in 1 week)"
2. Assess backend migration: "Can it be paused?"
   - Backend Dev: "Migration needs to complete by end of month, pausing adds risk"
3. Evaluate options:
   - Option 1: Pause migration, add API endpoints → delays migration
   - Option 2: Frontend waits → delays feature by 1 week
   - Option 3: Bring in Senior Developer to add endpoints
4. Assess team capacity: Senior Developer has capacity for 2-day task
5. Decision: "Option 3 - Senior Developer adds API endpoints"
6. Coordinate: Senior Dev pairs with Backend Dev for 1 hour to understand patterns
7. Delegate: Senior Dev implements, Backend Dev reviews
8. Monitor: Check-in daily to ensure API meets frontend needs

**Outcome**: Frontend unblocked, migration continues on schedule, no delays.

---

## Example 10: Scope Creep Identification

**Request**: "During implementation, Product Owner keeps adding 'small' features to the current sprint"

**Additions**: Original feature was "User profile editing", new requests: avatar upload, bio field, social links, privacy settings

**Tech Lead Actions**:
1. Identify scope creep: Original scope = edit name/email, new additions = 4 extra features
2. Assess impact: Each addition is 0.5-1 day, total 3 days added to 5-day feature → 60% scope increase
3. Check sprint capacity: Sprint is 80% allocated, 3 extra days exceeds capacity
4. Schedule conversation with Product Owner: "I've noticed the scope has grown significantly"
5. Present data:
   - "Original scope: 5 days (edit name/email)"
   - "Current scope: 8 days (with 4 additions)"
   - "Sprint capacity remaining: 5 days"
6. Offer options:
   - Option 1: Defer additions to next sprint
   - Option 2: Extend timeline by 1 sprint
   - Option 3: Prioritize: which 2 additions are must-have now?
7. Product Owner selects Option 3: "Avatar upload and bio are must-have, others can wait"
8. Recalculate: Original (5 days) + avatar (1 day) + bio (0.5 days) = 6.5 days → fits
9. Document agreement and scope boundaries
10. Communicate to team: Update task list, deliver agreed features

**Outcome**: Scope managed, sprint commitment maintained, remaining features deferred with agreement.
