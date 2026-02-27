# C-Suite Domain Mapping

## Domain-to-C-Suite Routing

| Domain Key | C-Suite Title | Agent | Super-Domain | Scope |
|-----------|---------------|-------|--------------|-------|
| make_eng | CTO | `cagents:cto` | Make | Technical architecture, implementation, testing, deployment |
| make_cre | CCO | `cagents:cco` | Make | Creative direction, branding, UX, content, game design |
| grow | CRO | `cagents:cro` | Grow | Marketing, sales, go-to-market, revenue |
| operate_fin | CFO | `cagents:cfo` | Operate | Budget, ROI, financial planning, cost analysis |
| operate_ops | COO | `cagents:coo` | Operate | Process, logistics, operational execution, supply chain |
| people | CHRO | `cagents:chro` | People | Talent, hiring, culture, org structure, L&D |
| serve | General Counsel | `cagents:general-counsel` | Serve | Legal, compliance, customer support, privacy |

## Keyword Detection

### make_eng (CTO)
Primary: `fix`, `bug`, `implement`, `code`, `api`, `database`, `build`, `refactor`, `test`, `deploy`, `architecture`, `backend`, `frontend`, `devops`, `infrastructure`, `microservices`, `ci/cd`, `migration`

### make_cre (CCO)
Primary: `write`, `story`, `content`, `design`, `creative`, `novel`, `script`, `poem`, `brand`, `UX`, `game`, `narrative`, `artwork`, `visual`, `animation`, `music`

### grow (CRO)
Primary: `campaign`, `marketing`, `sales`, `conversion`, `SEO`, `funnel`, `leads`, `revenue`, `growth`, `acquisition`, `retention`, `pricing`, `go-to-market`, `launch`

### operate_fin (CFO)
Primary: `budget`, `cost`, `forecast`, `investment`, `ROI`, `financial`, `funding`, `revenue model`, `burn rate`, `profitability`, `expenses`

### operate_ops (COO)
Primary: `operations`, `process`, `supply chain`, `procurement`, `logistics`, `efficiency`, `SOP`, `workflow optimization`, `vendor`, `capacity`

### people (CHRO)
Primary: `hire`, `recruit`, `onboard`, `culture`, `HR`, `talent`, `performance review`, `team`, `compensation`, `benefits`, `training`, `L&D`, `retention`, `org structure`

### serve (General Counsel)
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

1. **CEO mediates all**: C-suite never messages each other directly
2. **File-based communication**: domain_analysis_*.yaml and objections_*.yaml
3. **Parallel spawning**: All relevant C-suite run simultaneously for analysis and objection phases
4. **Single domain = single C-suite**: Only spawn the relevant C-suite agent
5. **CEO decides conflicts**: When C-suite disagree, CEO resolves based on chairperson intent
