# /review Command Flags Reference

## Complete Flag Categories

### Basic Usage (Backward Compatible)
```bash
/review                           # Auto-detect and review target
/review src/                      # Review specific path
/review src/auth/login.ts         # Review specific file
```

### Scope Filters
```bash
/review --scope changed           # Only changed files (git diff)
/review --scope staged            # Only staged files
/review --scope all               # Full codebase (default)
```

### Review Type
```bash
/review --type code               # Force code review
/review --type documentation      # Force documentation review
/review --type content            # Force content review
/review --type design             # Force design review
/review --type process            # Force business process review
/review --type data               # Force data review
/review --type infrastructure     # Force infrastructure review
```

### Focus Areas
```bash
/review --focus security          # Focus on security
/review --focus architecture      # Focus on architecture
/review --focus accessibility     # Focus on accessibility
/review --focus performance       # Focus on performance
/review --focus quality           # Focus on code quality
```

### Framework Detection
```bash
/review --framework nextjs        # Force Next.js patterns
/review --framework react         # Force React patterns
/review --framework vue           # Force Vue patterns
/review --framework angular       # Force Angular patterns
/review --framework django        # Force Django patterns
/review --framework fastapi       # Force FastAPI patterns
/review --framework express       # Force Express patterns
/review --framework flask         # Force Flask patterns
/review --framework rails         # Force Rails patterns
/review --framework springboot    # Force Spring Boot patterns
/review --framework laravel       # Force Laravel patterns
/review --framework .net          # Force .NET patterns
/review --auto-detect-framework   # Auto-detect framework (default)
```

### Parallel Execution
```bash
/review --parallel                # Enable parallel execution (default)
/review --parallel-limit 5        # Max 5 agents simultaneously
/review --sequential              # Disable parallel (debug mode)
```

### Auto-Fix Options
```bash
/review --auto-fix                # Generate auto-fixes for all issues
/review --auto-fix safe           # Only safe auto-fixes
/review --auto-fix all            # All auto-fixes (including risky)
/review --apply-safe-fixes        # Auto-apply safe fixes without asking
/review --dry-run                 # Show what would be fixed (no changes)
```

### Quality Gates
```bash
/review --quality-gate strict     # Block on any critical issue
/review --quality-gate standard   # Block on 3+ critical issues
/review --quality-gate relaxed    # Warn only, don't block
/review --run-tests               # Run tests after auto-fix
/review --rollback-on-failure     # Auto-rollback if tests fail
```

### Interactive Mode
```bash
/review --interactive             # Ask user preferences before review
/review --stream                  # Stream results in real-time (default)
/review --no-stream               # Wait for all agents to complete
```

### Confidence Thresholds
```bash
/review --confidence 0.8          # Only report issues with 80%+ confidence
/review --min-confidence 0.5      # Minimum confidence threshold
/review --show-confidence         # Display confidence scores in report
```

### Context-Aware
```bash
/review --git-hotspots            # Prioritize frequently changed files
/review --pr-context main         # Review against main branch
/review --recent-changes 7d       # Focus on files changed in last 7 days
/review --critical-first          # Review security-critical files first (default)
```

### Output Options
```bash
/review --output json             # JSON output
/review --output markdown         # Markdown report (default)
/review --output summary          # Executive summary only
/review --output detailed         # Detailed report with all findings
/review --save-report ./review.md # Save report to file
```

### Review Profiles
```bash
/review --profile pre-merge       # Load "pre-merge" profile (strict + auto-fix + tests)
/review --profile security-audit  # Load "security-audit" profile
/review --profile quick           # Load "quick" profile (changed files, summary output)
/review --profile content-review  # Load "content-review" profile (non-code focused)
```

Profile config location: `.claude/review-profiles.yaml` (project) or `Agent_Memory/_system/commands/review/profiles.yaml` (user).
Explicit flags always override profile values.

### Baseline & Suppression
```bash
/review --baseline                # Compare against saved baseline, show only new findings
/review --reset-baseline          # Clear baseline, review everything fresh
/review --suppress F-001          # Mark finding F-001 as suppressed (skip review)
/review --suppress F-001 --reason "Known limitation, deferred to Q3"  # With reason
```

### Quality Trends
```bash
/review --trends                  # Show quality trend for the target (last 5 reviews)
/review --trends --target src/    # Show trends for specific target
```

### Pattern Learning
```bash
/review --learn                   # Update pattern database from findings
/review --no-learn                # Don't update patterns
/review --pattern-stats           # Show pattern effectiveness statistics
```

## Combined Examples

```bash
# Comprehensive security review with auto-fix
/review src/ --focus security --auto-fix safe --apply-safe-fixes --run-tests

# Fast review of recent changes with parallel execution
/review --scope changed --parallel --stream --confidence 0.7

# Framework-specific review with quality gates
/review --framework nextjs --quality-gate strict --run-tests --rollback-on-failure

# Interactive review with dry-run
/review --interactive --dry-run --show-confidence

# Git-aware review of hot spots
/review --git-hotspots --recent-changes 7d --critical-first

# Full review with detailed report
/review --parallel --auto-fix all --output detailed --save-report ./full-review.md

# Pre-merge review using saved profile
/review --profile pre-merge

# Baseline review -- only show new findings since last review
/review src/ --baseline --output summary

# Suppress a known finding
/review --suppress F-042 --reason "Accepted risk, tracked in JIRA-1234"

# Review a business process document (non-code)
/review docs/onboarding-workflow.md --type process --focus quality

# Review marketing content
/review content/blog/ --type content --profile content-review

# Show quality trends over time
/review --trends --target src/

# Security audit profile with baseline filtering
/review --profile security-audit --baseline
```
