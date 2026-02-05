# Planning Templates Guide

Comprehensive guide to creating, managing, and governing planning templates.

## Template Design Principles

### Clarity Over Completeness

A template should guide the user to produce a quality output without overwhelming them. Every field must earn its place.

1. **Required fields**: Information that is essential for the output to be useful
2. **Recommended fields**: Information that significantly improves quality
3. **Optional fields**: Context that helps but is not critical
4. **Remove everything else**: If a field is rarely filled in, it does not belong

### Structure for Reuse

Templates should be modular so teams can assemble what they need:

- **Header block**: Metadata (owner, date, version, status)
- **Context block**: Background and objectives
- **Core content block**: The primary deliverable content
- **Review block**: Approval, feedback, and sign-off
- **Appendix block**: Supporting data, references, assumptions

### Progressive Detail

Start simple. Add detail only where the template will be used repeatedly and consistency matters.

- **Level 1 template**: Outline with section headings and brief guidance
- **Level 2 template**: Structured sections with field labels and examples
- **Level 3 template**: Full form with validation rules, drop-downs, and auto-calculations

## Core Planning Templates

### Strategic Planning Template

**Purpose**: Annual or multi-year strategic direction setting.

**Sections**:
1. Executive summary (1 page max)
2. Environmental scan (market, competitive, regulatory)
3. SWOT analysis (strengths, weaknesses, opportunities, threats)
4. Strategic priorities (3-5 maximum)
5. Key objectives per priority with measurable targets
6. Resource requirements and budget implications
7. Risk assessment and mitigation strategies
8. Implementation timeline with milestones
9. Governance and review cadence

**Usage guidance**: Complete sections 1-4 before the strategy workshop. Use the workshop to align on sections 5-8. Finalize section 9 post-workshop.

### Initiative Planning Template

**Purpose**: Detailed plan for a specific initiative or project.

**Sections**:
1. Initiative overview (problem statement, objectives, scope)
2. Stakeholder map (RACI matrix)
3. Work breakdown structure (phases, deliverables, tasks)
4. Resource allocation (people, budget, tools)
5. Timeline with dependencies and milestones
6. Risk register with probability, impact, and mitigation
7. Success criteria and measurement approach
8. Communication plan
9. Review and approval gates

**Usage guidance**: Complete the overview and stakeholder map first. Use them to inform the work breakdown. Do not finalize the timeline until dependencies are mapped.

### Sprint/Cycle Planning Template

**Purpose**: Short-cycle planning (1-4 weeks).

**Sections**:
1. Cycle goals (2-3 measurable objectives)
2. Capacity available (team members, hours, constraints)
3. Committed work items (prioritized list with estimates)
4. Stretch items (if capacity allows)
5. Dependencies and blockers
6. Carry-over items from previous cycle
7. Definition of done per work item

**Usage guidance**: Fill in capacity first to set realistic commitments. Prioritize carry-over items before new work. Keep stretch items truly optional.

## Template Governance

### Template Lifecycle

| Phase | Activities | Owner |
|-------|-----------|-------|
| **Draft** | Initial creation, gather requirements | Template author |
| **Review** | Peer review, pilot test with one team | Planning operations manager |
| **Approve** | Stakeholder sign-off, publish to library | Planning governance board |
| **Active** | In use, collect feedback, minor updates | Template author |
| **Review cycle** | Quarterly assessment, usage metrics | Planning operations manager |
| **Retire** | Archive, redirect users to replacement | Planning operations manager |

### Version Control

- Use semantic versioning: `MAJOR.MINOR` (e.g., 2.1)
- **Major version**: Structural changes (added/removed sections)
- **Minor version**: Wording, formatting, or example updates
- Maintain a changelog at the bottom of each template
- Archive previous versions rather than deleting them

### Template Library Management

Maintain a central template library with:

- **Catalog**: Searchable index of all active templates
- **Metadata per template**: Name, purpose, owner, version, last updated, usage count
- **Access control**: View access for all, edit access for owners and governance board
- **Feedback mechanism**: Easy way for users to suggest improvements
- **Usage analytics**: Track which templates are used, by whom, and how often

### Quality Standards

Every template must meet these criteria before approval:

1. **Clear purpose statement** - One sentence explaining when to use this template
2. **Field-level guidance** - Each field has a description or example
3. **Consistent formatting** - Follows the organization's style guide
4. **Tested with real data** - At least one pilot use before publication
5. **Owner assigned** - A named individual responsible for maintenance
6. **Review date set** - Next scheduled review within 6 months

## Template Adoption Strategy

### Driving Adoption

| Approach | Expected Impact |
|----------|-----------------|
| Executive sponsorship (leadership endorses and uses templates) | High |
| Integration with tools (embed in project management software) | High |
| Training sessions and success stories | Medium |
| Feedback loops and metrics visibility | Medium |

**Common resistance**: "Too rigid" (emphasize optional fields), "No time" (show rework savings), "Doesn't fit" (capture feedback and adapt).

### Measuring Adoption

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Template usage rate | >80% of applicable outputs | Count template-based vs. freeform deliverables |
| Completion rate | >90% of required fields filled | Audit a sample each quarter |
| User satisfaction | >4.0 / 5.0 | Quarterly survey |
| Time to first draft | Decrease 20% vs. freeform | Compare cycle times before and after adoption |
| Rework rate | Decrease 30% vs. freeform | Track revision cycles per deliverable |
