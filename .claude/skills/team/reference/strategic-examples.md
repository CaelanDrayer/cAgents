# /team Strategic Mode — Routing Examples

These examples show how `/team` handles three kinds of instruction in strategic mode. Those kinds are single-domain, multi-domain, and escalation-driven. Release v12.2.0 introduced strategic mode. Each example shows the same wave flow. That flow has these five steps:

1. Wave 0: the C-suite analysis.
2. Wave 1: the objection phase.
3. Wave 2: the brief synthesis.
4. Wave 3..N: the per-domain dispatch.
5. Final wave: the integration.

In strategic mode, `/team` holds the role of the earlier dedicated strategic skill. It does the cross-domain C-suite analysis first. It then dispatches the per-domain work in the waves that follow. An independent domain dispatches in parallel through the Agent tool. A dependent domain dispatches in sequence through `Skill(/act --brief)`. The upstream outputs are then available as context.

---

## Example 1: Single Domain Simple (-> standalone /act)

**Input**: `/team --strategic Fix the login button alignment`

**Strategic-Mode Lead Analysis**:
- Domains touched: engineering (1 domain)
- Scope: simple. It is a fix to a single component.
- Route: **single_run**. The lead delegates the work.

**Flow**:
1. The strategic-mode lead generates a minimal `strategic_brief.yaml` file:
   - Mission: "Fix login button alignment for consistent UI"
   - Success criteria: ["Button aligned per design spec"]
   - `domain_assignments.engineering.dependency_type: independent`
2. Invokes: `Skill("act", "Fix the login button alignment --brief {brief_path}")`
3. The strategic-mode pipeline collapses to INIT -> BRIEFED -> EXECUTED -> COMPLETE. Only one domain is in scope, so the full Wave 0 and the full Wave 1 are not necessary.

**Expected outputs**:
- `outputs/strategic_brief.yaml`
- The standard `/act` outputs from the delegated call

---

## Example 2: Single Domain Complex (-> /team standard mode)

**Input**: `/team --strategic Implement OAuth2 authentication with Google and GitHub providers`

**Strategic-Mode Lead Analysis**:
- Domains touched: engineering (1 domain)
- Scope: complex. It has many components and external integrations.
- Route: **single_team_standard**. The lead delegates the work.

**Flow**:
1. The strategic-mode lead generates `strategic_brief.yaml`:
   - Mission: "Implement OAuth2 with Google + GitHub for secure user authentication"
   - Success criteria: ["OAuth flow works for both providers", "Token refresh implemented", "Tests pass"]
   - `domain_assignments.engineering.dependency_type: independent`
2. The lead hands the work to the standard mode of `/team`, which is the non-strategic mode. It passes `--session {session_dir}`, so the brief is available.
3. Standard-mode /team reads `strategic_brief.yaml` for richer context.
4. States executed: INIT -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE

**Expected outputs**:
- `outputs/strategic_brief.yaml`
- The standard `/team` outputs, which are the per-wave deliverables and integration_report.yaml

---

## Example 3: Multi-Domain (Full Strategic Wave Flow)

**Input**: `/team --strategic Launch the new analytics product by Q2`

**Strategic-Mode Lead Analysis**:
- Domains touched:
  - engineering: the build.
  - creative: the UX and the branding.
  - growth: the GTM.
  - operate_fin: the budget.
  - people: the hiring.
- Scope: a multi-domain strategic initiative
- Route: **full_strategic_wave_flow**

**Wave-by-Wave Flow**:

1. **Wave 0: C-Suite Analysis (parallel, dependency-ordered)**:
   - Wave 0a (independent C-suites in parallel): CTO, CCO, CFO
     - CTO: "Need 3 backend devs, 2 frontend devs. Estimated 8 weeks for MVP."
     - CCO: "Brand refresh needed. UX research required. 4 weeks for design system."
     - CFO: "Total budget estimate $240K. Need headcount approval."
   - Wave 0b (dependent C-suites reading Wave 0a outputs): CRO (reads CCO+CTO), CHRO (reads COO+CFO)
     - CRO: "GTM plan needs product positioning informed by CCO brand work. 6 weeks."
     - CHRO: "Need to hire 5 engineers + 1 designer informed by CTO scope and CFO budget. 4-6 week hiring timeline."

2. **Wave 1: Objection Phase (parallel, all peer-read)**: the lead re-spawns the same C-suites. They read ALL of the peer analyses, and they write `objections_*.yaml`.
   - CFO objects: "Budget exceeds quarterly allocation by 30%"
   - CTO objects: "8 weeks unrealistic without hiring first"
   - CHRO flags: "Hiring 5 engineers in 4 weeks is aggressive"

