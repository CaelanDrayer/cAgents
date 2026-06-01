# Real-World Usage Examples

Categorized examples for `/helper --examples`.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug`; v12.1.2 folded `/improve` into `/run` via the keyword router. See [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). All examples below use the v12.1.2 surface: `/run review|audit|optimize|improve <target>` (keyword router), `/run context init|show|update|clear`, and `/run --mode debug`._

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

# Code review (v12.1.2: /improve --mode review -> /run review)
/run review src/auth/ --focus security
/run review --scope changed --auto-fix safe --apply-safe-fixes
/run review --framework nextjs --quality-gate strict --run-tests

# Performance optimization (v12.1.2: /improve --mode optimize -> /run optimize)
/run optimize src/ --type code --focus performance --safety safe
/run optimize "Reduce the API response time for the /users endpoint"
/run optimize --cross-file --require-tests-pass

# Review + optimize together with one shared baseline (v12.1.2: --mode full -> /run improve)
/run improve src/auth/

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
/run optimize blog/ --type content --focus quality
/run optimize README.md --type content
```

### Marketing / Sales Examples

```bash
# Campaigns
/run Plan Q4 product launch campaign
/run Create email nurture sequence for new signups
/run Write landing page copy for the premium tier

# Review
/run review marketing/ --type content

# Optimization
/run optimize --type campaign --focus performance
/run optimize --type sales
```

### Finance / Operations Examples

```bash
# Business tasks
/run Create Q4 budget with department breakdowns
/run Build FP&A report for the board meeting
/run Analyze last quarter's expenses vs budget

# Process optimization
/run optimize --type process "Streamline the invoice approval workflow"
/run optimize --type infrastructure --focus cost
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
/run review src/ --focus security --auto-fix safe
# Reports: 3 critical, 7 high, 12 medium issues
# Safe fixes auto-applied for 5 issues

# Step 2: Fix remaining
/run Fix the 3 critical security issues from improve session improve_20260204
```

### Audit + Optimize Together

```bash
# Single run with shared baseline
/run improve src/api/
# Produces unified improve_report.md with both review findings
# and optimization deltas measured against the same baseline
```

### Plan-then-Run

```bash
# Step 1: Generate optimization plan only (review mode auto-fix off, optimize mode --dry-run)
/run optimize src/ --type code --dry-run
# Step 2: Implement after review
/run Apply the recommended optimizations from improve session improve_20260204
```

## By Complexity

### Simple Tasks (Tier 2)

```bash
/run Fix the typo on the about page
/run What is the best caching strategy for our API?
/run Update the README with installation instructions
/run review src/utils/helpers.ts
/run optimize src/utils/helpers.ts --type code
```

### Moderate Tasks (Tier 2-3)

```bash
/run Add pagination to the user list endpoint
/run Implement email verification for new signups
/designer search functionality for the product catalog
/run review src/auth/ --focus security --auto-fix safe
/run optimize src/api/ --type code --cross-file
```

### Complex Tasks (Tier 3-4)

```bash
/run Migrate from REST API to GraphQL
/run Implement complete payment processing with Stripe
/designer microservices architecture migration from monolith
/run review --quality-gate strict --run-tests --rollback-on-failure
/run optimize --type infrastructure --focus cost --validation comprehensive
/team Build the complete admin panel with user management, analytics, and reporting
```

## Flag Combinations (Power User)

```bash
# Comprehensive security review with auto-fix and tests
/run review src/ --focus security --auto-fix safe --apply-safe-fixes --run-tests --rollback-on-failure

# Fast review of recent changes
/run review --scope changed --parallel --confidence 0.7

# Full code optimization with cross-file analysis and post-review
/run improve src/ --cross-file --validation comprehensive --require-tests-pass

# Safe incremental optimization
/run optimize --safety safe --incremental --dry-run

# Team execution with specific lead and display
/team Build user authentication system --lead tech-lead --members 4 --display --teammate-mode tmux

# Interactive /run with template
/run Implement payment gateway --interactive --template feature_addition

# Preview optimization plan without executing
/run optimize src/ --type code --focus performance --dry-run
```
