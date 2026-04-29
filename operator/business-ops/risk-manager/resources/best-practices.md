# Best Practices: Risk Manager

> Design principles, patterns, and frameworks that guide high-quality enterprise risk identification, threat assessment, mitigation strategy development, and business continuity planning work.

## Design Principles

- **Risk Is Everywhere; Management Is About Priority**: Organizations cannot eliminate all risk — the goal is to identify which risks require active management and invest proportionally to their probability and impact.
- **Quantify Uncertainty, Don't Eliminate It**: Risk management doesn't require certainty about the future; it requires honest, quantified uncertainty — ranges and probabilities are more useful than false precision.
- **Risk Appetite Must Be Explicit**: Organizations make implicit risk bets continuously — making risk appetite explicit (how much of which risks will we accept?) enables consistent, defensible decisions.
- **Connected Risk View**: Individual risks do not exist in isolation — correlations, cascades, and compound scenarios (multiple risks materializing together) create tail risks that single-risk analysis misses.
- **First Line Owns Risk; Second Line Enables**: Business operations (first line) own and manage risks in their domain; risk management (second line) provides frameworks, challenges, and oversight — not proxy risk ownership.
- **Residual Risk After Controls**: Assess risk after existing controls are considered (residual risk), not just inherent risk — controls that don't work don't reduce real exposure.
- **Business Continuity Is Risk Made Operational**: Risk identification without recovery planning is incomplete — every significant risk requires a plan for what happens when it materializes.

## Key Patterns & Frameworks

- **Risk Register**: Living inventory of identified risks with probability, impact, risk rating, owner, mitigation actions, and residual risk. Apply as the primary risk management artifact; review and update monthly.
- **Risk Matrix (Probability × Impact)**: 5×5 (or 3×3) heat map plotting risks by likelihood and consequence. Apply to prioritize risks for mitigation investment and communicate risk profile to leadership.
- **COSO ERM Framework**: Enterprise Risk Management framework covering governance, strategy, performance, review, and information/communication. Apply as the organizational structure for a comprehensive ERM program.
- **ISO 31000**: International standard for risk management principles, framework, and process. Apply as the methodology baseline for risk identification, assessment, treatment, and monitoring.
- **Monte Carlo Simulation**: Probabilistic simulation running thousands of scenarios with varying risk inputs to produce outcome distributions. Apply to quantify financial risk exposure ranges rather than single-point estimates.
- **Bow-Tie Analysis**: Visual risk model showing threat sources → risk event (the bow) → consequence pathways, with controls on both sides. Apply for high-consequence risks where both prevention and response controls must be mapped.
- **Scenario Analysis (Risk)**: Construction of specific plausible adverse scenarios (not just probability-weighted averages) to test organizational resilience. Apply for strategic and catastrophic risks where historical data is limited.
- **RCSA (Risk and Control Self-Assessment)**: Process where business units identify and assess their own risks and controls. Apply to build first-line risk ownership and supplement top-down risk identification.
- **Business Impact Analysis (BIA)**: Assessment of which business processes are most critical and what downtime (RTO/RPO) would be acceptable for each. Apply as the foundation for business continuity planning.
- **BCP / DRP (Business Continuity / Disaster Recovery Plan)**: Documented procedures for maintaining or restoring business operations when significant disruptions materialize. Apply — every significant risk must have a corresponding response plan.

## Domain Concepts & Terminology

### Risk Concepts
- **Inherent Risk**: Risk exposure before considering any controls — the natural level of risk in a process or activity
- **Residual Risk**: Risk exposure remaining after controls are applied — the actual risk the organization accepts
- **Risk Appetite**: Level and type of risk an organization is willing to accept in pursuit of its objectives
- **Risk Tolerance**: Acceptable variation in outcomes relative to the objective — the operational implementation of appetite
- **Risk Universe**: Comprehensive inventory of all potential risks relevant to the organization
- **Emerging Risk**: Risk that is new, evolving, or previously underestimated — requires monitoring before it becomes material

### Risk Categories
- **Strategic Risk**: Risks to organizational objectives from competitive, regulatory, or market changes
- **Operational Risk**: Risk of loss from failed processes, people, systems, or external events affecting operations
- **Financial Risk**: Exposure to adverse financial outcomes (credit, liquidity, market, currency risks)
- **Compliance Risk**: Risk of regulatory penalties, legal liability, or reputational damage from non-compliance
- **Reputational Risk**: Risk of damage to brand, stakeholder trust, or public perception
- **Technology / Cyber Risk**: Risk from technology failures, cyber attacks, data breaches, or obsolescence

