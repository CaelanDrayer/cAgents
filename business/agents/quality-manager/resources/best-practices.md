# Best Practices: Quality Manager

> Design principles, patterns, and frameworks that guide high-quality quality management system design, QA process management, Six Sigma implementation, and continuous improvement coordination.

## Design Principles

- **Quality Is Built In, Not Inspected In**: Moving quality controls upstream to prevent defects is 10x cheaper than detecting and correcting them downstream — prevention is the strategy.
- **Customer Definition of Quality**: Quality is conformance to customer requirements, not internal specifications — periodically validate that your internal standards still reflect what customers actually value.
- **Data-Driven Quality Decisions**: Quality decisions based on data and measurement outperform those based on judgment or anecdote — invest in measurement systems before improvement programs.
- **Everyone Owns Quality**: Quality is not the quality department's responsibility — it is every employee's, supported by a management system that makes it easier to do things right than wrong.
- **Process Stability Before Improvement**: Attempting to improve an unstable, unpredictable process produces misleading results — stabilize first (control chart in-control), then optimize.
- **Root Cause, Not Symptom**: Correcting symptoms produces recurrence; eliminating root causes produces sustained improvement — never close a corrective action without confirmed root cause.
- **Continuous Improvement Is a System, Not a Project**: Kaizen is a management philosophy — point improvements without a sustaining system drift back to baseline.

## Key Patterns & Frameworks

- **ISO 9001:2015 QMS**: International standard for quality management systems covering customer focus, leadership, planning, support, operation, performance evaluation, and improvement. Apply as the governance framework for comprehensive quality programs.
- **Six Sigma DMAIC**: Define → Measure → Analyze → Improve → Control. Apply to complex quality problems requiring statistical rigor and sustained control.
- **Total Quality Management (TQM)**: Organization-wide philosophy that quality is everyone's responsibility, driven by customer focus, process thinking, continuous improvement, and fact-based management.
- **Statistical Process Control (SPC)**: Control charts monitoring process output over time with statistically defined control limits. Apply to distinguish assignable causes (requiring investigation) from common cause variation (requiring process redesign).
- **Failure Mode and Effects Analysis (FMEA)**: Proactive tool identifying potential failure modes, their causes, effects, and current controls. Apply before process launch to design in error prevention.
- **7 Quality Tools (Basic)**: Check sheet, control chart, Pareto chart, fishbone diagram, histogram, scatter diagram, flowchart. Apply as diagnostic tools for quality problem investigation.
- **Measurement System Analysis (MSA / Gauge R&R)**: Statistical assessment of whether the measurement system contributes excessive variation relative to the process variation being measured. Apply before using measurement data for quality decisions.
- **Corrective Action and Preventive Action (CAPA)**: Structured process for identifying, analyzing, correcting, and preventing quality problems. Apply to every significant defect; close only when root cause is confirmed and fix is validated.
- **Quality Audit (Internal)**: Systematic examination of quality system effectiveness by internal auditors independent of the audited area. Apply quarterly to confirm QMS compliance and identify improvement opportunities.
- **Supplier Quality Management**: Extend quality standards to the supply chain through supplier qualification, audit, scorecard, and development programs.

## Domain Concepts & Terminology

### Quality Management System
- **QMS (Quality Management System)**: Formalized framework of policies, processes, and documentation governing quality within an organization
- **Quality Policy**: Top management's overall intentions and direction for quality — the statement of commitment
- **Quality Objective**: Specific, measurable quality target derived from the quality policy
- **Process Owner**: Individual accountable for a defined process's performance, documentation, and improvement
- **Document Control**: Governance of quality system documents (creation, review, approval, version, distribution, archival)
- **Record**: Evidence that a process was performed as required — critical for audit and traceability

### Statistical Quality
- **Control Chart (X-bar/R, p, np, c, u)**: Statistical chart monitoring process stability — must select chart type based on data type (continuous vs. discrete) and subgroup size
- **Upper/Lower Control Limits (UCL/LCL)**: Statistically calculated bounds (±3σ from centerline) — points outside are special causes requiring investigation
- **Process Capability (Cp, Cpk)**: Measures of how well process output fits within specification limits — Cpk ≥ 1.33 generally required for capable process
- **Sigma Level**: Statistical quality measure — 3-sigma process has ~66,807 DPMO; 6-sigma has 3.4 DPMO
- **Common Cause Variation**: Normal, random variation in a stable process — reduced through process redesign, not individual interventions
- **Special Cause Variation**: Non-random variation with an assignable cause — investigated and eliminated to restore process control

