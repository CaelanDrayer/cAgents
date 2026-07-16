# Research / Scientific Domain

Designing a research study, experiment, or investigation — the unit of
work is a hypothesis tested against measurements, NOT a software system.

## When to pick this domain

Pick this domain when the user describes a design problem whose central
artifact is a study, experiment, or investigation:

- "design a study on caffeine and sleep latency"
- "design an A/B test for the new pricing page" (the experimental design,
  not the page itself — the page is software)
- "design a literature review protocol"
- "design a longitudinal cohort study on remote-work productivity"
- "design a measurement plan for our new onboarding metric"

Do NOT pick this domain for: building the analytics pipeline (Software),
designing the user-facing report (Creative or Software).

## Phase 1-3 framing

**Empathize**. Stakeholders are not "users". They are: the study population
(who you draw inferences about), the funder or PI (who approves and
budgets), the IRB / ethics board (who gates the study), and the
downstream readers (who consume the findings). The Empathize phase
should ask the designer to identify each of these four roles separately
before moving on.

**Define**. The problem statement is a *research question* — a falsifiable
claim with a measurable outcome. Constraints in this domain include:
sample size feasibility, statistical power, available measurement
instruments, ethical limits, time horizon, and cost per subject.
Success criteria are framed as effect-size detection thresholds and
acceptable error rates, not as "users can do X".

**Conceptualize**. Offer the user 2-4 standard methodological framings:
- *Randomized controlled* (manipulation + control group + random assignment)
- *Quasi-experimental* (manipulation, no random assignment — natural experiment)
- *Observational / correlational* (measurement only, no manipulation)
- *Mixed methods* (quant + qual synthesis)

The framing choice cascades into Phase 5: an RCT design needs power
analysis, an observational study needs confounder enumeration.

## Phase 5 questions

Refinement for this domain centers on methodology rigor. The designer
selects from these question templates (full set in
`../../templates/research_chunks.yaml`):

- "What is your primary hypothesis, stated in falsifiable form (X causes Y
  with effect size at least Z)?"
- "What is your unit of analysis (subject, session, observation, cluster),
  and how does that map to your statistical model?"
- "What independent variables will you manipulate or observe, and at what
  levels?"
- "What dependent variables will you measure, and with what instrument or
  procedure?"
- "How will you control or measure confounding variables (age, time-of-day,
  prior exposure, etc.)?"
- "What is your sample size, and what effect size + power does that buy
  you (e.g. 80% power to detect d=0.5 at alpha=0.05)?"
- "What is your analysis plan — pre-registered, or exploratory? Which
  statistical tests, and what corrections for multiple comparisons?"
- "What is your stopping rule? When do you decide the study is over —
  fixed N, sequential, futility?"
- "How will you handle missing data, outliers, and drop-outs?"
- "What ethical review applies, and who approves the protocol?"

## Phase 6 artifacts

For Research, Phase 6 emits:

| Artifact | Purpose |
|----------|---------|
| `study_protocol.md` | The methodological backbone: question, hypothesis, design, procedures |
| `analysis_plan.md` | Pre-registered analysis: variables, transformations, tests, decision rules |
| `irb_application.md` | Ethics / IRB document: consent, risk, data handling, retention |
| `data_management_plan.md` | What gets recorded, where, with what access controls and retention |
| `power_analysis.md` | Sample size justification with effect size and alpha assumptions |
| `reproducibility_pack.md` | Codebook, instruments, analysis scripts inventory |

**Follow-up dispatch agent**: `cagents:market-research-analyst` (mode=business-research)
for further investigation during Phase 5 (e.g. "what's the standard power-analysis
convention for crossover designs?"); use mode=requirements for requirements or
gap analysis — NEVER
`cagents:architect` or `cagents:backend-developer` (those are software
domain agents and will produce wrong-shaped answers for research
methodology questions).
