# Data Patterns and Anomaly Detection

Techniques for pattern recognition, anomaly detection, and trend analysis.

## Pattern Recognition Techniques

### Common Data Patterns

| Pattern | Description | Visual Signature | Detection Method |
|---------|-------------|------------------|------------------|
| Linear trend | Steady increase or decrease | Straight line slope | Linear regression, slope test |
| Exponential growth | Accelerating increase | Curved upward | Log transform linearizes |
| Seasonal cycle | Repeating at fixed intervals | Regular oscillation | Autocorrelation at lag m |
| Step change | Sudden level shift | Flat-jump-flat | Change point detection |
| Mean reversion | Returns to average after deviation | Oscillation around mean | Stationarity tests |
| Regime shift | Fundamental behavior change | Different dynamics before/after | Structural break tests |

### Correlation Analysis

| Method | Measures | Assumptions | Best For |
|--------|----------|-------------|----------|
| Pearson | Linear relationship (-1 to +1) | Normal distribution | Continuous variables, linear relationships |
| Spearman Rank | Monotonic relationship | None | Ordinal data, non-linear monotonic relationships |
| Cross-Correlation | Correlation at time lags | Stationarity | Leading/lagging indicator discovery |

### Clustering for Pattern Discovery

Group similar patterns to find structure in data:

| Method | Best For | Parameters | Key Consideration |
|--------|----------|------------|-------------------|
| K-Means | Well-separated spherical clusters | k (number of clusters) | Must specify k in advance |
| DBSCAN | Arbitrary shapes, noise handling | epsilon, min_points | Finds clusters and outliers simultaneously |
| Hierarchical | Exploring cluster structure | linkage method | Produces dendrogram for visual inspection |
| Time Series K-Means | Grouping similar time series | k, distance metric (DTW) | Use Dynamic Time Warping for shifted patterns |

### Feature Engineering for Patterns

| Category | Examples |
|----------|---------|
| Time-based | Hour, day of week, month, quarter, days since event, cyclical encoding |
| Lag | Value at t-1 through t-n, rolling mean/std, rate of change |
| Interaction | Ratios between metrics, deviation from rolling average |

## Anomaly Detection

### Detection Method Selection

```
Decision process:

1. Is labeled anomaly data available?
   Yes -> Supervised methods (classification)
   No  -> Unsupervised methods (below)

2. What type of anomaly?
   Point anomaly (single outlier)     -> Statistical thresholds, Z-score
   Contextual anomaly (unusual in context) -> Conditional analysis
   Collective anomaly (unusual sequence)   -> Sequence models

3. How much data is available?
   Small (< 100 points)   -> Statistical methods (IQR, Z-score)
   Medium (100-10K)        -> Isolation Forest, LOF
   Large (10K+)            -> Autoencoders, ensemble methods
```

### Statistical Anomaly Detection

| Method | Formula | Threshold | Assumption |
|--------|---------|-----------|------------|
| Z-Score | `z = (x - mean) / std` | abs(z) > 2.5-3.0 | Normal distribution |
| Modified Z-Score | `z = 0.6745 * (x - median) / MAD` | abs(z) > 3.5 | None (robust to outliers) |
| IQR | Bounds: Q1 - 1.5*IQR, Q3 + 1.5*IQR | Outside bounds | None (distribution-free) |

### Machine Learning Anomaly Detection

| Method | Mechanism | Strengths | Weaknesses |
|--------|-----------|-----------|------------|
| Isolation Forest | Isolates anomalies via random partitions | Fast, scales well, few parameters | Less effective for local anomalies |
| Local Outlier Factor | Compares local density to neighbors | Detects local anomalies | Slow for large datasets, sensitive to k |
| One-Class SVM | Learns boundary around normal data | Works in high dimensions | Sensitive to kernel choice, slow training |
| Autoencoder | High reconstruction error = anomaly | Learns complex patterns | Requires tuning, needs sufficient normal data |

### Anomaly Response Protocol

When an anomaly is detected:

1. **Confirm** - Is this a real anomaly or a data quality issue?
2. **Classify** - Point, contextual, or collective anomaly?
3. **Investigate** - What changed? External events, system changes, data pipeline issues?
4. **Impact** - What is affected? Downstream models, reports, decisions?
5. **Act** - Correct if data error; flag if genuine; adjust models if regime shift
6. **Document** - Record the anomaly, root cause, and action taken for future reference

## Trend Analysis Methods

### Trend Identification

| Method | Type | Best For |
|--------|------|----------|
| Mann-Kendall test | Statistical | Non-parametric trend detection (H0: no monotonic trend) |
| Sen's Slope | Statistical | Robust trend magnitude estimate, resistant to outliers |
| Cox-Stuart test | Statistical | Simple sign-based trend detection |
| LOESS/LOWESS | Visual | Smoothed curve fitting for non-linear trends |
| Moving average overlay | Visual | Revealing underlying trend through noise |

### Trend Decomposition

| Method | Approach | Best For |
|--------|----------|----------|
| Classical decomposition | Fixed seasonal component | Simple, stable seasonality |
| STL decomposition | LOESS-based, flexible | Changing seasonality over time |
| X-13ARIMA-SEATS | Census Bureau method | Official economic statistics |

### Change Point Detection

| Method | Mechanism | Strengths |
|--------|-----------|-----------|
| CUSUM | Tracks cumulative deviation from target | Detects small persistent shifts |
| PELT | Minimizes cost function for multiple change points | Exact, penalty-controlled |
| Bayesian | Returns probability of change at each point | Handles uncertainty naturally |

## Reporting Patterns and Insights

Present findings in order of actionability: actionable anomalies first, then emerging trends, confirmed patterns, and background context last.

### Confidence Communication

| Confidence Level | Language | Evidence Required |
|------------------|----------|-------------------|
| High (>90%) | "The data shows..." | Strong statistical significance, multiple methods agree |
| Medium (70-90%) | "The data suggests..." | One method significant, visual confirmation |
| Low (50-70%) | "There are indications that..." | Visual pattern only, borderline significance |
| Speculative (<50%) | "It is possible that..." | Limited data, preliminary observation |

## Best Practices

- Always visualize data before applying automated methods
- Use multiple detection methods and look for consensus
- Set anomaly thresholds based on business impact, not just statistics
- Distinguish between data quality issues and genuine anomalies
- Re-calibrate models and thresholds as data distributions evolve
- Document all pattern findings with evidence and confidence levels
- Consider domain context when interpreting statistical results
