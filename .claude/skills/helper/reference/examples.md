# Real-World Usage Examples

Categorized examples for `/helper --examples`.

## By Domain

### Engineering Examples

```bash
# Bug fixes
/run Fix the authentication timeout when sessions expire after 30 minutes
/run Debug why the payment webhook returns 500 errors
/run Resolve the CORS issue blocking API calls from the frontend

# Feature development
/run Add user profile page with avatar upload and settings
/run Implement OAuth2 with Google, GitHub, and email providers
/run Build a real-time notification system using WebSockets

# Design first, then build
/designer payment gateway integration --focus security
# (after design) auto-triggers: /run implement design from designer_20260204_143022

# Code review
/review src/auth/ --focus security
/review --scope changed --auto-fix safe --apply-safe-fixes
/review --framework nextjs --quality-gate strict --run-tests

# Performance optimization
/optimize src/ --type code --focus performance --safety safe
/optimize "Reduce the API response time for the /users endpoint"
/optimize --cross-file --require-tests-pass

# Parallel team execution
/team Implement complete user authentication with Google, GitHub, and email
/team Build the admin dashboard with user management, analytics, and settings widgets
/run Build user profile with avatar, settings, and activity log --team

# Systematic debugging when quick fixes fail
/debug Auth token expiry causes random logouts --escalate

# Initialize project context
/context init
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
/optimize blog/ --type content --focus quality
/optimize README.md --type content
```

### Marketing / Sales Examples

```bash
# Campaigns
/run Plan Q4 product launch campaign
/run Create email nurture sequence for new signups
/run Write landing page copy for the premium tier

# Review
/review marketing/ --type content

# Optimization
/optimize --type campaign --focus performance
/optimize --type sales
```

### Finance / Operations Examples

```bash
# Business tasks
/run Create Q4 budget with department breakdowns
/run Build FP&A report for the board meeting
/run Analyze last quarter's expenses vs budget

# Process optimization
/optimize --type process "Streamline the invoice approval workflow"
/optimize --type infrastructure --focus cost
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

### Debug and Context Examples

```bash
# Systematic debugging (use when 2+ quick fixes have failed)
/debug Auth token expiry causes random logouts after 30 minutes
/debug Payment tests fail 1 in 5 runs with "connection timeout"
/debug Race condition in WebSocket reconnect --escalate
/debug Memory leak in event listener -- phase 3

# Product context management
/context init                    # Initialize for new project
/context show                    # Check current context
/context update                  # Update after framework change
/context clear                   # Remove and start fresh

# Debug-then-Fix pipeline
/debug Fix the intermittent 500 error in checkout
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
/review src/ --focus security --auto-fix safe
# Reports: 3 critical, 7 high, 12 medium issues
# Safe fixes auto-applied for 5 issues

# Step 2: Fix remaining
/run Fix the 3 critical security issues from review session review_20260204
```

### Optimize-then-Review

```bash
# Step 1: Optimize
/optimize src/ --type code --focus performance --review-after
# -> automatically triggers review after optimization completes

# Or manually:
/optimize src/ --type code --focus performance
# Then:
/review src/ --focus quality
```

### Explore-then-Optimize

```bash
# Step 1: Explore optimization approach
/optimize --explore-first
# -> triggers /designer to explore options

# Or:
/designer performance optimization strategy for our API
# Then:
/optimize src/api/ --type code --focus performance
```

### Plan-then-Run

```bash
# Step 1: Generate optimization plan only
/optimize src/ --type code --plan-only
# -> generates plan and hands off to /run for implementation
```

## By Complexity

### Simple Tasks (Tier 2)

```bash
/run Fix the typo on the about page
/run What is the best caching strategy for our API?
/run Update the README with installation instructions
/review src/utils/helpers.ts
/optimize src/utils/helpers.ts --type code
```

### Moderate Tasks (Tier 2-3)

```bash
/run Add pagination to the user list endpoint
/run Implement email verification for new signups
/designer search functionality for the product catalog
/review src/auth/ --focus security --auto-fix safe
/optimize src/api/ --type code --cross-file
```

### Complex Tasks (Tier 3-4)

```bash
/run Migrate from REST API to GraphQL
/run Implement complete payment processing with Stripe
/designer microservices architecture migration from monolith
/review --quality-gate strict --run-tests --rollback-on-failure
/optimize --type infrastructure --focus cost --validation comprehensive
/team Build the complete admin panel with user management, analytics, and reporting
```

## Flag Combinations (Power User)

```bash
# Comprehensive security review with auto-fix and tests
/review src/ --focus security --auto-fix safe --apply-safe-fixes --run-tests --rollback-on-failure

# Fast review of recent changes
/review --scope changed --parallel --stream --confidence 0.7

# Full code optimization with cross-file analysis and post-review
/optimize src/ --type code --cross-file --review-after --validation comprehensive --require-tests-pass

# Safe incremental optimization
/optimize --safety safe --incremental --dry-run

# Team execution with specific lead and display
/team Build user authentication system --lead engineering-manager --members 4 --display --teammate-mode tmux

# Interactive /run with template
/run Implement payment gateway --interactive --template feature_addition

# Preview optimization plan without executing
/optimize src/ --type code --focus performance --dry-run
```
