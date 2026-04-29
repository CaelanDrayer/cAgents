# Data Science Frameworks

## ML Project Workflow

### End-to-End Process
1. **Problem Definition**: Business goal, success criteria, impact
2. **Data Gathering**: Sources, collection, initial assessment
3. **Exploratory Analysis**: Patterns, distributions, correlations
4. **Feature Engineering**: Extract, transform, select features
5. **Model Development**: Train, tune, validate models
6. **Evaluation**: Performance metrics, business impact
7. **Deployment**: Production pipeline, monitoring
8. **Iteration**: Retrain, improve based on feedback

## Model Selection Guide

| Problem Type | Algorithms | Use When |
|--------------|-----------|----------|
| Classification | Logistic Regression, Random Forest, XGBoost, Neural Networks | Predict categories (churn, fraud, sentiment) |
| Regression | Linear Regression, XGBoost, Neural Networks | Predict continuous values (revenue, demand) |
| Clustering | K-Means, DBSCAN, Hierarchical | Discover segments, patterns |
| Time Series | ARIMA, Prophet, LSTM | Forecast future values |
| NLP | BERT, Transformers, Embeddings | Text classification, sentiment, NER |

## Feature Engineering Patterns

### Common Techniques
- **Numeric**: Normalization, binning, log transforms
- **Categorical**: One-hot encoding, target encoding, embeddings
- **Temporal**: Lag features, rolling averages, seasonality indicators
- **Text**: TF-IDF, word embeddings, n-grams
- **Interactions**: Polynomial features, cross-features

### Feature Selection
| Method | When to Use |
|--------|-------------|
| Correlation | Quick initial filter |
| Mutual Information | Non-linear relationships |
| RFE | Systematic elimination |
| SHAP | Interpretable importance |

## Model Evaluation

### Metrics by Problem Type
| Type | Primary Metrics | Secondary |
|------|-----------------|-----------|
| Classification | AUC-ROC, Precision, Recall, F1 | Accuracy, Confusion Matrix |
| Regression | RMSE, MAE, MAPE, R-squared | Residual analysis |
| Ranking | NDCG, MAP | Click-through rate |

### Cross-Validation
- K-Fold for standard problems
- Time-series split for temporal data
- Stratified for imbalanced classes

## A/B Testing Framework

### Experiment Design
1. **Hypothesis**: Clear, testable statement
2. **Metrics**: Primary + secondary (guardrails)
3. **Sample Size**: Power analysis calculation
4. **Duration**: Based on traffic, effect size
5. **Randomization**: User-level assignment

### Analysis Checklist
- [ ] Sample ratio mismatch check
- [ ] Statistical significance (p-value < 0.05)
- [ ] Practical significance (effect size)
- [ ] Segment analysis
- [ ] Long-term effects consideration

## Model Deployment

### Deployment Patterns
| Pattern | Use Case | Latency |
|---------|----------|---------|
| Batch Scoring | Daily predictions, reports | Hours |
| Real-time API | Personalization, pricing | <100ms |
| Embedded | Edge devices, mobile | <10ms |

### Production Monitoring
- **Performance**: Accuracy, latency, throughput
- **Data Drift**: Feature distribution changes
- **Model Decay**: Performance degradation over time
- **Retraining Triggers**: Scheduled or performance-based

## Example Scenarios

### Churn Prediction
```yaml
Problem: Identify at-risk customers
Features: Usage, engagement, support, billing
Model: XGBoost classifier
Metrics: AUC-ROC > 0.85, Precision @ k
Output: Daily risk scores, alert threshold
Impact: 20% churn reduction
```

### Demand Forecasting
```yaml
Problem: Predict product demand
Features: Historical sales, seasonality, promotions
Model: Prophet + XGBoost hybrid
Metrics: MAPE < 15%
Output: 90-day forecast by SKU
Impact: 25% inventory cost reduction
```

## Tools & Libraries

- **Python**: scikit-learn, XGBoost, TensorFlow, PyTorch
- **MLOps**: MLflow, Kubeflow, SageMaker
- **Data**: pandas, numpy, SQL, Spark
- **Visualization**: matplotlib, seaborn, plotly
