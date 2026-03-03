# Phase 2: Define (10% of session)

**Goal**: Crystallize the problem statement, identify constraints, and establish success criteria.

## Step 1: Research (--deep only)

If `--deep` flag is set, spawn research agents to analyze tech stack, architecture, and constraints:

```javascript
Task({
  subagent_type: "cagents:architect",
  description: "Research: Architecture analysis for Define questions",
  prompt: `Research agent for /designer Define phase.
TOPIC: ${topic}
SESSION: ${session_dir}
Read ${session_dir}/phases/01_empathize.md for user context.
Analyze: module boundaries, integration points, architectural constraints, technical debt.
Write to: ${session_dir}/question_prep/define_architecture.yaml`
})

Task({
  subagent_type: "cagents:backend-developer",
  description: "Research: Tech stack analysis for Define questions",
  prompt: `Research agent for /designer Define phase.
TOPIC: ${topic}
SESSION: ${session_dir}
Analyze: package.json, tech stack, existing patterns, recent changes (git log -20).
Write to: ${session_dir}/question_prep/define_codebase.yaml`
})
```

Without `--deep`, use inline analysis (Glob/Grep/Read) to gather basic tech context.

## Step 2: Problem Statement

Synthesize empathy findings into a clear problem statement:

```javascript
AskUserQuestion({
  questions: [{
    question: `Based on what we learned about the users, here's a draft problem statement:

"${users} need a way to ${need} because ${pain_point}, but currently ${barrier}."

Does this capture the core problem?`,
    header: "Problem",
    options: [
      {label: "Yes, that's it", description: "This captures the core problem accurately"},
      {label: "Close but needs tweaking", description: "The direction is right but wording needs adjustment"},
      {label: "Missing the real problem", description: "The actual problem is different"},
      {label: "Research this for me", description: "Dispatch a subagent to analyze the codebase for the real problem"}
    ],
    multiSelect: false
  }]
})
```

## Step 3: Constraints

Identify technical, business, and resource constraints:

```javascript
AskUserQuestion({
  questions: [{
    question: "What are the key constraints for this design?",
    header: "Constraints",
    options: [
      {label: "Technical", description: "Must work with specific tech, APIs, or platforms"},
      {label: "Timeline", description: "Need it by a specific date"},
      {label: "Resources", description: "Limited team size or budget"},
      {label: "Research this for me", description: "Dispatch a subagent to discover technical constraints from the codebase"}
    ],
    multiSelect: true
  }]
})
```

## Step 4: Success Criteria

Define measurable success criteria:

```javascript
AskUserQuestion({
  questions: [{
    question: "How will we know this design is successful? What does 'done' look like?",
    header: "Success",
    options: [
      {label: "Feature works correctly", description: "Functional correctness is the main goal"},
      {label: "Performance targets", description: "Speed, scale, or efficiency metrics matter"},
      {label: "User satisfaction", description: "Users find it easy/pleasant to use"},
      {label: "Research this for me", description: "Dispatch a subagent to analyze existing success metrics in the project"}
    ],
    multiSelect: true
  }]
})
```

## Step 5: Template Offer

If the design matches a known template pattern, offer it:

```javascript
AskUserQuestion({
  questions: [{
    question: "This looks like a ${template_type} design. Want to use a proven template?",
    header: "Template",
    options: [
      {label: "Use template (Recommended)", description: "${template_name} with pre-structured questions"},
      {label: "Custom approach", description: "I'll guide the exploration without a template"},
      {label: "See all templates", description: "Show me available templates first"},
      {label: "Research this for me", description: "Dispatch a subagent to recommend the best template"}
    ],
    multiSelect: false
  }]
})
```

**Available Templates** (reference: `Agent_Memory/_system/templates/designer/templates/`):
1. `product_feature_template` - Product features with user stories
2. `uiux_design_template` - UI/UX with wireframes and flows
3. `system_architecture_template` - Full system architecture
4. `api_design_template` - REST/GraphQL API design
5. `business_process_template` - Business workflows and processes
6. `creative_content_template` - Stories, novels, screenplays

## Define Phase Gate

Before advancing to Conceptualize, verify:
- [ ] Problem statement is clear and specific (>20 characters)
- [ ] At least 1 constraint documented
- [ ] Success criteria defined (measurable if possible)

If any are missing, ask targeted questions to fill gaps. Do NOT advance with gaps.

**Phase-Overlap**: During synthesis, spawn Conceptualize research agents if `--deep`:

```javascript
Task({
  subagent_type: "cagents:architect",
  description: "Research: High-level patterns for Conceptualize questions",
  prompt: `Research agent for Conceptualize phase.
TOPIC: ${topic}
SESSION: ${session_dir}
Read ${session_dir}/phases/02_define.md for problem + constraints.
Research: high-level architectural patterns, prior art, system boundary options.
Write to: ${session_dir}/question_prep/conceptualize_patterns.yaml`
})
```

## Define Synthesis

```javascript
AskUserQuestion({
  questions: [{
    question: `Here's the problem definition:

**Problem**: ${problem_statement}
**Constraints**: ${constraints}
**Success Criteria**: ${success_criteria}

Ready to explore conceptual approaches?`,
    header: "Confirm",
    options: [
      {label: "Yes, explore concepts", description: "Move to conceptualization"},
      {label: "Mostly right", description: "Small corrections, then continue"},
      {label: "Missing something", description: "Important constraints I haven't shared"},
      {label: "Research this for me", description: "Dispatch a subagent to validate this problem definition"}
    ],
    multiSelect: false
  }]
})
```
