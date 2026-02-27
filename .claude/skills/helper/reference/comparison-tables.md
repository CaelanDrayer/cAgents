# Command Comparison Tables

Side-by-side comparison matrices for `/helper --compare`.

## Core Comparison Matrix

| Dimension | /run | /designer | /review | /optimize | /team | /org |
|-----------|------|-----------|---------|-----------|-------|------|
| **Purpose** | Execute any task | Design before building | Quality analysis | Measurable improvement | Parallel execution | Multi-domain hierarchy |
| **Interaction** | Autonomous | Interactive 4-phase Q&A | Autonomous | Autonomous (or interactive) | Autonomous | Auto (with deliberation) |
| **Duration** | Varies (5min - hours) | 15-45 minutes | 3-10 minutes | 5-20 minutes | Varies (40-60% faster) | 25-60 minutes |
| **Input** | Natural language request | Topic or none | Path or auto-detect | Target or natural language | Natural language request | Strategic instruction |
| **Output** | Implementation + report | Design document + artifacts | Issue report + fixes | Before/after metrics | Aggregated results | Cross-domain integrated deliverable |
| **Domains** | All 5 super-domains | All (software/business/creative) | Code, docs, content, infra + 4 more | 8 types across domains | All (delegates to /run) | All (sequential /team per domain) |
| **Context** | None (inline) | None (main context, for Q&A) | Fork | Fork | Fork | None (inline) |
| **Agent count** | 238 available | 1+ (designer + specialists) | 9 parallel groups | Varies by type | Multiple teammates | C-suite + /team per domain |

## When-to-Use Decision Matrix

| Scenario | /run | /designer | /review | /optimize | /team | /org |
|----------|------|-----------|---------|-----------|-------|------|
| Fix a bug | Best | -- | -- | -- | -- | -- |
| Add a feature | Good | Best (plan first) | -- | -- | Good (if parallel) | -- |
| Large feature | Good | Best (plan first) | -- | -- | Best (parallel build) | -- |
| Multi-domain initiative | -- | -- | -- | -- | -- | Best |
| Product launch | -- | -- | -- | -- | -- | Best (eng + marketing + hiring) |
| Security check | -- | -- | Best | -- | -- | -- |
| Speed up code | -- | -- | Can detect | Best | -- | -- |
| Write content | Best | Good (if exploring) | Can review | Can optimize | -- | -- |
| Plan architecture | -- | Best | -- | -- | -- | -- |
| Pre-merge check | -- | -- | Best | -- | -- | -- |
| Reduce costs | -- | -- | Can detect | Best | -- | -- |
| Quick question | Best | -- | -- | -- | -- | -- |
| Cross-domain coordination | -- | -- | -- | -- | -- | Best |

## Flag Overlap Matrix

| Flag | /run | /designer | /review | /optimize | /team | /org |
|------|------|-----------|---------|-----------|-------|------|
| `--dry-run` | Yes | -- | Yes | Yes | Yes | Yes |
| `--interactive` | Yes | Always | Yes | Yes | -- | -- |
| `--quiet` / `-q` | Yes | -- | -- | -- | Yes | -- |
| `--domain` | Yes | -- | -- | -- | Yes | -- |
| `--domains` | -- | -- | -- | -- | -- | Yes |
| `--tier` | Yes | -- | -- | -- | Yes | -- |
| `--focus` | -- | Yes | Yes | Yes | -- | -- |
| `--template` | Yes | Yes | -- | -- | -- | -- |
| `--stream` | Yes | -- | Yes | -- | -- | -- |
| `--scope` | -- | -- | Yes | -- | -- | -- |
| `--auto-fix` | -- | -- | Yes | -- | -- | -- |
| `--safety` | -- | -- | -- | Yes | -- | -- |
| `--type` | -- | -- | Yes | Yes | -- | -- |
| `--cross-file` | -- | -- | -- | Yes | -- | -- |
| `--members` | -- | -- | -- | -- | Yes | -- |
| `--lead` | -- | -- | -- | -- | Yes | -- |
| `--team` | Yes | -- | -- | -- | N/A | -- |
| `--quick` | -- | -- | -- | -- | -- | Yes |
| `--brief` | Yes | Yes | -- | -- | -- | -- |
| `--resume` | Yes | Yes | -- | -- | -- | Yes |

## Integration Pipeline Matrix

| Start With | Then | Why |
|------------|------|-----|
| `/designer` | `/run` | Design thoroughly, then build. Most common pipeline. |
| `/designer` | `/team` | Design thoroughly, then build in parallel. For big features. |
| `/review` | `/run` | Find issues, then fix them. |
| `/optimize` | `/review` | Optimize, then verify quality. Use `--review-after` flag. |
| `/optimize` | `/run` | Optimizer creates plan, /run implements CRITICAL items. Use `--plan-only` flag. |
| `/optimize` | `/designer` | Explore optimization approach first. Use `--explore-first` flag. |
| `/run --team` | -- | Shortcut: /run with parallel team execution. |
| `/org` | `/team` (per domain) | CEO deliberation, then sequential /team per domain. For multi-domain initiatives. |
| `/org` | `/run` | Single-domain routing with strategic brief context. |
| `/designer --brief` | `/org` | Design with strategic brief from /org for richer context. |

## Complexity and Scope

| Aspect | /run | /designer | /review | /optimize | /team | /org |
|--------|------|-----------|---------|-----------|-------|------|
| **Minimum complexity** | Tier 2 (any request) | Any | Any | Any | Tier 3 (3+ work items) | Any (auto-routes simple) |
| **Maximum complexity** | Tier 4 (expert + HITL) | Any | Any | Tier 4 (CRITICAL -> /run) | Tier 4 | Tier 4 (multi-domain) |
| **Scope** | Single task | Single design | Single target | Single target | Multiple parallel tasks | Multi-domain coordinated |
| **Parallelism** | No (sequential) | No (interactive) | Yes (agent groups) | Yes (independent opts) | Yes (teammates) | Yes (/team per domain) |
| **Resumable** | Yes (--resume flag + waypoints) | Yes (--resume flag) | No | Yes (session waypoints) | No | Yes (--resume, per-domain) |

## Performance Characteristics

| Metric | /run | /designer | /review | /optimize | /team | /org |
|--------|------|-----------|---------|-----------|-------|------|
| **Startup time** | Fast (seconds) | Fast (immediate Q&A) | Fast (seconds) | Fast (seconds) | Medium (team setup) | Medium (C-suite analysis) |
| **Execution time** | Varies by task | 15-45 min (interactive) | 3-10 min | 5-20 min | 40-60% faster than /run | 25-60 min (multi-domain) |
| **Token efficiency** | Standard | Context-conscious | Parallel (efficient) | Standard | Higher (multiple contexts) | High (C-suite + /team) |
| **Context usage** | None (inline) | Main (for Q&A) | Fork (separate) | Fork (separate) | Fork (per teammate) | Fork (C-suite + /team) |
