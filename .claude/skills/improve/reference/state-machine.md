# /improve — 7-State Unified Machine (Placeholder)

This document will be fleshed out in V10.26.22. Placeholder created in V10.26.19
so the file path is stable for `@reference/state-machine.md` links from
SKILL.md.

## State List (Preview)

1. **SCOPING** — resolve target path, create session, write instruction.yaml
2. **MEASURING** — compute project hash, read/initialize baseline
3. **DETECTING** — spawn specialist agents (mode-specific)
4. **PLANNING** — aggregate findings, prioritize by severity × confidence
5. **EXECUTING** — apply changes (auto-fix or optimization patches)
6. **VALIDATING** — quality gates, regression checks, prime directives
7. **REPORTING** — write reports, append history, emit final_report.md

## Mode Branches

Each state has per-mode behavior markers:

- `review:` — legacy /review semantics (audit-only, optional auto-fix)
- `optimize:` — legacy /optimize semantics (measure-apply-remeasure)
- `full:` — review first, then optimize (full: review ∪ optimize)

Full per-state specifications land in V10.26.22.
