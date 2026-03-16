# Designer Session Resilience

Design sessions can run 30-60+ questions spanning hours. Context windows are finite. The designer MUST handle long sessions gracefully.

## Session Directory Structure

```
Agent_Memory/sessions/designer_{YYYYMMDD_HHMMSS}/
+-- session.yaml                    # Master state (updated after every question)
+-- qa_log.yaml                     # Active phase Q&A only (completed phases summarized)
+-- question_prep/                  # Research agent outputs (per-phase question lists)
|   +-- empathize_ux.yaml           # UX analysis for Empathize (--deep only)
|   +-- empathize_stakeholders.yaml # Stakeholder analysis for Empathize (--deep only)
|   +-- define_architecture.yaml    # Architecture analysis for Define (--deep only)
|   +-- define_codebase.yaml        # Codebase analysis for Define (--deep only)
|   +-- conceptualize_patterns.yaml # Pattern analysis for Conceptualize (--deep only)
|   +-- ideation_patterns.yaml      # Pattern analysis for Ideation (--deep only)
|   +-- ideation_feasibility.yaml   # Feasibility analysis for Ideation (--deep only)
|   +-- refinement_architecture.yaml # Architecture deep-dive for Refinement (always)
|   +-- refinement_security.yaml    # Security analysis for Refinement (always)
|   +-- refinement_testing.yaml     # Testing analysis for Refinement (always)
|   +-- specification_compatibility.yaml # Codebase compatibility for Specification (always)
|   +-- deferred_*.yaml             # Research for deferred "Research this for me" questions
|   +-- followup_*.yaml             # Follow-up research triggered by user answers
+-- phases/                         # Phase output files (written at phase completion)
|   +-- 01_empathize.md
|   +-- 02_define.md
|   +-- 03_conceptualize.md
|   +-- 04_ideation.md
|   +-- 05_refinement.md
|   +-- 06_specification.md
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
session_type: designer
version: "3.0"
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
  empathize:
    status: completed
    questions_asked: 4
    file: phases/01_empathize.md
  define:
    status: completed
    questions_asked: 5
    file: phases/02_define.md
  conceptualize:
    status: completed
    questions_asked: 3
    file: phases/03_conceptualize.md
  ideation:
    status: completed
    questions_asked: 5
    file: phases/04_ideation.md
  refinement:
    status: in_progress
    questions_asked: 6
  specification:
    status: pending

# Controller state for research-enriched question management
controller_state:
  question_pool_size: 8
  questions_asked: 6
  questions_skipped: 2
  questions_remaining: 0
  follow_up_dispatched: 1
  follow_up_received: 1
  deferred_questions: []  # Questions deferred via "Research this for me"
  research_status:
    empathize_ux: skipped  # Only with --deep
    empathize_stakeholders: skipped
    define_architecture: skipped
    define_codebase: skipped
    conceptualize_patterns: skipped
    ideation_patterns: skipped
    ideation_feasibility: skipped
    refinement_architecture: completed
    refinement_security: completed
    refinement_testing: completed
    specification_compatibility: in_progress  # Pre-spawned during refinement overlap
```

## Incremental File Saves

**MANDATORY**: Do NOT hold the entire design in memory. Write to files incrementally.

**Rules**:
- Research agents write `question_prep/*.yaml` files immediately (they are subagents with file access)
- Write `phases/01_empathize.md` the moment Empathize phase gate passes
- Write `phases/02_define.md` the moment Define phase gate passes
- Write `phases/03_conceptualize.md` the moment Conceptualize phase gate passes
- Write `phases/04_ideation.md` the moment Ideation phase gate passes
- Write individual artifact files as they are generated (not all at once)
- Write diagram `.mermaid` files as each diagram is created
- The final `design_document.md` is ASSEMBLED from phase files at the end - not built from memory
- Update `session.yaml` (including `controller_state`) after every question

## Context Window Monitoring

**Monitor these signals**:
1. **Question count**: After 20 questions, enter "context-conscious mode"
2. **Phase duration**: If a single phase exceeds 15 questions, consider splitting
3. **Synthesis frequency**: Increase from every 5-7 to every 3-4 questions after question 20

