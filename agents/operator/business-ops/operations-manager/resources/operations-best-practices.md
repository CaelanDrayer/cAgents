> Sub-resource for mode `operations` — relocated verbatim from `agents/operator/business-ops/operations-manager/resources/best-practices.md` (zero-loss consolidation).

# Best Practices: Operations Manager

> Design principles, patterns, and frameworks that guide high-quality operations planning, process management, performance optimization, and continuous improvement work.

## Design Principles

- **Measure Before You Manage**: Every operational decision must be grounded in data — you can't improve what you don't measure, and you can't trust improvement claims without baseline metrics.
- **Eliminate Before Automating**: Automating a wasteful process creates faster waste. Map and eliminate non-value-adding steps before applying technology or additional resources.
- **Standardize to Scale**: Repeatable excellence requires documented, standardized processes — ad-hoc execution depends on heroic individuals and produces inconsistent outcomes.
- **The 80/20 of Operations**: 80% of operational problems typically originate from 20% of process steps, inputs, or operators — focus improvement energy where it creates disproportionate impact.
- **Constraints Govern Throughput**: The slowest step in any process determines total system output. Improving non-constraint steps is waste until the constraint is addressed.
- **Prevention Over Inspection**: Quality built into the process costs a fraction of quality checked at the end — move quality controls upstream toward root causes.
- **People Closest to the Work Know the Problems**: Frontline knowledge is the most valuable input for process improvement — involve operators in problem definition and solution design.

## Key Patterns & Frameworks

- **Lean Methodology**: Identify value → Map the value stream → Create flow → Establish pull → Pursue perfection. Apply to eliminate the 8 wastes (DOWNTIME: Defects, Overproduction, Waiting, Non-utilized talent, Transportation, Inventory, Motion, Extra-processing).
- **Six Sigma DMAIC**: Define → Measure → Analyze → Improve → Control. Structured problem-solving framework for reducing process variation and defect rates. Apply to complex quality problems with measurable outcomes.
- **Theory of Constraints (TOC)**: Identify constraint → Exploit constraint → Subordinate everything else → Elevate constraint → Find next constraint. Apply to maximize system throughput through bottleneck focus.
- **Value Stream Mapping (VSM)**: Visual representation of all steps (value-adding and non-value-adding) in delivering a product or service. Apply to identify waste, lead time reduction opportunities, and improvement priority.
- **Kaizen Events**: Focused 3-5 day intensive improvement workshops bringing together cross-functional teams to redesign a specific process. Apply for high-impact process changes requiring collaborative redesign.
- **Balanced Scorecard**: Financial + Customer + Internal Process + Learning & Growth perspectives. Apply to ensure operational improvements are balanced across dimensions rather than optimizing one at the expense of others.
- **RACI Matrix**: Responsible, Accountable, Consulted, Informed — role clarity tool for cross-functional processes. Apply when process ownership is unclear or handoffs are causing errors.
- **Control Chart (SPC)**: Statistical process control chart with upper/lower control limits. Apply to distinguish common cause variation (systemic) from special cause variation (assignable) — only special causes warrant immediate investigation.
- **Capacity Planning Model**: Demand forecast × Process time per unit + Buffer = Required capacity. Apply monthly to ensure resources are ahead of demand, not reactive to it.
- **OEE (Overall Equipment Effectiveness)**: Availability × Performance × Quality = OEE. Apply to manufacturing or production operations to identify equipment utilization improvement opportunities.

## Domain Concepts & Terminology

### Process Management
- **Process**: Repeatable sequence of activities transforming inputs into outputs with defined value for a customer
- **Process Owner**: Individual accountable for the end-to-end performance and improvement of a defined process
- **SOP (Standard Operating Procedure)**: Documented, step-by-step instructions for performing a process consistently
- **Process Map / Flowchart**: Visual representation of process steps, decision points, and handoffs
- **Swim Lane Diagram**: Process map showing which role or department is responsible for each step
- **Work Instruction**: Detailed guidance for performing a specific task within a process (more granular than SOP)

