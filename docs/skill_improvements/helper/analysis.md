# /helper Skill Analysis

## Current State Summary

The /helper skill is an interactive command guide that explains cAgents skills and recommends the right command for the user's needs. It operates in 8 modes: full interactive guide (no arguments), specific command help, natural language recommendation, comparison view, flag reference, examples collection, quick reference, and topic deep dive. It uses a recommendation engine with intent classification (build, fix, plan, review, optimize, parallelize) to map natural language requests to the appropriate command. It is strictly non-executing -- it only explains and recommends, never runs commands on behalf of the user.

## Strengths

1. **8 distinct operation modes** cover a wide range of user needs from quick reference to deep dives
2. **Recommendation engine** with structured intent classification handles ambiguous requests
3. **Multi-intent detection** identifies composite workflows (design-then-build, review-then-fix)
4. **Comprehensive comparison tables** enable side-by-side evaluation across all commands
5. **Flag reference consolidation** provides a single source for all command flags
6. **Topic deep dives** educate users on foundational concepts (domains, tiers, agents, workflow)
7. **Copy-paste ready examples** organized by domain, workflow pattern, and complexity
8. **Non-executing principle** prevents accidental command execution during exploration
9. **Ambiguity handling** presents multiple options with tradeoffs instead of guessing

## Weaknesses and Gaps

### 1. Static Content with No Dynamic Updates

All /helper content is hardcoded in reference files (command-details.md, flag-summaries.md, comparison-tables.md, etc.). When skills are updated (new flags, changed behavior, modified workflows), /helper's reference files must be manually synchronized. There is no mechanism to detect stale content or automatically reflect current skill capabilities. If /run adds a new flag, /helper will not know about it until someone updates flag-summaries.md.

### 2. No Usage Analytics or Personalization

The /helper skill does not track which modes users access most frequently, which commands are most commonly recommended, or which topics generate the most questions. There is no personalization -- a first-time user and an experienced user see identical content. The system cannot adapt its recommendations based on the user's history, project type, or demonstrated expertise level.

### 3. No Validation of Recommendations

When /helper recommends a command (e.g., "/run Fix the auth bug"), it does not validate whether the recommendation is actually correct for the current project. It does not check if the project has authentication code, if the specified files exist, or if the recommended flags are compatible with the current setup. The recommendation engine operates entirely on keyword intent classification without project awareness.

### 4. No Interactive Tutorial or Guided Walkthrough

The /helper skill explains commands but does not offer guided walkthroughs that demonstrate commands step by step. A user who reads about /designer's 4-phase workflow still may not understand how it feels in practice. There is no "try it" mode, no sample session transcripts, and no interactive tutorial that walks users through a command execution.

### 5. /org Command is Not Documented

The command-details.md reference file provides detailed help templates for /run, /designer, /review, /optimize, /team, and /helper itself, but /org is missing entirely. The comparison tables also omit /org. The flag-summaries.md does not include /org flags. Users who ask "/helper org" will receive incomplete or improvised content rather than the structured detail available for other commands.

### 6. No Contextual Awareness of Current Project

The recommendation engine classifies intent based on generic signal words without considering the current project. For a Node.js project, "fix the build" most likely means engineering, but /helper does not check for package.json, tsconfig.json, or other project indicators. For a marketing agency's project, "fix the build" might mean something different. Project-aware recommendations would be more accurate.

### 7. Topic Guides Have Uneven Depth

The topic-guides.md covers 8 topics (flags, integration, domains, workflow, tiers, agents, teams, sessions) but with uneven depth. The "workflow" topic describes /run's internals in detail but omits /team's wave model and /org's hierarchy pipeline. The "agents" topic gives counts and examples but does not explain how to identify which agent will handle a specific request. Some topics are comprehensive while others are surface-level.

### 8. No Troubleshooting Guide

When commands fail or produce unexpected results, users have no /helper mode for troubleshooting. There is no "my /run is stuck" or "my /team did not spawn teammates" diagnostic flow. The CLAUDE.md troubleshooting section exists but is not accessible through /helper's interface. Users must know to look in CLAUDE.md directly rather than asking /helper for help.

### 9. Comparison Tables Do Not Include /org

The comparison-tables.md provides detailed matrices comparing /run, /designer, /review, /optimize, and /team, but /org is absent from all comparison matrices. This means users cannot use the comparison view to understand when /org is appropriate vs. /team or /run for multi-domain tasks.

### 10. No Feedback Loop for Recommendation Quality

After /helper makes a recommendation, there is no mechanism to learn whether the user followed it, whether the recommended command succeeded, or whether the user switched to a different command. This means the recommendation engine cannot improve over time. Incorrect recommendations are silently repeated.
