# Phase 6: Specification (20% of session)

**Goal**: Generate production-ready artifacts from all gathered design information.

**Research agents**: ALWAYS spawned (no `--deep` required).

## Continuation Gate Cascade (refinement-first)

Refinement is the default state of the designer. Generating artifacts is NOT
the end of the session — it is the start of the next refinement pass. The
designer NEVER self-terminates; build/export/stop options appear ONLY after
the user explicitly says they are done. `AskUserQuestion` allows at most 4
options per call, so the gate is a cascade:

```
Call 1 (continuation gate — refinement-first):
  Refine a specific area (Recommended) |
  Run an endless refinement pass (sweep every section) |
  I'm done refining — show build / export options |
  Save & pause

Call 2 (ONLY if user picks "I'm done refining"):
  Build now (/run) |
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
   specific area"; build/export NEVER appear in Call 1. Selecting either
   refinement option re-enters Refinement for the chosen scope and returns
   to this same gate — the loop does not exit on its own. The build-handoff
   strings (`Build now (/run`, `Build with team (/team)`, `/team --strategic`)
   must remain present and reachable in Call 2; that contract is guarded by
   `tests/v12/designer-design-anything.test.js`.
2. **Call 2 is only reached when the user picks "I'm done refining".** Never
   issue Call 2 unsolicited — that is the self-termination bug this contract
   exists to prevent.
3. **Call 3 is only reached when the user picks "Export / Share / Manual"
   in Call 2.** Never collapse the cascade into a single 5+ option call —
   `AskUserQuestion` will fail. Every Call 3 branch keeps a "Keep refining"
   path back to Call 1.
4. The non-implementation exits (Export, Share, Manual) are for designs
   that do not get "built" by `/run` or `/team` — weddings, curricula,
   research-study protocols, personal routines. The user gets a
   terminal action without forcing an `/run` invocation.
5. Write `phase: completed` to `status.yaml` and clean up tasks ONLY after
   the user explicitly chooses a build, export, or save-and-stop option.
   Never write it on your own initiative just because artifacts exist.

## Step 1: Read Specification Research

Read pre-prepared research files (spawned during Refinement phase-overlap):
- `question_prep/specification_compatibility.yaml` -- Codebase compatibility analysis (API patterns, naming conventions, model patterns, test patterns)

Use research findings to:
1. Pre-fill codebase compatibility validation data (avoid re-scanning the codebase)
2. Flag any design-codebase incompatibilities proactively
3. Ensure artifact generation uses correct naming conventions, API patterns, etc.

**Fallback**: If research files unavailable, perform inline compatibility checks with Glob/Grep/Read.

## Artifact Generation

Reference: `cagents-memory/_system/templates/designer/artifact_generator.yaml`

### Software Design Artifacts

1. **User Stories** (from user flows + stakeholders):
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

2. **Technical Specification** (from architecture + data model):
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

3. **Implementation Checklist** (from all design decisions):
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

Run 5-level validation on the completed design:

**1. Completeness** - Are all critical areas covered?
- Check: All required fields from the chunk template are answered
- Score: 0.0 to 1.0

**2. Consistency** - Any contradictions?
- Check: Tech choices align with constraints, scale matches architecture, timeline fits scope
- Score: 0.0 to 1.0

**3. Feasibility** - Is this realistic?
- Check: Architecture fits scale, timeline matches scope, team can deliver
- Score: 0.0 to 1.0

**4. Quality** - Best practices followed?
- Check: Security addressed, testing planned, edge cases considered, monitoring defined
- Score: 0.0 to 1.0

**5. Codebase Compatibility** (software designs only) - Does the design align with the existing codebase?
- **Primary source**: `question_prep/specification_compatibility.yaml` from research agent (pre-analyzed)
- Check: Proposed APIs vs existing API patterns
- Check: Data model compatibility with existing schema
- Check: Import/dependency feasibility
- Check: Naming convention alignment
- Score: 0.0 to 1.0
- Flag incompatibilities as validation warnings with suggested adjustments

Present validation results via AskUserQuestion:

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

**CRITICAL**: Artifacts being generated is NOT "complete." Present the
continuation gate refinement-first. Do NOT lead with build options, and do
NOT auto-advance to build/export — the designer never self-terminates.

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
      {label: "Build now (/run)", description: "Execute immediately with the pipeline engine"},
      {label: "Build with team (/team)", description: "Parallel team execution for complex designs"},
      {label: "Build with team strategic mode (/team --strategic, cross-domain)", description: "Cross-domain C-suite coordination (Wave 0/1, per-domain Wave 3..N)"},
      {label: "Export / Share / Manual", description: "Non-implementation exits: PDF/Markdown, read-only link, printable checklist"}
    ],
    multiSelect: false
  }]
})
```

### Auto-Trigger Build (only after "I'm done refining")

When user selects "Build now (/run)":
```javascript
Skill({ skill: "run", args: `implement design from ${session_id}` })
```

When user selects "Build with team (/team)":
```javascript
Skill({ skill: "team", args: `implement design from ${session_id}` })
```

When user selects "Build with team strategic mode (/team --strategic, cross-domain)":
```javascript
Skill({ skill: "team", args: `implement design from ${session_id} --strategic` })
```
(v12.2.0+; pre-v12.2.0 this option invoked `/org`, which was absorbed into `/team` strategic mode.)

When user selects "Refine a specific area":
```
Ask which phase/topic to refine via AskUserQuestion.
Jump back to that phase with existing context preserved.
Only re-ask questions relevant to the specified area.
Then RETURN to the continuation gate — do not terminate.
```

When user selects "Run an endless refinement pass" (the default loop):
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

If user saves for later, tell them:
```
Your design is saved at: cagents-memory/sessions/{session_id}/

To implement later:
  /run implement design from {session_id}
  /team implement design from {session_id}   (parallel, faster for large designs)
  /team implement design from {session_id} --strategic    (cross-domain coordination via C-suite Wave 0/1)
```

### Terminal Phase Value

Write `phase: completed` to `cagents-memory/sessions/{session_id}/status.yaml` ONLY after the user explicitly chooses a build, export, or save-and-stop option. The verify-completion.cjs Stop hook recognizes `complete`, `completed`, or `validating` as terminal phase values; any other value triggers a non-blocking warning. Do NOT write a terminal phase value while the user is still refining (or might refine again) — refinement is the default state, and marking the session complete on your own initiative is the self-termination bug this contract exists to prevent.
