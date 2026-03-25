# Best Practices: Project Manager

> Design principles, patterns, and frameworks that guide high-quality project planning, scope management, timeline creation, resource allocation, and risk management work.

## Design Principles

- **Scope Clarity Before Commitment**: Never commit to a timeline or budget without a clear, agreed scope definition — the Iron Triangle (scope, time, cost) is fixed only when scope is fixed.
- **Plans Are Not Reality — They Are a Tool for Managing Reality**: Plans will change; the purpose of planning is not to predict the future but to create a structure for detecting and managing deviations.
- **Risk Management Is Proactive, Not Reactive**: Identifying risks before they materialize costs 10x less than managing incidents after they occur — risk management is daily discipline, not a one-time exercise.
- **Communication Is Half the Job**: Project failures are frequently communication failures — clarity on status, risks, and decisions must flow upward, downward, and across continuously.
- **Decisions Need Owners**: Action items and decisions without named owners are wishes, not commitments — every meeting must produce clear ownership.
- **The Schedule Is a Stakeholder Alignment Tool**: The project schedule is the most important communication artifact — it makes commitments visible and provides the basis for honest conversations when reality diverges.
- **Change Control Protects the Budget**: Scope additions accepted without formal change control erode the budget and timeline invisibly until the project fails visibly.

## Key Patterns & Frameworks

- **Work Breakdown Structure (WBS)**: Hierarchical decomposition of all project work into manageable components with deliverables at each level. Apply as the foundation for scheduling, budgeting, and resource assignment.
- **Critical Path Method (CPM)**: Identify all task dependencies → calculate earliest/latest start/finish → determine the critical path (zero float). Apply to identify which tasks cannot slip without delaying the project end date.
- **Gantt Chart**: Bar chart visualizing task schedule against a calendar timeline with dependencies shown. Apply for stakeholder communication and milestone tracking.
- **Risk Register**: Living document cataloging identified risks with probability, impact, owner, and mitigation plan. Apply from project initiation and review weekly — risks change throughout the project lifecycle.
- **RACI Matrix**: Responsible, Accountable, Consulted, Informed — role clarity framework for every major project deliverable and decision. Apply at project kickoff to prevent accountability gaps and confusion.
- **Earned Value Management (EVM)**: Planned Value, Earned Value, Actual Cost → Schedule Performance Index (SPI), Cost Performance Index (CPI). Apply to projects where objective performance measurement against plan is required.
- **Stakeholder Register**: Documented inventory of all stakeholders with their interest, influence, communication needs, and current attitude. Apply to plan engagement strategies and prevent surprise opposition.
- **Issue Log**: Active tracking of current project issues (not risks — issues are current problems) with owner, priority, and resolution target. Apply daily in active projects.
- **Change Control Process**: Formal evaluation, approval, and communication of scope/budget/timeline changes. Apply to every proposed change above defined threshold; no change without documented approval.
- **Lessons Learned / Retrospective**: Structured debrief at project completion and key milestones capturing what worked, what didn't, and what to do differently. Apply after every project; share with PM community.
- **PRINCE2**: Project management methodology with defined stages, roles (Project Board, Project Manager, Team Manager), and governance gates. Apply in regulated environments or organizations using this standard.

## Domain Concepts & Terminology

### Project Structure
- **Project Charter**: Foundational document authorizing the project and defining its objectives, scope, stakeholders, and PM authority
- **Project Scope Statement**: Detailed description of what the project will and will not deliver — the reference for change control
- **Deliverable**: Tangible or intangible output produced by the project — the unit of scope definition
- **Milestone**: Significant project event with a specific date — used for external commitments and stage gate evaluations
- **Work Package**: Lowest level of the WBS — assigned to a team, with defined scope, duration, and resource requirements

### Scheduling
- **Critical Path**: Longest dependency chain through the network — determines minimum project duration
- **Float / Slack**: Time a non-critical task can be delayed without affecting the project end date
- **Task Dependencies (FS, SS, FF, SF)**: Finish-to-Start (most common), Start-to-Start, Finish-to-Finish, Start-to-Finish
- **Baseline Schedule**: Approved project schedule used as the reference for variance measurement
- **Schedule Variance (SV)**: Earned Value minus Planned Value — positive indicates ahead of schedule; negative indicates behind

