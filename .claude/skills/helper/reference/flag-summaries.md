# Consolidated Flag Reference

Complete flag tables for all commands, used by `/helper --flags <command>`.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug` — see [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). Their flag surfaces moved to `/improve` (review and optimize modes), `/run context` (passthrough), and `/run --mode debug` (debug mode)._

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
| `--resume <id>` | String | Resume an interrupted session | none | `/run --resume run_20260207_143022` |
| `--mode debug` | Subcommand-flag | Run the systematic 4-phase debugging protocol (V11 replacement for `/debug`) | none | `/run --mode debug "Auth token expiry causes random logouts"` |
| `--escalate` | Boolean | Used with `--mode debug`; force escalation report after investigation | false | `/run --mode debug ... --escalate` |
| `--phase <1-4>` | Number | Used with `--mode debug`; start at a specific debugging phase | 1 | `/run --mode debug ... --phase 3` |

### /run context Passthrough (V11 replacement for /context)

| Form | Description |
|------|-------------|
| `/run context init` | Auto-detect and initialize product context |
| `/run context show` | Display current product context |
| `/run context update` | Interactively update product context |
| `/run context clear` | Remove the product context document |

The product context document lives at `cagents-memory/_projects/{hash}/product_context.yaml`.

### /run Templates (12)

| Template | Tier | Domain | Use Case |
|----------|------|--------|----------|
| `bug_fix` | 2 | engineering | Bug fix workflow |
| `feature_addition` | 3 | engineering + product | Feature addition |
| `code_refactor` | 3 | engineering | Code refactoring |
| `architecture_migration` | 4 | engineering + HITL | Major migration |
| `content_creation` | 2 | creative/growth | Content creation |
| `story_development` | 3 | creative | Story development |
| `campaign_planning` | 3 | growth | Marketing campaign |
| `sales_forecast` | 2 | growth/business | Sales forecasting |
| `analysis_request` | 2 | universal | General analysis |
| `budget_creation` | 3 | business | Budget creation |
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

## /improve Flags

`/improve` is the V11 replacement for `/review` and `/optimize`. Mode selection determines which subset of flags applies.

### Mode Selection

| Flag | Description | Example |
|------|-------------|---------|
| `--mode review` | Run review pipeline (default) | `/improve --mode review src/` |
| `--mode optimize` | Run optimize pipeline | `/improve --mode optimize src/ --type code` |
| `--mode full` | Run review + optimize with one shared baseline (requires `--scope`) | `/improve --mode full --scope src/` |

### Common Flags (all modes)

| Flag | Description | Example |
|------|-------------|---------|
| `--scope <path>` | Required for `--mode full`, optional otherwise | `/improve --mode full --scope src/auth/` |
| `--dry-run` | Plan without applying changes | `/improve --mode optimize --dry-run` |
| `--history` | Append run to `_projects/{hash}/improve/history.yaml` | `/improve --mode review --history` |

### Review-Mode Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--scope changed\|staged\|all` | Scope filter | `/improve --mode review --scope changed` |
| `--type code\|documentation\|content\|design\|process\|data\|infrastructure` | Review type | `/improve --mode review --type infrastructure` |
| `--focus security\|architecture\|accessibility\|performance\|quality` | Focus area | `/improve --mode review --focus security` |
| `--framework nextjs\|react\|vue\|...` | Force framework detection | `/improve --mode review --framework nextjs` |
| `--auto-fix safe\|all` | Generate or apply auto-fixes | `/improve --mode review --auto-fix safe` |
| `--apply-safe-fixes` | Apply safe auto-fixes automatically | `/improve --mode review --apply-safe-fixes` |
| `--quality-gate strict\|standard\|relaxed` | Quality gate severity | `/improve --mode review --quality-gate strict` |
| `--run-tests` | Run tests after auto-fix | `/improve --mode review --run-tests` |
| `--rollback-on-failure` | Rollback if tests fail | `/improve --mode review --rollback-on-failure` |
| `--baseline <id>` | Use named baseline | `/improve --mode review --baseline 2026-q1` |
| `--suppress <id>` | Suppress findings tagged with id | `/improve --mode review --suppress finding-42` |
| `--confidence <N>` | Only report findings above threshold | `/improve --mode review --confidence 0.8` |
| `--show-confidence` | Display confidence scores | `/improve --mode review --show-confidence` |
| `--git-hotspots` | Prioritize frequently changed files | `/improve --mode review --git-hotspots` |
| `--pr-context <branch>` | Review against branch | `/improve --mode review --pr-context main` |
| `--output json\|markdown\|summary\|detailed` | Output format | `/improve --mode review --output json` |
| `--save-report <path>` | Save report to file | `/improve --mode review --save-report ./review.md` |

