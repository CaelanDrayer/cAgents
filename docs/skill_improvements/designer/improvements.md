# /designer Improvement Recommendations

## Priority 1: High Impact, Moderate Effort

### 1.1 Add Specialist Agent Delegation for Complex Designs

**Current**: Designer handles all analysis inline.
**Proposed**: For tier 3+ designs, spawn domain specialists via Agent tool during Refinement.

```
Phase 3 (Refinement) -- Enhanced:
  designer -> Agent(cagents:architect, "Evaluate proposed architecture for {constraints}")
  designer -> Agent(cagents:security-specialist, "Assess security implications of {design}")
  designer -> Agent(cagents:backend-developer, "Evaluate data model feasibility")
```

**Implementation**:
- Add `Task` to allowed-tools (currently missing)
- During Phase 3, identify areas needing specialist input
- Spawn up to 3 specialist agents in parallel for domain-specific validation
- Incorporate their findings into the design before Phase 4

**Impact**: Richer, more technically validated designs. Catch feasibility issues during design, not implementation.

### 1.2 Codebase-Aware Design Validation

**Current**: Codebase search in Discovery only (finding tech stack, frameworks).
**Proposed**: Active codebase validation in Phase 4 Specification.

```
Phase 4 (Specification) -- Enhanced Validation:
  5. Codebase Compatibility (0.0-1.0):
     - Proposed APIs vs existing API patterns
     - Data model compatibility with existing schema
     - Import/dependency feasibility
     - Naming convention alignment
```

**Implementation**:
- After generating artifacts, scan codebase for conflicts
- Flag incompatibilities as validation warnings
- Suggest adjustments to align with existing patterns

### 1.3 Design Iteration and Versioning

**Current**: No versioning. Sessions are one-shot or resumable.
**Proposed**: Add `--iterate <session_id>` flag.

```bash
/designer --iterate designer_20260204_143022
```

**Behavior**:
- Load the completed design from the previous session
- Present the existing design as a starting point
- Allow targeted modifications (skip Discovery, go straight to areas to change)
- Track changes as a design diff
- Save as a new version: `designer_20260210_091500` with `parent_session: designer_20260204_143022`

### 1.4 Design Export Formats

**Current**: Markdown only.
**Proposed**: Add `--export <format>` flag.

```bash
/designer OAuth2 auth --export jira     # Export user stories as JIRA-formatted issues
/designer OAuth2 auth --export linear   # Export as Linear tickets
/designer OAuth2 auth --export github   # Export as GitHub issues
```

**Implementation**:
- After final design_document.md assembly, transform artifacts to target format
- User stories -> issue format (title, description, acceptance criteria, labels)
- Technical spec -> wiki page format
- Implementation checklist -> task list format

## Priority 2: Medium Impact, Lower Effort

### 2.1 Strategic Brief Integration (/org awareness)

**Current**: No awareness of /org strategic context.
**Proposed**: Accept `--brief <path>` flag like /run does.

```bash
/designer authentication system --brief Agent_Memory/sessions/org_20260227/strategic_brief.yaml
```

**Behavior**:
- Read mission, success_criteria, and domain constraints from brief
- Pre-populate Discovery phase with strategic context
- Align design validation criteria with brief's success criteria

### 2.2 Implementation Feedback Loop

**Current**: No connection between design outcomes and implementation outcomes.
**Proposed**: After /run or /team completes implementation, optionally write feedback.

```yaml
# design_feedback.yaml
design_session: designer_20260204_143022
implementation_session: run_20260205_091000
feedback:
  - decision: "Use JWT for auth tokens"
    outcome: "Worked well, but refresh token rotation added complexity"
    learned: "Include refresh token strategy in design phase"
  - decision: "Single PostgreSQL database"
    outcome: "Bottleneck at 10K concurrent users"
    learned: "Include scale projections in design validation"
```

This feedback could be stored in `Agent_Memory/_knowledge/` and loaded by future /designer sessions.

### 2.3 Enhanced Creative Domain

**Current**: 6 creative refinement areas (plot, character, world, scene, theme, style).
**Proposed**: Add structured sub-workflows for each:

- **Character Development**: Personality matrix, relationship web (mermaid graph), arc planner
- **World Building**: Rule system generator, geography mapper, timeline builder
- **Plot Structure**: Beat sheet template (Save the Cat, Hero's Journey, 3-act), tension curve generator
- **Dialogue**: Voice profile per character, dialogue sample generator

### 2.4 Multi-Stakeholder Mode

**Current**: 1-on-1 with single user.
**Proposed**: Add `--stakeholders` mode for multi-perspective design.

```bash
/designer microservices migration --stakeholders "CTO, DevOps Lead, Security"
```

**Behavior**:
- During Discovery and Ideation, ask questions from each stakeholder perspective
- During Refinement, flag areas where stakeholder concerns conflict
- During Specification, label artifacts by primary stakeholder

## Priority 3: Nice-to-Have Enhancements

### 3.1 Design Templates from Past Sessions

Automatically extract successful design patterns from completed sessions and add them to the template library. Track which templates lead to successful implementations.

### 3.2 Visual Design Preview

For UI/UX designs, generate HTML/CSS mockups alongside mermaid diagrams. Use a simple component library to create clickable prototypes.

### 3.3 AI-Assisted Constraint Discovery

During Phase 1, automatically infer constraints from the codebase:
- Performance budgets from existing monitoring configs
- Security requirements from compliance configs
- Scale requirements from infrastructure configs
- Team size from git contributor analysis

### 3.4 Design Scoring Dashboard

Track design quality metrics over time:
- Average validation scores per domain
- Time-to-design vs design quality correlation
- Pattern effectiveness tracking
- Implementation success rate per design template
