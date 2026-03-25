# Best Practices: Predictive Analyst

> Design principles, patterns, and frameworks that guide high-quality predictive modeling, forecasting, trend analysis, and data-driven planning insights work.

## Design Principles

- **All Models Are Wrong, Some Are Useful**: No predictive model perfectly captures reality — the goal is a model useful enough to improve decisions, not one that achieves perfect accuracy.
- **Understand the Data Generating Process**: A forecast built on misunderstood data will fail in production even if it validates well historically. Invest time understanding how the data was created.
- **Uncertainty Is Information, Not Failure**: Quantifying and communicating forecast uncertainty (confidence intervals, scenario ranges) is more valuable than presenting false point estimates — decision-makers need to know what they're betting on.
- **Simplest Adequate Model Wins**: A linear regression that explains 75% of variance and is interpretable beats a neural network that explains 78% and is a black box — complexity must justify itself.
- **Causation Beats Correlation for Forecasting**: Leading indicators with causal relationships to outcomes produce more robust forecasts than correlates that may diverge when conditions change.
- **Out-of-Sample Validation Is the Only Test That Matters**: In-sample fit is irrelevant — only holdout or out-of-time validation confirms a model will perform in production.
- **Monitor for Drift**: All models decay as the world changes. Production models require regular accuracy monitoring and refresh cycles, not set-and-forget deployment.

## Key Patterns & Frameworks

- **ARIMA (AutoRegressive Integrated Moving Average)**: Time series forecasting model capturing trend, autocorrelation, and moving average patterns. Apply to stationary or differenced time series with temporal structure.
- **Exponential Smoothing (ETS)**: Weighted average of historical values with exponentially decreasing weights. Apply for business time series with trend and seasonality; interpretable and robust.
- **Prophet (Facebook)**: Additive time series model handling multiple seasonalities, holiday effects, and trend changepoints. Apply to business metrics with irregular seasonal patterns or known calendar effects.
- **Regression-Based Forecasting**: Linear or non-linear regression with causal predictors (leading indicators). Apply when causal drivers are known and available; produces interpretable, actionable forecasts.
- **Random Forest / Gradient Boosting (ML)**: Ensemble tree models capturing complex non-linear relationships. Apply when feature-rich datasets exist and interpretability is secondary to accuracy.
- **Monte Carlo Simulation**: Probabilistic simulation running thousands of scenarios with randomized inputs to produce outcome distributions. Apply to quantify forecast uncertainty and generate percentile-based scenarios.
- **Walk-Forward Validation**: Train on data up to time T, test on T+1, roll forward — simulates real-world forecasting conditions. Apply as the primary validation method for all time series models.
- **Ensemble Forecasting**: Combining multiple model predictions (average or weighted) to reduce individual model error. Apply when multiple viable models exist; typically outperforms individual models.
- **Driver Tree Modeling**: Build forecasting models around the causal driver structure (revenue = customers × conversion × ACV) rather than directly on the target metric. Produces interpretable, scenario-friendly models.
- **Forecast Reconciliation**: Aggregating forecasts from granular level (SKU, territory) to high level while maintaining consistency. Apply to prevent aggregate forecasts contradicting bottom-up granular ones.

## Domain Concepts & Terminology

### Model Types
- **Time Series Model**: Statistical model capturing temporal patterns in sequential data (trend, seasonality, cycles, irregular)
- **Regression Model**: Statistical model relating a target variable to one or more predictor variables through a mathematical function
- **Causal Model**: Forecasting model using leading indicators with known causal relationships to the target variable
- **Ensemble Model**: Combination of multiple individual models whose predictions are aggregated to reduce error
- **Probabilistic Forecast**: Forecast expressed as a probability distribution rather than a single point estimate

### Forecast Quality
- **MAPE (Mean Absolute Percentage Error)**: Average absolute percentage deviation of forecast from actual — most common measure; expressed as a % for easy interpretation
- **RMSE (Root Mean Square Error)**: Square root of mean squared errors — penalizes large errors more heavily than MAPE; used when large errors are disproportionately costly
- **Forecast Bias**: Systematic tendency to over-forecast or under-forecast — zero-mean residuals indicate unbiased forecast
- **Coverage**: % of actual values falling within the model's stated confidence interval — 95% interval should contain ~95% of actuals
- **Holdout Sample**: Data withheld from model training and used exclusively for out-of-sample validation
- **Train/Validation/Test Split**: Partitioning data into training (model fitting), validation (hyperparameter tuning), and test (final performance assessment) sets

