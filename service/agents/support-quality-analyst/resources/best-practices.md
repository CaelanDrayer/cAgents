# Best Practices: Support Quality Analyst

> Design principles, patterns, and frameworks that guide high-quality support interaction auditing, scoring, and agent coaching work.

## Design Principles

- **Calibration Before Scoring**: Quality rubrics only produce comparable results when all analysts score consistently; invest heavily in calibration sessions before deploying a new rubric
- **Coaching Over Judging**: Quality reviews exist to improve performance, not to catch agents making mistakes; the mindset and framing of feedback determines whether agents engage or disengage
- **Specific and Actionable Feedback**: "Your tone was off" is not actionable; "The customer expressed frustration in message 3, and your response acknowledged the issue without acknowledging the frustration" is actionable
- **Sampling Representativeness**: A sample that overrepresents complaints or escalations produces a biased quality picture; ensure samples reflect the actual ticket distribution
- **Trend Identification Is the Point**: Individual ticket scores are less valuable than the patterns they reveal — where are agents systematically falling short, and why?
- **Recognition Alongside Correction**: Quality programs that only identify deficiencies create defensiveness; balance feedback with recognition of high-quality interactions
- **Quality Data Drives Training Prioritization**: Quality scores by skill area should determine what training gets developed and delivered; disconnected training wastes resources

## Key Patterns & Frameworks

- **Quality Rubric Design**: Four-dimension framework (Accuracy, Communication, Resolution, Efficiency) with weighted scoring; each dimension has specific behavioral criteria that allow consistent scoring without subjective interpretation
- **Calibration Session Protocol**: Analysts independently score the same ticket, compare scores, identify discrepancies, discuss root causes, agree on correct scoring, and update rubric guidance; run monthly, especially after rubric changes
- **Representative Sampling Methodology**: Stratified random sample ensuring proportional representation of ticket types, channels, priority levels, and agent tenure; 5-10 tickets per agent per week minimum
- **Coaching Feedback Framework**: Positive reinforcement (what worked well) → Opportunity (specific behavior to change) → How (concrete alternative approach) → Expectation (what good looks like) → Check-in date
- **Skill Gap Heat Map**: Aggregate quality scores by dimension across all agents to identify where teams are systematically weak; drives training prioritization
- **Customer Correlation Analysis**: Cross-reference quality scores against CSAT for the same interactions; identifies which quality dimensions have the strongest impact on customer satisfaction
- **Performance Tier Management**: Excellent (90-100) → Good (80-89) → Needs Improvement (70-79) → Below Standard (<70); each tier has defined support escalation — recognition, standard coaching, intensive coaching, escalation to manager
- **Trend Line Monitoring**: Track each agent's quality score trend over rolling 4-8 week period; rising trend with initial low performance is progress; declining trend from high performance is an early warning

## Domain Concepts & Terminology

### Quality Program
- **Quality Rubric**: Scoring framework with defined dimensions, criteria, and weights; foundation for consistent evaluation
- **Calibration**: Process of aligning analyst scoring through joint review and discussion; ensures scores are comparable across analysts and time
- **Quality Sampling**: Representative selection of tickets for evaluation; sample size and representativeness determine statistical validity
- **Blind Scoring**: Scoring tickets without knowing the agent's historical performance or identity; reduces unconscious bias
- **Inter-Rater Reliability**: Statistical measure of consistency between different analysts scoring the same interaction; target κ > 0.7 (Cohen's kappa)

### Scoring Dimensions
- **Accuracy (30 points)**: Correct understanding of the issue, correct information provided, correct solution offered
- **Communication (30 points)**: Clarity of explanation, appropriate tone and empathy, grammar and professionalism
- **Resolution (25 points)**: Thoroughness, completeness of documentation, appropriate follow-through
- **Efficiency (15 points)**: Handle time relative to complexity, appropriate use of knowledge base, minimal unnecessary back-and-forth

### Coaching
- **1-on-1 Coaching Session**: Individual meeting between quality analyst and agent to review scored interactions and develop improvement plan
- **Coaching Note**: Written record of coaching session including tickets reviewed, feedback given, and development commitment
- **Performance Improvement Plan (PIP)**: Formal structured plan for agents consistently below quality thresholds; defines improvement targets, support provided, and consequences
- **Positive Recognition**: Formal acknowledgment of interactions scoring in the excellent tier; shared with team or management as exemplar

### Analytics
- **Quality Trend**: Direction and rate of change in quality scores over time; more meaningful than point-in-time scores
- **CSAT-Quality Correlation**: Statistical relationship between quality scores and customer satisfaction ratings for same interactions
- **Skill Gap Analysis**: Identification of dimensions where team or individual scores are systematically below target
- **Training Needs Assessment**: Systematic identification of learning objectives based on quality gap analysis

## Anti-Patterns to Avoid

- **Uncalibrated Scoring**: Different analysts scoring the same interaction differently; produces unfair agent comparisons and undermines program credibility
- **Complaint-Biased Sampling**: Over-sampling escalations and complaint tickets; produces pessimistic quality picture that doesn't represent the full interaction portfolio
- **Vague Feedback**: Providing quality scores without specific behavioral feedback; agents can't improve without knowing exactly what to change
- **Quality-Only Coaching**: Focusing solely on low scores and improvement areas without recognizing excellent work; creates adversarial agent relationship with the quality program
- **Rubric Rigidity**: Applying rubric criteria mechanically without accounting for context; a longer handle time on a complex emotional interaction may be quality service, not inefficiency
- **Disconnected Training**: Running training programs based on perceived needs rather than quality data; training priorities should flow directly from quality score gap analysis
- **Score Inflation**: Rating agents favorably to avoid difficult coaching conversations; inflated scores prevent improvement and corrupt the data used for management decisions

## Quality Indicators

- **Calibration Score Variance <5 Points**: Analysts scoring the same interaction within a 5-point range indicates reliable calibration
- **Sampling Coverage**: Each agent evaluated weekly with representative ticket distribution
- **Coaching Completion Rate**: All below-standard agents receiving 1-on-1 coaching sessions within the week of scoring
- **Quality Score Improvement Rate**: Percentage of agents in "Needs Improvement" tier who advance to "Good" tier within 4 weeks of coaching
- **CSAT Alignment**: Quality scores correlating positively with CSAT for the same interactions
- **Recognition Rate**: Percentage of quality reviews where excellent-tier interactions are formally recognized
- **Feedback Specificity**: All coaching notes containing specific behavior examples and concrete improvement suggestions

## Collaboration Touchpoints

- **With Support Supervisor**: Deliver weekly quality scores and coaching summaries; supervisor handles performance management while quality analyst provides the objective assessment data
- **With Support Trainer**: Share quality gap analysis to drive training curriculum priorities; training content should directly address the skill areas where quality data shows systematic weakness
- **With Support Operations Manager**: Report on quality trends by team and channel; quality data informs routing, staffing, and process decisions
- **With Support Analyst**: Coordinate on CSAT-quality correlation analysis; combining quality scores with customer satisfaction data produces richer insights than either alone
