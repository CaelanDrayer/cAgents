# /org Implementation Roadmap

## Phase 1: Reliability and Visibility (v9.28)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Domain-level resume (selective retry) | Medium | `.claude/skills/org/SKILL.md` Step 7, status.yaml schema |
| Strategic brief versioning | Low | `.claude/skills/org/SKILL.md` Step 6, reference/strategic-brief-schema.md |
| Cost-aware dry run output | Low | `.claude/skills/org/SKILL.md` Step 3 |

## Phase 2: Intelligence (v9.30)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Multi-round deliberation (adaptive, up to 3 rounds) | Medium | `.claude/skills/org/SKILL.md` Step 5 |
| Enhanced domain detection (layered, context-aware) | Medium | `.claude/skills/org/SKILL.md` Step 3, reference/csuite-mapping.md |
| Cross-domain conflict resolution protocol | Medium | `.claude/skills/org/SKILL.md` Step 8, new reference file |
| Orchestration retrospective | Medium | `.claude/skills/org/SKILL.md` Step 9 |

## Phase 3: Learning (v9.32)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Orchestration memory and pattern learning | High | `.claude/skills/org/SKILL.md`, Agent_Memory/_knowledge/ schema |
| C-suite context injection | Medium | `.claude/skills/org/SKILL.md` Step 4 |
| Strategic brief templates | Medium | `.claude/skills/org/SKILL.md`, new reference/templates.md |

## Phase 4: Advanced (v10.0)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Domain execution ordering (wave-based) | Medium | `.claude/skills/org/SKILL.md` Step 7 |
| Parallel deliberation optimization | Medium | `.claude/skills/org/SKILL.md` Step 5 |
| Cost estimation model (token + time prediction) | High | Agent_Memory/_system/config/, analytics integration |

## Key Dependencies

- Strategic brief versioning (Phase 1) should precede orchestration retrospective (Phase 2) so retrospective can analyze brief drift
- Multi-round deliberation (Phase 2) benefits from orchestration memory (Phase 3) for anticipating objections
- Enhanced domain detection layers build incrementally (keyword -> project context -> semantic -> historical)
- Domain-level resume requires per-domain status tracking to be robust before selective retry is reliable

## Success Criteria

- Domain-level resume eliminates redundant re-execution of completed domains (save 40%+ on resume)
- Brief versioning enables full audit trail of plan-vs-execution drift
- Cost-aware dry run reduces user surprise about orchestration resource consumption
- Multi-round deliberation resolves 90%+ of blocking objections without user escalation
- Enhanced domain detection improves routing accuracy from ~80% to ~95% for ambiguous requests
- Orchestration memory reduces brief drafting time by 30%+ for recurring patterns
- Retrospective provides actionable data for improving future orchestration quality
