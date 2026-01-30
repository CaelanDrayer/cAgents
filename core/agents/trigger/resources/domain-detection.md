# Domain Detection

3-method weighted detection for accurate domain classification.

## Detection Methods

### Method 1: Keyword-Based (30% weight)

Match keywords from user request against domain patterns:

| Domain | Keywords |
|--------|----------|
| Engineering | fix, bug, implement, code, api, database |
| Creative | write, story, content, copy, design |
| Revenue | campaign, marketing, sales, conversion |
| Finance | budget, cost, revenue, forecast |
| People | hire, recruit, onboard, culture |

### Method 2: Context-Based (40% weight)

Analyze project structure, git history, and file distribution:

```bash
# Git context
git status --short > workflow/git_status.txt
git log --oneline -20 > workflow/recent_commits.txt
git diff --stat > workflow/git_diff_stat.txt

# Project structure
find . -maxdepth 3 -name "package.json" -o -name "requirements.txt" \
  -o -name "Gemfile" -o -name "composer.json" -o -name "pom.xml" \
  -o -name "go.mod" -o -name "Cargo.toml" > workflow/project_files.txt

# File type distribution
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.md" \) | \
  cut -d'.' -f2- | sort | uniq -c > workflow/file_types.txt
```

### Method 3: Framework Detection (30% weight)

Detect specific frameworks and apply domain associations:

| Framework | Detection | Domain |
|-----------|-----------|--------|
| Next.js | next.config.js, `next` in package.json | engineering |
| React | `react` in package.json | engineering |
| Django | settings.py, manage.py | engineering |
| FastAPI | `fastapi` in requirements.txt | engineering |
| Flask | `flask` in requirements.txt | engineering |
| Vue | `vue` in package.json | engineering |
| Angular | angular.json | engineering |

## Score Calculation

```
domain_score = (
  keyword_score * 0.3 +
  context_score * 0.4 +
  framework_score * 0.3
) + historical_adjustment
```

## Confidence Thresholds

| Confidence | Action |
|------------|--------|
| >= 0.7 | Auto-proceed (high confidence) |
| 0.5-0.7 | Ask user with top 3 candidates |
| < 0.5 | Escalate to HITL (low confidence) |

## Multi-Domain Handling

If 2+ domains score > 0.6: Create multi-domain workflow with parent and child workflows per domain.

## Example Detection Result

```yaml
method: context_aware
timestamp: 2026-01-16T10:30:00Z

scores:
  engineering: 0.92
  product: 0.35
  creative: 0.12

selected_domain: engineering
confidence: 0.92
detection_methods_used:
  keyword: 0.80  # "fix", "bug", "auth"
  context: 0.95  # next.config.js found
  framework: 0.95  # Next.js detected

framework_detected: nextjs
multi_domain: false
user_confirmation_required: false
```
