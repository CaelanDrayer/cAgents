# C-Suite Domain Mapping

> **Canonical definition (A8-08/C9.7):** "C-suite" = the 9 leadership agents
> (`cagents:ceo`, `cagents:cto`, `cagents:cfo`, `cagents:cmo`, `cagents:coo`,
> `cagents:chro`, `cagents:cco`, `cagents:cro`, `cagents:cpo`). These live in
> `agents/leadership/` and are the only agents strategic mode spawns as Wave 0/1
> subagents. The `general-counsel` entry below is a domain *controller*. The
> service domain routes to that controller. It is not a 10th C-suite seat.
> There is no `clo`/`cso` C-suite agent on disk.

## Domain-to-C-Suite Routing

| Domain Key | C-Suite Title | Agent | Super-Domain | Scope |
|-----------|---------------|-------|--------------|-------|
| engineering | CTO | `cagents:cto` | Make | Technical architecture, implementation, testing, deployment |
| creative | CCO | `cagents:cco` | Make | Creative direction, branding, UX, content, game design |
| growth | CRO | `cagents:cro` | Grow | Marketing, sales, go-to-market, revenue |
| growth | CMO (optional) | `cagents:cmo` | Grow | Brand strategy, creative marketing (co-analyst with CRO for brand-heavy requests) |
| business | CPO | `cagents:cpo` | Business | Product strategy, roadmap, go-to-market, user research |
| operate_fin | CFO | `cagents:cfo` | Operate | Budget, ROI, financial planning, cost analysis |
| operate_ops | COO | `cagents:coo` | Operate | Process, logistics, operational execution, supply chain |
| people | CHRO | `cagents:chro` | People | Talent, hiring, culture, org structure, L&D |
| service | General Counsel | `cagents:general-counsel` | Serve | Legal, compliance, customer support, privacy |
| science | CTO | `cagents:cto` | Make | Research methodology, experiment design, data analysis, scientific rigor |
| health | CHRO | `cagents:chro` | People | Wellness programs, medical research synthesis, health recommendations, safety |
| education | CPO | `cagents:cpo` | Business | Learning experience design, curriculum, pedagogy, instructional strategy |
| personal | CHRO | `cagents:chro` | People | Individual development, goal-setting, habit formation, life coaching |
| arts | CCO | `cagents:cco` | Make | Fine arts direction, medium guidance, composition, critique, style |
| trades | COO | `cagents:coo` | Operate | Practical execution, safety compliance, procedural guidance, materials |

## Keyword Detection

### engineering (CTO)
Primary: `fix`, `bug`, `implement`, `code`, `api`, `database`, `build`, `refactor`, `test`, `deploy`, `architecture`, `backend`, `frontend`, `devops`, `infrastructure`, `microservices`, `ci/cd`, `migration`

### creative (CCO)
Primary: `write`, `story`, `content`, `design`, `creative`, `novel`, `script`, `poem`, `brand`, `UX`, `game`, `narrative`, `artwork`, `visual`, `animation`, `music`

### growth (CRO)
Primary: `campaign`, `marketing`, `sales`, `conversion`, `SEO`, `funnel`, `leads`, `revenue`, `growth`, `acquisition`, `retention`, `pricing`, `go-to-market`, `launch`

### business (CPO)
Primary: `product`, `roadmap`, `feature`, `user research`, `product strategy`, `go-to-market`, `MVP`, `product-market fit`, `backlog`, `sprint`, `requirements`

### operate_fin (CFO)
Primary: `budget`, `cost`, `forecast`, `investment`, `ROI`, `financial`, `funding`, `revenue model`, `burn rate`, `profitability`, `expenses`

### operate_ops (COO)
Primary: `operations`, `process`, `supply chain`, `procurement`, `logistics`, `efficiency`, `SOP`, `workflow optimization`, `vendor`, `capacity`

### people (CHRO)
Primary: `hire`, `recruit`, `onboard`, `culture`, `HR`, `talent`, `performance review`, `team`, `compensation`, `benefits`, `training`, `L&D`, `retention`, `org structure`

### service (General Counsel)
Primary: `support`, `legal`, `compliance`, `customer`, `SLA`, `contract`, `privacy`, `GDPR`, `regulation`, `liability`, `dispute`, `escalation`

### science (CTO)
Primary: `research`, `experiment`, `hypothesis`, `methodology`, `data collection`, `peer review`, `laboratory`, `scientific`, `study`, `evidence`, `replication`, `protocol`, `field study`

### health (CHRO)
Primary: `wellness`, `medical`, `health`, `symptom`, `treatment`, `fitness`, `mental health`, `therapy`, `nutrition`, `clinical`, `patient`, `healthcare`, `wellbeing`, `exercise`

### education (CPO)
Primary: `learn`, `teach`, `curriculum`, `lesson`, `course`, `student`, `pedagogy`, `training`, `assessment`, `educational`, `instructional design`, `learning objective`, `classroom`, `tutor`

