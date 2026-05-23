# /org (Removed in v12.2.0)

The `/org` skill was removed in **v12.2.0** and folded into `/team` strategic mode.

Cross-domain coordination — Wave 0/1 C-suite analysis, brief synthesis, per-domain dispatch — now runs inside `/team` automatically when `router.domain_count >= 2`. Override with `--strategic` (force enable for single-domain executive framing) or `--no-strategic` (force disable; flat multi-wave instead).

## Migration

| Pre-v12.2.0 | Post-v12.2.0 |
|-------------|--------------|
| `/org Plan Q3 product launch` | `/team Plan Q3 product launch` (strategic mode auto-enables for multi-domain requests) |
| `/org Restructure engineering team` | `/team Restructure engineering team --strategic` |
| `/org Fix auth bug` | `/run Fix auth bug` (single-domain → standard `/run`) |
| `/org Migrate to microservices --dry-run` | `/team Migrate to microservices --strategic --dry-run` |

## See Also

- [CHANGELOG.md v12.2.0](../../CHANGELOG.md) for the full removal rationale + breaking-change notes
- [.claude/skills/team/reference/strategic-mode.md](../../.claude/skills/team/reference/strategic-mode.md) for the strategic-mode protocol, brief schema, and examples
- [docs/SKILLS_REFERENCE.md](../SKILLS_REFERENCE.md) for the current 4-skill catalog (run / team / designer / helper)
