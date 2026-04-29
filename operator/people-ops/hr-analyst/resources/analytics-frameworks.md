# HR Analytics Frameworks

## Common Analytics Projects

### Turnover Analysis
- **Question**: Why are people leaving?
- **Data**: Exit interviews, demographics, tenure, performance, manager, comp
- **Analysis**: Segment by manager, department, tenure, hire source
- **Insight**: Identify patterns and drivers
- **Action**: Targeted retention interventions

### Hiring Efficiency
- **Question**: How to hire faster and better?
- **Data**: ATS data, time-to-fill, source, quality of hire
- **Analysis**: Compare by role, source effectiveness
- **Insight**: Which channels yield best candidates
- **Action**: Optimize sourcing mix

### Pay Equity Audit
- **Question**: Are we paying equitably?
- **Data**: Comp, demographics, role, level, performance
- **Analysis**: Regression controlling for legitimate factors
- **Insight**: Unexplained gaps by demographic
- **Action**: Remediate gaps, address representation

### Flight Risk Prediction
- **Question**: Who is likely to leave?
- **Data**: Historical turnover, tenure, performance, engagement
- **Analysis**: ML model (logistic regression, random forest)
- **Insight**: High-risk employees identified
- **Action**: Proactive retention conversations

## Data Visualization

### Chart Selection
| Use Case | Chart Type |
|----------|------------|
| Trends | Line chart |
| Comparisons | Bar chart |
| Distribution | Histogram |
| Composition | Pie/stacked bar |
| Relationships | Scatter plot |

### Dashboard Design
- Top-level KPIs with trend arrows
- Drill-down by segment
- Filters (date, department, role)
- Annotations for context

## Analytics Maturity

**Level 1**: Basic reporting (headcount, turnover)
**Level 2**: Dashboards and benchmarks
**Level 3**: Diagnostic analytics (root cause)
**Level 4**: Predictive models
**Level 5**: Prescriptive recommendations

## Data Sources

- **HRIS**: Workday, BambooHR (employee data)
- **ATS**: Greenhouse, Lever (recruiting)
- **Engagement**: Culture Amp, Glint (surveys)
- **Payroll**: ADP, Gusto (compensation)

## Tools

- Excel/Sheets: Basic analysis
- SQL: Database queries
- Python/R: Advanced statistics, ML
- Tableau/Looker: Visualization