### Optimize-Mode Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--type code\|content\|process\|infrastructure\|data\|campaign\|creative\|sales` | Optimization type | `/improve --mode optimize --type code` |
| `--focus performance\|cost\|quality` | Focus area | `/improve --mode optimize --focus cost` |
| `--safety safe\|medium` | Risk tolerance | `/improve --mode optimize --safety safe` |
| `--incremental` | Apply one optimization at a time | `/improve --mode optimize --incremental` |
| `--cross-file` | Enable cross-file analysis | `/improve --mode optimize --cross-file` |
| `--no-cross-file` | Skip cross-file analysis (faster) | `/improve --mode optimize --no-cross-file` |
| `--dependency-graph` | Generate dependency graph | `/improve --mode optimize --dependency-graph` |
| `--benchmark auto\|lighthouse\|k6\|hyperfine` | Choose benchmark tool | `/improve --mode optimize --benchmark lighthouse` |
| `--validation comprehensive` | Full test suite + benchmarks | `/improve --mode optimize --validation comprehensive` |
| `--rollback automatic` | Auto-rollback on failure | `/improve --mode optimize --rollback automatic` |
| `--require-tests-pass` | Must pass all tests | `/improve --mode optimize --require-tests-pass` |

---

## /team Flags

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--parallel` | Boolean | Force parallel execution | auto | `/team Build system --parallel` |
| `--dry-run` | Boolean | Preview team composition | false | `/team Build feature --dry-run` |
| `--lead <agent>` | String | Specify team lead | auto-detect | `/team Build API --lead tech-lead` |
| `--members <N>` | Number | Max team members | 8 | `/team Build system --members 4` |
| `--display` | Boolean | Show team communication | false | `/team Build feature --display` |
| `--domain <domain>` | String | Override domain | auto-detect | `/team Campaign --domain growth` |
| `--tier <N>` | Number | Override tier | auto | `/team Build system --tier 4` |
| `--quiet` / `-q` | Boolean | Suppress output | false | `/team Build feature --quiet` |
| `--teammate-mode <mode>` | String | Display: auto/tmux/in-process | auto | `/team Build app --teammate-mode tmux` |
| `--waves <N>` | Number | Force minimum number of waves | auto | `/team Build feature --waves 8` |

---

## /org Flags

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--dry-run` | Boolean | Preview routing decision and C-suite engagement plan | false | `/org Launch product --dry-run` |
| `--quick` | Boolean | Skip deliberation for single-domain routing | false | `/org Fix auth --quick` |
| `--domains <d1,d2,...>` | String | Force specific domain scope | auto-detect | `/org Task --domains engineering,growth` |
| `--resume <session_id>` | String | Resume interrupted /org session | none | `/org --resume org_20260227_143022` |

### /org Domain Keys

| Domain Key | C-Suite Agent | Example Keywords |
|-----------|---------------|------------------|
| `engineering` | CTO | fix, build, implement, code, api, database, architecture |
| `creative` | CCO | write, story, content, design, creative, brand, UX |
| `growth` | CRO | campaign, marketing, sales, conversion, SEO, leads |
| `business_fin` | CFO | budget, cost, forecast, investment, ROI, financial |
| `business_ops` | COO | operations, process, supply chain, logistics, efficiency |
| `people` | CHRO | hire, recruit, onboard, culture, HR, talent, performance |
| `service` | General Counsel | support, legal, compliance, customer, SLA, contract |
