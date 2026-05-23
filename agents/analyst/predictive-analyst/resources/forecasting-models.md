# Forecasting Models and Techniques

Detailed reference for statistical forecasting, time series analysis, and model selection.

## Statistical Forecasting Techniques

### Method Overview

| Method | Best For | Data Requirement | Complexity | Accuracy |
|--------|----------|------------------|------------|----------|
| Moving Average | Stable trends, smoothing noise | 10+ data points | Low | Moderate |
| Exponential Smoothing | Short-term forecasts with trend/seasonality | 20+ data points | Low-Medium | Good |
| ARIMA | Stationary time series with patterns | 50+ data points | Medium | Good-High |
| Linear Regression | Relationship between variables | 30+ observations | Low | Moderate |
| Prophet | Business time series with holidays/events | 2+ years daily data | Medium | Good |
| Ensemble Methods | Complex patterns, high-stakes forecasts | 100+ data points | High | High |

### Moving Average

- **Simple (SMA)**: `SMA(n) = (x_1 + x_2 + ... + x_n) / n` -- smooths noise, window 3-7 for short-term, 12+ for seasonal
- **Weighted (WMA)**: Linearly increasing weights toward present -- more responsive to recent changes than SMA

### Exponential Smoothing Family

| Variant | Parameters | Handles | Best For |
|---------|-----------|---------|----------|
| Simple (SES) | alpha (level) | Level only | No trend, no seasonality |
| Holt's Linear | alpha, beta (trend) | Level + trend | Linear trends, damped variant available |
| Holt-Winters | alpha, beta, gamma (season) | Level + trend + season | Full seasonal patterns (additive or multiplicative) |

### ARIMA Components

```
AR (Autoregressive) - p:
  Current value depends on previous values
  Higher p = longer memory of past values

I (Integrated) - d:
  Number of differencing steps to make series stationary
  d=0: already stationary
  d=1: first differences (most common)
  d=2: second differences (rare)

MA (Moving Average) - q:
  Current value depends on previous forecast errors
  Higher q = longer memory of past errors

Seasonal ARIMA (SARIMA):
  Adds seasonal components (P, D, Q, m)
  m = seasonal period (12 for monthly, 7 for daily)
  Example: ARIMA(1,1,1)(1,1,1,12) for monthly data with yearly season
```

## Time Series Analysis

### Decomposition

Break a time series into its constituent components:

| Component | Description | How to Identify |
|-----------|-------------|-----------------|
| Trend | Long-term increase or decrease | Moving average over large window |
| Seasonality | Regular repeating patterns | Autocorrelation at fixed lags |
| Cyclical | Irregular long-term oscillations | After removing trend and season |
| Residual | Random noise | What remains after decomposition |

### Stationarity Testing

A time series must be stationary for many models to work correctly. Use two complementary tests:

| Test | H0 (Null) | Reject When | Action If Non-Stationary |
|------|-----------|-------------|--------------------------|
| ADF (Augmented Dickey-Fuller) | Non-stationary | p < 0.05 | Apply differencing (d parameter) |
| KPSS | Stationary | p < 0.05 | Confirms ADF; conflicting results suggest trend-stationarity |

### Autocorrelation Analysis

| Pattern | ACF Behavior | PACF Behavior | Suggests |
|---------|-------------|---------------|----------|
| AR(p) | Decays slowly | Cuts off after lag p | Autoregressive model |
| MA(q) | Cuts off after lag q | Decays slowly | Moving average model |
| ARMA(p,q) | Both decay gradually | Both decay gradually | Mixed model |

Use ACF and PACF plots together to identify appropriate ARIMA orders.

## Model Selection Criteria

### Selection Decision Tree

```
1. How much historical data is available?
   < 10 points  -> Simple average or naive forecast
   10-50 points -> Exponential smoothing or moving average
   50+ points   -> ARIMA, regression, or ensemble

2. Is there a clear trend?
   No trend     -> SES or ARIMA(0,0,q)
   Linear trend -> Holt's method or ARIMA(p,1,q)
   Non-linear   -> Prophet or polynomial regression

3. Is there seasonality?
   No season    -> Holt's or ARIMA
   Regular      -> Holt-Winters or SARIMA
   Irregular    -> Prophet (handles holidays/events)

4. Are external factors important?
   No           -> Univariate methods (above)
   Yes          -> Regression with ARIMA errors, or multivariate models
```

### Evaluation Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| MAE | mean(abs(actual - forecast)) | Average error magnitude in original units |
| RMSE | sqrt(mean((actual - forecast)^2)) | Penalizes large errors more heavily |
| MAPE | mean(abs((actual - forecast) / actual)) * 100 | Percentage error, scale-independent |
| sMAPE | Symmetric MAPE variant | Handles near-zero actuals better |
| MASE | MAE / naive_forecast_MAE | Compares to naive baseline; <1 is good |

### Cross-Validation for Time Series

Standard k-fold cross-validation does NOT work for time series because it leaks future data. Use temporal validation instead:

- **Expanding window** - Training set grows with each fold (all history up to test period)
- **Rolling window** - Fixed-size training window slides forward
- Report mean and standard deviation of error across all folds

### Forecast Horizon Guidelines

| Horizon | Reliability | Appropriate Use |
|---------|-------------|-----------------|
| 1-7 days | High | Operational planning, staffing |
| 1-4 weeks | Good | Sprint planning, inventory |
| 1-3 months | Moderate | Quarterly planning, budgets |
| 3-12 months | Low-Moderate | Strategic planning, hiring |
| 1+ years | Low | Directional guidance only |

Always report forecasts with confidence intervals (80% and 95%) rather than point estimates.

## Best Practices

- Always establish a naive baseline (last value, seasonal naive) before building models
- Visualize the data before choosing a model
- Check residuals for randomness after fitting; patterns indicate a missed component
- Retrain models regularly as new data arrives
- Document assumptions, parameters, and data sources for reproducibility
- Present forecasts as ranges, not point estimates
- Monitor forecast accuracy over time and trigger re-evaluation when performance degrades
