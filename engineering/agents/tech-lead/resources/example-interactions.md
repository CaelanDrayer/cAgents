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