**Context-Conscious Mode** (activated after 20 questions):
- Shorter synthesis summaries (100-200 words, not 300-500)
- Write phase files immediately (don't wait for phase gate)
- Reference files instead of repeating content ("See phases/01_empathize.md")
- Stop including full Q&A history in synthesis - summarize instead
- Reduce inline diagram complexity
- Write artifacts to files immediately, show only summary inline
- Read only question summaries from question_prep files (not full context per question)

**When approaching context limits** (>30 questions):
1. Write ALL current state to files immediately
2. Create a waypoint checkpoint (including research agent status)
3. Summarize remaining work as a compact resume plan

**Research agents mitigate context pressure**: Because research agents write to files instead of returning results in the conversation context, the designer only loads ~200-500 tokens per phase from question_prep files (summaries + active question context). This is much less than the ~2000+ tokens that inline codebase analysis would consume.

## Phase-Level Checkpointing (Waypoints)

Create a waypoint file at every phase transition:

```yaml
# waypoints/wp-001.yaml
id: WP-001
type: phase_transition
phase_from: empathize
phase_to: define
created_at: "2026-02-04T15:00:00Z"
question_count: 7

completed_work:
  - "Problem statement defined"
  - "3 stakeholders identified"
  - "4 constraints documented"
  - "Success criteria: response time < 200ms, 99.9% uptime"

files_written:
  - phases/01_empathize.md
  - question_prep/empathize_ux.yaml
  - question_prep/empathize_stakeholders.yaml
  - session.yaml
  - qa_log.yaml

research_status:
  empathize_ux: completed
  empathize_stakeholders: completed
  define_architecture: in_progress  # Pre-spawned during overlap
  define_codebase: in_progress

resume_instructions: |
  Read phases/01_empathize.md for full Empathize output.
  Read question_prep/define_*.yaml for pre-prepared Define questions (if available).
  Continue with Define phase: crystallize problem statement, constraints, success criteria.
  Empathize synthesis confirmed by user.
```

## Q&A Log Management

The `qa_log.yaml` keeps only active phase Q&A. After phase completion, move Q&A into the phase file and keep only a summary:

```yaml
# qa_log.yaml (after Discovery completes)
completed_phases:
  empathize:
    question_count: 4
    questions_skipped: 0
    summary: "Users: developers + end users. Pain: no OAuth2 for SPA."
    full_log: "phases/01_empathize.md"
  define:
    question_count: 5
    questions_skipped: 1
    summary: "Problem: OAuth2 for SPA. Constraints: backward compat. Success: response < 200ms."
    full_log: "phases/02_define.md"

exchanges:
  # Only current phase's Q&A lives here
  - id: 8
    phase: ideation
    question: "Which approach interests you most?"
    answer: "Option A: next-auth providers"
    source: question_prep/ideation_patterns.yaml  # Track which research informed this question
```

## Session Resume Protocol

When resuming (via `/designer --resume {id}` or after context compaction):

1. Read `session.yaml` (100-200 tokens) - get phase, progress, domain, controller_state
2. Read latest `waypoints/wp-*.yaml` (200-300 tokens) - get resume instructions and research_status
3. Read ONLY the current phase file (500-1500 tokens) - NOT all phase files
4. Read active `qa_log.yaml` (only current phase's exchanges)
5. Read `question_prep/{current_phase}_*.yaml` summaries (100-200 tokens) - restore question pool
6. If research agents were in_progress: check if question_prep files now exist; if so, read them
7. Continue from where you left off with restored question pool

**DO NOT** reload all previous phase files. They are on disk for final assembly.
**DO NOT** re-spawn research agents for phases that already have question_prep files.

**Resume announcement**:
```javascript
AskUserQuestion({
  questions: [{
    question: `Resuming your design session:

**Topic**: ${topic}
**Current Phase**: ${current_phase}
**Progress**: ${progress_percentage}%
**Last Activity**: ${last_activity}
**Research Status**: ${research_summary}

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
