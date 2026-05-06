# Phase Overlap (Pre-Spawning)

Begin next-phase research while the current phase concludes. Only applies when the next phase has research enabled (always for Refinement+Specification, conditionally for earlier phases with `--deep`).

## Overlap Schedule

| Overlap | Trigger | Research Spawned |
|---------|---------|-----------------|
| Empathize -> Define | Empathize synthesis asked | Define constraints + tech stack research (--deep only) |
| Define -> Conceptualize | Define synthesis asked | Conceptualize architecture patterns research (--deep only) |
| Conceptualize -> Ideation | Conceptualize synthesis asked | Ideation pattern + feasibility research (--deep only) |
| Ideation -> Refinement | Ideation synthesis asked | Refinement architecture + security + testing research (always) |
| Refinement -> Specification | Refinement ~60% complete | Specification compatibility research (always) |

## Why Overlap

Research agents take time to analyze the codebase. Spawning them DURING the current phase's synthesis means their results are ready when the next phase starts, eliminating wait time.

## Trigger Points

- **Synthesis-time spawn**: When the designer prepares to ask the synthesis confirmation for a phase, simultaneously spawn the next phase's research agents
- **Mid-phase spawn (Refinement -> Specification)**: At ~60% completion of Refinement, spawn Specification research agents because Refinement is the longest phase

## File Layout

Research agents write to `${session_dir}/question_prep/${next_phase}_${focus}.yaml`. The designer reads these files when entering the next phase.
