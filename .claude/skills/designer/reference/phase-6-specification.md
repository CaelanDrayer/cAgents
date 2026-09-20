# Phase 6: Specification (20% of session)

**Goal**: Generate production-ready artifacts from all of the design
information that you gathered.

**Research agents**: The designer ALWAYS spawns them. The `--deep` flag is not
needed.

## Continuation Gate Cascade (refinement-first)

Refinement is the default state of the designer. The artifacts that you
generate are NOT the end of the session. They are the start of the next
refinement pass. The designer NEVER self-terminates. A build option, an export
option, or a stop option appears ONLY after the user explicitly says that they
are done. `AskUserQuestion` allows at most 4 options in one call, so the gate
is a cascade:

```
Call 1 (continuation gate — refinement-first):
  Refine a specific area (Recommended) |
  Run an endless refinement pass (sweep every section) |
  I'm done refining — show build / export options |
  Save & pause

Call 2 (ONLY if user picks "I'm done refining"):
  Build now (/act) |
  Build with team (/team) |
  Build with team strategic mode (/team --strategic, cross-domain) |
  Export / Share / Manual (non-implementation exits)

Call 3 (ONLY if user picks "Export / Share / Manual" in Call 2):
  Export design (PDF/Markdown) |
  Share design (read-only link) |
  Manual execute (printable checklist) |
  Keep refining — back to Call 1
```

### Rules for the cascade

1. **Call 1 defaults to refinement.** The recommended option is "Refine a
   specific area". A build option or an export option NEVER appears in Call 1.
   If the user selects either refinement option, re-enter Refinement for the
   chosen scope and return to this same gate. The loop does not exit on its
   own. The build-handoff strings are `Build now (/act`, `Build with team
   (/team)`, and `/team --strategic`. They must stay present and reachable in
   Call 2, and `tests/v12/designer-design-anything.test.js` guards that
   contract.
2. **Call 2 is only reached when the user picks "I'm done refining".** Never
   issue Call 2 on your own initiative. That is the self-termination bug that
   this contract exists to prevent.
3. **Call 3 is only reached when the user picks "Export / Share / Manual"
   in Call 2.** Never collapse the cascade into a single call with 5 or more
   options, because `AskUserQuestion` fails on such a call. Every Call 3 branch
   keeps a "Keep refining" path back to Call 1.
4. The non-implementation exits are Export, Share, and Manual. They are for a
   design that `/act` and `/team` do not "build". Examples are a wedding, a
   curriculum, a research-study protocol, and a personal routine. The user gets
   a terminal action, and no `/act` invocation is forced.
5. The user explicitly chooses a build option, an export option, or a
   save-and-stop option. ONLY after that choice, write `phase: completed` to
   `status.yaml` and clean up the tasks. Never write it on your own initiative
   because some artifacts exist.

## Step 1: Read Specification Research

The Refinement phase-overlap already spawned the research agents. Read the
files that they prepared:
- `question_prep/specification_compatibility.yaml` -- It holds the analysis of the compatibility with the codebase. That analysis covers the API patterns, the naming conventions, the model patterns, and the test patterns.

Use the findings of the research to do these three things:
1. Pre-fill the validation data for the compatibility with the codebase. You then avoid a second scan of the codebase.
2. Flag each incompatibility between the design and the codebase early.
3. Make sure that the artifacts you generate use the correct naming conventions and the correct API patterns.

**Fallback**: If the research files are unavailable, do the compatibility checks inline with Glob, Grep, and Read.

## Artifact Generation

Reference: `cagents-memory/_system/templates/designer/artifact_generator.yaml`

### Software Design Artifacts

1. **User Stories**, built from the user flows and the stakeholders:
```markdown
### US-001: [Title]
**As a** [user role]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] Given [context] When [action] Then [result]
- [ ] Given [context] When [action] Then [result]

**Priority**: High | **Estimate**: [points]
```

2. **Technical Specification**, built from the architecture and the data model:
```markdown
## Architecture Overview
[Mermaid component diagram]

## Components
| Component | Responsibility | Technology |
|-----------|---------------|------------|

## Data Model
[Mermaid ERD]

## API Contracts
[Endpoint definitions with request/response]
```

3. **Implementation Checklist**, built from all of the design decisions:
```markdown
## Phase 1: Foundation
- [ ] Set up project structure
- [ ] Configure database schema

## Phase 2: Core Features
- [ ] Implement [Feature 1]
- [ ] Add tests

## Phase 3: Integration
- [ ] Connect services
- [ ] End-to-end testing

## Phase 4: Deployment
- [ ] CI/CD pipeline
- [ ] Production deployment
```

### Business Design Artifacts
1. Process Flow Document with BPMN-style mermaid diagrams
2. Stakeholder RACI Matrix
3. Implementation Roadmap with milestones
4. Change Management Plan
5. Risk Register

### Creative Design Artifacts
1. Story Bible / Design Document
2. Character Sheets with arcs and relationships
3. Plot Outline with scene breakdown
4. World Bible (rules, history, geography)
5. Style Guide (voice, tone, techniques)

## Design Validation

Reference: `cagents-memory/_system/templates/designer/validation_framework.yaml`

Run the 5-level validation on the design when it is complete:

**1. Completeness** - Does the design cover all of the critical areas?
- Check: Every required field from the chunk template has an answer.
- Score: 0.0 to 1.0

**2. Consistency** - Does the design hold a contradiction?
- Check: The technology choices align with the constraints. The scale matches the architecture. The timeline fits the scope.
- Score: 0.0 to 1.0

