# Phase 4: Ideation (20% of session)

**Goal**: Explore 2-4 concrete solution alternatives, evaluate trade-offs, and select an approach.

## Step 1: Read Ideation Research

Read pre-prepared research files (spawned during Conceptualize phase-overlap if `--deep`):
- `question_prep/ideation_patterns.yaml` -- Design pattern analysis, alternative approaches
- `question_prep/ideation_feasibility.yaml` -- Feasibility assessment, effort estimates

Build a question pool from research findings. If research files are not yet available (agents still running, failed, or `--deep` not set), fall back to the design pattern library + inline analysis.

**Pattern Library Reference**: `Agent_Memory/_system/templates/designer/patterns/design_patterns_library.yaml`

## Step 2: Generate Alternatives

Based on research findings (if available) + conceptualize context, propose 2-4 approaches. Include "Research this for me" on every question.

For each alternative, include:
- What pattern(s) does it use? (from research if available)
- What are the pros and cons?
- What's the effort/complexity?
- What's the risk level?

```javascript
AskUserQuestion({
  questions: [{
    question: `Based on your ${scope_context}, here are 3 approaches:

**Option A: ${approach_a_name}**
${approach_a_description}
Pros: ${pros} | Cons: ${cons}
Effort: ${effort} | Risk: ${risk}

**Option B: ${approach_b_name}**
${approach_b_description}
Pros: ${pros} | Cons: ${cons}
Effort: ${effort} | Risk: ${risk}

**Option C: ${approach_c_name}**
${approach_c_description}
Pros: ${pros} | Cons: ${cons}
Effort: ${effort} | Risk: ${risk}

Which approach interests you most?`,
    header: "Approach",
    options: [
      {label: "Option A", description: approach_a_summary},
      {label: "Option B", description: approach_b_summary},
      {label: "Option C", description: approach_c_summary},
      {label: "Research this for me", description: "Dispatch a subagent to evaluate feasibility of each option"}
    ],
    multiSelect: false
  }]
})
```

## Step 3: Pattern Recommendations (Controller-Adapted)

When the user selects an approach, present pattern recommendations:

```javascript
AskUserQuestion({
  questions: [{
    question: `For this approach, I recommend the "${pattern_name}" pattern:

${pattern_details}

${context_about_how_pattern_fits}

Should we design with this pattern?`,
    header: "Pattern",
    options: [
      {label: "Use this pattern (Recommended)", description: pattern_summary},
      {label: "Simpler approach", description: "Something less complex"},
      {label: "More complex", description: "More capability but more work"},
      {label: "Research this for me", description: "Dispatch a subagent to evaluate this pattern against your codebase"}
    ],
    multiSelect: false
  }]
})
```

**Controller adaptation after answer**: If user picks "Simpler approach", reorder remaining questions to focus on simplicity trade-offs. If "More complex", promote advanced architecture questions.

## Step 4: Trade-off Exploration

For key decisions, present trade-offs:

```javascript
AskUserQuestion({
  questions: [{
    question: "This decision involves a key trade-off. Which matters more for your situation?",
    header: "Trade-off",
    options: [
      {label: "Simplicity", description: "Easier to build and maintain, fewer moving parts"},
      {label: "Scalability", description: "Handles growth, but more complex upfront"},
      {label: "Speed to market", description: "Ship fast, iterate later"},
      {label: "Research this for me", description: "Dispatch a subagent to analyze which trade-off best fits your project"}
    ],
    multiSelect: false
  }]
})
```

**Follow-up dispatch**: If user's trade-off choice significantly changes the design direction, dispatch a follow-up research agent to re-assess approach feasibility.

## Ideation Phase Gate + Phase-Overlap

Before advancing to Refinement, verify:
- [ ] At least 2 alternatives were explored
- [ ] Trade-offs documented for each alternative
- [ ] One approach selected with clear rationale
- [ ] Key technical/creative decisions logged

**Phase-Overlap**: During synthesis, ALWAYS spawn Refinement research agents (Refinement always uses research, regardless of `--deep`):

```javascript
Task({
  subagent_type: "cagents:architect",
  description: "Research: Architecture deep-dive for Refinement questions",
  prompt: `Research agent for Refinement phase.
TOPIC: ${topic}
SESSION: ${session_dir}
SELECTED APPROACH: Read ${session_dir}/phases/04_ideation.md
Deep-dive: component interactions, data flow, integration points, constraints.
Write to: ${session_dir}/question_prep/refinement_architecture.yaml`
})

Task({
  subagent_type: "cagents:security-specialist",
  description: "Research: Security analysis for Refinement questions",
  prompt: `Research agent for Refinement security questions.
TOPIC: ${topic}
SESSION: ${session_dir}
APPROACH: Read ${session_dir}/phases/04_ideation.md
Analyze: auth patterns, data privacy, encryption needs, compliance, security gaps.
Write to: ${session_dir}/question_prep/refinement_security.yaml`
})

Task({
  subagent_type: "cagents:qa-lead",
  description: "Research: Testing strategy for Refinement questions",
  prompt: `Research agent for Refinement testing questions.
TOPIC: ${topic}
SESSION: ${session_dir}
APPROACH: Read ${session_dir}/phases/04_ideation.md
Analyze: existing test coverage, testing patterns, testability of proposed approach.
Write to: ${session_dir}/question_prep/refinement_testing.yaml`
})
```

## Ideation Synthesis

```javascript
AskUserQuestion({
  questions: [{
    question: `Approach selected:

**Selected**: ${selected_approach}
**Rationale**: ${rationale}
**Key Decisions**: ${key_decisions}
**Patterns**: ${recommended_patterns}
**Trade-offs Accepted**: ${accepted_tradeoffs}

Ready to detail this approach?`,
    header: "Proceed",
    options: [
      {label: "Yes, detail it", description: "Move to detailed design (refinement phase)"},
      {label: "Explore more", description: "I want to consider other options"},
      {label: "Adjust approach", description: "Modify the selected approach"},
      {label: "Research this for me", description: "Dispatch a subagent to validate the selected approach"}
    ],
    multiSelect: false
  }]
})
```
