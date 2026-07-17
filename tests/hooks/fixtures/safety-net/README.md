# Safety-net regression fixtures (Phase 0)

On-disk fixtures that reproduce the three systemic defects surfaced by audit
session `team_plugin-full-audit_260717_001`. They exist so every subsequent fix
phase is *provable*: a later phase lands its fix AND un-skips the matching
`describe.skip(...)` block, which flips from failing-if-run to passing.

Phase 0 lands these fixtures + the **skipped** tests only. `npm test` and
`scripts/ci/cagents-ci.sh` stay GREEN because the assertions live inside
`describe.skip(...)` (registered-but-not-run).

## The three defects

| # | Defect | Fixture dir | Builder (materialize.mjs) |
|---|--------|-------------|---------------------------|
| (a) | Fabricated `status: completed` on an INIT / 0-agent session (no work done, no agents spawned). A fresh init heartbeat wrongly rescued the session and the force-terminal patch stamped it `complete`. | `init-zero-agent/` | `materializeInitZeroAgent` |
| (b) | Controller-background-yield stall: COORDINATED with NO `coordination_log.yaml` and a stale `stopped_at: null` child in `agent_tree.yaml` masking the stall. | `coordinated-stale-child/` | `materializeCoordinatedStaleChild` |
| (c) | Hook-fabricated PASS `validation_report.yaml` (`generated_by: verify-completion-hook-safety-net`) treated as a genuine validator verdict. | `fabricated-pass/` | `materializeFabricatedPass` |

`genuine-validated/` is the **positive control** — a genuinely VALIDATED session
(real validator report + completed coordination_log + stopped child) that the
honesty/learning fixes must NOT suppress. Builder: `materializeGenuineValidated`.

## Static shape vs live builder

The committed `.yaml` files under each fixture dir document the canonical on-disk
SHAPE with illustrative timestamps. The stall assertions are timestamp-sensitive
(fresh-heartbeat, stale-child freshness), so the tests do NOT read the static
files directly for timing — they call the parameterized builders in
`materialize.mjs`, which write a live session dir under
`cagents-memory/sessions/` with controllable `last_updated_at` / `spawned_at`
and clean it up in `afterEach`. The static files are the human-readable
reference (and back the timestamp-insensitive marker checks, e.g. `generated_by`).

## Un-skip map — which phase un-skips which test

| Test file | Un-skipped by | What the un-skipped assertion must prove |
|-----------|---------------|------------------------------------------|
| `tests/hooks/verify-completion-honesty.test.js` | **Phase 2** (REC-02/03) | INIT/0-agent + COORDINATED-no-validation + fabricated-PASS fixtures resolve to `incomplete` / `overall_status: UNKNOWN`; the genuine-validated positive control still resolves to `complete` / PASS. |
| `tests/hooks/learning-store-integrity.test.js` | **Phase 2** (REC-06) | A fabricated-PASS session writes NO `successes:` and records `pass_fail: incomplete`, `genuinely_validated: false`; a genuine VALIDATED session still writes `successes:` and `pass`. |
| `tests/hooks/verify-completion-active-wait.test.js` (appended `describe.skip` block) | **Phase 3** (REC-04) | INIT + fresh heartbeat + 0 `- id:` children → the Stop hook BLOCKS (a fresh heartbeat may not rescue a 0-child session); INIT + fresh heartbeat WITH a running child → warn. |
| `tests/hooks/verify-completion-stale-child.test.js` | **Phase 3** (REC-05) | COORDINATED + 2h-old null-stop child + missing coordination_log → BLOCK; the same fixture with a 10s-old child → warn. |

Fixture (a) (`init-zero-agent/` / `materializeInitZeroAgent`) intentionally backs
BOTH a Phase-2 honesty assertion (genuinely-validated check → resolves to
`incomplete`, not `complete`) AND a Phase-3 active-wait assertion (INIT / 0-child
→ verify-completion BLOCKS rather than passing). The builder exposes a
`fabricateArtifacts` option so the Phase-2 REC-03 assertion can also inspect the
`generated_by: session-stop-hook` execution_summary smoking-gun.

## Source-line anchors (for the un-skipping phases)

- REC-02 honesty: `verify-completion.cjs` force-terminal patch `:1422`, stub
  `overall_status: PASS` `:450`, exec-summary status ternary `:430`.
- REC-03 team-stop honesty: `team-stop.cjs:242` (`generateExecutionSummary`,
  `let status = 'completed'`).
- REC-04 INIT 0-child gate: `sessionActivelyWorking` `verify-completion.cjs:134`,
  block sites `:613` / `:626`.
- REC-05 stale-child freshness: `runningChild` scan `:138-144`, coord-log-missing
  block `:714`.
- REC-06 learning store: LP-24 `successes:` `:1548`, `session_outcomes.jsonl`
  `:1698`.
