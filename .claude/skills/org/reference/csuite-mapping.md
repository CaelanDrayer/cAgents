# C-Suite Domain Mapping

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

## Multi-Domain Detection

Cross-domain keywords trigger multi-domain routing (2+ C-suite):

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

1. **CEO decides all**: C-suite never messages each other directly, but CAN read peer analyses via file-based inline passes (domain_analyses/*.yaml). CEO remains the sole decision-maker; peer reads provide cross-domain context, not coordination authority.
2. **File-based communication**: domain_analysis_*.yaml and objections_*.yaml. Peer cross-pollination is READ-ONLY via these files.
3. **Dependency-ordered spawning**: Analysis phase uses multi-wave ordering (Wave 1: independent agents in parallel, Wave 2: dependent agents reading Wave 1 outputs). Objection phase spawns all in parallel (all read ALL peer analyses).
4. **Single domain = single C-suite**: Only spawn the relevant C-suite agent (dependency ordering is N/A for single domain)
5. **CEO decides conflicts**: When C-suite disagree, CEO resolves based on chairperson intent

## C-Suite Dependency Ordering

C-suite analysis uses dependency-ordered multi-wave execution. Independent agents run first (Wave 1), then dependent agents run with access to Wave 1 outputs via file-based reads.

### Default Dependency Map

The following default dependencies reflect typical cross-domain information flows. CEO overrides based on instruction context.

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

1. **Analyze the instruction**: CEO determines which domains are involved and how they relate
2. **Apply default map**: Use the table above as starting point
3. **Override based on context**: If the instruction makes a typically-dependent agent independent (e.g., "review our hiring process" makes CHRO independent), move it to Wave 1
4. **Prune irrelevant dependencies**: Only include dependencies where the peer's analysis would actually inform the dependent agent's assessment
5. **Write domain_dependencies.yaml**: Records wave assignments and read-from relationships

### File-Based Pass Mechanism

Cross-pollination uses the shared session directory -- no direct messaging:

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

Subagents cannot spawn subagents. All cross-pollination is FILE-BASED only:
- Agent A writes `domain_analysis_A.yaml`
- Agent B reads `domain_analysis_A.yaml` as input
- No Task-to-Task or message-based coordination between C-suite peers