### Defect Management
- **Defect**: Unit of output failing to meet specified requirements
- **DPMO (Defects Per Million Opportunities)**: Normalized quality metric enabling comparison across processes
- **First Pass Yield (FPY)**: % of units completing the process without rework or defect on first attempt
- **Rolled Throughput Yield (RTY)**: FPY multiplied across sequential process steps — represents probability a unit passes all steps without defect
- **Nonconformance Report (NCR)**: Formal documentation of a unit failing to meet requirements, triggering CAPA
- **Disposition**: Decision about how to handle nonconforming material (rework, scrap, use-as-is, return to supplier)

### Improvement
- **CAPA (Corrective and Preventive Action)**: Formal quality system process for identifying, investigating, correcting, and preventing quality problems
- **Root Cause Analysis (RCA)**: Investigation to identify the fundamental cause of a quality problem — required before CAPA can be effective
- **Effectiveness Review**: Verification that a corrective action actually prevented recurrence of the problem — closes the CAPA cycle
- **Kaizen**: Continuous improvement philosophy — incremental improvements by all employees, every day

## Anti-Patterns to Avoid

- **Inspection-Dependent Quality**: Relying on end-of-line inspection to catch defects rather than preventing them in the process. Fix: move controls upstream; add poka-yoke and in-process controls at defect creation points.
- **Metric Gaming**: Teams optimize quality metrics without improving actual quality (e.g., reducing defect count by reclassifying defects, not eliminating them). Fix: audit metric definitions and counting methods; validate that metric trends correlate with customer outcomes.
- **CAPA Without Root Cause**: Closing corrective actions when a fix has been implemented, without confirming the fix actually addresses the root cause. Fix: require effectiveness reviews 30-90 days after implementation to confirm recurrence prevention.
- **Audit Theater**: Conducting quality audits that find nothing because auditors only check what they know will pass. Fix: use risk-based audit sampling; train auditors to probe rather than confirm; track defect-to-audit-finding correlation.
- **Quality Silo**: Quality team owns quality independently from operations — when quality "passes" their inspection, it's operations' problem. Fix: embed quality ownership in operations; quality team provides standards, tools, and coaching, not inspection and policing.
- **Specification Drift**: Process specifications updated to reflect current (degraded) process capability rather than customer requirements. Fix: specifications must trace to customer requirements; process capability must chase the spec, not the reverse.
- **Improvement Without Sustaining**: Kaizen events or improvement projects produce measurable gains that drift back to baseline within 90 days. Fix: every improvement must include a sustaining plan (updated SOP, metrics, audit schedule, management review).

## Quality Indicators

- **First Pass Yield (FPY)**: % of units produced without rework — rising FPY indicates upstream quality improvement.
- **Customer Defect Rate**: Defects reaching customers per unit shipped — ultimate quality outcome measure.
- **CAPA Closure Rate**: % of open CAPA items closed within the defined response timeline (target: >90% on time).
- **CAPA Effectiveness Rate**: % of closed CAPAs where effectiveness review confirmed no recurrence (target: >85%).
- **Internal Audit Finding Rate**: Number of findings per audit — track trend; declining rate with maintained audit rigor indicates QMS improvement.
- **Repeat Finding Rate**: % of audit findings that appeared in prior audit cycles (target: <10%) — measures whether corrective actions are genuine.
- **Supplier Quality Rate**: % of supplier deliveries meeting quality requirements — monitors supply chain quality performance.

## Collaboration Touchpoints

- **With Operations Manager**: Quality looks like quality standards integrated into operational SOPs, quality metrics visible in operational dashboards, and quality improvement priorities aligned to operational goals.
- **With Process Improvement Specialist**: Quality looks like improvement projects addressing root causes of quality defects, SPC applied to sustain quality improvements post-project, and defect data informing improvement prioritization.
- **With Process Auditor**: Quality looks like audit findings feeding the CAPA system, quality control evidence maintained for auditability, and audit schedules coordinated to avoid coverage gaps or duplication.
- **With Supply Chain Manager**: Quality looks like supplier quality requirements incorporated in supplier contracts, incoming quality inspection protocols aligned with supply risk, and supplier development plans targeting quality performance gaps.
