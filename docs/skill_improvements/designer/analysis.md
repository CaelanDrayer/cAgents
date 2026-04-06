# /designer Skill Analysis

## Current State Summary

The /designer skill is a structured 4-phase interactive design engine (Discovery -> Ideation -> Refinement -> Specification) that transforms ideas into implementation-ready design documents through AskUserQuestion-driven Q&A. It supports software, business, and creative domains with template-based questioning, mermaid diagram generation, 4-level validation, and build integration via /run and /team.

## Strengths

1. **Well-structured 4-phase workflow** with clear phase gates and validation criteria
2. **Session resilience** with waypoints, incremental file saves, and resume protocol
3. **Multi-domain support** (software, business, creative) with domain-specific question templates
4. **Build integration** seamlessly hands off to /run or /team at completion
5. **20-rule behavioral contract** provides clear guardrails
6. **Context-conscious mode** (after 20 questions) for long sessions
7. **Template library** with 6 pre-built templates for common patterns

## Weaknesses and Gaps

### 1. No Agent Delegation
The designer operates as a single agent with no Agent tool delegation. Unlike /review and /optimize which spawn specialist agents, /designer does everything inline. For complex designs (system architecture, game world building), spawning domain specialists could provide richer analysis.

### 2. No Version/Iteration Support
There is no mechanism to create design v2 from an existing v1. Users must start fresh or resume incomplete sessions -- they cannot branch or iterate on completed designs.

### 3. Limited Collaboration Model
The designer is purely 1-on-1 with the user. There is no mechanism for multi-stakeholder input, peer review of designs, or asynchronous collaboration.

### 4. No Design Diff/Comparison
When users modify designs, there is no diff or comparison between the original and modified versions. Design decisions lack traceability over time.

### 5. Pattern Library is Theoretical
The design pattern library is referenced in the SKILL.md but the actual `Agent_Memory/_system/templates/designer/patterns/design_patterns_library.yaml` may not exist or be populated. The patterns are conceptual rather than battle-tested.

### 6. No Codebase-Aware Design Validation
While the designer searches the codebase during Discovery, it does not validate the final design against the actual codebase (e.g., checking if proposed APIs conflict with existing ones, if data models are compatible).

### 7. No Export Formats
The output is always markdown. There is no export to Confluence, Notion, Google Docs, PDF, or other formats teams commonly use for design documents.

### 8. Missing /org Integration
The /org skill has C-suite agents for strategic framing, but /designer has no awareness of or integration with /org's strategic brief. A design created after /org analysis should inherit context.

### 9. Weak Creative Domain Support
While software and business domains have detailed refinement areas (7 each), creative domain refinement is less structured. Character sheets, world-building, and plot structure could benefit from more sophisticated sub-phase workflows.

### 10. No Feedback Loop from Implementation
When a design is built via /run or /team, there is no mechanism to feed implementation learnings back into the design (e.g., "this design decision caused X problem during implementation").
