# Phase Research Protocol

The designer delegates the preparation of the questions to subagents. A
research agent builds the question list for one phase before the designer
presents the questions. Each list carries the context that the agent found in
the codebase.

## --deep Flag Gating

| Phase | Default (no flag) | --deep |
|-------|-------------------|--------|
| Empathize | Inline analysis (Glob/Grep/Read) | Research agents spawned |
| Define | Inline analysis | Research agents spawned |
| Conceptualize | Inline analysis | Research agents spawned |
| Ideation | Inline analysis | Research agents spawned |
| Refinement | **Research agents spawned** | Research agents spawned |
| Specification | **Research agents spawned** | Research agents spawned |

**Rationale**: The early phases are Empathize through Ideation. They are
conversational, and they get their value from the intuition of the designer.
The later phases are Refinement and Specification. They need a deep technical
analysis, and a research agent gives much value there. Use `--deep` when the
project is large, or when the project is new to you. The flag gives you
questions with research behind them from the start.

## How It Works

```
1. Phase starts -> Check if research agents are enabled for this phase
2. If enabled: Designer spawns 1-2 research agents via Agent tool
3. Research agents analyze codebase/patterns/constraints for that phase
4. Research agents write findings to question_prep/{phase}_{focus}.yaml
5. Designer reads question_prep files -> builds question pool
6. Designer selects best question from pool -> presents via AskUserQuestion
7. User answers -> Designer adapts pool (reorder, skip, enrich remaining questions)
8. If user selects "Research this for me" -> Designer dispatches follow-up research agent
9. Repeat until phase gate criteria met
```

## Research Agent Spawning Per Phase

| Phase | Research Agents | What They Investigate | Requires --deep |
|-------|----------------|----------------------|-----------------|
| Empathize | `cagents:frontend-developer` (mode=ux), `cagents:market-research-analyst` (mode=requirements) | User personas, pain points, existing UX patterns, stakeholder landscape | Yes |
| Define | `cagents:architect`, `cagents:backend-developer` | Tech stack, codebase structure, existing patterns, constraints | Yes |
| Conceptualize | `cagents:architect` | High-level architectural patterns, prior art, system boundaries | Yes |
| Ideation | `cagents:architect`, `cagents:backend-developer` | Design pattern matching, alternative feasibility, existing patterns to extend | Yes |
| Refinement | `cagents:architect`, `cagents:security-engineer`, `cagents:qa-lead` | Architecture validation, security posture, test coverage, integration points | No |
| Specification | `cagents:backend-developer` | Codebase compatibility, naming conventions, API patterns, existing test patterns | No |

## Spawning Pattern

```javascript
// At phase start (when research is enabled for this phase):
Agent({
  subagent_type: "cagents:backend-developer",
  description: "Research: Analyze project for ${phase} questions",
  prompt: `You are a research agent preparing informed questions for /designer ${phase} phase.
TOPIC: ${topic}
SESSION: ${session_dir}
${previous_phase_context}
Research the codebase and write ${session_dir}/question_prep/${phase}_${focus}.yaml with:
- questions: [{id, question, context: {files_examined, findings, code_snippet}, options, priority, category}]
- summary: {key_findings, total_questions}
Focus on FACTUAL findings from the codebase. Keep prompt under 300 tokens.`
})
```

## Question Prep File Format

```yaml
# question_prep/define_codebase.yaml
phase: define
research_agent: cagents:backend-developer
questions:
  - id: DQ-001
    question: "Your project uses Next.js 14 with Prisma ORM. Should the new feature extend the existing data model or create separate tables?"
    context:
      files_examined: ["package.json", "prisma/schema.prisma"]
      findings: "Next.js 14, Prisma with PostgreSQL, 12 existing models"
    options:
      - {label: "Extend existing", description: "Add to current schema", feasibility: high}
      - {label: "Separate tables", description: "New isolated schema", feasibility: medium}
    priority: high
    category: data_model
summary:
  key_findings: ["Next.js 14 + Prisma + PostgreSQL", "12 existing models"]
  total_questions: 8
```

## Fallback

If the research agents fail, fall back to the current behavior. Do the same if
the agents are unavailable, or if `--deep` is not set for an early phase. The
current behavior is to load the chunk templates, and to do an inline analysis
of the codebase with Glob, Grep, and Read. The research is an enhancement. It
is not a need.
