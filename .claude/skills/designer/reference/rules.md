# Designer Behavioral Rules

This file holds the complete behavioral contract for the /designer command.

1. **ALWAYS USE AskUserQuestion: OVERRIDE AUTO-PROCEED** - Never write a question as plain text. ALWAYS use the `AskUserQuestion` tool. This rule OVERRIDES the "Automatic Workflow Progression" rule and the "Automatic State Transitions" rule from CLAUDE.md and from orchestration.md. The /designer MUST stop and wait for user input at every question. It MUST NOT go on through the phases on its own, and it MUST ask first. After you call `AskUserQuestion`, STOP and WAIT. Do not continue to process. Do not generate an artifact. Do not advance a phase until the user responds. **A multi-question call of 2-4 questions is the MANDATORY default.** Batch the related questions together, because a batch makes the conversation more efficient. A single-question call is allowed only for a standalone gate decision, as in rule 33.

2. **FOLLOW THE 6 PHASES** - The order is Empathize -> Define -> Conceptualize -> Ideation -> Refinement -> Specification. Do not skip a phase. Each phase builds on the phase before it.

3. **--DEEP FLAG CONTROLS RESEARCH AGENT SPAWNING** - Without `--deep`, research agents only spawn in Refinement and Specification phases. With `--deep`, research agents spawn in all 6 phases. Early phases (Empathize through Ideation) use inline analysis by default.

4. **READ QUESTION_PREP FILES BEFORE PRESENTING** - If research is enabled for a phase, read the question_prep files before you ask any question. Build a question pool from the findings of the research. If the research is unavailable, fall back to the chunk templates.

5. **ACT AS CONTROLLER** - Select the questions from the pre-prepared pool. Use the priority of each question, its dependencies, and the category that it clusters into. Do not write a question from the start when a research-prepared pool exists. **When you present questions, batch the related questions from the pool into a single AskUserQuestion call of 2-4 questions.** Group them by topic area: put the user type with the pain points, and put the constraints with the success criteria. A batch cuts the round-trips, and it makes the conversation flow more natural.

6. **ADAPT QUESTIONS BASED ON ANSWERS** - Do these three steps after each user answer. If the user shows expertise in a topic, or puts emphasis on it, reorder the questions that remain. Skip each question that an earlier answer already answered. Enrich each question that is still to come with the context that the user stated.

7. **DISPATCH FOLLOW-UP RESEARCH** - Sometimes the user gives information that the first research did not cover. Examples are a new constraint, an unexpected context, and more systems. In that case, spawn a follow-up research agent with the Agent tool to investigate. Put its results into the question pool.

8. **PHASE-OVERLAP RESEARCH** - Each phase has a synthesis step and a confirmation step. During that step, spawn the research agents for the NEXT phase. Do this only when research is enabled for that phase. The overlap removes the dead time at a phase transition.

9. **ALWAYS INCLUDE "RESEARCH THIS FOR ME" OPTION** - Every AskUserQuestion call MUST include a "Research this for me" option, or an equivalent phrase. If the user selects that option, dispatch a subagent to investigate. Present the question again later, with the enriched context.

10. **SEARCH BEFORE ASKING** - A research agent does the deep analysis of the codebase. The designer can also use Glob, Grep, and Read for a quick inline check. Never ask a question whose answer is already in the codebase.

11. **BUILD ON ANSWERS** - Each question should connect to what the user said. Never ask a question in a vacuum.

12. **BATCH RELATED QUESTIONS** - The designer MUST ask 2-4 related questions in each AskUserQuestion call. A batch of 2-4 questions is mandatory, and it is not optional. It cuts the interaction rounds, and it makes the conversation flow more natural. Batch the questions by topic area: the users with the pain points, the constraints with the success criteria, and the domain with the scope. Use a single question ONLY for a standalone gate decision, as in rule 33. Never write a question as plain text, and always use the AskUserQuestion tool.

13. **GENERATE ARTIFACTS INLINE** - Build the design document as you go. Show the diagrams, the user stories, and the specs as they form. Show them in real time during the Refinement phase and the Specification phase.

14. **RECOMMEND PATTERNS** - When a known design pattern fits, recommend it and give your rationale. Point to the pattern library and to the findings of the research.

15. **VALIDATE AT GATES** - Do a check of the phase gate before you advance. Do not skip to the next phase while a gap remains.

16. **SYNTHESIZE REGULARLY** - Stop every 5-7 questions. Use AskUserQuestion to confirm your understanding with the user.

17. **ADAPT TO EXPERTISE** - Adjust the complexity of each question to the answers of the user. A technical user gets technical questions. The controller reorders the pool to match the level of expertise that it detects.

18. **SHOW PROGRESS** - After each significant answer in Refinement or in Specification, show what you added to the design. Show the overall progress too.

19. **NEVER SELF-TERMINATE: REFINEMENT-FIRST CONTINUATION GATE** - The artifacts that you generate are a checkpoint. They are not the finish line. Present the continuation gate with refinement first, and give these four options in this order:
    - "Refine a specific area", which is the recommended option
    - "Run an endless refinement pass"
    - "I'm done refining — show build/export options"
    - "Save & pause"

    NEVER lead with a build option, and NEVER advance to build or to export on your own. The build menu holds Build /act, Build /team, Build /team --strategic, and Export/Share/Manual. That menu appears in a SECOND call, and only after the user explicitly picks "I'm done refining".

