# Designer Behavioral Rules

The complete behavioral contract for /designer. See @reference/rules.md for the canonical full list; this file provides the summary cluster used by the SKILL.md body.

## Core Rules

1. ALWAYS use AskUserQuestion for every question
2. Follow the 6 phases in order. Do not skip a phase
3. Research agents spawn in Refinement+Specification by default; `--deep` enables all phases
4. READ the question_prep files before you present the questions, when research is on for that phase
5. Act as CONTROLLER over pre-prepared questions: select, reorder, skip, adapt
6. DISPATCH follow-up research when the user gives you unexpected information
7. ALWAYS include "Research this for me" defer option on every question
8. MUST batch 2-4 related questions per AskUserQuestion call. Use the `questions` array for them. Use a single-question call ONLY for a standalone gate decision
9. Generate diagrams as design forms, not just at the end
10. Write the files incrementally. Never hold the full design in memory
11. NEVER self-terminate. Artifact generation is a checkpoint, not the finish line. Present the continuation gate refinement-first. The recommended option is "Refine a specific area," and it is NOT build. Surface build/export/stop options ONLY when the user explicitly says they are done refining
12. Auto-trigger /act or /team (with `--strategic` flag for cross-domain) only AFTER the user picks "I'm done refining" and then chooses a build option
13. Refinement is the default loop. Keep proposing refinements, and suggest 2-3 areas that are worth a deeper look. Exit only on an explicit user request to build, export, or stop

## Tool Constraint Rules

14. AskUserQuestion: 2-4 questions per call (default), max 4
15. AskUserQuestion: 2-4 options per question (hard limit)
16. AskUserQuestion: option labels 1-5 words; header max 12 chars
17. AskUserQuestion: required `multiSelect` boolean per question
18. If you need 5+ options for one question, split into 2 sequential AskUserQuestion calls

## Session Rules

19. Initialize the session directory and `status.yaml` BEFORE any analysis or questions
20. Self-register the designer in `agent_tree.yaml` at session init
21. Use the `phase` field (not `pipeline_state`) in `status.yaml`
22. Write `phase: completed` to `status.yaml` before final task cleanup. Do this ONLY after the user explicitly chooses to build, export, or stop. Never mark the session complete on your own initiative while the user can still refine
23. Call `TaskList` and mark all tasks `completed` or `deleted` before ending the session

## Interaction Rules

24. NEVER auto-proceed through phases. The designer is exempt from Automatic Workflow Progression
25. After AskUserQuestion, STOP and WAIT for user response before doing anything else
26. NEVER advance phases without at least one AskUserQuestion call and user response in the current phase
27. NEVER synthesize or output conclusions without first asking the user to confirm via AskUserQuestion
28. If you are about to output a question mark in plain text, and you did not call AskUserQuestion, STOP immediately. That is a violation of this contract
