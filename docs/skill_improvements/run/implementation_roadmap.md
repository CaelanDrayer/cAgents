# /run Implementation Roadmap

## Phase 1: Pipeline Efficiency (v9.28)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Adaptive pipeline (skip states for tier 2) | High | `pipeline_config.yaml`, `.claude/skills/run/SKILL.md` |
| Domain/tier confirmation display | Low | `.claude/skills/run/SKILL.md` Step 3 |
| Execution analytics tracking | Medium | `.claude/skills/run/SKILL.md`, Agent_Memory metrics |

## Phase 2: Visibility and Recovery (v9.30)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Rich progress feedback (sub-state) | Medium | `.claude/skills/run/SKILL.md`, controller protocol |
| Intelligent error recovery | Medium | `.claude/skills/run/SKILL.md`, pipeline_config.yaml |
| Partial pipeline execution flags | Low | `.claude/skills/run/SKILL.md`, `.claude/skills/run/reference/flags.md` |

## Phase 3: Advanced Features (v9.32)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Multi-request batching | High | `.claude/skills/run/SKILL.md`, enrichment pipeline |
| Delegation prompt transparency | Low | `.claude/skills/run/SKILL.md` |
| Pipeline plugins | High | pipeline_config.yaml schema, SKILL.md |

## Phase 4: Intelligence Layer (v10.0)

| Item | Effort | Files to Modify |
|------|--------|----------------|
| Request clarification for ambiguous inputs | Medium | Domain detection enhancement |
| Dry-run with saved plan | Low | Flag handling |
| Pipeline observability dashboard | High | New visualization system |

## Key Dependencies

- Adaptive pipeline (Phase 1) is the highest-impact change and should be prioritized
- Rich progress feedback requires controller protocol changes
- Analytics tracking should start in Phase 1 to collect data for future optimization
- Multi-request batching depends on adaptive pipeline being stable

## Success Criteria

- Adaptive pipeline reduces tier 2 execution time by 40%+
- Rich progress feedback eliminates "black box" perception during coordination
- Analytics provide actionable insights on pipeline bottlenecks
- Intelligent error recovery reduces --resume suggestions by 50%+
