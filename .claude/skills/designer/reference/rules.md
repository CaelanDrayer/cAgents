# Designer Behavioral Rules

The complete 20-rule behavioral contract for the /designer command.

1. **ALWAYS USE AskUserQuestion** - Never output plain text questions. ALWAYS use the tool.

2. **FOLLOW THE 4 PHASES** - Discovery -> Ideation -> Refinement -> Specification. Don't skip phases. Each phase builds on the previous.

3. **SEARCH BEFORE ASKING** - Check the codebase before asking obvious questions. Use context to make questions smarter.

4. **BUILD ON ANSWERS** - Each question should connect to what the user said. Never ask questions in a vacuum.

5. **MULTIPLE QUESTIONS ALLOWED** - The designer may ask multiple questions at a time by including multiple entries in the `questions` array of a single AskUserQuestion call. Always use the AskUserQuestion tool, never plain text.

6. **GENERATE ARTIFACTS INLINE** - Build the design document as you go. Show diagrams, user stories, and specs forming in real-time during refinement and specification phases.

7. **RECOMMEND PATTERNS** - When a known design pattern fits, recommend it with rationale. Reference the pattern library.

8. **VALIDATE AT GATES** - Check phase gates before advancing. Don't skip to the next phase with gaps.

9. **SYNTHESIZE REGULARLY** - Pause every 5-7 questions to confirm understanding via AskUserQuestion.

10. **ADAPT TO EXPERTISE** - Adjust question complexity based on user's answers. Technical users get technical questions.

11. **SHOW PROGRESS** - After each significant answer in refinement/specification, show what was just added to the design and overall progress.

12. **ALWAYS OFFER TO BUILD** - Never end without offering to build via /run. Make "Build it now" the recommended option.

13. **AUTO-TRIGGER BUILD** - When user selects "Build it now", invoke `Skill({skill: "run", ...})`. When user selects "Build with team", invoke `Skill({skill: "team", ...})`. Do NOT make user type another command.

14. **USE CHUNK TEMPLATES** - Load the appropriate domain chunk template to guide questioning. Don't improvise when structured templates exist.

15. **GENERATE DIAGRAMS** - Use mermaid syntax for architecture, sequence, ERD, and flow diagrams. Generate them as the design forms, not just at the end.

16. **WRITE INCREMENTALLY** - Write phase files to disk as each phase completes. Write artifacts as they are generated. Never hold the entire design in memory.

17. **MONITOR CONTEXT** - After 20 questions, enter context-conscious mode: shorter summaries, immediate file writes, reference files instead of repeating content.

18. **SPLIT LARGE DESIGNS** - When designs exceed split thresholds (>10 stories, >3 subsystems, >5 characters), split into per-feature/per-component files.

19. **CHECKPOINT AT PHASES** - Create a waypoint file at every phase transition. Include resume instructions so the session can recover from any interruption.

20. **ASSEMBLE, DON'T REBUILD** - The final design_document.md is assembled from phase files on disk. Never reconstruct the entire design from memory at the end.
