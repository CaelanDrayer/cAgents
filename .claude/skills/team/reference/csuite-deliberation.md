# C-Suite Deliberation Protocol

Detailed Wave 1/Wave 2 dependency-ordered C-suite analysis and the two-phase deliberation pattern (objection -> resolve).

## Overview

C-suite analysis uses **multi-wave dependency-ordered execution** with inline peer passes. Independent C-suite agents run first (Wave 1), then dependent agents run with access to Wave 1 outputs (Wave 2). Cross-pollination is FILE-BASED — C-suite peers in the same wave cannot message each other directly (the lead is fixed; there is no teammate-to-teammate messaging), so agent A writes a domain_analysis file and agent B reads it.

## Step 4a: Detect C-Suite Dependencies

Before spawning, analyze the instruction to determine which C-suite agents depend on peer analyses. Use the dependency map from `csuite-mapping.md`.

```
Default dependency patterns (override based on instruction context):
  - CFO often benefits from CTO analysis (cost of technical scope)
  - CRO often benefits from CCO analysis (brand/creative alignment)
  - CPO often benefits from CTO + CCO analysis (product feasibility)
  - COO often benefits from CTO + CFO analysis (operational + cost feasibility)
  - CHRO often benefits from COO analysis (org structure implications)
  - General Counsel often benefits from all peers (compliance across domains)

Note: C-suite agents are loaded from leadership/agents/. Each agent's domain
field in frontmatter identifies their primary domain responsibility.

For each relevant C-suite agent:
  dependencies = analyze_instruction_for_peer_needs(instruction, domain_key)
  if dependencies is empty -> assign to Wave 1 (independent)
  if dependencies exist -> assign to Wave 2 (dependent, reads Wave 1 outputs)
```

Write `domain_dependencies.yaml`:
```yaml
wave_1_independent:
  - {domain_key}: {csuite_agent}  # No peer dependencies
wave_2_dependent:
  - {domain_key}:
      agent: {csuite_agent}
      reads_from: [{peer_domain_key_1}, {peer_domain_key_2}]
```

## Step 4b: Wave 1 — Spawn INDEPENDENT C-Suite Agents in Parallel

```
# Spawn all Wave 1 (independent) C-suite agents simultaneously
Agent({
  subagent_type: "cagents:{csuite_agent}",
  description: "Domain analysis (Wave 1 independent): {domain_key}",
  prompt: "You are the {csuite_title} performing strategic domain analysis.

CHAIRPERSON INSTRUCTION: {user_instruction}
SESSION: {SESSION_DIR}/
YOUR DOMAIN: {domain_key}
WAVE: 1 (independent -- no peer analyses available yet)

RESEARCH FINDINGS: Read {SESSION_DIR}/domain_analyses/research_*.yaml for concrete project facts gathered by research agents. Use these findings to ground your analysis in actual project state rather than instruction-text interpretation alone.

Analyze this instruction from your domain perspective. Write your analysis to:
{SESSION_DIR}/domain_analyses/domain_analysis_{domain_key}.yaml

Format:
  agent: cagents:{csuite_agent}
  domain: {domain_key}
  scope_assessment: '{what this means for your domain}'
  work_required:
    - '{work item 1}'
    - '{work item 2}'
  resource_needs:
    - '{resource 1}'
  risks:
    - '{risk 1}'
  dependencies_on_other_domains:
    - domain: '{other_domain}'
      need: '{what you need}'
  estimated_complexity: simple|moderate|complex
  priority: high|medium|low
"
})
```

Wait for all Wave 1 agents to complete before proceeding to Wave 2.

## Step 4c: Wave 2 — Spawn DEPENDENT C-Suite Agents with Peer Access

```
# Spawn all Wave 2 (dependent) C-suite agents simultaneously
# Each reads relevant Wave 1 peer analyses from domain_analyses/
Agent({
  subagent_type: "cagents:{csuite_agent}",
  description: "Domain analysis (Wave 2 dependent): {domain_key}",
  prompt: "You are the {csuite_title} performing strategic domain analysis.

CHAIRPERSON INSTRUCTION: {user_instruction}
SESSION: {SESSION_DIR}/
YOUR DOMAIN: {domain_key}
WAVE: 2 (dependent -- peer analyses available from Wave 1)

RESEARCH FINDINGS: Read {SESSION_DIR}/domain_analyses/research_*.yaml for concrete project facts gathered by research agents. Use these findings to ground your analysis in actual project state.

IMPORTANT: Before writing your analysis, READ the following peer domain analyses for cross-domain context:
{for each peer in reads_from: '{SESSION_DIR}/domain_analyses/domain_analysis_{peer_domain_key}.yaml'}

Use insights from peer analyses to inform your own assessment (e.g., technical scope from CTO informs your cost estimates, brand direction from CCO informs your go-to-market approach). Reference specific peer findings where relevant.

Write your analysis to:
{SESSION_DIR}/domain_analyses/domain_analysis_{domain_key}.yaml

Format:
  agent: cagents:{csuite_agent}
  domain: {domain_key}
  scope_assessment: '{what this means for your domain}'
  peer_context_used:
    - from: '{peer_domain}'
      insight: '{what you learned from their analysis}'
  work_required:
    - '{work item 1}'
    - '{work item 2}'
  resource_needs:
    - '{resource 1}'
  risks:
    - '{risk 1}'
  dependencies_on_other_domains:
    - domain: '{other_domain}'
      need: '{what you need}'
  estimated_complexity: simple|moderate|complex
  priority: high|medium|low
"
})
```

