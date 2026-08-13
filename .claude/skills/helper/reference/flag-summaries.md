# Consolidated Flag Reference

Complete flag tables for all commands, used by `/helper --flags <command>`.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug`; v12.1.2 folded `/improve` into `/act` via the keyword router. See [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). Flag surfaces moved to `/act review|audit|optimize|improve` (keyword router; review/optimize/full modes inferred from first token), `/act context` (passthrough), and `/act --mode debug` (debug mode)._

## /act Flags

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--interactive` | Boolean | Ask user preferences before starting | false | `/act Fix bug --interactive` |
| `--dry-run` | Boolean | Preview plan without executing | false | `/act Add feature --dry-run` |
| `--quiet` / `-q` | Boolean | Skip plan display | false | `/act Fix bug --quiet` |
| `--stream` | Boolean | Real-time progress updates | false | `/act Deploy --stream` |
| `--skip-preflight` | Boolean | Skip pre-flight validation | false | `/act Hotfix --skip-preflight` |
| `--team` | Boolean | Parallel team execution | false | `/act Build dashboard --team` |
| `--template <name>` | String | Use workflow template | auto-match | `/act Budget --template budget_creation` |
| `--domain <domain>` | String | Override domain detection | auto-detect | `/act Analyze --domain engineering` |
| `--tier <N>` | Number | Override tier (2-4) | auto-classify | `/act Migrate --tier 4` |
| `--confidence <N>` | Number | Detection confidence threshold | 0.7 | `/act Request --confidence 0.6` |
| `--resume <id>` | String | Resume an interrupted session | none | `/act --resume act_20260207_143022` |
| `--mode debug` | Subcommand-flag | Run the systematic 4-phase debugging protocol (V11 replacement for `/debug`) | none | `/act --mode debug "Auth token expiry causes random logouts"` |
| `--escalate` | Boolean | Used with `--mode debug`; force escalation report after investigation | false | `/act --mode debug ... --escalate` |
| `--phase <1-4>` | Number | Used with `--mode debug`; start at a specific debugging phase | 1 | `/act --mode debug ... --phase 3` |

### /act context Passthrough (V11 replacement for /context)

| Form | Description |
|------|-------------|
| `/act context init` | Auto-detect and initialize product context |
| `/act context show` | Display current product context |
| `/act context update` | Interactively update product context |
| `/act context clear` | Remove the product context document |

The product context document lives at `cagents-memory/_projects/{hash}/product_context.yaml`.

### /act Templates (12)

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

## /act review|audit|optimize|improve Flags (Keyword Router Modes)

In v12.1.2, the standalone `/improve` skill was folded into `/act` via a first-token keyword router. The mode is inferred from the first request token: `review` and `audit` → review mode; `optimize` → optimize mode; `improve` → full mode. All V11.0 `/improve` mode-specific flags carry through unchanged. Mode selection determines which subset of flags applies.

### Mode Selection (via Keyword Router)

| First-word keyword | Inferred mode | Example |
|--------------------|---------------|---------|
| `review` | Run review pipeline | `/act review src/` |
| `audit` | Run review pipeline (alias) | `/act audit infrastructure --type infrastructure` |
| `optimize` | Run optimize pipeline | `/act optimize src/ --type code` |
| `improve` | Run review + optimize with one shared baseline | `/act improve src/` |

The match is case-insensitive on the first token. An explicit `--mode <value>` flag overrides the inferred mode (treat the first token as part of the request).

### Common Flags (all modes)

| Flag | Description | Example |
|------|-------------|---------|
| `--scope <path>` | Optional positional / explicit scope | `/act improve src/auth/` |
| `--dry-run` | Plan without applying changes | `/act optimize --dry-run` |
| `--history` | Append run to `_projects/{hash}/improve/history.yaml` | `/act review --history` |

