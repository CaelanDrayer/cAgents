# /team Strategic Mode — Routing Examples

Examples showing how `/team` in strategic mode (introduced in v12.2.0) handles single-domain, multi-domain, and escalation-driven instructions. Each example shows the strategic-mode wave flow: Wave 0 (C-suite analysis) -> Wave 1 (objection phase) -> Wave 2 (brief synthesis) -> Wave 3..N (per-domain dispatch) -> Final wave (integration).

In strategic mode, `/team` plays the role formerly held by a dedicated strategic skill: it performs cross-domain C-suite analysis up front and then dispatches per-domain work in subsequent waves. Independent domains dispatch in parallel via the Agent tool; dependent domains dispatch sequentially via `Skill(/act --brief)` so upstream outputs are available as context.

---

## Example 1: Single Domain Simple (-> standalone /act)

**Input**: `/team --strategic Fix the login button alignment`

**Strategic-Mode Lead Analysis**:
- Domains touched: engineering (1 domain)
- Scope: simple (single component fix)
- Route: **single_run** (delegated)

**Flow**:
1. Strategic-mode lead generates minimal `strategic_brief.yaml`:
   - Mission: "Fix login button alignment for consistent UI"
   - Success criteria: ["Button aligned per design spec"]
   - `domain_assignments.engineering.dependency_type: independent`
2. Invokes: `Skill("act", "Fix the login button alignment --brief {brief_path}")`
3. Strategic-mode pipeline collapses to: INIT -> BRIEFED -> EXECUTED -> COMPLETE (no need for full Wave 0/1 since only one domain)

**Expected outputs**:
- `outputs/strategic_brief.yaml`
- Standard `/act` outputs from the delegated call

---

## Example 2: Single Domain Complex (-> /team standard mode)

**Input**: `/team --strategic Implement OAuth2 authentication with Google and GitHub providers`

**Strategic-Mode Lead Analysis**:
- Domains touched: engineering (1 domain)
- Scope: complex (multiple components, external integrations)
- Route: **single_team_standard** (delegated)

**Flow**:
1. Strategic-mode lead generates `strategic_brief.yaml`:
   - Mission: "Implement OAuth2 with Google + GitHub for secure user authentication"
   - Success criteria: ["OAuth flow works for both providers", "Token refresh implemented", "Tests pass"]
   - `domain_assignments.engineering.dependency_type: independent`
2. Hands off to `/team` standard mode (non-strategic) with `--session {session_dir}` so the brief is available
3. Standard-mode /team reads `strategic_brief.yaml` for richer context
4. States executed: INIT -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE

**Expected outputs**:
- `outputs/strategic_brief.yaml`
- Standard `/team` outputs (per-wave deliverables, integration_report.yaml)

---

## Example 3: Multi-Domain (Full Strategic Wave Flow)

**Input**: `/team --strategic Launch the new analytics product by Q2`

**Strategic-Mode Lead Analysis**:
- Domains touched: engineering (build), creative (UX/branding), growth (GTM), operate_fin (budget), people (hiring)
- Scope: multi-domain strategic initiative
- Route: **full_strategic_wave_flow**

**Wave-by-Wave Flow**:

1. **Wave 0 — C-Suite Analysis (parallel, dependency-ordered)**:
   - Wave 0a (independent C-suites in parallel): CTO, CCO, CFO
     - CTO: "Need 3 backend devs, 2 frontend devs. Estimated 8 weeks for MVP."
     - CCO: "Brand refresh needed. UX research required. 4 weeks for design system."
     - CFO: "Total budget estimate $240K. Need headcount approval."
   - Wave 0b (dependent C-suites reading Wave 0a outputs): CRO (reads CCO+CTO), CHRO (reads COO+CFO)
     - CRO: "GTM plan needs product positioning informed by CCO brand work. 6 weeks."
     - CHRO: "Need to hire 5 engineers + 1 designer informed by CTO scope and CFO budget. 4-6 week hiring timeline."

2. **Wave 1 — Objection Phase (parallel, all peer-read)**: same C-suites re-spawned to read ALL peer analyses and write `objections_*.yaml`
   - CFO objects: "Budget exceeds quarterly allocation by 30%"
   - CTO objects: "8 weeks unrealistic without hiring first"
   - CHRO flags: "Hiring 5 engineers in 4 weeks is aggressive"

