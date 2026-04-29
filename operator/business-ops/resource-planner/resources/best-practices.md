# Best Practices: Resource Planner

> Design principles, patterns, and frameworks that guide high-quality resource allocation, capacity forecasting, team utilization optimization, and workload balancing work.

## Design Principles

- **Capacity Is the Constraint; Demand Is the Variable**: Organizations consistently generate more demand than they have capacity to serve — the resource planner's job is to make the trade-off explicit and manageable.
- **Skills Matter as Much as Headcount**: A team of 10 with the wrong skills is not "fully resourced" — skill matching is as important as headcount matching in effective resource planning.
- **Visibility Enables Choices**: Resource conflicts are inevitable; hidden conflicts produce crises. Visible conflicts produce decisions. Surface all contention early.
- **Planned Utilization Must Leave Headroom**: 100% planned utilization guarantees overload when actuals vary — sustainable resource plans target 80-85% utilization with buffer for unplanned demand.
- **Resource Planning Is a Living Process**: Plans made 6 months ago reflect reality 6 months ago — resource plans require continuous updating as project scope, timelines, and priorities change.
- **People Are Not Fungible**: Unlike commodities, human resources have relationships, knowledge contexts, and transitions costs — switching assignments has a real cost that must be factored into reallocation decisions.
- **Forward Visibility Is the Value**: The primary value of resource planning is giving leaders enough advance notice to act — a resource constraint discovered with 1 day's notice cannot be resolved.

## Key Patterns & Frameworks

- **Resource Demand Aggregation**: Collect resource requirements from all active and planned projects by skill category and time period → aggregate to identify total demand → compare to supply → surface conflicts and gaps.
- **Capacity vs. Demand Chart**: Visual overlay of available capacity (supply) vs. projected demand by role and period. Apply monthly to provide the "at-a-glance" view of resource balance.
- **Resource Leveling**: Adjusting project start dates, durations, or resource assignments to eliminate demand spikes that exceed available capacity. Apply when demand exceeds supply in specific periods.
- **Skills Inventory Matrix**: Map of team members against skill categories (technical, domain, soft skills) with proficiency levels. Apply to enable skill-based matching for assignments and to identify skill gaps for hiring.
- **Rolling Forecast (Resources)**: 12-month forward view of resource demand updated monthly as projects progress and priorities change. Apply to give hiring and contracting decisions sufficient lead time.
- **Utilization Model**: Planned utilization = project hours committed ÷ available hours per period. Apply to track per-person and per-team utilization against sustainable targets (80-85%).
- **Scenario Planning (Resources)**: Model resource requirements under different project portfolio scenarios (base, optimistic, pessimistic) to identify hiring and contracting decisions that are robust across scenarios.
- **Resource Reallocation Decision Framework**: When conflict is identified — resolve by (1) adjusting schedule, (2) reducing scope, (3) adding external resource, (4) escalating priority trade-off to leadership. Apply in this order.
- **Bench Management**: Tracking resources between assignments and minimizing bench time through proactive assignment pipeline management. Apply in professional services environments.

## Domain Concepts & Terminology

### Resource Concepts
- **Resource**: Any input to project work — people, equipment, materials, budget (though resource planning primarily refers to human resources)
- **Capacity**: Total available work hours for a person or team in a defined period, net of leave, training, and overhead
- **Demand**: Total resource hours required by projects and operational work in a defined period
- **Resource Contention**: Situation where multiple projects or activities require the same resource in the same period
- **Allocation**: Assignment of a specified percentage or hours of a person's capacity to a specific project or activity
- **Utilization Rate**: Actual resource hours on productive work ÷ Total available hours — measure of how effectively capacity is used

### Planning Concepts
- **Headcount Plan**: Number of approved positions by role and time period — the organizational resource supply plan
- **FTE (Full-Time Equivalent)**: Standardized unit of resource (1.0 FTE = one person working full-time) — enables comparison across part-time, full-time, and contracted resources
- **Resource Requisition**: Formal request for a resource from a project or team, specifying skill requirements, start date, duration, and % allocation
- **Pipeline**: Queue of upcoming resource demands — managed to ensure resources are matched and available before projects need them
- **Bench**: Resources between assignments, available for new project assignments — bench time is a cost; extended bench signals demand planning failure

