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
```
