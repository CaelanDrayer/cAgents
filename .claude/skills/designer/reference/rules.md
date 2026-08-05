# Designer Behavioral Rules

The complete behavioral contract for the /designer command.

1. **ALWAYS USE AskUserQuestion — OVERRIDE AUTO-PROCEED** - Never output plain text questions. ALWAYS use the `AskUserQuestion` tool. This rule OVERRIDES the "Automatic Workflow Progression" and "Automatic State Transitions" rules from CLAUDE.md and orchestration.md. The /designer MUST stop and wait for user input at every question. It MUST NOT auto-proceed through phases without asking. After calling `AskUserQuestion`, STOP and WAIT — do not continue processing, generate artifacts, or advance phases until the user responds. **Multi-question calls (2-4 questions per call) are the MANDATORY default** — batch related questions together for conversational efficiency. Single-question calls are only permitted for standalone gate decisions (see rule 33).

2. **FOLLOW THE 6 PHASES** - Empathize -> Define -> Conceptualize -> Ideation -> Refinement -> Specification. Don't skip phases. Each phase builds on the previous.

3. **--DEEP FLAG CONTROLS RESEARCH AGENT SPAWNING** - Without `--deep`, research agents only spawn in Refinement and Specification phases. With `--deep`, research agents spawn in all 6 phases. Early phases (Empathize through Ideation) use inline analysis by default.

4. **READ QUESTION_PREP FILES BEFORE PRESENTING** - When research is enabled for a phase, read the question_prep files before asking any question. Build a question pool from research findings. Fall back to chunk templates if research is unavailable.

5. **ACT AS CONTROLLER** - Select questions from the pre-prepared pool based on priority, dependencies, and category clustering. Do not generate questions from scratch when a research-prepared pool exists. **When presenting questions, batch related questions from the pool into a single AskUserQuestion call (2-4 questions per call)** — group by topic area (e.g., user type + pain points together, constraints + success criteria together). This reduces round-trips and creates a more natural conversation flow.

6. **ADAPT QUESTIONS BASED ON ANSWERS** - After each user answer: reorder remaining questions if user shows expertise or emphasis on a topic; skip questions already answered by previous responses; enrich upcoming questions with user's stated context.

7. **DISPATCH FOLLOW-UP RESEARCH** - When user reveals information not covered by initial research (new constraints, unexpected context, additional systems), spawn a follow-up research agent via Agent tool to investigate. Integrate results into the question pool.

8. **PHASE-OVERLAP RESEARCH** - During each phase's synthesis/confirmation step, spawn research agents for the NEXT phase (when research is enabled for it). This eliminates dead time at phase transitions.

9. **ALWAYS INCLUDE "RESEARCH THIS FOR ME" OPTION** - Every AskUserQuestion call MUST include a "Research this for me" option (or equivalent phrasing). When selected, dispatch a subagent to investigate and re-present the question later with enriched context.

10. **SEARCH BEFORE ASKING** - Research agents handle deep codebase analysis. The designer may also use Glob/Grep/Read for quick inline checks. Never ask questions whose answers are already in the codebase.

11. **BUILD ON ANSWERS** - Each question should connect to what the user said. Never ask questions in a vacuum.

12. **BATCH RELATED QUESTIONS** - The designer MUST ask 2-4 related questions per AskUserQuestion call. The default is 2-4 questions per call — batching is mandatory, not optional. It reduces interaction rounds and creates a more natural conversational flow. Batch by topic area (users + pain points; constraints + success criteria; domain + scope). Use a single question ONLY for standalone gate decisions (see rule 33). Never use plain text questions — always use the AskUserQuestion tool.

13. **GENERATE ARTIFACTS INLINE** - Build the design document as you go. Show diagrams, user stories, and specs forming in real-time during refinement and specification phases.

14. **RECOMMEND PATTERNS** - When a known design pattern fits, recommend it with rationale. Reference the pattern library and research findings.

15. **VALIDATE AT GATES** - Check phase gates before advancing. Don't skip to the next phase with gaps.

16. **SYNTHESIZE REGULARLY** - Pause every 5-7 questions to confirm understanding via AskUserQuestion.

17. **ADAPT TO EXPERTISE** - Adjust question complexity based on user's answers. Technical users get technical questions. Controller reorders pool to match detected expertise level.

18. **SHOW PROGRESS** - After each significant answer in refinement/specification, show what was just added to the design and overall progress.

19. **NEVER SELF-TERMINATE — REFINEMENT-FIRST CONTINUATION GATE** - Generating artifacts is a checkpoint, not the finish line. Present the continuation gate refinement-first: "Refine a specific area" (the recommended option) | "Run an endless refinement pass" | "I'm done refining — show build/export options" | "Save & pause". NEVER lead with build options and NEVER auto-advance to build/export. The build menu (Build /run, Build /team, Build /team --strategic, Export/Share/Manual) appears in a SECOND call only after the user explicitly picks "I'm done refining".