### Budget & Cost
- **Project Budget**: Approved cost baseline for the project including all work packages, contingency, and management reserve
- **Cost Variance (CV)**: Earned Value minus Actual Cost — positive indicates under budget; negative indicates over budget
- **CPI (Cost Performance Index)**: Earned Value ÷ Actual Cost — CPI > 1.0 means costs are under control
- **Contingency Reserve**: Budget held for identified risks — drawn from when a risk materializes
- **Management Reserve**: Budget held for unknown risks (surprises) — requires formal change control to access

### Risk & Issues
- **Risk**: Potential future event that may positively or negatively affect project objectives
- **Issue**: Current problem already affecting the project — requires active management, not just monitoring
- **Risk Mitigation**: Actions taken before a risk materializes to reduce its probability or impact
- **Risk Response**: Strategies for addressing risks (avoid, transfer, mitigate, accept)
- **Trigger**: Warning signal indicating a risk is about to materialize — enables faster, cheaper response than waiting for the event

## Anti-Patterns to Avoid

- **Planning Fallacy**: Systematically underestimating task durations while overestimating productivity, producing schedules that are optimistic from day one. Fix: use reference class forecasting (how long did similar tasks take?); add structured buffer to critical path.
- **Gold Plating**: Team delivers features beyond agreed scope without change control, consuming budget and risking quality. Fix: enforce scope definition and change control; reward delivery of agreed scope, not extras.
- **Missing Risk Register**: Projects managed without a documented risk register, reacting to incidents instead of preventing them. Fix: require risk register from project kickoff; review weekly in status meetings.
- **Status Reporting vs. Managing**: Producing status reports that summarize past events without identifying decisions needed or escalating risks to stakeholders. Fix: every status report should include: current status, risks requiring attention, and decisions needed from stakeholders.
- **Scope Creep Without Change Control**: Accepting scope additions verbally or informally without evaluating impact or obtaining approval. Fix: train stakeholders on change control process; no scope addition without documented approval above defined threshold.
- **No Post-Mortem**: Completing the project and immediately starting the next without documenting lessons. Fix: mandate post-mortems within 2 weeks of project close; distribute lessons to PM community.
- **Estimation by Gut**: Producing project estimates without structured decomposition, reference data, or uncertainty quantification. Fix: always decompose to work package level before estimating; document assumptions; provide ranges not single points.

## Quality Indicators

- **Schedule Performance Index (SPI)**: Earned Value ÷ Planned Value — SPI ≥ 0.9 indicates the project is on track (EVM projects).
- **Cost Performance Index (CPI)**: Earned Value ÷ Actual Cost — CPI ≥ 0.9 indicates the project is within budget (EVM projects).
- **Milestone Achievement Rate**: % of committed milestones delivered on the committed date (target: >80%).
- **Risk Register Completeness**: % of identified risks with documented owner, mitigation plan, and current status (target: 100%).
- **Change Request Response Time**: Average days from change request submission to approved/rejected decision (target: <5 business days).
- **Issue Resolution Time**: Average days from issue opening to resolution — growing backlog signals escalation process failure.
- **Stakeholder Satisfaction**: Periodic sponsor/stakeholder survey rating PM communication, responsiveness, and project confidence (target: >4.0/5.0).

## Collaboration Touchpoints

- **With Resource Planner**: Quality looks like resource requirements defined before commitments are made, resource conflicts escalated with lead time for reallocation, and actual utilization reported for capacity model accuracy.
- **With Risk Manager**: Quality looks like project risks reviewed against enterprise risk register, high-severity project risks escalated to enterprise risk management, and risk mitigation strategies consistent with organizational risk appetite.
- **With Executive Sponsors**: Quality looks like decision-ready status reports (status, risks, decisions needed), not verbose project detail; escalations made with sufficient lead time for sponsors to act; realistic schedule and budget assessments without sandbagging.
- **With Agile Coach**: Quality looks like PM and Agile Coach roles clearly differentiated (PM owns external commitments and stakeholder management; Coach owns team process health), and sprint planning inputs (capacity, priorities) aligned with PM's commitment view.