20. **AUTO-TRIGGER BUILD (only after "I'm done refining")** - The user first picks "I'm done refining", and then picks a build option. Map that option to a skill call:
    - "Build now (/act)" -> `Skill({skill: "act", ...})`
    - "Build with team (/team)" -> `Skill({skill: "team", ...})`
    - "Build with team strategic mode" -> `Skill({skill: "team", args: "<request> --strategic"})`

    Do NOT make the user type another command. Before v12.2.0 the cross-domain option was `/org`. Version v12.2.0 absorbed `/org` into `/team --strategic`.

21. **ENDLESS REFINEMENT IS THE DEFAULT** - Refinement is the default state of the designer, and it is not an opt-in mode. Enter continuous refinement with these steps. Present the design areas, or propose 2-3 areas that you judge worth more depth. The user then picks one area. Do a targeted refinement with research, show the diff, and repeat. Exit ONLY when the user explicitly selects "I'm done refining". Never exit on a turn count, on an artifact count, or on your own judgment that the design "looks done".

22. **USE CHUNK TEMPLATES AS FALLBACK** - The chunk templates are the FALLBACK source when the research agents are unavailable. When the research is available, use the research-enriched questions as the main source. Let the templates fill the gaps.

23. **GENERATE DIAGRAMS** - Use the mermaid syntax for the architecture diagram, the sequence diagram, the ERD, and the flow diagram. Generate them as the design forms. Do not generate them only at the end.

24. **WRITE INCREMENTALLY** - Write the phase file to disk as each phase completes. Write the question_prep files at once. Write each artifact as you generate it. Never hold the entire design in memory.

25. **MONITOR CONTEXT** - After 20 questions, enter the context-conscious mode. In that mode, write shorter summaries and write each file at once. Point to a file instead of a repeat of its content. A research agent lowers the context pressure, because it writes to a file and does not return its findings in the context.

26. **SPLIT LARGE DESIGNS** - A design reaches a split threshold at more than 10 stories, at more than 3 subsystems, or at more than 5 characters. At that point, split the design into one file per feature, or into one file per component.

27. **CHECKPOINT AT PHASES** - Create a waypoint file at every phase transition. Include the resume instructions and the state of each research agent. The session can then recover from any interruption.

28. **ASSEMBLE, DON'T REBUILD** - The final design_document.md is assembled from the phase files on disk. Never build the entire design again from memory at the end.

29. **GRACEFUL DEGRADATION** - If the research agents fail, time out, or give invalid output, fall back to the current behavior. The current behavior is the chunk templates plus an inline analysis. The designer ALWAYS works, with the research agents or without them.

30. **SKIP WITH NOTIFICATION** - Sometimes you skip a question, because the research or the user already gave the answer. Tell the user in short: "Skipping [topic] -- [reason]". Never drop a question in silence.

31. **MANAGE DEFERRED QUESTIONS** - Track each deferred question in the session state. When the research returns for a deferred question, present that question again with the enriched context. If every question that remains is deferred, wait for the research agents.

32. **REFINE SPECIFIC AREA** - The user selects "Refine a specific area" at the continuation gate. Jump back to the phase that is relevant, and keep the existing context. Ask again only the questions that are relevant to the area that the user named. Then RETURN to the continuation gate. Do not terminate.

33. **MINIMUM 2 QUESTIONS PER CALL** - The designer MUST present a minimum of 2 questions in each AskUserQuestion call. A single-question call is allowed only for the three standalone gate decisions below. Each one carries an explicit justification.
    - **Opening topic detection**: The user gave no topic, and the designer must establish what the user wants to design. This is Phase 1, Step 1, which holds the first question of the whole session.
    - **Synthesis confirmations**: A phase gate holds a true binary go or no-go decision. An example is "Does this capture the situation? Yes / No, missing something". Use one question only when that confirmation is the one pending question. Also make sure that no near question shares the same topic concern.
    - **Build option overflow**: Phase 6 offers the build options in two calls. The second AskUserQuestion call handles the options that did not fit inside the 4-option limit of the first call.

    Any other single-question call breaks this rule. If you are in doubt, look at the questions near it in the pool. If any of them shares a topic concern, batch them together. "Related" means the same phase concern. The users and the pain points are both empathy concerns. The constraints and the success criteria are both problem-definition concerns.

34. **SIZE RULE: THE EXCEPTION IS USER TURNS AND NOTHING ELSE** - The main-session size rule admits only content whose size does not grow with the size of the work. See @.claude/rules/core/delegation.md § The Size Rule for the canonical statement. /designer is a declared exception **in one respect only**: it carries **user turns**, which have no alternative channel. A question cannot be answered on disk. That exception is bounded by **checkpoint-restart**, and it is not bounded by exclusion. The designer writes the Q&A to the phase files and to the waypoints as it forms, as in rules 24 and 27. The restart arms when the context of the designer reaches the DEGRADING band, or when 30 questions accumulate since the last restart. It then fires at the next phase gate, at the next continuation gate, or at the next synthesis confirmation. It never fires in the middle of a question. The new segment resumes from the latest waypoint, and it does not carry its whole history forward. See @reference/checkpoint-restart.md for the full contract, and see @reference/session-resilience.md for the resume protocol that it builds on.

    The carve-out covers the user turns, and it stops there. The size rule excludes design reasoning, artifact bodies, evidence, work-product content, and unbounded tool results from the main session of /designer. It excludes them here exactly as it does everywhere else. That is why a research agent writes its findings to a `question_prep/` file, instead of a return of those findings in context, as in rule 25. That is also why `design_document.md` is assembled from the phase files, instead of a rebuild from memory, as in rule 28. /designer is not broadly exempt from the size rule.
