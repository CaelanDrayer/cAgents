# /review - Universal Review

## Usage
```bash
/review <target>
/review src/auth/                    # Review auth module
/review --baseline main              # Compare against baseline
/review --profile security           # Security-focused review
/review --suppress low               # Suppress low severity
```

## How It Works

1. Scope analysis and framework detection
2. Parallel agent execution across review dimensions
3. Auto-fix generation for fixable issues
4. Quality gates with confidence scoring
5. Aggregate report generation

## Review Types
Code, documentation, content, designs, processes, data, infrastructure.

## Options
- `--baseline <branch>`: Compare against baseline branch
- `--profile <name>`: Use review profile (security, performance, etc.)
- `--suppress <level>`: Suppress findings below severity level

## Context Mode
`context: fork` -- parallel agent execution.

## Output
- `reports/final_report.md`
- `reports/auto_fixes.yaml`
- `reports/quality_gates.yaml`
