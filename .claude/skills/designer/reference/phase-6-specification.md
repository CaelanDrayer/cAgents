# Phase 6: Specification (20% of session)

**Goal**: Generate production-ready artifacts from all gathered design information.

**Research agents**: ALWAYS spawned (no `--deep` required).

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

## Build Offer

**CRITICAL**: When design is complete, ALWAYS offer 6 build options:

```javascript
AskUserQuestion({
  questions: [{
    question: "Design complete! Your design document and artifacts have been generated. What would you like to do?",
    header: "Build",
    options: [
      {label: "Build it now (/run) (Recommended)", description: "Execute immediately with the pipeline engine"},
      {label: "Build with team (/team)", description: "Parallel team execution for complex designs"},
      {label: "Build with org (/org)", description: "Full corporate hierarchy orchestration for cross-domain designs"},
      {label: "Refine specific area", description: "Jump back to a specific phase or topic for targeted refinement"}
    ],
    multiSelect: false
  }]
})
// Note: AskUserQuestion supports max 4 options. Use a second question for remaining options:
AskUserQuestion({
  questions: [{
    question: "Or would you prefer to continue refining?",
    header: "More options",
    options: [
      {label: "Endless refinement loop", description: "Enter continuous refinement mode - keep improving until satisfied"},
      {label: "Save design only", description: "Save for later, I'll build when ready"}
    ],
    multiSelect: false
  }]
})
```

### Auto-Trigger Build

When user selects "Build it now (/run)":
```javascript
Skill({ skill: "run", args: `implement design from ${session_id}` })
```

When user selects "Build with team (/team)":
```javascript
Skill({ skill: "team", args: `implement design from ${session_id}` })
```

When user selects "Build with org (/org)":
```javascript
Skill({ skill: "org", args: `implement design from ${session_id}` })
```

When user selects "Refine specific area":
```
Ask which phase/topic to refine via AskUserQuestion.
Jump back to that phase with existing context preserved.
Only re-ask questions relevant to the specified area.
```

When user selects "Endless refinement loop":
```
Enter continuous refinement mode:
1. Present design areas
2. User picks one
3. Targeted refinement with research agent
4. Show diff of what changed
5. Loop back to step 1
6. Exit when user selects "I'm satisfied - show build options"
```

### Save for Later

If user saves for later, tell them:
```
Your design is saved at: cagents-memory/sessions/{session_id}/

To implement later:
  /run implement design from {session_id}
  /team implement design from {session_id}   (parallel, faster for large designs)
  /org implement design from {session_id}    (full hierarchy for cross-domain)
```