### Statistics & Modeling
- **Autocorrelation**: Correlation of a time series with its own past values — fundamental property of time series data
- **Stationarity**: Statistical property where mean, variance, and autocorrelation are constant over time — required by many time series models
- **Seasonality**: Periodic, predictable fluctuation in a time series driven by calendar patterns (daily, weekly, annual)
- **Trend**: Systematic long-term increase or decrease in a time series over time
- **Changepoint**: Point in time where the underlying trend or behavior of a time series fundamentally shifts
- **Overfitting**: Model performing well on training data but poorly on new data due to excessive complexity fitting noise

### Uncertainty & Scenarios
- **Confidence Interval**: Range within which the true value is expected to fall at a specified probability level
- **Prediction Interval**: Wider range accounting for both model uncertainty and data noise — appropriate for individual future observations
- **Scenario Analysis**: Generation of multiple forecast paths under different assumption sets (optimistic, base, pessimistic)
- **Monte Carlo Simulation**: Computational technique generating probability distributions by running thousands of randomized trials

## Anti-Patterns to Avoid

- **Point Forecast Only**: Presenting a single forecast number without uncertainty quantification, giving decision-makers false precision. Fix: always accompany point forecasts with confidence intervals or scenario ranges.
- **In-Sample Validation**: Validating a model only on data used to train it, producing optimistically biased accuracy metrics. Fix: always use out-of-time or holdout data for validation; report walk-forward accuracy.
- **Ignoring Model Drift**: Deploying a model and never monitoring its production accuracy as the world changes. Fix: instrument all production models with accuracy monitoring; trigger retraining when performance degrades beyond thresholds.
- **Correlation as Causation in Predictors**: Using correlated features as predictors without confirming causal direction, producing models that fail when the correlation breaks. Fix: validate causal direction before including correlates as predictors.
- **Overcomplicated Models**: Using deep learning for a forecasting problem adequately solved by exponential smoothing. Fix: benchmark complex models against simple baselines; adopt complexity only when accuracy improvement justifies maintainability cost.
- **Missing Baseline Comparison**: Claiming a model improves forecasting without comparing to a naive baseline (last-period carry, historical average). Fix: always report model accuracy alongside naïve baseline accuracy.
- **Forecast Without Business Context**: Delivering a statistically valid forecast without explaining what it means for the business decision at hand. Fix: translate every forecast into its business implication and recommended action.

## Quality Indicators

- **Holdout MAPE by Horizon**: Mean absolute percentage error on withheld data at 30/60/90-day forecast horizons — measures production-like accuracy.
- **Forecast Bias**: Mean of forecast errors (positive = systematic over-forecast; negative = systematic under-forecast) — target: near zero.
- **Interval Coverage Rate**: % of actuals falling within stated confidence intervals — should match the stated confidence level (e.g., 80% of actuals within 80% confidence interval).
- **Model Refresh Frequency**: How often models are retrained with new data — should be defined based on data velocity and drift rate.
- **Business Decision Adoption Rate**: % of planning decisions using model outputs vs. judgment alone — measures actual model impact.
- **Residual Autocorrelation (Ljung-Box Test)**: Statistically significant autocorrelation in residuals indicates model is leaving predictable signal unexplained — target: no significant autocorrelation.
- **Feature Importance Stability**: Degree to which top predictors remain consistent across model retraining cycles — instability signals data quality or structural change issues.

## Collaboration Touchpoints

- **With Planning Analyst**: Quality looks like forecasting models using planning KPI definitions consistently, historical trend analysis informing model feature selection, and forecast outputs formatted for integration into planning dashboards.
- **With Finance Manager**: Quality looks like revenue and cost forecasts with documented methodology, scenario models matching financial planning scenarios, and accuracy track records available for stakeholder credibility.
- **With Operations Manager**: Quality looks like demand forecasts with appropriate lead time for capacity planning decisions, operational driver variables integrated into forecast models, and model outputs delivered in operational planning cadence.
- **With Data Scientist**: Quality looks like statistical methodology reviewed for rigor, feature engineering leveraging domain data science expertise, and production model deployment and monitoring handled collaboratively.
