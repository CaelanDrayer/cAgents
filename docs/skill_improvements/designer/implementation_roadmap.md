# /designer Implementation Roadmap

## Phase 1: Foundation Enhancements (v9.28)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Add Task to allowed-tools | Low | `.claude/skills/designer/SKILL.md` frontmatter |
| Add specialist delegation during Refinement | Medium | `.claude/skills/designer/SKILL.md` Phase 3, new reference file |
| Add codebase validation in Specification | Medium | `.claude/skills/designer/reference/phase-4-specification.md` |
| Add `--brief` flag for /org integration | Low | `.claude/skills/designer/SKILL.md` argument handling |

## Phase 2: Iteration and Export (v9.30)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Add `--iterate <session_id>` flag | Medium | `.claude/skills/designer/SKILL.md`, new reference file for iteration protocol |
| Add `--export <format>` flag | Medium | `.claude/skills/designer/SKILL.md`, new reference file for export formats |
| Add design versioning to session.yaml | Low | `.claude/skills/designer/reference/session-resilience.md` |

## Phase 3: Domain Enrichment (v9.32)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Enhanced creative sub-workflows | Medium | `.claude/skills/designer/reference/phase-3-refinement.md` |
| Multi-stakeholder mode | Medium | `.claude/skills/designer/SKILL.md`, new reference file |
| Implementation feedback loop | Low | `.claude/skills/designer/SKILL.md`, session files |

## Phase 4: Intelligence Layer (v10.0)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Design templates from past sessions | High | Agent_Memory templates, session analysis |
| AI constraint discovery | Medium | Phase 1 Discovery enhancements |
| Design scoring dashboard | Medium | Agent_Memory metrics integration |

## Dependencies

- Phase 1 has no dependencies
- Phase 2 depends on Phase 1 (Agent tool needed for export agents)
- Phase 3 can run in parallel with Phase 2
- Phase 4 requires historical session data from Phases 1-3

## Success Criteria

- Specialist delegation improves design validation scores by 15%+
- Iteration mode reduces redesign time by 40%+
- Export formats save 10+ minutes of manual reformatting per design
- Creative domain improvements increase creative design completion rate
