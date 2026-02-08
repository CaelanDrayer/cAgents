# Phase 2: Ideation (25% of session)

**Goal**: Explore 2-4 solution alternatives, evaluate trade-offs, and select an approach.

## Step 1: Generate Alternatives

Based on discovery findings, propose 2-4 approaches. Use the design pattern library to inform alternatives.

**Pattern Library Reference**: `Agent_Memory/_system/templates/designer/patterns/design_patterns_library.yaml`

For each alternative, consider:
- What pattern(s) does it use?
- What are the pros and cons?
- What's the effort/complexity?
- What's the risk level?

Present alternatives via AskUserQuestion:

```javascript
AskUserQuestion({
  questions: [{
    question: `Based on what you've described, here are 3 approaches:

**Option A: ${approach_a_name}**
${approach_a_description}
Pros: ${pros} | Cons: ${cons}

**Option B: ${approach_b_name}**
${approach_b_description}
Pros: ${pros} | Cons: ${cons}

**Option C: ${approach_c_name}**
${approach_c_description}
Pros: ${pros} | Cons: ${cons}

Which approach interests you most?`,
    header: "Approach",
    options: [
      {label: "Option A", description: approach_a_summary},
      {label: "Option B", description: approach_b_summary},
      {label: "Option C", description: approach_c_summary},
      {label: "Combine approaches", description: "Mix elements from multiple options"}
    ],
    multiSelect: false
  }]
})
```

## Step 2: Pattern Recommendations

When the user selects an approach, recommend specific design patterns:

```javascript
AskUserQuestion({
  questions: [{
    question: `For this approach, I recommend the "${pattern_name}" pattern:

${pattern_details}

This is a proven pattern used by ${examples}. Should we design with this pattern?`,
    header: "Pattern",
    options: [
      {label: "Use this pattern (Recommended)", description: pattern_summary},
      {label: "Simpler approach", description: "Something less complex"},
      {label: "More complex", description: "More capability but more work"},
      {label: "Tell me more", description: "Explain trade-offs in detail"}
    ],
    multiSelect: false
  }]
})
```

## Step 3: Trade-off Exploration

For key decisions, explore trade-offs explicitly:

```javascript
AskUserQuestion({
  questions: [{
    question: "This decision involves a key trade-off. Which matters more for your situation?",
    header: "Trade-off",
    options: [
      {label: "Simplicity", description: "Easier to build and maintain, fewer moving parts"},
      {label: "Scalability", description: "Handles growth, but more complex upfront"},
      {label: "Speed to market", description: "Ship fast, iterate later"},
      {label: "Long-term flexibility", description: "More work now, easier to change later"}
    ],
    multiSelect: false
  }]
})
```

## Ideation Phase Gate

Before advancing to Refinement, verify:
- [ ] At least 2 alternatives were explored
- [ ] Trade-offs documented for each alternative
- [ ] One approach selected with clear rationale
- [ ] Key technical/creative decisions logged

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
      {label: "Start over", description: "Go back to discovery with different constraints"}
    ],
    multiSelect: false
  }]
})
```
