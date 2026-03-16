# 8 Optimization Types

## Detailed Type Reference

### Code Optimization
- **Domain**: Make
- **What it optimizes**: Performance, bundle size, algorithms, memory, queries
- **Key metrics**: FCP, LCP, bundle size, query time, memory usage
- **Controller**: engineering-manager
- **Specialists**: backend-developer, frontend-developer, architect
- **Auto-detection**: Source code files (.js, .ts, .py, etc.)

### Content Optimization
- **Domain**: Make/Grow
- **What it optimizes**: Readability, SEO, engagement, CTAs, structure
- **Key metrics**: Readability score, SEO score, keyword density
- **Controller**: content-marketing-manager
- **Specialists**: copywriter, seo-specialist
- **Auto-detection**: Content files (.md, blog/)

### Process Optimization
- **Domain**: Operate
- **What it optimizes**: Workflow efficiency, automation, cycle time
- **Key metrics**: Cycle time, manual steps, error rate, automation %
- **Controller**: operations-manager
- **Specialists**: operations-analyst
- **Auto-detection**: Workflow/process docs

### Infrastructure Optimization
- **Domain**: Make/Operate
- **What it optimizes**: Cost, scaling, reliability, monitoring
- **Key metrics**: Monthly cost, utilization %, uptime, response time
- **Controller**: devops-lead
- **Specialists**: backend-developer, architect
- **Auto-detection**: Infrastructure configs (docker, k8s, terraform)

### Data Optimization
- **Domain**: Make/Operate
- **What it optimizes**: Query performance, ETL speed, data quality
- **Key metrics**: Query time, ETL duration, data completeness
- **Controller**: engineering-manager
- **Specialists**: dba, backend-developer
- **Auto-detection**: ETL/pipeline scripts

### Campaign Optimization
- **Domain**: Grow
- **What it optimizes**: Conversion rates, engagement, targeting
- **Key metrics**: Conversion %, bounce rate, CTR, open rate
- **Controller**: campaign-manager
- **Specialists**: copywriter, growth-hacker
- **Auto-detection**: Campaign/marketing files

### Creative Optimization
- **Domain**: Make
- **What it optimizes**: Pacing, character depth, plot structure, dialogue
- **Key metrics**: Reader engagement, pacing score, consistency
- **Controller**: creative-director
- **Specialists**: game-writer, copywriter
- **Auto-detection**: Creative writing files

### Sales Optimization
- **Domain**: Grow
- **What it optimizes**: Sales cycle, win rate, follow-up completion
- **Key metrics**: Cycle length, win rate %, follow-up completion %
- **Controller**: sales-ops-specialist
- **Specialists**: sales-rep
- **Auto-detection**: Sales docs/CRM configs

## Auto-Detection from Project Structure

| Indicator | Detected Type |
|-----------|--------------|
| Source code files | `code` |
| Content files (.md, blog/) | `content` |
| Workflow/process docs | `process` |
| Infrastructure configs (docker, k8s, terraform) | `infrastructure` |
| ETL/pipeline scripts | `data` |
| Campaign/marketing files | `campaign` |
| Creative writing files | `creative` |
| Sales docs/CRM configs | `sales` |

## Framework Detection for Code Optimization

| Project File | Framework |
|-------------|-----------|
| `next.config.*` | Next.js |
| `package.json` with `react` | React |
| `*.py` with `FastAPI` | FastAPI |
| `settings.py` / `manage.py` | Django |
| `package.json` with `express` | Express |
| `package.json` with `vue` | Vue |
| `angular.json` | Angular |