20. **AUTO-TRIGGER BUILD (only after "I'm done refining")** - Once the user has chosen "I'm done refining" and then a build option: when "Build now (/run)", invoke `Skill({skill: "run", ...})`; when "Build with team (/team)", invoke `Skill({skill: "team", ...})`; when "Build with team strategic mode", invoke `Skill({skill: "team", args: "<request> --strategic"})`. Do NOT make user type another command. (Note: pre-v12.2.0 the cross-domain option was `/org`; v12.2.0 absorbed it into `/team --strategic`.)

21. **ENDLESS REFINEMENT IS THE DEFAULT** - Refinement is the designer's default state, not an opt-in mode. Enter continuous refinement: present design areas (or proactively propose 2-3 worth deepening), user picks one, targeted refinement with research, show diff, repeat. Exit ONLY when the user explicitly selects "I'm done refining" — never on a turn count, an artifact count, or your own judgment that the design "looks done".

22. **USE CHUNK TEMPLATES AS FALLBACK** - Chunk templates are the FALLBACK source when research agents are unavailable. When research is available, use research-enriched questions as the primary source, with templates filling gaps.

23. **GENERATE DIAGRAMS** - Use mermaid syntax for architecture, sequence, ERD, and flow diagrams. Generate them as the design forms, not just at the end.

24. **WRITE INCREMENTALLY** - Write phase files to disk as each phase completes. Write question_prep files immediately. Write artifacts as generated. Never hold the entire design in memory.

25. **MONITOR CONTEXT** - After 20 questions, enter context-conscious mode: shorter summaries, immediate file writes, reference files instead of repeating content. Research agents mitigate context pressure by writing to files rather than returning in context.

26. **SPLIT LARGE DESIGNS** - When designs exceed split thresholds (>10 stories, >3 subsystems, >5 characters), split into per-feature/per-component files.

27. **CHECKPOINT AT PHASES** - Create a waypoint file at every phase transition. Include resume instructions and research agent state so the session can recover from any interruption.

28. **ASSEMBLE, DON'T REBUILD** - The final design_document.md is assembled from phase files on disk. Never reconstruct the entire design from memory at the end.

29. **GRACEFUL DEGRADATION** - If research agents fail, time out, or produce invalid output, fall back to current behavior (chunk templates + inline analysis). The designer ALWAYS works, with or without research agents.

30. **SKIP WITH NOTIFICATION** - When skipping a question because the answer is already known (from research or user), briefly notify: "Skipping [topic] -- [reason]". Never silently drop questions.

31. **MANAGE DEFERRED QUESTIONS** - Track deferred questions in session state. When research returns for a deferred question, re-present it with enriched context. If all remaining questions are deferred, wait for research agents.

32. **REFINE SPECIFIC AREA** - When user selects "Refine a specific area" at the continuation gate, jump back to the relevant phase with existing context preserved. Only re-ask questions relevant to the specified area, then RETURN to the continuation gate — do not terminate.

33. **MINIMUM 2 QUESTIONS PER CALL** - The designer MUST present a minimum of 2 questions per AskUserQuestion call. A single-question call is only permitted for the following explicitly justified standalone gate decisions:
    - **Opening topic detection**: When no topic was provided and the designer needs to establish what the user wants to design (Phase 1, Step 1 — the very first question of the session)
    - **Synthesis confirmations**: A true binary go/no-go decision at phase gates (e.g., "Does this capture the situation? Yes / No, missing something") where the confirmation is the only pending question and no adjacent question shares the same topic concern
    - **Build option overflow**: The second AskUserQuestion call in Phase 6's two-call build offer sequence, which handles overflow options that could not fit in the first call's 4-option limit

    Any other single-question call is a violation of this rule. When in doubt, look at the surrounding questions in the pool — if any share a topic concern, batch them. "Related" means same phase concern (e.g., users + pain points are both empathy concerns; constraints + success criteria are both problem-definition concerns).

34. **SIZE RULE — THE EXCEPTION IS USER TURNS AND NOTHING ELSE** - The main-session size rule (see @.claude/rules/core/delegation.md § The Size Rule) admits only content whose size does not grow with the size of the work. /designer is a declared exception **in one respect only**: it carries **user turns**, which have no alternative channel — a question cannot be answered on disk. That exception is bounded by **checkpoint-restart**, not by exclusion: Q&A is written to phase files and waypoints as it forms (rules 24 and 27), and a session that outgrows its context restarts from the latest waypoint rather than carrying its whole history forward. See @reference/session-resilience.md for the resume protocol that makes the bound real.

    The carve-out covers user turns and stops there. The size rule excludes design reasoning, artifact bodies, evidence, work-product content, and unbounded tool results from /designer's main session exactly as it does everywhere else — which is why research agents write findings to `question_prep/` files instead of returning them in context (rule 25), and why `design_document.md` is assembled from phase files rather than rebuilt from memory (rule 28). /designer is not broadly exempt from the size rule.
