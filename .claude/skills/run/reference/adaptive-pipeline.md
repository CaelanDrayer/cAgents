# Adaptive Pipeline (V9.27+, updated for v12.0.0)

Tier-based and complexity-based pipeline path selection that skips enrichment agents when they add minimal value.

## Complexity Scoring (9 Signals)

A complexity score (0.0 to 1.0) is computed inline using 9 weighted signals:

| Signal | Weight | Scoring |
|--------|--------|---------|
| Request length | 0.15 | <10 words: 0, 10-30: 0.3, 30-60: 0.6, 60+: 1.0 |
| Complexity keywords | 0.20 | "refactor", "migrate", "integrate", "redesign" each +0.25 (capped 1.0) |
| Multi-component | 0.10 | "and", "then", "plus", "also" each +0.25 (capped 1.0) |
| File references | 0.10 | Explicit file paths: +0.33 per file (capped 1.0) |
| Domain breadth | 0.15 | Multi-domain keywords: 1 domain=0, 2+=1.0 |
| Test requirements | 0.05 | "with tests", "ensure", "verify": 1.0 if present |
| Security markers | 0.10 | "auth", "encryption", "RBAC", "security": 1.0 if present |
| Architecture markers | 0.10 | "API", "database", "microservice", "schema": 1.0 if present |
| Scale markers | 0.05 | "all", "every", "entire", "comprehensive": 1.0 if present |

`complexity_score = sum(signal_score * weight)`

## Pipeline Path Selection (v12.0.0 — 5 states)

| Path | Score Range | States | Skip Agents |
|------|-----------|--------|-------------|
| **Minimal** | < 0.25 | PLANNED -> COORDINATED | orchestrator, validator |
| **Medium** | 0.25 - 0.65 | ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | (none — all 4 non-INIT agents run) |
| **Full** | >= 0.65 or tier 4 | All 5 states | none |

Display the selected path:

```
Pipeline: {path} (score: {score:.2f}), Domain={domain}, Tier={tier}, Controller={controller}
```

## Planner Escalation

After the planner runs, if plan.yaml contains `complexity_escalation: medium` or `complexity_escalation: full`, upgrade to the higher path. Never downgrade.

## Tier Classification (minimum tier 2)

| Tier | Criteria | Controllers |
|------|----------|-------------|
| 2 | Single component, clear scope | 1 primary controller |
| 3 | Multiple components, external deps | 1 primary + 1-2 supporting |
| 4 | Strategic/architectural, company-wide | Executive + HITL |

## Adaptive Pipeline (Tier-Based State Skipping, v12.0.0)

For **tier 2** requests with clear scope, skip enrichment agents that add minimal value:

| State | Tier 2 (Simple) | Tier 3+ (Complex) |
|-------|-----------------|-------------------|
| INIT (orchestrator) | **SKIP** — /run does inline enrichment | Execute |
| ORCHESTRATED (universal-planner) | Execute (always needed; produces plan + work_items inline) | Execute |
| PLANNED (controller) | Execute | Execute |
| COORDINATED (validator) | Execute | Execute |
| VALIDATED (terminal) | Terminal | Terminal |

**v12.0.0 collapse**: The previous DECOMPOSED and PROMPTS_READY states no longer exist. `task-decomposer` and `prompt-engineer` were absorbed into `cagents:universal-planner`, which handles decomposition inline.

## Tier 2 Fast Path (v12.0.0)

```
/run -> inline enrichment -> universal-planner -> controller -> validator -> DONE
```

This saves 1 agent spawn (orchestrator) for simple tasks. Versus the pre-v12 fast path which saved 3 spawns (orchestrator, decomposer, prompt-engineer), the v12 fast path saves only 1 because decomposer and prompt-engineer are no longer separate agents to skip — they were folded into universal-planner. Net pipeline length still dropped 7 states -> 5 states.

## Skip Behavior Specifics

For tier 2, when skipping INIT:
- Write a minimal `enriched_context.yaml` inline with the user request, domain, tier, and working directory context.
- This becomes the universal-planner's input.

For tier 2 ORCHESTRATED state (universal-planner):
- The planner produces both `plan.yaml` and `work_items.yaml` inline.
- For simple tier 2 requests, `work_items.yaml` may contain a single work item derived from plan.yaml objectives.
- No separate decomposition or prompt-engineering step runs.

For tier 2 PLANNED state (controller):
- Controllers use the standard delegation prompt template (no crafted `delegation_prompts.yaml` artifact in v12).
- Pre-v12 sessions produced `delegation_prompts.yaml` via the prompt-engineer agent; v12 sessions omit this file.

## Domain/Tier Confirmation Display

After classifying domain and tier, display the classification to the user:

```
Detected: Domain={domain} ({super_domain}), Tier={tier}, Controller={controller_name}
```

If `--interactive`, ask for confirmation with override options:

```
I detected this as a {domain} task (Tier {tier}). Is that right?
1. Yes, proceed
2. Different domain: [specify]
3. Higher complexity: Tier 3 or 4
```

If not interactive, just display and proceed. Include an override hint:

```
Detected: Domain=Make (Engineering), Tier=2, Controller=tech-lead
  (Override with: --domain <domain> --tier <N>)
```
