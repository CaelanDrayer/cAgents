# Version Registry — V10.x Historical Reference

This file preserves the V10.x historical context that used to live inline in
`.claude/rules/core/version-registry.md`. The mixed inline content (V10.x
21-location catalog alongside the V11.0+ 18-location canonical registry) was
trimmed out in V11.2.16 (Q-011 / F-xcut-003) so that the rule file describes
exactly one canonical registry and serves as the unambiguous source of truth
for future registry additions.

**Canonical current registry**: see `.claude/rules/core/version-registry.md`.
That file is the source of truth. This file is historical only — it documents
how the registry shape evolved across V10.x → V11.0, so future contributors
can understand why certain slots were added or removed, but it is NOT
consulted by `scripts/sync-versions.sh` or `scripts/ci/validate-versions.sh`.

## V10.x Catalog (21 locations)

V11.0 removed four skill SKILL.md version locations
(`context`, `debug`, `review`, `optimize`) when the corresponding
skill directories were deleted. The V10.x catalog had 21 locations;
the current canonical count is 18. Any "21 registry locations"
phrasing in V10.x-era documentation or commit messages refers to the
V10.x historical catalog and is retained only for back-reference.

## V11.0 Slot Removals

V11.0 removed four skill SKILL.md version locations
(`context`, `debug`, `review`, `optimize`) when the corresponding
skill directories were deleted. Those four slots accounted for the
21 → 18 transition. The removal landed alongside the V11.0 consolidation
of `/review` and `/optimize` into `/improve --mode review|optimize|full`,
and the removal of `/context` and `/debug` (whose behaviors moved into
`/run --mode debug` and the orchestrator's pre-enrichment context flow,
respectively).

The 18-location canonical table in `.claude/rules/core/version-registry.md`
reflects the post-V11.0 shape and has been the single source of truth ever
since. Any reference to "21 registry locations" outside this history file
is stale and should be updated to "18 locations" or removed entirely.

## Tiny-Bump Cadence — V10.x Pre-Promotion History

The `cagents-memory/.claude/rules/core/version-registry.md` enforcement
mechanism (the `check_tiny_bump` stage in `scripts/ci/cagents-ci.sh`) was
promoted from warn-only to blocking in **V10.26.5**. Before that promotion,
four clean warn-only runs (V10.26.1 through V10.26.4) preceded the change.
That promotion is now stable in the canonical rule file; this entry exists
only to preserve the version-history context for the four-clean-runs
gating decision.

## Related

- `.claude/rules/core/version-registry.md` — canonical current registry (V11.0+ shape)
- `scripts/sync-versions.sh` — automated version sync (operates on the 18 canonical locations)
- `scripts/ci/validate-versions.sh` — paired-commit invariant enforcement (slot list must match canonical table)
- `CHANGELOG.md` `[11.2.16]` — the bump that extracted this history file
