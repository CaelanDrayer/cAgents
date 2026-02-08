# Task Completion Protocol Summary

100% completion with verified evidence, or it is not complete.

## Requirements

- All objectives met with specific evidence
- Outputs are production-quality
- coordination_log.yaml is complete with status: completed
- Evidence includes file paths, test results, or metrics
- No partial completion accepted

## Completion Chain

1. **Planning**: Work items have acceptance_criteria with verification_method
2. **Coordination**: Controllers track work_item_status, capture evidence, record completed_at/completed_by
3. **Validation**: Validator checks each criterion using its verification method, confirms evidence chain

## Checklist

### At Planning

- [ ] Work items have acceptance_criteria
- [ ] Criteria have verification_method
- [ ] Objectives link to derived_from work items

### At Coordination

- [ ] work_item_status tracked in coordination_log
- [ ] Evidence captured for each criterion
- [ ] completed_at/completed_by recorded

### At Validation

- [ ] Every criterion verified using its method
- [ ] Evidence chain confirmed
- [ ] All derived_from work items complete

## Enforcement Points

- **Controllers**: Verify acceptance criteria, capture evidence
- **Universal-executor**: Check coordination_log completeness
- **Universal-validator**: Quality gates with evidence chain verification
- **Orchestrator**: Phase validation with evidence

See @.claude/rules/quality/completion.md for the full protocol.
See @shared/resources/evidence-patterns.md for evidence examples.