### Workforce Categories
- **Internal Resource**: Employee allocated from the organization's existing workforce
- **Contractor / Freelancer**: External individual engaged for a defined period and scope
- **Outsourced Team**: External team or vendor engaged to deliver a defined scope — managed differently from individual contractor
- **Secondment**: Temporary assignment of an employee to a different team, department, or location
- **Skills Gap**: Difference between the skills required by demand and the skills available in the current workforce

### Metrics
- **Planned Utilization**: Resource hours committed to projects ÷ Available hours — measure of planned workload intensity
- **Actual Utilization**: Resource hours actually worked on projects ÷ Available hours — measure of actual workload intensity
- **Overallocation**: State where planned or actual demand exceeds available capacity (utilization > 100%) — unsustainable; drives burnout and quality issues
- **Bench Rate**: % of available FTEs not currently allocated to productive work — high bench rate is cost waste

## Anti-Patterns to Avoid

- **100% Utilization Planning**: Scheduling every resource hour against projects, leaving no buffer for unplanned work, meetings, or context switching. Fix: plan to 80-85% utilization; the remaining 15-20% is absorbed by reality.
- **Skill-Blind Headcount**: Counting resources as available without checking whether their skills match project requirements. Fix: maintain skills inventory; match assignments to skills, not just headcount.
- **Point-in-Time Planning**: Producing a resource plan at project kickoff and not updating it as scope, timelines, and priorities change. Fix: resource plans must be updated monthly; resource conflicts discovered late are managed as crises, not decisions.
- **Hidden Conflicts**: Resource contention identified but not surfaced to project and portfolio stakeholders because it's "too early" or "we'll figure it out." Fix: surface all contention immediately; early visibility enables resolution; hidden conflicts produce late crises.
- **Spreadsheet-Only Tracking**: Managing resource allocation across 30+ projects in disconnected spreadsheets with manual consolidation. Fix: invest in resource management tooling that aggregates demand from all project plans; manual consolidation fails at scale.
- **Resource Allocation Without Release**: People allocated to projects for which they are no longer needed, blocking them from other work. Fix: track allocation through project completion and release resources promptly when no longer needed.
- **Ignoring Ramp-Up Time**: Planning new resources to be immediately productive without accounting for onboarding and ramp time. Fix: model productivity curves for new hires and new assignments; new resources are not 100% productive from day one.

## Quality Indicators

- **Resource Plan Coverage**: % of active and planned projects with resource requirements documented in the capacity model (target: 100% above defined project size threshold).
- **Overallocation Rate**: % of planned resources with utilization >100% in the next 90 days — signals unsustainable commitments requiring immediate action.
- **Resource Request Lead Time**: Average days from resource need identification to resource confirmed and onboarded — shorter lead times indicate better demand visibility.
- **Skill Match Rate**: % of project resource assignments where the assigned person's skills match the stated requirements (target: >90%).
- **Utilization Variance**: Actual utilization vs. planned utilization per period — high variance signals poor demand estimation or priority changes not reflected in plans.
- **Bench Rate Trend**: % of total workforce on bench month-over-month — rising bench rate signals demand shortfall or project delays.
- **Resource Conflict Resolution Time**: Average days from conflict identification to resolution decision — long times signal governance or decision authority issues.

## Collaboration Touchpoints

- **With Project Manager**: Quality looks like resource requirements defined at project planning (not during execution), resource conflicts escalated with lead time for resolution, and actual resource usage reported for plan accuracy.
- **With Finance Manager**: Quality looks like headcount plans translated into personnel cost forecasts, contractor spend tracked against budget, and resource utilization data informing cost variance explanations.
- **With HR / Talent Acquisition**: Quality looks like hiring forecasts based on resource gap analysis (skills, timing, quantity), open requisitions aligned to demand pipeline, and new hire start dates coordinated with project needs.
- **With Portfolio Manager**: Quality looks like portfolio capacity model built on resource planner data, portfolio priority decisions informed by resource constraint analysis, and reallocation decisions made with portfolio context.