### personal (CHRO)
Primary: `personal development`, `self-improvement`, `goals`, `habits`, `productivity`, `life coaching`, `career planning`, `personal growth`, `motivation`, `mindset`, `journaling`, `routine`

### arts (CCO)
Primary: `painting`, `drawing`, `sculpture`, `performance`, `gallery`, `exhibition`, `artistic`, `fine arts`, `visual art`, `craft`, `portfolio`, `technique`, `composition`, `medium`

### trades (COO)
Primary: `plumbing`, `electrical`, `carpentry`, `HVAC`, `welding`, `construction`, `installation`, `repair`, `tools`, `safety`, `code compliance`, `permits`, `materials`, `procedure`

## Multi-Domain Detection

A cross-domain keyword triggers multi-domain routing. That routing engages 2 or more C-suite agents:

| Keyword Pattern | Domains Triggered |
|----------------|-------------------|
| "launch product" | make_eng + grow + operate_fin |
| "restructure" | make_eng + people + operate_ops |
| "compliance audit" | serve + operate_ops |
| "scale the team" | people + operate_fin |
| "go-to-market" | grow + make_cre + operate_fin |
| "security + compliance" | make_eng + serve |
| "customer experience" | serve + make_cre + grow |

## C-Suite Interaction Rules

1. **CEO decides all**: The C-suite agents never message each other directly. They CAN read the peer analyses through the file-based inline passes in `domain_analyses/*.yaml`. The CEO remains the sole decision-maker. A peer read gives cross-domain context, and it gives no coordination authority.
2. **File-based communication**: The two file sets are domain_analysis_*.yaml and objections_*.yaml. The peer cross-pollination is READ-ONLY, and it goes through these files.
3. **Dependency-ordered spawning**: The analysis phase uses a multi-wave order. Wave 1 runs the independent agents in parallel. Wave 2 runs the dependent agents, and they read the Wave 1 outputs. The objection phase spawns every agent in parallel, and each agent reads ALL of the peer analyses.
4. **Single domain = single C-suite**: Spawn the relevant C-suite agent only. The dependency ordering does not apply to a single domain
5. **CEO decides conflicts**: When the C-suite agents disagree, the CEO resolves the conflict. The CEO follows the intent of the chairperson

## C-Suite Dependency Ordering

C-suite analysis uses dependency-ordered multi-wave execution. The independent agents run first, in Wave 1. The dependent agents then run in Wave 2, and they reach the Wave 1 outputs through file-based reads.

### Default Dependency Map

The default dependencies below show the usual cross-domain information flows. The CEO overrides them, and it uses the context of the instruction to do so.

| C-Suite Agent | Default Wave | Typically Reads From | Rationale |
|--------------|-------------|---------------------|-----------|
| CTO | Wave 1 | *(independent)* | Technical scope is foundational; other domains depend on it |
| CCO | Wave 1 | *(independent)* | Creative direction is foundational for brand-dependent domains |
| CRO | Wave 2 | CCO, CTO | Go-to-market strategy benefits from brand direction and technical capabilities |
| CFO | Wave 1 | *(independent)* | Financial planning provides budget constraints for dependent agents |
| COO | Wave 2 | CTO, CFO | Operational execution needs technical scope and budget constraints |
| CHRO | Wave 2 | CTO, COO | Staffing needs depend on technical scope and operational structure |
| General Counsel | Wave 2 | All peers | Compliance review benefits from full cross-domain context |

### How Dependency Detection Works

1. **Analyze the instruction**: The CEO finds which domains are involved, and how those domains relate to each other
2. **Apply default map**: Use the table above as the starting point
3. **Override based on context**: An instruction can make a dependent agent independent. For example, "review our hiring process" makes the CHRO independent. Move that agent to Wave 1
4. **Prune irrelevant dependencies**: Keep a dependency only when the analysis of the peer informs the assessment of the dependent agent
5. **Write domain_dependencies.yaml**: This file records the wave assignments and the read-from relationships

### File-Based Pass Mechanism

Cross-pollination uses the shared session directory. There is no direct messaging:

```
Wave 1: Independent agents write domain_analysis_{domain_key}.yaml
         (e.g., CTO writes domain_analysis_make_eng.yaml)

Wave 2: Dependent agents READ Wave 1 outputs before writing their own
         (e.g., CFO reads domain_analysis_make_eng.yaml for cost context,
          then writes domain_analysis_operate_fin.yaml)

Objection phase: ALL agents read ALL domain_analysis_*.yaml files
                  (full cross-domain context for objections)
```

### Constraint

C-suite peers in the same wave do not message each other directly. Subagents coordinate downward, and they do this by spawning helper subagents. They never coordinate sideways to a peer. All cross-pollination is FILE-BASED only:
- Agent A writes `domain_analysis_A.yaml`
- Agent B reads `domain_analysis_A.yaml` as input
- There is no message-based coordination between the C-suite peers. The dependency ordering across the waves carries the peer context, and in-wave messaging does not
