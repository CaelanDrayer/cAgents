# Phase 3: Conceptualize (10% of session)

**Goal**: Explore high-level concepts, mental models, and framings for the solution space.

## Step 1: Research (--deep only)

If `--deep` flag is set, read pre-prepared research files (spawned during Define overlap):
- `question_prep/conceptualize_patterns.yaml` -- High-level patterns, prior art, system boundaries

If research files unavailable, fall back to inline analysis.

## Step 2: Concept Exploration

Present 2-3 high-level conceptual framings. These are NOT detailed solutions — they are mental models and approaches:

```javascript
AskUserQuestion({
  questions: [{
    question: `For "${topic}", there are a few conceptual approaches we could take:

**Approach A: ${concept_a}**
${concept_a_description}

**Approach B: ${concept_b}**
${concept_b_description}

**Approach C: ${concept_c}**
${concept_c_description}

Which framing resonates most with your vision?`,
    header: "Concept",
    options: [
      {label: "Approach A", description: concept_a_summary},
      {label: "Approach B", description: concept_b_summary},
      {label: "Approach C", description: concept_c_summary},
      {label: "Research this for me", description: "Dispatch a subagent to analyze which concept best fits your codebase"}
    ],
    multiSelect: false
  }]
})
```

## Steps 3 & 4: Domain Framing + Scope Boundaries

Determine the design domain and scope in a single batched call — these two questions establish the shape of the solution together (what kind of thing are we building + how much of it). Always include the defer option on each question.

```javascript
// Batch domain + scope together — both orient the solution direction, same conceptualize concern
AskUserQuestion({
  questions: [
    {
      question: "What type of design are we working on?",
      header: "Domain",
      options: [
        {label: "Software design", description: "Technical architecture, APIs, data models, code"},
        {label: "Business design", description: "Processes, workflows, operations, strategy"},
        {label: "Creative design", description: "Stories, content, campaigns, creative work"},
        {label: "Research this for me", description: "Dispatch a subagent to determine the best domain from your project"}
      ],
      multiSelect: false
    },
    {
      question: "Let's set scope boundaries. Which areas should this design cover?",
      header: "Scope",
      options: [
        {label: "Core feature only", description: "Just the essential functionality"},
        {label: "Feature + integration", description: "Core feature plus how it connects to existing systems"},
        {label: "Full system", description: "End-to-end including deployment, testing, monitoring"},
        {label: "Research this for me", description: "Dispatch a subagent to recommend scope based on your codebase complexity"}
      ],
      multiSelect: false
    }
  ]
})
```

## Conceptualize Phase Gate

Before advancing to Ideation, verify:
- [ ] Domain identified (Software / Business / Creative)
- [ ] Conceptual framing selected
- [ ] Scope boundaries set (what's in, what's out)

If any are missing, ask targeted questions to fill gaps. Do NOT advance with gaps.

**Phase-Overlap**: During synthesis, spawn Ideation research agents if `--deep`:

```javascript
Task({
  subagent_type: "cagents:architect",
  description: "Research: Design alternatives for Ideation questions",
  prompt: `Research agent for Ideation phase.
TOPIC: ${topic}
SESSION: ${session_dir}
Read ${session_dir}/phases/03_conceptualize.md for concept + scope.
Research: 2-4 concrete design alternatives, relevant patterns, trade-off dimensions, feasibility.
Write to: ${session_dir}/question_prep/ideation_patterns.yaml`
})

Task({
  subagent_type: "cagents:backend-developer",
  description: "Research: Feasibility analysis for Ideation questions",
  prompt: `Research agent for Ideation feasibility.
TOPIC: ${topic}
SESSION: ${session_dir}
Read ${session_dir}/phases/03_conceptualize.md for scope.
Assess: feasibility of likely approaches given tech stack, effort estimates, risk factors.
Write to: ${session_dir}/question_prep/ideation_feasibility.yaml`
})
```

## Conceptualize Synthesis

```javascript
AskUserQuestion({
  questions: [{
    question: `Here's the conceptual direction:

**Concept**: ${selected_concept}
**Domain**: ${domain}
**In Scope**: ${in_scope}
**Out of Scope**: ${out_of_scope}

Ready to explore concrete solution alternatives?`,
    header: "Confirm",
    options: [
      {label: "Yes, explore solutions", description: "Move to ideation phase"},
      {label: "Adjust concept", description: "The concept needs refinement"},
      {label: "Change scope", description: "Scope boundaries need adjustment"},
      {label: "Research this for me", description: "Dispatch a subagent to validate this conceptual direction"}
    ],
    multiSelect: false
  }]
})
```
