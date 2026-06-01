# Consolidated Flag Reference

Complete flag tables for all commands, used by `/helper --flags <command>`.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug`; v12.1.2 folded `/improve` into `/run` via the keyword router. See [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). Flag surfaces moved to `/run review|audit|optimize|improve` (keyword router; review/optimize/full modes inferred from first token), `/run context` (passthrough), and `/run --mode debug` (debug mode)._

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

## /run review|audit|optimize|improve Flags (Keyword Router Modes)

In v12.1.2, the standalone `/improve` skill was folded into `/run` via a first-token keyword router. The mode is inferred from the first request token: `review` and `audit` → review mode; `optimize` → optimize mode; `improve` → full mode. All V11.0 `/improve` mode-specific flags carry through unchanged. Mode selection determines which subset of flags applies.

### Mode Selection (via Keyword Router)

| First-word keyword | Inferred mode | Example |
|--------------------|---------------|---------|
| `review` | Run review pipeline | `/run review src/` |
| `audit` | Run review pipeline (alias) | `/run audit infrastructure --type infrastructure` |
| `optimize` | Run optimize pipeline | `/run optimize src/ --type code` |
| `improve` | Run review + optimize with one shared baseline | `/run improve src/` |

The match is case-insensitive on the first token. An explicit `--mode <value>` flag overrides the inferred mode (treat the first token as part of the request).

### Common Flags (all modes)

| Flag | Description | Example |
|------|-------------|---------|
| `--scope <path>` | Optional positional / explicit scope | `/run improve src/auth/` |
| `--dry-run` | Plan without applying changes | `/run optimize --dry-run` |
| `--history` | Append run to `_projects/{hash}/improve/history.yaml` | `/run review --history` |

### Review-Mode Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--scope changed\|staged\|all` | Scope filter | `/run review --scope changed` |
| `--type code\|documentation\|content\|design\|process\|data\|infrastructure` | Review type | `/run review --type infrastructure` |
| `--focus security\|architecture\|accessibility\|performance\|quality` | Focus area | `/run review --focus security` |
| `--framework nextjs\|react\|vue\|...` | Force framework detection | `/run review --framework nextjs` |
| `--auto-fix safe\|all` | Generate or apply auto-fixes | `/run review --auto-fix safe` |
| `--apply-safe-fixes` | Apply safe auto-fixes automatically | `/run review --apply-safe-fixes` |
| `--quality-gate strict\|standard\|relaxed` | Quality gate severity | `/run review --quality-gate strict` |
| `--run-tests` | Run tests after auto-fix | `/run review --run-tests` |
| `--rollback-on-failure` | Rollback if tests fail | `/run review --rollback-on-failure` |
| `--baseline <id>` | Use named baseline | `/run review --baseline 2026-q1` |
| `--suppress <id>` | Suppress findings tagged with id | `/run review --suppress finding-42` |
| `--confidence <N>` | Only report findings above threshold | `/run review --confidence 0.8` |
| `--show-confidence` | Display confidence scores | `/run review --show-confidence` |
| `--git-hotspots` | Prioritize frequently changed files | `/run review --git-hotspots` |
| `--pr-context <branch>` | Review against branch | `/run review --pr-context main` |
| `--output json\|markdown\|summary\|detailed` | Output format | `/run review --output json` |
| `--save-report <path>` | Save report to file | `/run review --save-report ./review.md` |

### Optimize-Mode Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--type code\|content\|process\|infrastructure\|data\|campaign\|creative\|sales` | Optimization type | `/run optimize --type code` |
| `--focus performance\|cost\|quality` | Focus area | `/run optimize --focus cost` |
| `--safety safe\|medium` | Risk tolerance | `/run optimize --safety safe` |
| `--incremental` | Apply one optimization at a time | `/run optimize --incremental` |
| `--cross-file` | Enable cross-file analysis | `/run optimize --cross-file` |
| `--no-cross-file` | Skip cross-file analysis (faster) | `/run optimize --no-cross-file` |
| `--dependency-graph` | Generate dependency graph | `/run optimize --dependency-graph` |
| `--benchmark auto\|lighthouse\|k6\|hyperfine` | Choose benchmark tool | `/run optimize --benchmark lighthouse` |
| `--validation comprehensive` | Full test suite + benchmarks | `/run optimize --validation comprehensive` |
| `--rollback automatic` | Auto-rollback on failure | `/run optimize --rollback automatic` |
| `--require-tests-pass` | Must pass all tests | `/run optimize --require-tests-pass` |

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

## /org Flags - REMOVED in v12.2.0

`/org` was removed in v12.2.0; flags below map to `/team` strategic mode equivalents.

| Pre-v12.2.0 (/org) | v12.2.0+ (/team strategic mode) |
|--------------------|---------------------------------|
| `/org <request>` | `/team <request>` (strategic mode auto-enables when `router.domain_count >= 2`) |
| `/org <request> --quick` | `/team <request> --strategic` (force-enable for single-domain) |
| `/org <request> --dry-run` | `/team <request> --dry-run` |
| `/org <request> --domains <d1,d2>` | `/team <request>` (router infers domains from request keywords) |
| `/org --resume <session_id>` | `/team --resume <session_id>` |

### Domain Keys (now consumed by router for /team strategic-mode auto-detect)

| Domain Key | C-Suite Agent | Example Keywords |
|-----------|---------------|------------------|
| `engineering` | CTO | fix, build, implement, code, api, database, architecture |
| `creative` | CCO | write, story, content, design, creative, brand, UX |
| `growth` | CRO | campaign, marketing, sales, conversion, SEO, leads |
| `business_fin` | CFO | budget, cost, forecast, investment, ROI, financial |
| `business_ops` | COO | operations, process, supply chain, logistics, efficiency |
| `people` | CHRO | hire, recruit, onboard, culture, HR, talent, performance |
| `service` | General Counsel | support, legal, compliance, customer, SLA, contract |
