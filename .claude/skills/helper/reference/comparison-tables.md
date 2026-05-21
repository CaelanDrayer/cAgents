# Command Comparison Tables

Side-by-side comparison matrices for `/helper --compare`.

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug` — see [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). Their functionality moved to `/improve`, `/run context`, and `/run --mode debug`._
>
> _v12.2.0 removed `/org` and absorbed its responsibilities into `/team` strategic mode (auto-enabled when `universal-router.domain_count >= 2`; force via `--strategic` / `--no-strategic`). The `/org` columns in the matrices below are PRESERVED as historical reference for users migrating from pre-v12.2.0; treat any `/org` cell as "equivalent /team --strategic behavior" in v12.2.0+._

## Core Comparison Matrix

| Dimension | /run | /designer | /improve | /team | /org | /helper |
|-----------|------|-----------|----------|-------|------|---------|
| **Purpose** | Execute any task | Design before building | Review + optimize engine | Parallel execution | Multi-domain hierarchy | Command guide |
| **Interaction** | Autonomous | Interactive 4-phase Q&A | Autonomous | Autonomous | Auto (with deliberation) | Interactive |
| **Duration** | Varies (5min - hours) | 15-45 minutes | 3-20 minutes | Varies (40-60% faster) | 25-60 minutes | 1-2 minutes |
| **Input** | Natural language request | Topic or none | Path / target / natural language | Natural language request | Strategic instruction | Command name or question |
| **Output** | Implementation + report | Design document + artifacts | Findings, optimizations, before/after metrics | Aggregated results | Cross-domain integrated deliverable | Recommendation |
| **Domains** | All 15 domains | All (software/business/creative) | All (code, docs, content, infra, content) | All (delegates to /run) | All (sequential /team per domain) | n/a |
| **Context** | None (inline) | None (main context, for Q&A) | Fork | Fork | None (inline) | None (inline) |
| **Agent count** | 243 available | 1+ (designer + specialists) | Specialists per mode | Multiple teammates | C-suite + /team per domain | n/a |

## When-to-Use Decision Matrix

| Scenario | /run | /designer | /improve | /team | /org |
|----------|------|-----------|----------|-------|------|
| Fix a bug | Best | -- | -- | -- | -- |
| Add a feature | Good | Best (plan first) | -- | Good (if parallel) | -- |
| Large feature | Good | Best (plan first) | -- | Best (parallel build) | -- |
| Multi-domain initiative | -- | -- | -- | -- | Best |
| Product launch | -- | -- | -- | -- | Best (eng + marketing + hiring) |
| Security check | -- | -- | Best (`--mode review --focus security`) | -- | -- |
| Speed up code | -- | -- | Best (`--mode optimize`) | -- | -- |
| Write content | Best | Good (if exploring) | Can review or optimize | -- | -- |
| Plan architecture | -- | Best | -- | -- | -- |
| Pre-merge check | -- | -- | Best (`--mode review`) | -- | -- |
| Reduce costs | -- | -- | Best (`--mode optimize --type infrastructure`) | -- | -- |
| Quick question | Best | -- | -- | -- | -- |
| Cross-domain coordination | -- | -- | -- | -- | Best |
| Debug stubborn bug | Best (`--mode debug`) | -- | -- | -- | -- |
| Persist project knowledge | Best (`/run context init`) | -- | -- | -- | -- |
| Audit + optimize together | -- | -- | Best (`--mode full`) | -- | -- |

## Flag Overlap Matrix

| Flag | /run | /designer | /improve | /team | /org |
|------|------|-----------|----------|-------|------|
| `--dry-run` | Yes | -- | Yes | Yes | Yes |
| `--interactive` | Yes | Always | Yes | -- | -- |
| `--quiet` / `-q` | Yes | -- | -- | Yes | -- |
| `--domain` | Yes | -- | -- | Yes | -- |
| `--domains` | -- | -- | -- | -- | Yes |
| `--tier` | Yes | -- | -- | Yes | -- |
| `--focus` | -- | Yes | Yes | -- | -- |
| `--template` | Yes | Yes | -- | -- | -- |
| `--stream` | Yes | -- | Yes | -- | -- |
| `--scope` | -- | -- | Yes (required for `--mode full`) | -- | -- |
| `--mode review\|optimize\|full` | -- | -- | Yes | -- | -- |
| `--auto-fix` | -- | -- | Yes (review mode) | -- | -- |
| `--baseline` / `--suppress` | -- | -- | Yes (review mode) | -- | -- |
| `--benchmark` | -- | -- | Yes (optimize / full) | -- | -- |
| `--type` | -- | -- | Yes | -- | -- |
| `--cross-file` | -- | -- | Yes (optimize) | -- | -- |
| `--members` | -- | -- | -- | Yes | -- |
| `--lead` | -- | -- | -- | Yes | -- |
| `--team` | Yes | -- | -- | N/A | -- |
| `--quick` | -- | -- | -- | -- | Yes |
| `--brief` | Yes | Yes | -- | -- | -- |
| `--resume` | Yes | Yes | -- | -- | Yes |
| `--mode debug` | Yes (`/run --mode debug`) | -- | -- | -- | -- |

## Integration Pipeline Matrix

| Start With | Then | Why |
|------------|------|-----|
| `/designer` | `/run` | Design thoroughly, then build. Most common pipeline. |
| `/designer` | `/team` | Design thoroughly, then build in parallel. For big features. |
| `/improve --mode review` | `/run` | Find issues, then fix them. |
| `/improve --mode full` | -- | Review + optimize together with one shared baseline. |
| `/improve --mode optimize` | `/improve --mode review` | Optimize, then verify quality (or use `--mode full`). |
| `/run --team` | -- | Shortcut: /run with parallel team execution. |
| `/team --strategic` (v12.2.0+) | Per-domain dispatch (nested waves) | CEO/C-suite deliberation, then dependency-ordered per-domain dispatch. Replaces `/org` for multi-domain initiatives. |
| `/team --strategic` | `/run` | Single-domain routing with strategic brief context (replaces `/org --quick`). |
| `/designer --brief` | `/team --strategic` | Design with strategic brief feeding /team strategic mode (replaces pre-v12.2.0 `/designer --brief` -> `/org`). |

## Complexity and Scope

| Aspect | /run | /designer | /improve | /team | /org |
|--------|------|-----------|----------|-------|------|
| **Minimum complexity** | Tier 2 (any request) | Any | Any | Tier 3 (3+ work items) | Any (auto-routes simple) |
| **Maximum complexity** | Tier 4 (expert + HITL) | Any | Tier 4 (CRITICAL findings hand off to /run) | Tier 4 | Tier 4 (multi-domain) |
| **Scope** | Single task | Single design | Single target (or `--scope` for `--mode full`) | Multiple parallel tasks | Multi-domain coordinated |
| **Parallelism** | No (sequential) | No (interactive) | Yes (specialist groups + opportunity scanners) | Yes (teammates) | Yes (/team per domain) |
| **Resumable** | Yes (--resume flag + waypoints) | Yes (--resume flag) | Yes (session waypoints) | No | Yes (--resume, per-domain) |

## Performance Characteristics

| Metric | /run | /designer | /improve | /team | /org |
|--------|------|-----------|----------|-------|------|
| **Startup time** | Fast (seconds) | Fast (immediate Q&A) | Fast (seconds) | Medium (team setup) | Medium (C-suite analysis) |
| **Execution time** | Varies by task | 15-45 min (interactive) | 3-20 min | 40-60% faster than /run | 25-60 min (multi-domain) |
| **Token efficiency** | Standard | Context-conscious | Parallel (efficient) | Higher (multiple contexts) | High (C-suite + /team) |
| **Context usage** | None (inline) | Main (for Q&A) | Fork (separate) | Fork (per teammate) | Fork (C-suite + /team) |

## V10 → V11 Migration Quick Reference

| V10 invocation | V11 replacement |
|----------------|-----------------|
| `/review <target>` | `/improve --mode review <target>` (or `/improve <target>`; `review` is the default mode) |
| `/optimize <target>` | `/improve --mode optimize <target>` |
| `/optimize <target> --review-after` | `/improve --mode full --scope <target>` |
| `/context init\|show\|update\|clear` | `/run context init\|show\|update\|clear` |
| `/debug <bug>` | `/run --mode debug <bug>` |
