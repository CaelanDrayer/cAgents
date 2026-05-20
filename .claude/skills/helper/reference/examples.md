# Real-World Usage Examples

Categorized examples for `/helper --examples`.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug` — see [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). All examples below use the V11 surface: `/improve --mode review|optimize|full`, `/run context init|show|update|clear`, and `/run --mode debug`._

## By Domain

### Engineering Examples

```bash
# Bug fixes
/run Fix the authentication timeout when sessions expire after 30 minutes
/run Resolve the CORS issue blocking API calls from the frontend

# Feature development
/run Add user profile page with avatar upload and settings
/run Implement OAuth2 with Google, GitHub, and email providers
/run Build a real-time notification system using WebSockets

# Design first, then build
/designer payment gateway integration --focus security
# (after design) auto-triggers: /run implement design from designer_20260204_143022

# Code review (V11: /review -> /improve --mode review)
/improve --mode review src/auth/ --focus security
/improve --mode review --scope changed --auto-fix safe --apply-safe-fixes
/improve --mode review --framework nextjs --quality-gate strict --run-tests

# Performance optimization (V11: /optimize -> /improve --mode optimize)
/improve --mode optimize src/ --type code --focus performance --safety safe
/improve --mode optimize "Reduce the API response time for the /users endpoint"
/improve --mode optimize --cross-file --require-tests-pass

# Review + optimize together with one shared baseline
/improve --mode full --scope src/auth/

# Parallel team execution
/team Implement complete user authentication with Google, GitHub, and email
/team Build the admin dashboard with user management, analytics, and settings widgets
/run Build user profile with avatar, settings, and activity log --team

# Systematic debugging when quick fixes fail (V11: /debug -> /run --mode debug)
/run --mode debug "Auth token expiry causes random logouts" --escalate

# Initialize project context (V11: /context init -> /run context init)
/run context init
```

### Creative Writing Examples

```bash
# Writing
/run Write a 3-chapter mystery story set in Victorian London
/run Write API documentation for the user management endpoints
/run Create a blog post about the benefits of microservices

# Design first
/designer a fantasy novel about a kingdom where magic is dying
/designer a game world with three warring factions and a neutral zone

# Content optimization
/improve --mode optimize blog/ --type content --focus quality
/improve --mode optimize README.md --type content
```

### Marketing / Sales Examples

```bash
# Campaigns
/run Plan Q4 product launch campaign
/run Create email nurture sequence for new signups
/run Write landing page copy for the premium tier

# Review
/improve --mode review marketing/ --type content

# Optimization
/improve --mode optimize --type campaign --focus performance
/improve --mode optimize --type sales
```

### Finance / Operations Examples

```bash
# Business tasks
/run Create Q4 budget with department breakdowns
/run Build FP&A report for the board meeting
/run Analyze last quarter's expenses vs budget

# Process optimization
/improve --mode optimize --type process "Streamline the invoice approval workflow"
/improve --mode optimize --type infrastructure --focus cost
```

### HR / People Examples

```bash
# HR tasks
/run Create job description for Senior Software Engineer
/run Design the onboarding workflow for new hires
/run Plan the Q1 team building activities

# Design first
/designer employee performance review system
```

### Support / Legal Examples

```bash
# Support
/run Handle escalated customer complaint about billing discrepancy
/run Create support FAQ for the new pricing tier

# Legal
/run Review the SaaS agreement for compliance issues
/run Create privacy policy update for GDPR compliance
```

### Debug-Mode and Context Examples

```bash
# Systematic debugging (use when 2+ quick fixes have failed)
/run --mode debug "Auth token expiry causes random logouts after 30 minutes"
/run --mode debug "Payment tests fail 1 in 5 runs with connection timeout"
/run --mode debug "Race condition in WebSocket reconnect" --escalate
/run --mode debug "Memory leak in event listener" --phase 3

# Product context management (V11 passthroughs)
/run context init                    # Initialize for new project
/run context show                    # Check current context
/run context update                  # Update after framework change
/run context clear                   # Remove and start fresh

# Debug-then-Fix pipeline
/run --mode debug "Intermittent 500 error in checkout"
# (after root cause identified)
/run Fix the race condition in session token refresh
```

## By Workflow Pattern

### Design-then-Build (Most Common Pipeline)

```bash
# Step 1: Design
/designer OAuth2 authentication system for our SPA
# ... interactive Q&A session (15-30 min) ...
# Step 2: Select "Build it now" at the end
# -> auto-triggers: /run implement design from designer_20260204_143022
```

### Design-then-Team-Build (Big Features)

```bash
# Step 1: Design
/designer microservices architecture for the e-commerce platform
# ... interactive Q&A session ...
# Step 2: Select "Build with team" at the end
# -> auto-triggers: /team implement design from designer_20260204_143022
```

### Review-then-Fix

```bash
# Step 1: Review
/improve --mode review src/ --focus security --auto-fix safe
# Reports: 3 critical, 7 high, 12 medium issues
# Safe fixes auto-applied for 5 issues

# Step 2: Fix remaining
/run Fix the 3 critical security issues from improve session improve_20260204
```

### Audit + Optimize Together

```bash
# Single run with shared baseline
/improve --mode full --scope src/api/
# Produces unified improve_report.md with both review findings
# and optimization deltas measured against the same baseline
```

### Plan-then-Run

```bash
# Step 1: Generate optimization plan only (review mode auto-fix off, optimize mode --dry-run)
/improve --mode optimize src/ --type code --dry-run
# Step 2: Implement after review
/run Apply the recommended optimizations from improve session improve_20260204
```

## By Complexity

### Simple Tasks (Tier 2)

```bash
/run Fix the typo on the about page
/run What is the best caching strategy for our API?
/run Update the README with installation instructions
/improve --mode review src/utils/helpers.ts
/improve --mode optimize src/utils/helpers.ts --type code
```

### Moderate Tasks (Tier 2-3)

```bash
/run Add pagination to the user list endpoint
/run Implement email verification for new signups
/designer search functionality for the product catalog
/improve --mode review src/auth/ --focus security --auto-fix safe
/improve --mode optimize src/api/ --type code --cross-file
```

### Complex Tasks (Tier 3-4)

```bash
/run Migrate from REST API to GraphQL
/run Implement complete payment processing with Stripe
/designer microservices architecture migration from monolith
/improve --mode review --quality-gate strict --run-tests --rollback-on-failure
/improve --mode optimize --type infrastructure --focus cost --validation comprehensive
/team Build the complete admin panel with user management, analytics, and reporting
```

## Flag Combinations (Power User)

```bash
# Comprehensive security review with auto-fix and tests
/improve --mode review src/ --focus security --auto-fix safe --apply-safe-fixes --run-tests --rollback-on-failure

# Fast review of recent changes
/improve --mode review --scope changed --parallel --confidence 0.7

# Full code optimization with cross-file analysis and post-review
/improve --mode full --scope src/ --cross-file --validation comprehensive --require-tests-pass

# Safe incremental optimization
/improve --mode optimize --safety safe --incremental --dry-run

# Team execution with specific lead and display
/team Build user authentication system --lead tech-lead --members 4 --display --teammate-mode tmux

# Interactive /run with template
/run Implement payment gateway --interactive --template feature_addition

# Preview optimization plan without executing
/improve --mode optimize src/ --type code --focus performance --dry-run
```
