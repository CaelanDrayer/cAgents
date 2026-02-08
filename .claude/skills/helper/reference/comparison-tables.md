# Command Comparison Tables

Side-by-side comparison matrices for `/helper --compare`.

## Core Comparison Matrix

| Dimension | /run | /designer | /review | /optimize | /team |
|-----------|------|-----------|---------|-----------|-------|
| **Purpose** | Execute any task | Design before building | Quality analysis | Measurable improvement | Parallel execution |
| **Interaction** | Autonomous | Interactive 4-phase Q&A | Autonomous | Autonomous (or interactive) | Autonomous |
| **Duration** | Varies (5min - hours) | 15-45 minutes | 3-10 minutes | 5-20 minutes | Varies (40-60% faster) |
| **Input** | Natural language request | Topic or none | Path or auto-detect | Target or natural language | Natural language request |
| **Output** | Implementation + report | Design document + artifacts | Issue report + fixes | Before/after metrics | Aggregated results |
| **Domains** | All 5 super-domains | All (software/business/creative) | Code, docs, content, infra + 4 more | 8 types across domains | All (delegates to /run) |
| **Context** | Fork (separate context) | None (main context, for Q&A) | Fork | Fork | Fork |
| **Agent count** | 236 available | 1 (designer itself) | 9 parallel groups | Varies by type | Multiple teammates |

## When-to-Use Decision Matrix

| Scenario | /run | /designer | /review | /optimize | /team |
|----------|------|-----------|---------|-----------|-------|
| Fix a bug | Best | -- | -- | -- | -- |
| Add a feature | Good | Best (plan first) | -- | -- | Good (if parallel) |
| Large feature | Good | Best (plan first) | -- | -- | Best (parallel build) |
| Security check | -- | -- | Best | -- | -- |
| Speed up code | -- | -- | Can detect | Best | -- |
| Write content | Best | Good (if exploring) | Can review | Can optimize | -- |
| Plan architecture | -- | Best | -- | -- | -- |
| Pre-merge check | -- | -- | Best | -- | -- |
| Reduce costs | -- | -- | Can detect | Best | -- |
| Quick question | Best | -- | -- | -- | -- |

## Flag Overlap Matrix

| Flag | /run | /designer | /review | /optimize | /team |
|------|------|-----------|---------|-----------|-------|
| `--dry-run` | Yes | -- | Yes | Yes | Yes |
| `--interactive` | Yes | Always | Yes | Yes | -- |
| `--quiet` / `-q` | Yes | -- | -- | -- | Yes |
| `--domain` | Yes | -- | -- | -- | Yes |
| `--tier` | Yes | -- | -- | -- | Yes |
| `--focus` | -- | Yes | Yes | Yes | -- |
| `--template` | Yes | Yes | -- | -- | -- |
| `--stream` | Yes | -- | Yes | -- | -- |
| `--scope` | -- | -- | Yes | -- | -- |
| `--auto-fix` | -- | -- | Yes | -- | -- |
| `--safety` | -- | -- | -- | Yes | -- |
| `--type` | -- | -- | Yes | Yes | -- |
| `--cross-file` | -- | -- | -- | Yes | -- |
| `--members` | -- | -- | -- | -- | Yes |
| `--lead` | -- | -- | -- | -- | Yes |
| `--team` | Yes | -- | -- | -- | N/A |
| `--resume` | Yes | Yes | -- | -- | -- |

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

## Complexity and Scope

| Aspect | /run | /designer | /review | /optimize | /team |
|--------|------|-----------|---------|-----------|-------|
| **Minimum complexity** | Tier 2 (any request) | Any | Any | Any | Tier 3 (3+ work items) |
| **Maximum complexity** | Tier 4 (expert + HITL) | Any | Any | Tier 4 (CRITICAL -> /run) | Tier 4 |
| **Scope** | Single task | Single design | Single target | Single target | Multiple parallel tasks |
| **Parallelism** | No (sequential) | No (interactive) | Yes (agent groups) | Yes (independent opts) | Yes (teammates) |
| **Resumable** | Yes (--resume flag + waypoints) | Yes (--resume flag) | No | Yes (session waypoints) | No |

## Performance Characteristics

| Metric | /run | /designer | /review | /optimize | /team |
|--------|------|-----------|---------|-----------|-------|
| **Startup time** | Fast (seconds) | Fast (immediate Q&A) | Fast (seconds) | Fast (seconds) | Medium (team setup) |
| **Execution time** | Varies by task | 15-45 min (interactive) | 3-10 min | 5-20 min | 40-60% faster than /run |
| **Token efficiency** | Standard | Context-conscious | Parallel (efficient) | Standard | Higher (multiple contexts) |
| **Context usage** | Fork (separate) | Main (for Q&A) | Fork (separate) | Fork (separate) | Fork (per teammate) |