**3. Feasibility** - Is the design realistic?
- Check: The architecture fits the scale. The timeline matches the scope. The team can deliver the work.
- Score: 0.0 to 1.0

**4. Quality** - Does the design follow the best practices?
- Check: The design addresses the security, plans the tests, considers the edge cases, and defines the monitoring.
- Score: 0.0 to 1.0

**5. Codebase Compatibility** (software designs only) - Does the design align with the existing codebase?
- **Primary source**: `question_prep/specification_compatibility.yaml`, which the research agent already analyzed.
- Check: The proposed APIs against the existing API patterns.
- Check: The compatibility of the data model with the existing schema.
- Check: The feasibility of each import and of each dependency.
- Check: The alignment of the naming conventions.
- Score: 0.0 to 1.0
- Flag each incompatibility as a validation warning, and suggest an adjustment.

Present the results of the validation with AskUserQuestion:

```javascript
AskUserQuestion({
  questions: [{
    question: `Design Validation Results:

Completeness: ${completeness_score}/1.0 - ${completeness_status}
Consistency: ${consistency_score}/1.0 - ${consistency_status}
Feasibility: ${feasibility_score}/1.0 - ${feasibility_status}
Quality: ${quality_score}/1.0 - ${quality_status}

Overall: ${overall_score}/1.0 - ${overall_assessment}

${issues_if_any}

${recommendation}`,
    header: "Validation",
    options: [
      {label: "Accept design", description: "Design is ready, proceed to build options"},
      {label: "Fix issues", description: "Address validation concerns before finalizing"},
      {label: "Accept with notes", description: "Acknowledge issues but proceed anyway"},
      {label: "Research this for me", description: "Dispatch a subagent to suggest fixes for validation issues"}
    ],
    multiSelect: false
  }]
})
```

## Continuation Gate Offer

**CRITICAL**: The artifacts that you generate are NOT "complete." Present the
continuation gate with refinement first. Do NOT lead with the build options. Do
NOT advance to build or to export on your own, because the designer never
self-terminates.

```javascript
AskUserQuestion({
  questions: [{
    question: "Your design document and artifacts are drafted. This is a checkpoint, not the finish line — what should we sharpen next?",
    header: "Refine",
    options: [
      {label: "Refine a specific area (Recommended)", description: "Jump back to a phase or topic for targeted refinement"},
      {label: "Run an endless refinement pass", description: "Sweep every section, deepening edge cases and alternatives"},
      {label: "I'm done refining — show build / export options", description: "Surface the build and export handoffs"},
      {label: "Save & pause", description: "Save for later; I'll come back to refine or build"}
    ],
    multiSelect: false
  }]
})
// Only if the user picks "I'm done refining" — second call surfaces the
// build/export handoffs (max 4 options each):
AskUserQuestion({
  questions: [{
    question: "How would you like to build or export this design?",
    header: "Build",
    options: [
      {label: "Build now (/act)", description: "Execute immediately with the pipeline engine"},
      {label: "Build with team (/team)", description: "Parallel team execution for complex designs"},
      {label: "Build with team strategic mode (/team --strategic, cross-domain)", description: "Cross-domain C-suite coordination (Wave 0/1, per-domain Wave 3..N)"},
      {label: "Export / Share / Manual", description: "Non-implementation exits: PDF/Markdown, read-only link, printable checklist"}
    ],
    multiSelect: false
  }]
})
```

### Auto-Trigger Build (only after "I'm done refining")

When the user selects "Build now (/act)", make this call:
```javascript
Skill({ skill: "act", args: `implement design from ${session_id}` })
```

When the user selects "Build with team (/team)", make this call:
```javascript
Skill({ skill: "team", args: `implement design from ${session_id}` })
```

When the user selects "Build with team strategic mode (/team --strategic, cross-domain)", make this call:
```javascript
Skill({ skill: "team", args: `implement design from ${session_id} --strategic` })
```
This behavior starts at v12.2.0. Before v12.2.0 this option invoked `/org`, and `/team` strategic mode then absorbed `/org`.

When the user selects "Refine a specific area", follow these steps:
```
Ask which phase/topic to refine via AskUserQuestion.
Jump back to that phase with existing context preserved.
Only re-ask questions relevant to the specified area.
Then RETURN to the continuation gate — do not terminate.
```

When the user selects "Run an endless refinement pass", which is the default loop, follow these steps:
```
Enter continuous refinement mode:
1. Present design areas
2. User picks one (or you proactively propose 2-3 worth deepening)
3. Targeted refinement with research agent
4. Show diff of what changed
5. Loop back to step 1
6. Exit ONLY when the user explicitly selects "I'm done refining" —
   never on a turn count, artifact count, or your own judgment
```

### Save for Later

If the user saves the design for later, tell them this:
```
Your design is saved at: cagents-memory/sessions/{session_id}/

To implement later:
  /act implement design from {session_id}
  /team implement design from {session_id}   (parallel, faster for large designs)
  /team implement design from {session_id} --strategic    (cross-domain coordination via C-suite Wave 0/1)
```

### Terminal Phase Value

Write `phase: completed` to `cagents-memory/sessions/{session_id}/status.yaml` ONLY after the user explicitly chooses a build option, an export option, or a save-and-stop option. The verify-completion.cjs Stop hook recognizes three terminal phase values, which are `complete`, `completed`, and `validating`. Any other value triggers a non-blocking warning. Do NOT write a terminal phase value while the user is still refining. Do NOT write one while the user can refine again, because refinement is the default state. If you mark the session complete on your own initiative, that is the self-termination bug that this contract exists to prevent.