3. **Wave 2 — Brief Synthesis**: strategic-mode lead reads objections, resolves conflicts, writes final `strategic_brief.yaml`
   - Phased hiring across Q1-Q2
   - Reduced initial scope to core analytics
   - `domain_assignments`:
     - engineering: `dependency_type: dependent_on, dependent_on: [people]` (waits for first hire)
     - creative: `dependency_type: independent`
     - growth: `dependency_type: dependent_on, dependent_on: [engineering, creative]`
     - operate_fin: `dependency_type: independent`
     - people: `dependency_type: independent`

4. **Wave 3 — Independent Domains (parallel dispatch via Agent tool)**:
   - creative: spawn `cagents:cco`-led domain controller
   - operate_fin: spawn `cagents:cfo`-led domain controller
   - people: spawn `cagents:chro`-led domain controller

5. **Wave 4 — Dependent Domain (engineering)**: spawns AFTER people completes initial hire
   - Dispatched via `Skill(/act --brief {brief_path} --domain engineering)`

6. **Wave 5 — Dependent Domain (growth)**: spawns AFTER engineering AND creative complete
   - Dispatched via `Skill(/act --brief {brief_path} --domain growth)`

7. **Final Wave — Integration**: strategic-mode lead merges outputs, verifies cross-domain handoffs, writes `integration_report.yaml`

**Expected outputs**:
- `outputs/strategic_brief.yaml` (with full `domain_assignments`, `dependency_type`, `dependent_on`, `cross_domain_dependencies`)
- `domain_analyses/*.yaml` (one per C-suite from Wave 0)
- `objections/*.yaml` (one per C-suite from Wave 1)
- Per-domain wave outputs (engineering/, creative/, growth/, operate_fin/, people/)
- `outputs/integration_report.yaml`

---

## Example 4: Cross-Domain with Escalation

**Input**: `/team --strategic Migrate from monolith to microservices`

**Strategic-Mode Lead Analysis**:
- Domains: engineering (architecture), operate_ops (deployment), service (compliance)
- Route: **full_strategic_wave_flow**

**During Execution (Wave 4+)**:
- CTO and COO conflict surfaces during per-domain dispatch: CTO wants Kubernetes, COO says team lacks K8s experience
- **Escalation**: strategic-mode lead reads escalation from `domain_status.escalations`, resolves by adding a training work item to the People domain
- Adjusts brief mid-execution (version bump in `_version_history`): hire DevOps contractor for 3 months, include K8s training
- Records directive in `strategic_brief.yaml` under `directives:`

**Expected outputs**:
- `strategic_brief.yaml` with `_version_history` showing brief drift
- `directives:` array with the resolution
- `outputs/integration_report.yaml` documenting the escalation

---

## Example 5: Quick Mode

**Input**: `/team --strategic --quick Fix the typo in the homepage`

**Strategic-Mode Lead Analysis**:
- Domains: creative (1 domain)
- `--quick` flag: skip Wave 0 (analysis) and Wave 1 (objections)
- Route: **single_run** (quick mode)

**Flow**:
1. Strategic-mode lead generates brief inline (no Wave 0 C-suite spawn)
2. Directly invokes `/act` with `--brief`
3. States: INIT -> BRIEFED -> EXECUTED -> COMPLETE

---

## Example 6: Forced Domains

**Input**: `/team --strategic Restructure the engineering org --domains engineering,people,operate_ops`

**Strategic-Mode Lead Analysis**:
- Domains: forced to engineering, people, operate_ops (others skipped)
- Route: **full_strategic_wave_flow** (3 domains)

**C-Suite Engaged**: CTO, CHRO, COO (only these 3 — other C-suites are not spawned in Wave 0)

---

## Routing Decision Tree

```
/team --strategic <instruction>
  |
  +-- Count domains touched
  |
  +-- 1 domain?
  |     +-- Simple scope? -> Skill(/act --brief)
  |     +-- Complex scope? -> /team standard mode with strategic_brief
  |
  +-- 2+ domains?
        +-- Full strategic wave flow:
              Wave 0 (C-suite analysis) ->
              Wave 1 (objection phase) ->
              Wave 2 (brief synthesis) ->
              Wave 3..N (per-domain dispatch — independent in parallel, dependent_on sequential) ->
              Final wave (integration)
```

## See Also

- `@reference/strategic-mode.md` — full wave-by-wave specification of strategic mode
- `@reference/strategic-brief-format.md` — strategic_brief.yaml schema including `dependency_type`
- `@reference/csuite-deliberation.md` — Wave 0/1 dependency-ordered analysis + two-phase deliberation
- `@reference/strategic-escalation.md` — escalation triggers, chain, and resolution patterns
