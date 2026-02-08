# Consolidated Flag Reference

Complete flag tables for all commands, used by `/helper --flags <command>`.

## /run Flags

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--interactive` | Boolean | Ask user preferences before starting | false | `/run Fix bug --interactive` |
| `--dry-run` | Boolean | Preview plan without executing | false | `/run Add feature --dry-run` |
| `--quiet` / `-q` | Boolean | Skip plan display | false | `/run Fix bug --quiet` |
| `--stream` | Boolean | Real-time progress updates | false | `/run Deploy --stream` |
| `--skip-preflight` | Boolean | Skip pre-flight validation | false | `/run Hotfix --skip-preflight` |
| `--team` | Boolean | Parallel team execution | false | `/run Build dashboard --team` |
| `--template <name>` | String | Use workflow template | auto-match | `/run Budget --template budget_creation` |
| `--domain <domain>` | String | Override domain detection | auto-detect | `/run Analyze --domain engineering` |
| `--tier <N>` | Number | Override tier (2-4) | auto-classify | `/run Migrate --tier 4` |
| `--confidence <N>` | Number | Detection confidence threshold | 0.7 | `/run Request --confidence 0.6` |

### /run Templates (12)

| Template | Tier | Domain | Use Case |
|----------|------|--------|----------|
| `bug_fix` | 2 | engineering | Bug fix workflow |
| `feature_addition` | 3 | engineering + product | Feature addition |
| `code_refactor` | 3 | engineering | Code refactoring |
| `architecture_migration` | 4 | engineering + HITL | Major migration |
| `content_creation` | 2 | creative/revenue | Content creation |
| `story_development` | 3 | creative | Story development |
| `campaign_planning` | 3 | revenue | Marketing campaign |
| `sales_forecast` | 2 | revenue/finance | Sales forecasting |
| `analysis_request` | 2 | universal | General analysis |
| `budget_creation` | 3 | finance | Budget creation |
| `question_answer` | 2 | universal | Q&A |
| `documentation_creation` | 2 | universal/engineering | Documentation |

---

## /designer Flags

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--resume {id}` | String | Resume previous session | -- | `/designer --resume designer_20260204_143022` |
| `--template <name>` | String | Use pre-built template | none | `/designer --template system-architecture` |
| `--focus <area>` | String | Focus design on area | all | `/designer --focus security` |
| `--detail <level>` | String | Detail depth (low/medium/high) | medium | `/designer --detail high` |

### /designer Templates (6)

| Template | Domain | What It Covers |
|----------|--------|----------------|
| `product-feature` | Software | User stories, flows, acceptance criteria |
| `ui-ux` | Software | Wireframes, interactions, accessibility |
| `system-architecture` | Software | Components, data flow, deployment |
| `api-design` | Software | REST/GraphQL, endpoints, schemas |
| `business-process` | Business | Workflows, RACI, timelines |
| `creative-content` | Creative | Story structure, characters, world |

---

## /review Flags

### Scope

| Flag | Description | Example |
|------|-------------|---------|
| `--scope changed` | Only changed files (git diff) | `/review --scope changed` |
| `--scope staged` | Only staged files | `/review --scope staged` |
| `--scope all` | Full codebase (default) | `/review --scope all` |

### Type

| Flag | Description | Example |
|------|-------------|---------|
| `--type code` | Code review | `/review --type code` |
| `--type documentation` | Documentation review | `/review --type documentation` |
| `--type content` | Content review | `/review --type content` |
| `--type design` | Design review | `/review --type design` |
| `--type process` | Process review | `/review --type process` |
| `--type data` | Data review | `/review --type data` |
| `--type infrastructure` | Infrastructure review | `/review --type infrastructure` |

### Focus

| Flag | Description | Example |
|------|-------------|---------|
| `--focus security` | Security analysis | `/review --focus security` |
| `--focus architecture` | Architecture review | `/review --focus architecture` |
| `--focus accessibility` | Accessibility check | `/review --focus accessibility` |
| `--focus performance` | Performance analysis | `/review --focus performance` |
| `--focus quality` | Code quality | `/review --focus quality` |

### Framework

| Flag | Description |
|------|-------------|
| `--framework nextjs` | Next.js patterns |
| `--framework react` | React patterns |
| `--framework vue` | Vue patterns |
| `--framework angular` | Angular patterns |
| `--framework django` | Django patterns |
| `--framework fastapi` | FastAPI patterns |
| `--framework express` | Express patterns |
| `--framework flask` | Flask patterns |
| `--framework rails` | Rails patterns |
| `--framework springboot` | Spring Boot patterns |
| `--framework laravel` | Laravel patterns |
| `--framework .net` | .NET patterns |
| `--auto-detect-framework` | Auto-detect (default) |

### Auto-Fix

| Flag | Description | Example |
|------|-------------|---------|
| `--auto-fix` | Generate fixes for all issues | `/review --auto-fix` |
| `--auto-fix safe` | Only safe auto-fixes | `/review --auto-fix safe` |
| `--auto-fix all` | All fixes including risky | `/review --auto-fix all` |
| `--apply-safe-fixes` | Apply safe fixes automatically | `/review --apply-safe-fixes` |
| `--dry-run` | Show what would be fixed | `/review --dry-run` |

### Quality Gates

