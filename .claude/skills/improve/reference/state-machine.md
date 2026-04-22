# /improve — 7-State Unified Machine

This file documents the canonical state machine for `/improve`, introduced
in V10.26.19 as a placeholder and fleshed out in V10.26.22. Clusters 4 and 5
add mode-specific handlers that must respect this contract without changing
the state graph.

## State List

1. **SCOPING** — resolve target path, create session, write `instruction.yaml`
2. **MEASURING** — compute project hash, read/initialize baseline
3. **DETECTING** — spawn specialist agents (mode-specific)
4. **PLANNING** — aggregate findings, prioritize by severity × confidence (review) or ROI (optimize)
5. **EXECUTING** — apply changes (auto-fix or optimization patches)
6. **VALIDATING** — quality gates, regression checks, prime directives
7. **REPORTING** — write reports, append history, emit `final_report.md`

Visits are strictly linear. A state completes when its exit condition (the
required output files on disk) is satisfied. On entry, a state asserts its
preconditions (previous state's exit outputs are present).

## Mode Branches

Each state has per-mode behavior markers:

- `review:` — legacy /review semantics (audit-only, optional auto-fix)
- `optimize:` — legacy /optimize semantics (measure-apply-remeasure)
- `full:` — review first, then optimize (full: review ∪ optimize)

## Per-State Specifications

### 1. SCOPING

| Aspect | Spec |
|--------|------|
| **Inputs** | `$ARGUMENTS` (parsed `--mode`, target path, flags) |
| **Outputs** | `Agent_Memory/sessions/improve_{slug}_{YYMMDD}_{NNN}/instruction.yaml`, `.../status.yaml` (phase: scoped) |
| **review:** | Resolve target (default: `.`), compute slug, create session dir |
| **optimize:** | Same. Plus: detect optimization type (code/content/process/infrastructure/data/campaign/creative/sales) |
| **full:** | Same. Plus: run review detection first, then optimize detection |
| **Exit trigger** | `instruction.yaml` on disk; `status.yaml.phase == scoped` |
| **Error recovery** | If target path invalid → print error, exit 1. Do NOT create session. |

### 2. MEASURING

| Aspect | Spec |
|--------|------|
| **Inputs** | Session dir, target path |
| **Outputs** | `Agent_Memory/_projects/{hash}/improve/baseline.yaml`, session `status.yaml.phase == measured` |
| **review:** | Read `_projects/{hash}/improve/baseline.yaml`. Fallback to legacy `_projects/{hash}/review/baseline.yaml`. If neither exists, create a fresh placeholder with `quality_score: null`. |
| **optimize:** | Measure perf/size metrics appropriate to detected type (bundle size, FCP, query time, readability, etc.) |
| **full:** | Both review baseline and optimize metric measurements |
| **Exit trigger** | Baseline file on disk (even if placeholder) |
| **Error recovery** | If project hash cannot be computed → use content hash of target path; note fallback in status.yaml |

### 3. DETECTING

| Aspect | Spec |
|--------|------|
| **Inputs** | Session dir, target path, baseline |
| **Outputs** | Per-agent findings in session `workflow/detection/*.yaml` |
| **review:** | Spawn 3 parallel agent groups (correctness, security, quality) per `@reference/agent-groups.md` |
| **optimize:** | Spawn optimize scanners per optimization type |
| **full:** | Review groups first (parallel), then optimize scanners (parallel) |
| **Exit trigger** | All spawned agents return findings |
| **Error recovery** | Per-agent timeout: mark agent's findings empty and continue |

### 4. PLANNING

| Aspect | Spec |
|--------|------|
| **Inputs** | Per-agent findings from DETECTING |
| **Outputs** | `workflow/findings.yaml` (review) or `workflow/opportunities.yaml` (optimize) |
| **review:** | Aggregate findings, dedupe, rank by severity × confidence, attach baseline-suppression status |
| **optimize:** | Group opportunities by ROI, filter by `--safety` threshold, order for atomic apply |
| **full:** | Unified plan: review findings drive auto-fix work items, optimize opportunities drive optimization work items |
| **Exit trigger** | findings.yaml or opportunities.yaml on disk |
| **Error recovery** | If zero findings → skip to REPORTING with empty report |

### 5. EXECUTING

| Aspect | Spec |
|--------|------|
| **Inputs** | findings.yaml / opportunities.yaml |
| **Outputs** | Modified files; `workflow/auto_fixes_applied.yaml` or `workflow/optimizations_applied.yaml` |
| **review:** | Only if `--auto-fix` is set. Atomic per-fix loop: snapshot → apply → test → keep or `git reset HEAD~1`. Max 3 rollback retries per fix. |
| **optimize:** | Respect `--dry-run`. Otherwise: snapshot → apply → remeasure → keep if improved (and no regression), else rollback |
| **full:** | Review auto-fixes first (conservative), then optimize patches |
| **Exit trigger** | Applied-list YAML on disk (may be empty if `--auto-fix` was not requested or no opportunities) |
| **Error recovery** | Per-fix rollback: keep session recoverable, note `rollback_count` |

### 6. VALIDATING

| Aspect | Spec |
|--------|------|
| **Inputs** | Modified files, applied-list, baseline |
| **Outputs** | `reports/quality_gates.yaml`, `reports/regression_check.yaml` |
| **review:** | 12 prime directives from `reference/quality-gates.md` (see `reference/directives.md` for checklist form) |
| **optimize:** | Before/after metric comparison; regression guard (tests/lint/type check) must pass |
| **full:** | Both gate sets must pass for overall PASS |
| **Exit trigger** | Gate report on disk with `verdict: PASS|FAIL` |
| **Error recovery** | FAIL with reason → proceed to REPORTING; do not roll back applied changes automatically |

### 7. REPORTING

| Aspect | Spec |
|--------|------|
| **Inputs** | All prior artifacts |
| **Outputs** | `reports/aggregate.yaml`, `reports/final_report.md`, plus per-mode files |
| **review:** | `reports/auto_fixes.yaml`, `reports/quality_gates.yaml`, append to `_projects/{hash}/improve/history.yaml` |
| **optimize:** | `reports/optimization_report.md`, append to `_projects/{hash}/improve/history.yaml` |
| **full:** | Merged `final_report.md` with review section + optimize section |
| **Exit trigger** | `final_report.md` on disk; session `status.yaml.phase == complete` |
| **Error recovery** | If any report file cannot be written → emit skeleton with error block; do not fail the whole run |

## Cross-Session History

Every run appends an entry to `_projects/{hash}/improve/history.yaml`:

```yaml
runs:
  - session_id: improve_fix-auth_260421_001
    mode: review
    started_at: "2026-04-21T14:00:00Z"
    finished_at: "2026-04-21T14:04:32Z"
    verdict: PASS
    findings_count: 5
    auto_fixes_applied: 3
    quality_score_delta: +4
```

## Back-Compat During Migration

Reads from `_projects/{hash}/review/baseline.yaml` when the new
`_projects/{hash}/improve/baseline.yaml` does not exist (V10.26.23+).
First-read performs a copy-forward so subsequent runs use the new path.
Writes only go to the new path.
