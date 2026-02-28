# Forecasting Techniques for Planning

Methods and frameworks for producing reliable forecasts that support data-driven planning decisions.

## Forecasting Fundamentals

### When to Use Which Method

| Situation | Recommended Method | Rationale |
|-----------|-------------------|-----------|
| Historical data available (12+ periods) | Time series analysis | Captures trends and seasonality |
| No historical data (new product/market) | Analogous estimation | Borrows from similar contexts |
| High uncertainty, many variables | Scenario planning | Explores multiple futures |
| Expert knowledge available, sparse data | Delphi method | Structured expert consensus |
| Dependent variable with known drivers | Regression analysis | Models causal relationships |
| Short-term operational forecasting | Moving averages | Simple, responsive to recent changes |
| Resource and capacity planning | Monte Carlo simulation | Quantifies probability distributions |

### Accuracy vs. Horizon Trade-off

Forecast accuracy degrades with time horizon. Plan your method accordingly:

- **1-4 weeks**: High accuracy achievable (85-95%). Use moving averages, velocity-based projection.
- **1-3 months**: Moderate accuracy (70-85%). Use time series, regression, rolling forecasts.
- **3-12 months**: Lower accuracy (55-75%). Use scenario planning, driver-based models.
- **1-3 years**: Directional only (40-60%). Use scenario planning, trend extrapolation with wide confidence intervals.

Always communicate forecasts with confidence intervals, not point estimates.

## Quantitative Methods

### Time Series Analysis

**Moving Averages**
- Simple Moving Average (SMA): average of last N periods
- Weighted Moving Average (WMA): recent periods weighted more heavily
- Exponential Smoothing (ETS): exponentially decaying weights
- Best for: stable environments with minor fluctuations

**Trend Decomposition**
- Decompose data into trend, seasonal, cyclical, and residual components
- Apply appropriate model to each component
- Recombine for forecast
- Best for: data with clear seasonal patterns

**ARIMA Models**
- AutoRegressive Integrated Moving Average
- Handles non-stationary data through differencing
- Requires parameter selection (p, d, q) via ACF/PACF analysis
- Best for: complex time series with 50+ data points

### Regression Analysis

**Linear Regression**
- Model: Y = a + bX (simple) or Y = a + b1X1 + b2X2 + ... (multiple)
- Requires identified driver variables with historical data
- Check assumptions: linearity, independence, homoscedasticity, normality
- Best for: understanding and forecasting based on causal drivers

**Driver-Based Forecasting**
- Identify 3-5 key business drivers (e.g., traffic, conversion rate, ARPU)
- Build a model where each driver can be independently forecast
- Combine driver forecasts to produce outcome forecast
- Advantage: enables "what-if" scenario analysis on each driver

### Monte Carlo Simulation

- Define probability distributions for each input variable
- Run thousands of simulations (typically 10,000+)
- Analyze the distribution of outcomes
- Output: probability ranges (P10, P50, P90) rather than single estimates
- Best for: project timelines, budget forecasts, capacity planning

## Qualitative Methods

### Delphi Method

Process:
1. Select 5-15 domain experts
2. Each expert provides an independent forecast with rationale
3. Anonymize and share aggregated results
4. Experts revise their forecasts in light of peer reasoning
5. Repeat for 2-3 rounds until convergence

Guidelines:
- Keep experts anonymous to prevent anchoring to senior voices
- Require written rationale, not just numbers
- Track convergence metrics; stop when standard deviation stabilizes
- Document final consensus and dissenting views

### Analogous Estimation

Process:
1. Identify 3-5 analogous situations (similar product launches, market entries, projects)
2. Collect outcome data from each analogy
3. Adjust for known differences (scale, timing, resources, market conditions)
4. Produce a range estimate based on adjusted analogies

Document why each analogy was selected, list adjustments and rationale, and use the range of outcomes rather than the average. Most useful when you have zero direct historical data.

### Scenario Planning

Process:
1. Identify 2-3 critical uncertainties (variables you cannot predict)
2. Define 2-3 states for each uncertainty (optimistic, base, pessimistic)
3. Combine into 3-4 coherent scenarios (select plausible combinations)
4. Forecast outcomes under each scenario
5. Identify robust strategies that perform well across multiple scenarios

Use descriptive scenario names (e.g., "Rapid Adoption", "Steady Growth", "Market Contraction") rather than "best case / worst case". Each scenario should be plausible and internally consistent.

## Forecast Validation

### Backtesting

- Take historical data, withhold the last N periods
- Apply your forecasting method to the remaining data
- Compare forecast to the withheld actuals
- Measure error using MAPE, RMSE, or MAE
- Repeat with different withholding windows for robustness

### Error Metrics

| Metric | Formula | Best For |
|--------|---------|----------|
| MAPE | Mean Absolute Percentage Error | Comparing across different scales |
| RMSE | Root Mean Squared Error | Penalizing large errors |
| MAE | Mean Absolute Error | Simple, interpretable error measure |
| Bias | Mean Error (signed) | Detecting systematic over/under-forecasting |

### Continuous Calibration

- Compare each forecast to actuals as they become available; maintain a forecast accuracy log
- Identify systematic biases (e.g., consistently optimistic timelines) and adjust accordingly
- Share calibration results with stakeholders to set realistic expectations

## Communicating Forecasts

- Lead with the range, not the point estimate: "We expect 120-150 new customers (80% confidence)"
- Show key assumptions explicitly and highlight biggest sources of uncertainty
- Present alongside the forecast accuracy track record
- Update annual plans quarterly, quarterly plans monthly, sprints at boundaries

### Anti-Patterns to Avoid

- **False precision**: Presenting point estimates when the honest answer is a range
- **Anchoring to first estimate**: Refusing to update when new data arrives
- **Single scenario thinking**: Planning for only one future instead of multiple
- **Confusing forecasts with targets**: A forecast is what you expect; a target is what you aim for
