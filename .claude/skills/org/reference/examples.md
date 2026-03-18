# /org Routing Examples

## Example 1: Single Domain Simple (-> /run)

**Input**: `/org Fix the login button alignment`

**CEO Analysis**:
- Domains touched: engineering (1 domain)
- Scope: simple (single component fix)
- Route: **single_run**

**Flow**:
1. CEO generates minimal strategic_brief.yaml:
   - Mission: "Fix login button alignment for consistent UI"
   - Success criteria: ["Button aligned per design spec"]
2. Invokes: `Skill("run", "Fix the login button alignment --brief {brief_path}")`
3. States executed: INIT -> BRIEFED -> EXECUTED -> COMPLETE

---

## Example 2: Single Domain Complex (-> /team)

**Input**: `/org Implement OAuth2 authentication with Google and GitHub providers`

**CEO Analysis**:
- Domains touched: engineering (1 domain)
- Scope: complex (multiple components, external integrations)
- Route: **single_team**

**Flow**:
1. CEO generates strategic_brief.yaml:
   - Mission: "Implement OAuth2 with Google + GitHub for secure user authentication"
   - Success criteria: ["OAuth flow works for both providers", "Token refresh implemented", "Tests pass"]
2. Invokes: `Skill("team", "Implement OAuth2 with Google and GitHub --session {session_dir}")`
3. /team reads strategic_brief.yaml for richer context
4. States executed: INIT -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE

---

## Example 3: Multi-Domain (Full Hierarchy)

**Input**: `/org Launch the new analytics product by Q2`

**CEO Analysis**:
- Domains touched: engineering (build), creative (UX/branding), grow (GTM), operate_fin (budget), people (hiring)
- Scope: multi-domain strategic initiative
- Route: **full_hierarchy**

**Flow**:
1. **INIT**: CEO identifies 5 domains
2. **ANALYZED**: Spawns CTO, CCO, CRO, CFO, CHRO in parallel
   - CTO: "Need 3 backend devs, 2 frontend devs. Estimated 8 weeks for MVP."
   - CCO: "Brand refresh needed. UX research required. 4 weeks for design system."
   - CRO: "GTM plan needs product positioning, pricing, launch campaign. 6 weeks."
   - CFO: "Total budget estimate $240K. Need headcount approval."
   - CHRO: "Need to hire 5 engineers + 1 designer. 4-6 week hiring timeline."
3. **DELIBERATED**: CEO drafts brief -> C-suite objections:
   - CFO objects: "Budget exceeds quarterly allocation by 30%"
   - CTO objects: "8 weeks unrealistic without hiring first"
   - CHRO flags: "Hiring 5 engineers in 4 weeks is aggressive"
   - CEO resolves: Phase hiring across Q1-Q2, reduce initial scope to core analytics
4. **BRIEFED**: Final strategic_brief.yaml with phased approach
5. **EXECUTED**: Sequential /team per domain (dependency-ordered):
   - /team engineering (engineering build)
   - /team creative (design + brand)
   - /team grow (GTM campaign)
   - /team people (hiring pipeline)
6. **INTEGRATED**: CEO merges outputs, verifies cross-domain handoffs
7. **COMPLETE**: Integrated launch plan with timeline, budget, hiring, and GTM

---

## Example 4: Cross-Domain with Escalation

**Input**: `/org Migrate from monolith to microservices`

**CEO Analysis**:
- Domains: engineering (architecture), operate_ops (deployment), serve (compliance)
- Route: **full_hierarchy**

**During Execution**:
- CTO and COO conflict: CTO wants Kubernetes, COO says team lacks K8s experience
- **Escalation**: CEO resolves by adding training work item to People domain
- Adjusts brief: hire DevOps contractor for 3 months, include K8s training

---

## Example 5: Quick Mode

**Input**: `/org Fix the typo in the homepage --quick`

**CEO Analysis**:
- Domains: creative (1 domain)
- `--quick` flag: skip deliberation
- Route: **single_run** (quick mode)

**Flow**:
1. CEO generates brief inline (no C-suite analysis)
2. Directly invokes /run with --brief
3. States: INIT -> BRIEFED -> EXECUTED -> COMPLETE

---

## Example 6: Forced Domains

**Input**: `/org Restructure the engineering org --domains engineering,people,operate_ops`

**CEO Analysis**:
- Domains: forced to engineering, people, operate_ops
- Route: **full_hierarchy** (3 domains)

**C-Suite Engaged**: CTO, CHRO, COO (only these 3, others skipped)

---

## Routing Decision Tree

```
/org <instruction>
  |
  +-- Count domains touched
  |
  +-- 1 domain?
  |     +-- Simple scope? -> /run with --brief
  |     +-- Complex scope? -> /team with strategic_brief
  |
  +-- 2+ domains?
        +-- Full hierarchy (C-suite analysis -> deliberation -> sequential /team)
```