### Review-Mode Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--scope changed\|staged\|all` | Scope filter | `/act review --scope changed` |
| `--type code\|documentation\|content\|design\|process\|data\|infrastructure` | Review type | `/act review --type infrastructure` |
| `--focus security\|architecture\|accessibility\|performance\|quality` | Focus area | `/act review --focus security` |
| `--framework nextjs\|react\|vue\|...` | Force framework detection | `/act review --framework nextjs` |
| `--auto-fix safe\|all` | Generate or apply auto-fixes | `/act review --auto-fix safe` |
| `--apply-safe-fixes` | Apply safe auto-fixes automatically | `/act review --apply-safe-fixes` |
| `--quality-gate strict\|standard\|relaxed` | Quality gate severity | `/act review --quality-gate strict` |
| `--run-tests` | Run tests after auto-fix | `/act review --run-tests` |
| `--rollback-on-failure` | Rollback if tests fail | `/act review --rollback-on-failure` |
| `--baseline <id>` | Use named baseline | `/act review --baseline 2026-q1` |
| `--suppress <id>` | Suppress findings tagged with id | `/act review --suppress finding-42` |
| `--confidence <N>` | Only report findings above threshold | `/act review --confidence 0.8` |
| `--show-confidence` | Display confidence scores | `/act review --show-confidence` |
| `--git-hotspots` | Prioritize frequently changed files | `/act review --git-hotspots` |
| `--pr-context <branch>` | Review against branch | `/act review --pr-context main` |
| `--output json\|markdown\|summary\|detailed` | Output format | `/act review --output json` |
| `--save-report <path>` | Save report to file | `/act review --save-report ./review.md` |

### Optimize-Mode Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--type code\|content\|process\|infrastructure\|data\|campaign\|creative\|sales` | Optimization type | `/act optimize --type code` |
| `--focus performance\|cost\|quality` | Focus area | `/act optimize --focus cost` |
| `--safety safe\|medium` | Risk tolerance | `/act optimize --safety safe` |
| `--incremental` | Apply one optimization at a time | `/act optimize --incremental` |
| `--cross-file` | Enable cross-file analysis | `/act optimize --cross-file` |
| `--no-cross-file` | Skip cross-file analysis (faster) | `/act optimize --no-cross-file` |
| `--dependency-graph` | Generate dependency graph | `/act optimize --dependency-graph` |
| `--benchmark auto\|lighthouse\|k6\|hyperfine` | Choose benchmark tool | `/act optimize --benchmark lighthouse` |
| `--validation comprehensive` | Full test suite + benchmarks | `/act optimize --validation comprehensive` |
| `--rollback automatic` | Auto-rollback on failure | `/act optimize --rollback automatic` |
| `--require-tests-pass` | Must pass all tests | `/act optimize --require-tests-pass` |

---

## /team Flags

Canonical source: `.claude/skills/_MODE_REGISTRY.md` § /team.

| Flag | Type | Description | Default | Example |
|------|------|-------------|---------|---------|
| `--strategic` | Boolean | Force-enable strategic mode (Wave 0/1/2 C-suite prefix) regardless of domain count | auto | `/team Launch product --strategic` |
| `--no-strategic` | Boolean | Force-disable strategic mode regardless of domain count | auto | `/team Build feature --no-strategic` |
| `--template <id>` | String | Use a named team template (fullstack-app, etc.) | auto-match | `/team Build app --template fullstack-app` |
| `--no-template` | Boolean | Force flat execution, skip template selection | false | `/team Build feature --no-template` |
| `--waves <N>` | Number | Force minimum number of waves | per tier | `/team Build feature --waves 8` |
| `--dry-run` | Boolean | Display wave structure without spawning subagents | false | `/team Build feature --dry-run` |
| `--members <N>` | Number | Target subagent count per wave | 5 | `/team Build system --members 4` |
| `--teammate-mode <mode>` | String | Display mode: auto/tmux/in-process | auto | `/team Build app --teammate-mode tmux` |

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
