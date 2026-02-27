# /org Improvement Recommendations

## Priority 1: High Impact, Moderate Effort

### 1.1 Orchestration Memory and Pattern Learning

**Current**: Every /org invocation starts from scratch with no historical context.
**Proposed**: Build an orchestration knowledge base that accumulates across sessions.

```yaml
# Agent_Memory/_knowledge/orchestration/patterns.yaml
patterns:
  "launch product":
    domains_observed: [make_eng, grow, operate_fin]
    frequency: 5
    avg_domains: 3
    common_objections:
      - source: cfo
        pattern: "budget exceeds quarterly allocation"
        resolution: "phase spending across quarters"
    common_dependencies:
      - from: make_eng.api_spec
        to: grow.marketing_materials
        type: blocks
    avg_duration_seconds: 1800
    success_rate: 0.80

  "restructure team":
    domains_observed: [make_eng, people, operate_ops]
    frequency: 3
    common_objections:
      - source: chro
        pattern: "hiring timeline too aggressive"
        resolution: "extend timeline or use contractors"
```

**Implementation**:
- After each /org completion, append to patterns.yaml with anonymized data
- During INIT, CEO reads patterns.yaml and uses historical data to:
  - Pre-populate expected domains (confirm with auto-detect)
  - Anticipate common objections during brief drafting
  - Pre-define likely cross-domain dependencies
  - Estimate execution duration for user information
- Pattern matching uses request similarity, not exact keyword match

### 1.2 Multi-Round Deliberation

**Current**: Exactly one objection round, then CEO resolves.
**Proposed**: Adaptive deliberation with up to 3 rounds for blocking objections.

```
Round 1: CEO draft -> C-suite objections
  - All suggestions: incorporate and proceed
  - No blocking objections: proceed to BRIEFED
  - Blocking objections present: proceed to Round 2

Round 2: CEO revised draft -> C-suite re-review (ONLY blockers re-reviewed)
  - All resolved: proceed to BRIEFED
  - Blocking objections remain: proceed to Round 3

Round 3: CEO final draft -> C-suite final review
  - All resolved: proceed to BRIEFED
  - Still blocked: escalate unresolved items to user
  - Maximum 3 rounds to prevent deliberation deadlock
```

**Implementation**:
- After CEO resolves Round 1 objections, check if any blocking objections remain unresolved
- If yes, re-spawn only the C-suite agents with blocking objections for targeted review
- Track deliberation_rounds in status.yaml
- Add `max_deliberation_rounds: 3` to pipeline config

### 1.3 Domain-Level Resume

**Current**: --resume restarts from last checkpoint, potentially re-executing completed domains.
**Proposed**: Track per-domain completion status and support selective domain retry.

```bash
# Resume only the failed domain
/org --resume org_20260227_143022 --domain make_eng

# Resume all incomplete domains (skip completed ones)
/org --resume org_20260227_143022
```

**Implementation**:
- Persist domain completion state in strategic_brief.yaml domain_status
- On resume, check each domain's status:
  - `completed`: skip entirely
  - `in_progress` or `blocked`: re-execute only this domain
  - `pending`: execute normally
- Preserve integration from already-completed domains
- Only re-run integration if any domain was re-executed

### 1.4 Strategic Brief Versioning

**Current**: strategic_brief.yaml is mutated in place during execution.
**Proposed**: Maintain versioned history of brief changes.

```yaml
# strategic_brief.yaml additions
_version_history:
  - version: 1
    state: BRIEFED
    timestamp: "{ISO_TIMESTAMP}"
    changes: "Initial brief after deliberation"
  - version: 2
    state: EXECUTED
    timestamp: "{ISO_TIMESTAMP}"
    changes: "CEO escalation resolution: re-prioritized grow domain"
    directive_ref: directive_001
  - version: 3
    state: EXECUTED
    timestamp: "{ISO_TIMESTAMP}"
    changes: "User directive: extend timeline by 2 weeks"
    directive_ref: directive_002
```

**Implementation**:
- Before any mutation to strategic_brief.yaml, snapshot current state to version history
- Each version entry includes: version number, pipeline state, timestamp, change description, directive reference
- Integration phase can diff version 1 (original plan) vs. final version (actual execution)
- Retrospective can analyze brief drift (how much did the plan change during execution)

## Priority 2: Medium Impact, Lower Effort

### 2.1 Cost-Aware Dry Run

**Current**: --dry-run shows routing decision and C-suite engagement plan.
**Proposed**: Add resource estimation to dry-run output.

```
/org Launch the new product --dry-run

Routing: full_hierarchy (5 domains)
C-Suite: CTO, CCO, CRO, CFO, CHRO

Estimated Resources:
  C-suite spawns: 10 (5 analysis + 5 objection)
  /team invocations: 5 (one per domain)
  Estimated teammates: 15-25 (across all domains)
  Estimated duration: 25-40 minutes
  Estimated token usage: ~500K-800K tokens

Alternative Routes:
  --quick (skip deliberation): saves ~5 min, 10 spawns
  --domains make_eng,grow (2 domains only): saves ~15 min, 15 spawns

Proceed? /org Launch the new product
```

### 2.2 Enhanced Domain Detection

