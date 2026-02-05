# Research Methodologies

Detailed guide to research approaches, data gathering techniques, and quality standards.

## Methodology Selection

### Choosing the Right Approach

The research question determines the methodology. Match the question type to the approach:

| Question Type | Recommended Methodology | Example Question |
|--------------|------------------------|------------------|
| "What is happening?" | Descriptive / Exploratory | What tools does the team currently use? |
| "How much / how many?" | Quantitative survey or analytics | How many users complete onboarding? |
| "Why does this happen?" | Qualitative interviews or case study | Why do users abandon the checkout flow? |
| "Which option is better?" | Comparative analysis or A/B test | Which architecture handles scale better? |
| "What will happen if?" | Predictive modeling or scenario analysis | What is the projected load at 10x users? |
| "What should we do?" | Decision analysis or framework evaluation | Which vendor best fits our requirements? |

### Methodology Spectrum

Methodologies range from exploratory to confirmatory:

1. **Exploratory** - Open-ended discovery when the problem space is unclear
   - Stakeholder interviews, observation, brainstorming sessions
   - Output: Hypotheses, themes, initial frameworks

2. **Descriptive** - Characterize the current state with specifics
   - Surveys, document analysis, metrics review, inventory audits
   - Output: Baseline data, current state maps, gap analysis

3. **Analytical** - Investigate relationships and root causes
   - Comparative analysis, correlation studies, root cause analysis
   - Output: Causal models, prioritized factors, recommendations

4. **Evaluative** - Assess options against defined criteria
   - Weighted scoring, trade-off analysis, proof of concept testing
   - Output: Ranked options, decision matrices, selection rationale

5. **Predictive** - Forecast outcomes based on data and models
   - Trend analysis, scenario planning, simulation
   - Output: Projections, risk assessments, contingency plans

## Data Gathering Techniques

### Primary Data (Collected Firsthand)

**Interviews**
- Best for: Deep understanding, nuanced perspectives, complex topics
- Format: Semi-structured (prepared questions with room for follow-up)
- Sample size: 5-12 participants per stakeholder group
- Duration: 30-60 minutes per interview
- Documentation: Notes during, detailed write-up within 24 hours
- Key principle: Ask open-ended questions; avoid leading the respondent

**Surveys**
- Best for: Broad input, quantifiable opinions, large populations
- Format: Mix of closed (Likert scale, multiple choice) and 1-2 open questions
- Sample size: Aim for 30+ responses for statistical relevance
- Distribution: Email, embedded in tools, or meeting follow-ups
- Key principle: Keep under 10 minutes; pilot test before wide distribution

**Observation**
- Best for: Understanding actual behavior vs. reported behavior
- Format: Structured observation with a checklist or open field notes
- Duration: Observe at least 3 instances of the process or behavior
- Key principle: Minimize observer effect; record without interpreting during observation

**Workshops and Focus Groups**
- Best for: Collaborative problem exploration, generating ideas, building consensus
- Format: Facilitated session with structured activities
- Group size: 4-8 participants per session
- Duration: 60-120 minutes
- Key principle: Ensure psychological safety; capture all ideas before evaluating

### Secondary Data (Existing Sources)

**Internal Sources**
- Documentation: Architecture docs, process guides, meeting notes
- Analytics: Usage metrics, performance dashboards, error logs
- Records: Project histories, post-mortems, decision logs
- Artifacts: Code repositories, configuration files, test suites

**External Sources**
- Industry reports and benchmarks
- Academic papers and technical publications
- Vendor documentation and case studies
- Community forums and knowledge bases
- Regulatory and compliance standards

### Data Quality Checklist

Before relying on any data source, verify:

- [ ] **Relevance**: Does this data directly address the research question?
- [ ] **Recency**: Is the data current enough to be applicable?
- [ ] **Reliability**: Is the source trustworthy and the collection method sound?
- [ ] **Completeness**: Does the data cover the full scope, or are there gaps?
- [ ] **Bias**: Are there known biases in how the data was collected or reported?
- [ ] **Accessibility**: Can the data be obtained within the research timeline?

## Analysis Frameworks

### Thematic Analysis (for Qualitative Data)

1. Familiarize yourself with the data (read all transcripts/notes)
2. Generate initial codes (label meaningful segments)
3. Search for themes (group codes into broader patterns)
4. Review themes (check against data, refine or merge)
5. Define and name themes (clear, concise labels)
6. Write up findings (theme by theme with supporting evidence)

### Comparative Analysis (for Evaluative Research)

1. Define evaluation criteria (from stakeholder requirements)
2. Weight criteria by importance (use pairwise comparison if needed)
3. Score each option against each criterion (use consistent scale)
4. Calculate weighted scores
5. Conduct sensitivity analysis (does the ranking change if weights shift?)
6. Document rationale for each score

### Gap Analysis

1. Define the desired future state (based on objectives)
2. Document the current state (based on research findings)
3. Identify gaps (where current falls short of desired)
4. Prioritize gaps by impact and feasibility
5. Recommend actions to close each gap

## Research Quality Standards

### Rigor Criteria

| Criterion | Definition | How to Achieve |
|-----------|-----------|----------------|
| Credibility | Findings accurately represent reality | Triangulate sources, member-check findings |
| Transferability | Findings apply beyond the specific context | Document context thoroughly, identify boundary conditions |
| Dependability | Findings are consistent and reproducible | Document methodology, maintain audit trail |
| Confirmability | Findings are based on data, not researcher bias | Use evidence quotes, have peer review |

### Common Pitfalls and Mitigations

- **Confirmation bias** (seeking supporting data) - Actively seek disconfirming evidence
- **Sampling bias** (only vocal stakeholders) - Use structured protocols and diverse sources
- **Anchoring** (over-weighting first data point) - Review findings in varied order
- **Recency bias** (over-weighting latest info) - Weight by relevance, not recency
- **Scope creep** (expanding question mid-study) - Define scope before gathering data; maintain a decision log