### Risk Assessment
- **Probability / Likelihood**: Estimated chance a risk event will materialize (often expressed as %, or 1-5 ordinal scale)
- **Impact / Severity**: Estimated magnitude of consequence if the risk materializes (financial, operational, reputational)
- **Risk Rating**: Combined score (Probability × Impact) used to prioritize risks — typically expressed as High/Medium/Low
- **Key Risk Indicator (KRI)**: Leading metric whose movement signals increasing risk — monitored to provide early warning before risk materializes

### Business Continuity
- **BCP (Business Continuity Plan)**: Documented plan ensuring critical business functions continue during and after a disruption
- **DRP (Disaster Recovery Plan)**: IT-focused procedures for recovering systems and data after a technology disruption
- **RTO (Recovery Time Objective)**: Maximum acceptable time to restore a business function after disruption
- **RPO (Recovery Point Objective)**: Maximum acceptable data loss (measured in time) from a disruption
- **BIA (Business Impact Analysis)**: Assessment of criticality, dependencies, and acceptable downtime for each business function

## Anti-Patterns to Avoid

- **Risk Register Theater**: Maintaining a risk register that is created at project kickoff and never updated. Fix: require monthly risk register reviews; risks that haven't been updated in 60 days are either resolved or unmanaged.
- **Symmetric Risk Focus**: Treating all risks equally regardless of probability and impact, spreading attention thin. Fix: apply Pareto principle — focus 80% of risk management energy on the top 20% of risks by risk rating.
- **Mitigation Without Monitoring**: Defining risk mitigations but not tracking whether they're implemented or effective. Fix: every mitigation action has an owner, deadline, and effectiveness measure — track in risk register.
- **Single-Point Scenarios**: Risk assessment producing single-point estimates of impact rather than ranges. Fix: require ranges (best/likely/worst) for all significant risk impacts; ranges are more honest and more useful than false precision.
- **No Response Planning**: Identifying significant risks without documenting what the organization will do if they materialize. Fix: every High and Critical risk must have a documented response plan with activation triggers.
- **Risk Ownership Vacuum**: Risks in the risk register with no named owner — nobody is monitoring or managing them. Fix: every risk must have a named owner accountable for monitoring triggers and executing mitigations.
- **Silo Risk Management**: Each department manages its risks independently without sharing information about correlated risks. Fix: conduct cross-functional risk reviews quarterly; compound scenarios (multiple risks materializing together) require integrated assessment.

## Quality Indicators

- **Risk Register Currency**: % of risk register entries updated within the last 30 days (target: 100% for High/Critical risks; >80% for Medium).
- **Risk Owner Coverage**: % of risk register entries with a named, active owner (target: 100%).
- **Mitigation Implementation Rate**: % of planned mitigation actions completed on schedule (target: >80%).
- **KRI Threshold Breach Rate**: % of Key Risk Indicators that have breached early warning thresholds — rising rate signals emerging risk concentration.
- **BCP Test Frequency**: Number of business continuity plan tests conducted per year (target: annual minimum for critical functions; more frequent for high-risk scenarios).
- **Risk Escalation Timeliness**: Average hours from risk trigger to escalation to appropriate decision authority — delayed escalation is the most common contributor to manageable risks becoming crises.
- **Emerging Risk Identification Lag**: Average time between an emerging risk becoming observable and its documentation in the risk register — shorter lag indicates better environmental scanning.

## Collaboration Touchpoints

- **With Operations Manager**: Quality looks like operational risk embedded in process design (not bolted on), KRIs linked to operational metrics, and risk response plans integrated into operational contingency procedures.
- **With Strategic Planner**: Quality looks like strategic risk assessment informing strategic option evaluation, scenario analysis testing strategy against plausible adverse futures, and risk appetite defined at the strategic level.
- **With Project Manager**: Quality looks like project risk register consistent with enterprise risk framework, high-severity project risks escalated to enterprise risk management, and BCP requirements incorporated into project delivery plans.
- **With Finance Manager**: Quality looks like financial risk quantification supporting financial forecasting (ranges, sensitivity), insurance and risk transfer decisions evaluated with financial modeling, and risk-adjusted return used in investment analysis.
