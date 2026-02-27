# /optimize Command Flags Reference

## Basic Usage
```bash
/optimize                              # Auto-detect and optimize
/optimize "Make the app faster"        # Natural language goal
/optimize --interactive                # Ask preferences via AskUserQuestion
/optimize src/                         # Specific target
```

## Optimization Type
```bash
/optimize --type code                  # Force code optimization
/optimize --type content               # Force content optimization
/optimize --type process               # Force process optimization
/optimize --type infrastructure        # Force infrastructure optimization
/optimize --type data                  # Force data pipeline optimization
/optimize --type campaign              # Force campaign optimization
/optimize --type creative              # Force creative content optimization
/optimize --type sales                 # Force sales process optimization
/optimize --focus performance          # Focus on performance metrics
/optimize --focus cost                 # Focus on cost reduction
```

## Safety & Execution
```bash
/optimize --safety safe                # Only SAFE (0-20% risk)
/optimize --safety medium              # Up to MEDIUM (0-60% risk)
/optimize --dry-run                    # Preview without applying
/optimize --incremental                # Apply one at a time
/optimize --parallel                   # Run independent optimizations in parallel (default)
```

## Plugin Integration
```bash
/optimize --plan-only                  # Generate plan, trigger /run for implementation
/optimize --explore-first              # Start with /designer for exploration
/optimize --review-after               # Trigger /review after optimization
```

## Cross-File Analysis
```bash
/optimize --cross-file                 # Enable cross-file analysis (default for code)
/optimize --no-cross-file              # Skip cross-file analysis (faster)
/optimize --cross-file-only            # Only run cross-file analysis
/optimize --dependency-graph           # Generate dependency graph visualization
```

## History & Learning
```bash
/optimize --history                    # Show past optimization sessions and outcomes
/optimize --history --domain make      # Show history for specific domain
```

## Benchmark Integration
```bash
/optimize --benchmark auto             # Auto-detect appropriate benchmark tool
/optimize --benchmark lighthouse       # Use Lighthouse for web performance
/optimize --benchmark k6               # Use k6 for API load testing
/optimize --benchmark hyperfine        # Use hyperfine for CLI performance
```

## Continuous Mode (Planned)

> **Note**: Continuous mode is not yet implemented. These flags are reserved for future use.

```bash
/optimize --continuous --interval 1d   # (Planned) Run daily optimization scan
```

## Validation
```bash
/optimize --validation comprehensive   # Full test suite + benchmarks
/optimize --rollback automatic         # Auto-rollback on failure (default)
/optimize --require-tests-pass         # Must pass all tests
```

## Combined Examples

```bash
# Performance optimization with safety
/optimize src/ --type code --focus performance --safety safe --require-tests-pass

# Content SEO optimization
/optimize blog/ --type content --focus quality

# Infrastructure cost optimization (dry run first)
/optimize --type infrastructure --focus cost --dry-run

# Full optimization with post-review
/optimize src/ --cross-file --review-after --validation comprehensive

# Generate plan only, delegate to /run
/optimize --type code --plan-only

# Explore options first via /designer
/optimize --explore-first
```