| Flag | Description | Example |
|------|-------------|---------|
| `--quality-gate strict` | Block on any critical | `/review --quality-gate strict` |
| `--quality-gate standard` | Block on 3+ critical | `/review --quality-gate standard` |
| `--quality-gate relaxed` | Warn only | `/review --quality-gate relaxed` |
| `--run-tests` | Run tests after auto-fix | `/review --run-tests` |
| `--rollback-on-failure` | Rollback if tests fail | `/review --rollback-on-failure` |

### Execution

| Flag | Description | Example |
|------|-------------|---------|
| `--parallel` | Parallel execution (default) | `/review --parallel` |
| `--parallel-limit <N>` | Max simultaneous agents | `/review --parallel-limit 5` |
| `--sequential` | Disable parallel | `/review --sequential` |

### Confidence

| Flag | Description | Example |
|------|-------------|---------|
| `--confidence <N>` | Only report above threshold | `/review --confidence 0.8` |
| `--min-confidence <N>` | Minimum threshold | `/review --min-confidence 0.5` |
| `--show-confidence` | Display confidence scores | `/review --show-confidence` |

### Context

| Flag | Description | Example |
|------|-------------|---------|
| `--git-hotspots` | Prioritize frequently changed files | `/review --git-hotspots` |
| `--pr-context <branch>` | Review against branch | `/review --pr-context main` |
| `--recent-changes <period>` | Focus on recent changes | `/review --recent-changes 7d` |
| `--critical-first` | Security-critical files first | `/review --critical-first` |

### Output

| Flag | Description | Example |
|------|-------------|---------|
| `--output json` | JSON output | `/review --output json` |
| `--output markdown` | Markdown report (default) | `/review --output markdown` |
| `--output summary` | Executive summary only | `/review --output summary` |
| `--output detailed` | Detailed with all findings | `/review --output detailed` |
| `--save-report <path>` | Save report to file | `/review --save-report ./review.md` |

---

## /optimize Flags

### Type and Focus

| Flag | Description | Example |
|------|-------------|---------|
| `--type code` | Code optimization | `/optimize --type code` |
| `--type content` | Content optimization | `/optimize --type content` |
| `--type process` | Process optimization | `/optimize --type process` |
| `--type infrastructure` | Infrastructure optimization | `/optimize --type infrastructure` |
| `--type data` | Data optimization | `/optimize --type data` |
| `--type campaign` | Campaign optimization | `/optimize --type campaign` |
| `--type creative` | Creative optimization | `/optimize --type creative` |
| `--type sales` | Sales optimization | `/optimize --type sales` |
| `--focus performance` | Focus on performance | `/optimize --focus performance` |
| `--focus cost` | Focus on cost reduction | `/optimize --focus cost` |
| `--focus quality` | Focus on quality | `/optimize --focus quality` |

### Safety and Execution

| Flag | Description | Example |
|------|-------------|---------|
| `--safety safe` | Only safe optimizations (0-20% risk) | `/optimize --safety safe` |
| `--safety medium` | Up to medium risk (0-60%) | `/optimize --safety medium` |
| `--dry-run` | Preview without applying | `/optimize --dry-run` |
| `--incremental` | Apply one at a time | `/optimize --incremental` |
| `--parallel` | Parallel execution (default) | `/optimize --parallel` |

### Integration

| Flag | Description | Example |
|------|-------------|---------|
| `--plan-only` | Generate plan, hand off to /run | `/optimize --plan-only` |
| `--explore-first` | Start with /designer | `/optimize --explore-first` |
| `--review-after` | Trigger /review after | `/optimize --review-after` |

### Cross-File Analysis

| Flag | Description | Example |
|------|-------------|---------|
| `--cross-file` | Enable cross-file analysis | `/optimize --cross-file` |
| `--no-cross-file` | Skip cross-file (faster) | `/optimize --no-cross-file` |
| `--cross-file-only` | Only cross-file analysis | `/optimize --cross-file-only` |
| `--dependency-graph` | Generate dependency graph | `/optimize --dependency-graph` |

### Validation

| Flag | Description | Example |
|------|-------------|---------|
| `--validation comprehensive` | Full test suite + benchmarks | `/optimize --validation comprehensive` |
| `--rollback automatic` | Auto-rollback on failure | `/optimize --rollback automatic` |
| `--require-tests-pass` | Must pass all tests | `/optimize --require-tests-pass` |

---

## /team Flags

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--parallel` | Boolean | Force parallel execution | auto | `/team Build system --parallel` |
| `--dry-run` | Boolean | Preview team composition | false | `/team Build feature --dry-run` |
| `--lead <agent>` | String | Specify team lead | auto-detect | `/team Build API --lead engineering-manager` |
| `--members <N>` | Number | Max team members | 8 | `/team Build system --members 4` |
| `--display` | Boolean | Show team communication | false | `/team Build feature --display` |
| `--domain <domain>` | String | Override domain | auto-detect | `/team Campaign --domain grow` |
| `--tier <N>` | Number | Override tier | auto | `/team Build system --tier 4` |
| `--quiet` / `-q` | Boolean | Suppress output | false | `/team Build feature --quiet` |
| `--teammate-mode <mode>` | String | Display: auto/tmux/in-process | auto | `/team Build app --teammate-mode tmux` |
