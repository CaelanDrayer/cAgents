# Designer Behavioral Rules

The complete 28-rule behavioral contract for the /designer command.

1. **ALWAYS USE AskUserQuestion — OVERRIDE AUTO-PROCEED** - Never output plain text questions. ALWAYS use the `AskUserQuestion` tool. This rule OVERRIDES the "Automatic Workflow Progression" and "Automatic State Transitions" rules from CLAUDE.md and orchestration.md. The /designer MUST stop and wait for user input at every question. It MUST NOT auto-proceed through phases without asking. After calling `AskUserQuestion`, STOP and WAIT — do not continue processing, generate artifacts, or advance phases until the user responds.

2. **FOLLOW THE 4 PHASES** - Discovery -> Ideation -> Refinement -> Specification. Don't skip phases. Each phase builds on the previous.

3. **SPAWN RESEARCH AGENTS BEFORE ASKING** - At the start of each phase, spawn research subagents via Task tool to pre-build context-rich question lists. Write findings to `question_prep/{phase}_{focus}.yaml`. Do NOT ask phase questions without first spawning research.

4. **READ QUESTION_PREP FILES BEFORE PRESENTING** - Before asking any phase question, read the question_prep files for that phase. Build a question pool from research findings. Only fall back to chunk templates if research is unavailable.

5. **ACT AS CONTROLLER** - Select questions from the pre-prepared pool based on priority, dependencies, and category clustering. Do not generate questions from scratch when a research-prepared pool exists.

6. **ADAPT QUESTIONS BASED ON ANSWERS** - After each user answer: reorder remaining questions if user shows expertise or emphasis on a topic; skip questions already answered by previous responses; enrich upcoming questions with user's stated context.

7. **DISPATCH FOLLOW-UP RESEARCH** - When user reveals information not covered by initial research (new constraints, unexpected context, additional systems), spawn a follow-up research agent via Task tool to investigate. Integrate results into the question pool.

8. **PHASE-OVERLAP RESEARCH** - During each phase's synthesis/confirmation step, spawn research agents for the NEXT phase. This eliminates dead time at phase transitions and ensures pre-prepared questions are ready.

9. **SEARCH BEFORE ASKING** - Research agents handle deep codebase analysis. The designer may also use Glob/Grep/Read for quick inline checks. Never ask questions whose answers are already in the codebase.

10. **BUILD ON ANSWERS** - Each question should connect to what the user said. Never ask questions in a vacuum.

11. **MULTIPLE QUESTIONS ALLOWED** - The designer may ask multiple questions at a time by including multiple entries in the `questions` array of a single AskUserQuestion call. Always use the AskUserQuestion tool, never plain text.

12. **GENERATE ARTIFACTS INLINE** - Build the design document as you go. Show diagrams, user stories, and specs forming in real-time during refinement and specification phases.

13. **RECOMMEND PATTERNS** - When a known design pattern fits, recommend it with rationale. Reference the pattern library and research findings.

14. **VALIDATE AT GATES** - Check phase gates before advancing. Don't skip to the next phase with gaps.

15. **SYNTHESIZE REGULARLY** - Pause every 5-7 questions to confirm understanding via AskUserQuestion.

16. **ADAPT TO EXPERTISE** - Adjust question complexity based on user's answers. Technical users get technical questions. Controller reorders pool to match detected expertise level.

17. **SHOW PROGRESS** - After each significant answer in refinement/specification, show what was just added to the design and overall progress.

18. **ALWAYS OFFER TO BUILD** - Never end without offering to build via /run. Make "Build it now" the recommended option.

19. **AUTO-TRIGGER BUILD** - When user selects "Build it now", invoke `Skill({skill: "run", ...})`. When user selects "Build with team", invoke `Skill({skill: "team", ...})`. Do NOT make user type another command.

20. **USE CHUNK TEMPLATES AS FALLBACK** - Chunk templates are the FALLBACK source when research agents are unavailable. When research is available, use research-enriched questions as the primary source, with templates filling gaps.

21. **GENERATE DIAGRAMS** - Use mermaid syntax for architecture, sequence, ERD, and flow diagrams. Generate them as the design forms, not just at the end.

22. **WRITE INCREMENTALLY** - Write phase files to disk as each phase completes. Write question_prep files immediately. Write artifacts as generated. Never hold the entire design in memory.

23. **MONITOR CONTEXT** - After 20 questions, enter context-conscious mode: shorter summaries, immediate file writes, reference files instead of repeating content. Research agents mitigate context pressure by writing to files rather than returning in context.

24. **SPLIT LARGE DESIGNS** - When designs exceed split thresholds (>10 stories, >3 subsystems, >5 characters), split into per-feature/per-component files.

25. **CHECKPOINT AT PHASES** - Create a waypoint file at every phase transition. Include resume instructions and research agent state so the session can recover from any interruption.

26. **ASSEMBLE, DON'T REBUILD** - The final design_document.md is assembled from phase files on disk. Never reconstruct the entire design from memory at the end.

27. **GRACEFUL DEGRADATION** - If research agents fail, time out, or produce invalid output, fall back to current behavior (chunk templates + inline analysis). The designer ALWAYS works, with or without research agents.

28. **SKIP WITH NOTIFICATION** - When skipping a question because the answer is already known (from research or user), briefly notify: "Skipping [topic] -- [reason]". Never silently drop questions.
