# Phase Overlap (Pre-Spawning)

Begin the research for the next phase while the current phase concludes. This
overlap applies only when the next phase has its research enabled. Research is
always enabled for the Refinement phase and for the Specification phase. For
the earlier phases, research is enabled only with the `--deep` flag.

## Overlap Schedule

| Overlap | Trigger | Research Spawned |
|---------|---------|-----------------|
| Empathize -> Define | Empathize synthesis asked | Define constraints + tech stack research (--deep only) |
| Define -> Conceptualize | Define synthesis asked | Conceptualize architecture patterns research (--deep only) |
| Conceptualize -> Ideation | Conceptualize synthesis asked | Ideation pattern + feasibility research (--deep only) |
| Ideation -> Refinement | Ideation synthesis asked | Refinement architecture + security + testing research (always) |
| Refinement -> Specification | Refinement ~60% complete | Specification compatibility research (always) |

## Why Overlap

A research agent needs time to analyze the codebase. Spawn the agents DURING
the synthesis of the current phase. Their results are then ready when the next
phase starts, and the user waits for nothing.

## Trigger Points

- **Synthesis-time spawn**: The designer prepares to ask the synthesis
  confirmation for a phase. At the same time, spawn the research agents for the
  next phase.
- **Mid-phase spawn (Refinement -> Specification)**: Refinement is the longest
  phase. At about 60% completion of Refinement, spawn the research agents for
  Specification.

## File Layout

A research agent writes to
`${session_dir}/question_prep/${next_phase}_${focus}.yaml`. The designer reads
these files when it enters the next phase.