### Lean Concepts
- **Value-Added Activity**: Process step that transforms the product/service in a way the customer values and would pay for
- **Non-Value-Added Activity**: Process step consuming resources without creating customer value — eliminate or minimize
- **Necessary Non-Value-Added**: Steps required for regulatory, safety, or business control reasons despite not adding customer value — streamline but don't eliminate
- **Gemba Walk**: Going to where the work happens to observe processes directly — "go see" the reality, don't rely on reports
- **5S (Sort, Set in Order, Shine, Standardize, Sustain)**: Workplace organization methodology creating a clean, efficient, and safe environment

### Performance Metrics
- **Throughput**: Volume of outputs produced per unit of time
- **Cycle Time**: Time to complete one unit of output from start to finish
- **Lead Time**: Total time from order receipt to delivery (includes waiting time)
- **Takt Time**: Available production time ÷ Customer demand rate — the pace at which output must be produced to meet demand
- **Utilization Rate**: Actual output ÷ Maximum possible output — measure of capacity usage
- **First Pass Yield (FPY)**: % of units completing the process without defects or rework on the first attempt

### Quality & Improvement
- **DPMO (Defects Per Million Opportunities)**: Quality measure normalizing defect counts to a million-unit basis for comparison across processes
- **Sigma Level**: Statistical measure of process quality (6-sigma = 3.4 DPMO); guides improvement investment level
- **Root Cause Analysis (RCA)**: Structured investigation finding the fundamental cause of a problem, not just its symptoms
- **Corrective Action**: Elimination of the root cause of a detected nonconformity to prevent recurrence
- **Preventive Action**: Elimination of potential causes of nonconformities before they occur

## Anti-Patterns to Avoid

- **Automating Waste**: Implementing technology on a broken process without first eliminating non-value-added steps. Fix: map and improve the process first; automate only validated, stable steps.
- **Metric Theater**: Tracking many metrics and reporting them without using them to make decisions. Fix: select 5-7 key operational metrics that drive decisions; remove metrics that generate reports but no action.
- **Fire-Fighting Culture**: Operations run in constant reactive mode where heroes solve today's problems, never preventing tomorrow's. Fix: carve out structured time for proactive improvement; reward prevention, not heroics.
- **Ignoring Constraint**: Improving non-bottleneck steps while the constraint is not addressed — efficiency gains that don't improve throughput. Fix: identify the system constraint first; all improvement energy goes there.
- **Process Without Ownership**: SOPs documented but not maintained; nobody accountable for process health. Fix: assign explicit process owners with accountability for performance and improvement.
- **Change Without Measurement**: Implementing process changes without establishing baseline metrics to confirm improvement. Fix: measure before and after every change; without data, you can't distinguish improvement from variation.
- **Improvement Silos**: Process improvements made within one department without understanding upstream/downstream impact. Fix: use value stream mapping to scope all changes at the full process level.

## Quality Indicators

- **Process Adherence Rate**: % of process executions following the documented SOP (target: >95%) — gap signals training need or SOP inadequacy.
- **First Pass Yield**: % of outputs produced without rework on first attempt (target varies by process; improving trend is critical).
- **Cycle Time Reduction**: % decrease in process cycle time over rolling 12 months — measures improvement effectiveness.
- **Operational Cost per Unit**: Total process cost ÷ Output units — tracks efficiency over time and against benchmarks.
- **On-Time Delivery Rate**: % of outputs delivered to internal or external customers within committed timeframes (target: >95%).
- **Defect Rate (DPMO)**: Defects per million opportunities — enables comparison across processes of different sizes.
- **Improvement Initiative Completion Rate**: % of planned operational improvement projects completed within planned timeline — measures execution discipline.

## Collaboration Touchpoints

- **With Process Improvement Specialist**: Quality looks like improvement opportunities prioritized by impact and feasibility, Kaizen events scoped with clear current-state data, and improvement results measured against defined baselines.
- **With Finance Manager**: Quality looks like operational KPIs linked to financial outcomes (cost reduction, margin improvement), capital requests for process equipment supported with ROI calculations, and budget variance explained by operational root causes.
- **With Supply Chain Manager**: Quality looks like demand signals shared proactively to prevent inventory imbalances, supply disruptions escalated with impact assessment, and S&OP process running monthly with cross-functional inputs.
- **With Quality Manager**: Quality looks like quality standards integrated into process design (not inspected at the end), defect root causes addressed systematically, and quality metrics visible in operational dashboards.
