# Phase 1: Discovery (15% of session)

**Goal**: Understand what we're designing, for whom, why, and within what constraints.

## Step 1: Opening & Domain Detection

If no topic provided:

```javascript
AskUserQuestion({
  questions: [{
    question: "What are you trying to create, solve, or design?",
    header: "Goal",
    options: [
      {label: "Build a feature", description: "Add new functionality to existing system"},
      {label: "Design a system", description: "Architecture or full system from scratch"},
      {label: "Solve a problem", description: "Fix or improve something specific"},
      {label: "Create content", description: "Story, campaign, document, or creative work"}
    ],
    multiSelect: false
  }]
})
```

If topic provided, ask about intent:

```javascript
AskUserQuestion({
  questions: [{
    question: `You want to work on "${topic}". What's the main goal?`,
    header: "Intent",
    options: [
      {label: "Design it thoroughly", description: "Full design before building"},
      {label: "Quick architecture", description: "High-level design, skip details"},
      {label: "Explore options", description: "Compare approaches before committing"},
      {label: "Refine existing", description: "Improve something already designed"}
    ],
    multiSelect: false
  }]
})
```

## Step 2: Context Discovery

**CRITICAL**: After the opening answer, immediately search for relevant context using Glob, Grep, and Read tools.

**For Software Projects** (reference: `Agent_Memory/_system/templates/designer/context_discovery_patterns.yaml`):
1. **Language/Framework**: Check package.json, requirements.txt, go.mod, Cargo.toml
2. **Architecture**: Monorepo (multiple package.json), microservices (services/ folder), monolith (src/)
3. **Key Modules**: Search for auth, user, checkout, api, database patterns
4. **Tech Stack**: Frontend deps, backend deps, database, infrastructure (Docker, CI/CD)
5. **Recent Changes**: Git log for relevant recent work

Report findings naturally, then ask context-aware questions:

```javascript
// After discovering Next.js + Prisma + PostgreSQL:
AskUserQuestion({
  questions: [{
    question: "I found your project uses Next.js with Prisma and PostgreSQL. Should the new design work within this stack, or are you considering changes?",
    header: "Stack",
    options: [
      {label: "Use existing stack", description: "Build within Next.js + Prisma + PostgreSQL"},
      {label: "Extend stack", description: "Add new technologies alongside existing"},
      {label: "Different stack", description: "Consider alternative technologies"},
      {label: "Stack doesn't matter", description: "This design isn't about code"}
    ],
    multiSelect: false
  }]
})
```

## Step 3: Domain-Specific Discovery

Based on detected domain, ask targeted questions:

**Software Domain** (reference: `Agent_Memory/_system/templates/designer/software_chunks.yaml`):
- Core problem statement (3 questions)
- Technical architecture (5 questions)
- User experience (4 questions)
- Security & compliance (3 questions)
- Testing & validation (3 questions)
- Deployment & operations (4 questions)

**Business Domain** (reference: `Agent_Memory/_system/templates/designer/business_chunks.yaml`):
- Current state analysis (4 questions)
- Desired future state (4 questions)
- Stakeholders & impact (3 questions)
- Implementation plan (4 questions)
- Risk & mitigation (3 questions)

**Creative Domain** (reference: `Agent_Memory/_system/templates/designer/creative_chunks.yaml`):
- Core premise (3 questions)
- Characters (5 questions)
- World & setting (4 questions)
- Conflict & plot (5 questions)
- Themes & style (3 questions)

**Adapt question complexity to user expertise level**:
- Technical answers with jargon -> expert-level questions
- Simple answers -> beginner-friendly questions
- Detect and adapt within the first 2-3 exchanges

## Step 4: Template Offer

If the design matches a known template pattern, offer it:

```javascript
AskUserQuestion({
  questions: [{
    question: "This looks like a system architecture design. Want to use a proven template?",
    header: "Template",
    options: [
      {label: "Use template (Recommended)", description: "System Architecture template with pre-structured questions"},
      {label: "Custom approach", description: "I'll guide the exploration without a template"},
      {label: "See all templates", description: "Show me available templates first"}
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

## Discovery Phase Gate

Before advancing to Ideation, verify:
- [ ] Problem statement is clear and specific (>20 characters)
- [ ] At least 1 stakeholder/user group identified
- [ ] At least 1 constraint documented
- [ ] Success criteria defined (measurable if possible)

If any are missing, ask targeted questions to fill gaps. Do NOT skip to Ideation with gaps.

## Discovery Synthesis

After 5-7 discovery questions, confirm understanding:

```javascript
AskUserQuestion({
  questions: [{
    question: `Here's what I understand so far:

**Problem**: ${problem_statement}
**Users**: ${stakeholders}
**Constraints**: ${constraints}
**Success looks like**: ${success_criteria}

Does this capture the situation?`,
    header: "Confirm",
    options: [
      {label: "Yes, move to solutions", description: "Start exploring solution approaches"},
      {label: "Mostly right", description: "Small corrections, then continue"},
      {label: "Missing something", description: "Important context I haven't shared"},
      {label: "Let me re-explain", description: "The understanding needs significant adjustment"}
    ],
    multiSelect: false
  }]
})
```