3. **Wave 2: Brief Synthesis**: the strategic-mode lead reads the objections. It resolves the conflicts, and it writes the final `strategic_brief.yaml` file.
   - The hiring is phased across Q1 and Q2.
   - The initial scope is reduced to the core analytics.
   - `domain_assignments`:
     - engineering: `dependency_type: dependent_on, dependent_on: [people]`. This domain waits for the first hire.
     - creative: `dependency_type: independent`
     - growth: `dependency_type: dependent_on, dependent_on: [engineering, creative]`
     - operate_fin: `dependency_type: independent`
     - people: `dependency_type: independent`

4. **Wave 3: Independent Domains (parallel dispatch through the Agent tool)**:
   - creative: spawn the domain controller that `cagents:cco` leads.
   - operate_fin: spawn the domain controller that `cagents:cfo` leads.
   - people: spawn the domain controller that `cagents:chro` leads.

5. **Wave 4: Dependent Domain (engineering)**: this wave spawns AFTER the people domain completes the first hire.
   - Dispatched via `Skill(/act --brief {brief_path} --domain engineering)`

6. **Wave 5: Dependent Domain (growth)**: this wave spawns AFTER engineering AND creative complete.
   - Dispatched via `Skill(/act --brief {brief_path} --domain growth)`

7. **Final Wave: Integration**: the strategic-mode lead merges the outputs. It makes sure that each cross-domain handoff is correct, and it writes `integration_report.yaml`.

**Expected outputs**:
- `outputs/strategic_brief.yaml`, with the full `domain_assignments`, `dependency_type`, `dependent_on`, and `cross_domain_dependencies`
- `domain_analyses/*.yaml`, which holds one file for each C-suite from Wave 0
- `objections/*.yaml`, which holds one file for each C-suite from Wave 1
- The per-domain wave outputs, which are engineering/, creative/, growth/, operate_fin/, and people/
- `outputs/integration_report.yaml`

---

## Example 4: Cross-Domain with Escalation

**Input**: `/team --strategic Migrate from monolith to microservices`

**Strategic-Mode Lead Analysis**:
- Domains: engineering for the architecture, operate_ops for the deployment, and service for the compliance
- Route: **full_strategic_wave_flow**

**During Execution (Wave 4+)**:
- A conflict between the CTO and the COO appears during the per-domain dispatch. The CTO wants Kubernetes. The COO says that the team has no K8s experience.
- **Escalation**: the strategic-mode lead reads the escalation from `domain_status.escalations`. It resolves the escalation, and it adds a training work item to the People domain.
- The lead changes the brief during the execution, and it bumps the version in `_version_history`. The change hires a DevOps contractor for 3 months, and it includes the K8s training.
- The lead records the directive in `strategic_brief.yaml`, under `directives:`.

**Expected outputs**:
- `strategic_brief.yaml` with a `_version_history` that shows the drift of the brief
- The `directives:` array with the resolution
- `outputs/integration_report.yaml`, which writes down the escalation

---

## Example 5: Quick Mode

**Input**: `/team --strategic --quick Fix the typo in the homepage`

**Strategic-Mode Lead Analysis**:
- Domains: creative (1 domain)
- `--quick` flag: skip Wave 0 (analysis) and Wave 1 (objections)
- Route: **single_run** in quick mode.

**Flow**:
1. The strategic-mode lead generates the brief inline. It spawns no C-suite agent in Wave 0.
2. The lead invokes `/act` directly with `--brief`.
3. States: INIT -> BRIEFED -> EXECUTED -> COMPLETE

---

## Example 6: Forced Domains

**Input**: `/team --strategic Restructure the engineering org --domains engineering,people,operate_ops`

**Strategic-Mode Lead Analysis**:
- Domains: the flag forces engineering, people, and operate_ops. The lead skips the other domains.
- Route: **full_strategic_wave_flow** with 3 domains.

**C-Suite Engaged**: CTO, CHRO, and COO. The lead spawns no other C-suite agent in Wave 0.

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

- `@reference/strategic-mode.md`: the full wave-by-wave specification of strategic mode.
- `@reference/strategic-brief-format.md`: the schema of strategic_brief.yaml, which includes `dependency_type`.
- `@reference/csuite-deliberation.md`: the dependency-ordered analysis in Wave 0 and Wave 1, plus the two-phase deliberation.
- `@reference/strategic-escalation.md`: the escalation triggers, the chain, and the resolution patterns.