## Step 4d: After All C-Suite Agents Return

Read all `domain_analyses/domain_analysis_*.yaml` files. Verify Wave 2 agents referenced peer context. Update tasks (TaskUpdate) and status.yaml to ANALYZED. (v12.6.0: `workflow/events/EVT-{N}.yaml` emission removed — the `status.yaml` `pipeline_state` update plus the `domain_analyses/*.yaml` outputs are the canonical state-transition signal.)

**Note**: If all C-suite agents are independent (no dependencies detected), all run in Wave 1 and Wave 2 is skipped. If only one domain is involved, dependency ordering is unnecessary.

## Step 5: Two-Phase Deliberation (ANALYZED -> DELIBERATED)

### 5a. CEO Produces Draft Brief

Read all domain analyses. Synthesize into `strategic_brief_draft.yaml`:
- Combine work items across domains
- Identify cross-domain dependencies
- Set priorities and sequencing
- Draft risk register
- Define success criteria

Write `strategic_brief_draft.yaml` to session directory.

### 5b. Spawn Same C-Suite Again for Objections (Parallel, with ALL Peer Analyses)

Each C-suite agent reads the strategic brief draft AND ALL peer domain analyses (not just their own). This ensures objections are informed by the full cross-domain context, not just a single domain's view.

```
Agent({
  subagent_type: "cagents:{csuite_agent}",
  description: "Objection review: {domain_key}",
  prompt: "You are the {csuite_title} reviewing the CEO's strategic brief draft.

SESSION: {SESSION_DIR}/

MANDATORY READS (read ALL of these before writing objections):
1. {SESSION_DIR}/strategic_brief_draft.yaml -- the CEO's proposed brief
2. ALL files in {SESSION_DIR}/domain_analyses/ -- every peer's domain analysis
   Read each domain_analysis_*.yaml to understand what other C-suite members assessed.

You have access to ALL peer analyses. Use this cross-domain context to:
- Identify conflicts between your domain's needs and peer domains' plans
- Spot gaps where peer dependencies are not addressed in the brief
- Flag risks that span multiple domains
- Suggest improvements informed by peer insights

Review from your domain perspective. Write objections to:
{SESSION_DIR}/objections/objections_{csuite_agent}.yaml

Format:
  agent: cagents:{csuite_agent}
  domain: {domain_key}
  peer_analyses_reviewed: [{list of domain_keys whose analyses you read}]
  status: approved|conditional_approval|objection
  approved:
    - '{approved items}'
  objections:
    - item: '{what}'
      concern: '{why}'
      alternative: '{proposed fix}'
      severity: blocking|suggestion
      cross_domain_context: '{which peer analysis informed this objection, if any}'
  requested_dependencies:
    - from: '{other_domain}'
      need: '{what}'
      by_when: '{when}'
  risk_flags:
    - '{identified risk}'
"
})
```

### 5c. Validate Peer Reads (M-03 Post-Validation)

Before resolving, verify that each objection file contains a `peer_analyses_reviewed` list with at least 1 entry. If an objection file has an empty or missing `peer_analyses_reviewed`, the C-suite agent did not read peer analyses — re-spawn that agent with an explicit reminder to read ALL `domain_analyses/*.yaml` files first.

```
for each objections_{agent}.yaml:
  if peer_analyses_reviewed is empty or missing:
    log warning: "{agent} did not review peer analyses"
    re-spawn agent with stronger read instruction (1 retry max)
```

### 5d. CEO Resolves Conflicts

Read all objections. Resolve:
- **Blocking objections**: Adjust brief to address
- **Suggestions**: Incorporate if low-cost
- **Conflicting demands**: CEO decides based on chairperson intent
- **New dependencies**: Add to cross_domain_dependencies

Update status to DELIBERATED. (v12.6.0: `workflow/events/EVT-{N}.yaml` emission removed — the `status.yaml` `pipeline_state` update plus the `objections/*.yaml` and `strategic_brief_draft.yaml` outputs are the canonical state-transition signal.)
