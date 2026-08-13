# Real-World Usage Examples

Categorized examples for `/helper --examples`.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug`; v12.1.2 folded `/improve` into `/act` via the keyword router. See [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). All examples below use the v12.1.2 surface: `/act review|audit|optimize|improve <target>` (keyword router), `/act context init|show|update|clear`, and `/act --mode debug`._

## By Domain

### Engineering Examples

```bash
# Bug fixes
/act Fix the authentication timeout when sessions expire after 30 minutes
/act Resolve the CORS issue blocking API calls from the frontend

# Feature development
/act Add user profile page with avatar upload and settings
/act Implement OAuth2 with Google, GitHub, and email providers
/act Build a real-time notification system using WebSockets

# Design first, then build
/designer payment gateway integration --focus security
# (after design) auto-triggers: /act implement design from designer_20260204_143022

# Code review (v12.1.2: /improve --mode review -> /act review)
/act review src/auth/ --focus security
/act review --scope changed --auto-fix safe --apply-safe-fixes
/act review --framework nextjs --quality-gate strict --run-tests

# Performance optimization (v12.1.2: /improve --mode optimize -> /act optimize)
/act optimize src/ --type code --focus performance --safety safe
/act optimize "Reduce the API response time for the /users endpoint"
/act optimize --cross-file --require-tests-pass

# Review + optimize together with one shared baseline (v12.1.2: --mode full -> /act improve)
/act improve src/auth/

# Parallel team execution
/team Implement complete user authentication with Google, GitHub, and email
/team Build the admin dashboard with user management, analytics, and settings widgets
/act Build user profile with avatar, settings, and activity log --team

# Systematic debugging when quick fixes fail (V11: /debug -> /act --mode debug)
/act --mode debug "Auth token expiry causes random logouts" --escalate

# Initialize project context (V11: /context init -> /act context init)
/act context init
```

### Creative Writing Examples

```bash
# Writing
/act Write a 3-chapter mystery story set in Victorian London
/act Write API documentation for the user management endpoints
/act Create a blog post about the benefits of microservices

# Design first
/designer a fantasy novel about a kingdom where magic is dying
/designer a game world with three warring factions and a neutral zone

# Content optimization
/act optimize blog/ --type content --focus quality
/act optimize README.md --type content
```

### Marketing / Sales Examples

```bash
# Campaigns
/act Plan Q4 product launch campaign
/act Create email nurture sequence for new signups
/act Write landing page copy for the premium tier

# Review
/act review marketing/ --type content

# Optimization
/act optimize --type campaign --focus performance
/act optimize --type sales
```

### Finance / Operations Examples

```bash
# Business tasks
/act Create Q4 budget with department breakdowns
/act Build FP&A report for the board meeting
/act Analyze last quarter's expenses vs budget

# Process optimization
/act optimize --type process "Streamline the invoice approval workflow"
/act optimize --type infrastructure --focus cost
```

### HR / People Examples

```bash
# HR tasks
/act Create job description for Senior Software Engineer
/act Design the onboarding workflow for new hires
/act Plan the Q1 team building activities

# Design first
/designer employee performance review system
```

### Support / Legal Examples

```bash
# Support
/act Handle escalated customer complaint about billing discrepancy
/act Create support FAQ for the new pricing tier

# Legal
/act Review the SaaS agreement for compliance issues
/act Create privacy policy update for GDPR compliance
```

### Debug-Mode and Context Examples

```bash
# Systematic debugging (use when 2+ quick fixes have failed)
/act --mode debug "Auth token expiry causes random logouts after 30 minutes"
/act --mode debug "Payment tests fail 1 in 5 runs with connection timeout"
/act --mode debug "Race condition in WebSocket reconnect" --escalate
/act --mode debug "Memory leak in event listener" --phase 3

# Product context management (V11 passthroughs)
/act context init                    # Initialize for new project
/act context show                    # Check current context
/act context update                  # Update after framework change
/act context clear                   # Remove and start fresh

# Debug-then-Fix pipeline
/act --mode debug "Intermittent 500 error in checkout"
# (after root cause identified)
/act Fix the race condition in session token refresh
```

## By Workflow Pattern

### Design-then-Build (Most Common Pipeline)

```bash
# Step 1: Design
/designer OAuth2 authentication system for our SPA
# ... interactive Q&A session (15-30 min) ...
# Step 2: Select "Build it now" at the end
# -> auto-triggers: /act implement design from designer_20260204_143022
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
/act review src/ --focus security --auto-fix safe
# Reports: 3 critical, 7 high, 12 medium issues
# Safe fixes auto-applied for 5 issues

# Step 2: Fix remaining
/act Fix the 3 critical security issues from improve session improve_20260204
```

### Audit + Optimize Together

```bash
# Single run with shared baseline
/act improve src/api/
# Produces unified improve_report.md with both review findings
# and optimization deltas measured against the same baseline
```

### Plan-then-Run

```bash
# Step 1: Generate optimization plan only (review mode auto-fix off, optimize mode --dry-run)
/act optimize src/ --type code --dry-run
# Step 2: Implement after review
/act Apply the recommended optimizations from improve session improve_20260204
```

## By Complexity

### Simple Tasks (Tier 2)

```bash
/act Fix the typo on the about page
/act What is the best caching strategy for our API?
/act Update the README with installation instructions
/act review src/utils/helpers.ts
/act optimize src/utils/helpers.ts --type code
```

### Moderate Tasks (Tier 2-3)

```bash
/act Add pagination to the user list endpoint
/act Implement email verification for new signups
/designer search functionality for the product catalog
/act review src/auth/ --focus security --auto-fix safe
/act optimize src/api/ --type code --cross-file
```

### Complex Tasks (Tier 3-4)

```bash
/act Migrate from REST API to GraphQL
/act Implement complete payment processing with Stripe
/designer microservices architecture migration from monolith
/act review --quality-gate strict --run-tests --rollback-on-failure
/act optimize --type infrastructure --focus cost --validation comprehensive
/team Build the complete admin panel with user management, analytics, and reporting
```

## Flag Combinations (Power User)

```bash
# Comprehensive security review with auto-fix and tests
/act review src/ --focus security --auto-fix safe --apply-safe-fixes --run-tests --rollback-on-failure

# Fast review of recent changes
/act review --scope changed --parallel --confidence 0.7

# Full code optimization with cross-file analysis and post-review
/act improve src/ --cross-file --validation comprehensive --require-tests-pass

# Safe incremental optimization
/act optimize --safety safe --incremental --dry-run

# Team execution with specific lead and display
/team Build user authentication system --lead tech-lead --members 4 --display --teammate-mode tmux

# Interactive /act with template
/act Implement payment gateway --interactive --template feature_addition

# Preview optimization plan without executing
/act optimize src/ --type code --focus performance --dry-run
```