**Current**: Static keyword matching with hardcoded multi-domain patterns.
**Proposed**: Layered detection with project context and semantic analysis.

```
Layer 1: Keyword matching (existing, fast)
Layer 2: Project structure analysis
  - package.json exists -> likely engineering
  - marketing/ directory -> likely grow
  - contracts/ directory -> likely serve
Layer 3: Semantic intent analysis
  - "We need to scale our infrastructure" -> operate_ops (not just keyword "scale")
  - "The team is burning out" -> people (context: burnout, not "team" as engineering)
Layer 4: Historical pattern matching
  - Previous /org with similar phrasing -> reuse detected domains
```

**Implementation**:
- Layer 1 remains the fast path (existing keyword detection)
- Layer 2 adds codebase-aware detection via Glob/Read of key project files
- Layer 3 uses the orchestrator's context enrichment for intent disambiguation
- Layer 4 uses orchestration memory (from improvement 1.1) for pattern matching
- Final detection is the union of all layers, with confidence scores per domain

### 2.3 Cross-Domain Conflict Resolution Protocol

**Current**: CEO "merges overlapping outputs" without structured methodology.
**Proposed**: Define explicit merge strategies for common conflict types.

```yaml
merge_strategies:
  file_conflict:
    detection: "Two domains modified the same file"
    resolution:
      - "Identify which domain owns the file (primary author)"
      - "Non-owning domain's changes reviewed by owning domain's controller"
      - "If compatible: merge both changes"
      - "If conflicting: owning domain's changes take priority, non-owner adapts"

  interface_conflict:
    detection: "Domain A's output API differs from Domain B's expected input"
    resolution:
      - "Identify which domain defined the interface first (blocks dependency)"
      - "Adapter pattern: create compatibility layer if both are valid"
      - "If one domain clearly wrong: revert that domain's interface changes"

  priority_conflict:
    detection: "Two domains claim the same resource (budget, timeline, personnel)"
    resolution:
      - "Check strategic_brief priority rankings"
      - "Higher priority domain gets first allocation"
      - "Lower priority domain adapts to remaining resources"
      - "If both high priority: escalate to user"
```

### 2.4 Orchestration Retrospective

**Current**: Basic completion summary with counts.
**Proposed**: Comprehensive retrospective analysis after each orchestration.

```yaml
# Agent_Memory/sessions/{session_id}/retrospective.yaml
retrospective:
  session_id: org_20260227_143022
  route: full_hierarchy

  deliberation_analysis:
    rounds: 2
    total_objections: 7
    blocking_objections: 2
    resolved_in_round_1: 5
    resolved_in_round_2: 2
    unresolved: 0
    most_contentious_topic: "Budget allocation between engineering and marketing"

  domain_execution_analysis:
    fastest_domain: {domain: make_cre, duration: 180s}
    slowest_domain: {domain: make_eng, duration: 450s}
    bottleneck: "make_eng blocked by grow.api_spec for 120s"

  dependency_accuracy:
    planned_dependencies: 5
    actual_dependencies: 7
    missed_dependencies: 2  # discovered during execution
    false_dependencies: 0   # planned but not actually needed

  escalation_analysis:
    total_escalations: 2
    ceo_resolved: 1
    user_resolved: 1
    avg_resolution_time: 45s

  improvements_for_next_time:
    - "Add API spec as explicit dependency between make_eng and grow"
    - "Increase budget buffer for make_eng (consistently underestimated)"
    - "CHRO objection about hiring timeline is a recurring pattern -- pre-address in brief"
```

## Priority 3: Nice-to-Have Enhancements

### 3.1 C-Suite Context Injection

Provide C-suite agents with project-specific context from Agent_Memory:

```
CEO pre-populates C-suite prompts with:
  - Previous domain analyses for this project (from _knowledge/)
  - Active initiatives in their domain (from recent sessions)
  - Known constraints and decisions (from past deliberations)
  - Organizational context (team size, tech stack, budget range)
```

### 3.2 Parallel Deliberation Optimization

For 5+ domain orchestrations, run deliberation in two parallel batches:

```
Batch 1 (likely objectors): CFO, CHRO (budget/hiring always object)
  -> CEO resolves financial/resource objections first
Batch 2 (likely approvers): CTO, CCO, COO
  -> CEO presents pre-resolved brief for validation
```

Reduces total deliberation time by running independent objection reviews in parallel.

### 3.3 Strategic Brief Templates

Pre-built brief templates for common multi-domain patterns:

```bash
/org Launch product --template product_launch
# Pre-defined: make_eng + make_cre + grow + operate_fin + people
# Pre-defined dependencies, risk register, success criteria

/org Expand to new market --template market_expansion
# Pre-defined: grow + operate_fin + serve + people

/org Major technical migration --template tech_migration
# Pre-defined: make_eng + operate_ops + serve (compliance)
```

### 3.4 Domain Execution Ordering

Allow CEO to specify domain execution order rather than all-parallel:

```yaml
execution_strategy:
  wave_1: [make_eng]        # Build core first
  wave_2: [make_cre, grow]  # Design + marketing after core exists
  wave_3: [operate_fin, people]  # Finance + hiring after scope is clear
```

This respects implicit sequencing that pure parallel execution misses.
