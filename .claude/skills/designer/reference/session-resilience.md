# Designer Session Resilience

Design sessions can run 30-60+ questions spanning hours. Context windows are finite. The designer MUST handle long sessions gracefully.

## Session Directory Structure

```
Agent_Memory/sessions/designer_{YYYYMMDD_HHMMSS}/
+-- session.yaml                    # Master state (updated after every question)
+-- qa_log.yaml                     # Active phase Q&A only (completed phases summarized)
+-- phases/                         # Phase output files (written at phase completion)
|   +-- 01_discovery.md
|   +-- 02_ideation.md
|   +-- 03_refinement.md
|   +-- 04_specification.md
+-- artifacts/                      # Generated artifacts (written individually)
|   +-- user_stories.md
|   +-- technical_spec.md
|   +-- implementation_checklist.md
|   +-- diagrams/
|       +-- architecture.mermaid
|       +-- sequence.mermaid
|       +-- erd.mermaid
|       +-- flow.mermaid
+-- waypoints/                      # Phase transition checkpoints
|   +-- wp-001.yaml
|   +-- wp-002.yaml
+-- design_document.md              # Final assembled document
+-- validation/
    +-- validation_report.yaml
```

## session.yaml (Updated After Every Question)

```yaml
session_id: designer_20260204_143022
version: "2.0"
status: active
current_phase: refinement
domain: software
topic: "OAuth2 authentication for SPA"
template_used: product_feature
question_count: 18
progress_percentage: 65
context_mode: normal  # normal | context_conscious (after 20 questions)
started_at: "2026-02-04T14:30:22Z"
last_activity: "2026-02-04T15:15:00Z"

phases:
  discovery:
    status: completed
    questions_asked: 7
    file: phases/01_discovery.md
  ideation:
    status: completed
    questions_asked: 5
    file: phases/02_ideation.md
  refinement:
    status: in_progress
    questions_asked: 6
  specification:
    status: pending
```

## Incremental File Saves

**MANDATORY**: Do NOT hold the entire design in memory. Write to files incrementally.

**Rules**:
- Write `phases/01_discovery.md` the moment Discovery phase gate passes
- Write `phases/02_ideation.md` the moment Ideation phase gate passes
- Write individual artifact files as they are generated (not all at once)
- Write diagram `.mermaid` files as each diagram is created
- The final `design_document.md` is ASSEMBLED from phase files at the end - not built from memory
- Update `session.yaml` after every question

## Context Window Monitoring

**Monitor these signals**:
1. **Question count**: After 20 questions, enter "context-conscious mode"
2. **Phase duration**: If a single phase exceeds 15 questions, consider splitting
3. **Synthesis frequency**: Increase from every 5-7 to every 3-4 questions after question 20

**Context-Conscious Mode** (activated after 20 questions):
- Shorter synthesis summaries (100-200 words, not 300-500)
- Write phase files immediately (don't wait for phase gate)
- Reference files instead of repeating content ("See phases/01_discovery.md")
- Stop including full Q&A history in synthesis - summarize instead
- Reduce inline diagram complexity
- Write artifacts to files immediately, show only summary inline

**When approaching context limits** (>30 questions):
1. Write ALL current state to files immediately
2. Create a waypoint checkpoint
3. Summarize remaining work as a compact resume plan

## Phase-Level Checkpointing (Waypoints)

Create a waypoint file at every phase transition:

```yaml
# waypoints/wp-001.yaml
id: WP-001
type: phase_transition
phase_from: discovery
phase_to: ideation
created_at: "2026-02-04T15:00:00Z"
question_count: 7

completed_work:
  - "Problem statement defined"
  - "3 stakeholders identified"
  - "4 constraints documented"
  - "Success criteria: response time < 200ms, 99.9% uptime"

files_written:
  - phases/01_discovery.md
  - session.yaml
  - qa_log.yaml

resume_instructions: |
  Read phases/01_discovery.md for full Discovery output.
  Continue with Ideation phase: generate 2-4 solution alternatives.
  Discovery synthesis confirmed by user.
```

## Q&A Log Management

The `qa_log.yaml` keeps only active phase Q&A. After phase completion, move Q&A into the phase file and keep only a summary:

```yaml
# qa_log.yaml (after Discovery completes)
completed_phases:
  discovery:
    question_count: 7
    summary: "Problem: OAuth2 for SPA. Users: developers + end users. Constraints: backward compat."
    full_log: "phases/01_discovery.md"

exchanges:
  # Only current phase's Q&A lives here
  - id: 8
    phase: ideation
    question: "Which approach interests you most?"
    answer: "Option A: next-auth providers"
```

## Session Resume Protocol

When resuming (via `/designer --resume {id}` or after context compaction):

1. Read `session.yaml` (100-200 tokens) - get phase, progress, domain
2. Read latest `waypoints/wp-*.yaml` (200-300 tokens) - get resume instructions
3. Read ONLY the current phase file (500-1500 tokens) - NOT all phase files
4. Read active `qa_log.yaml` (only current phase's exchanges)
5. Continue from where you left off

**DO NOT** reload all previous phase files. They are on disk for final assembly.

**Resume announcement**:
```javascript
AskUserQuestion({
  questions: [{
    question: `Resuming your design session:

**Topic**: ${topic}
**Current Phase**: ${current_phase}
**Progress**: ${progress_percentage}%
**Last Activity**: ${last_activity}

${resume_summary}

Ready to continue?`,
    header: "Resume",
    options: [
      {label: "Continue where I left off", description: "Pick up from ${current_phase}"},
      {label: "Review what we have", description: "Show summary of completed phases"},
      {label: "Jump to a different phase", description: "Skip ahead or go back"},
      {label: "Start fresh", description: "Begin a new design session"}
    ],
    multiSelect: false
  }]
})
```
