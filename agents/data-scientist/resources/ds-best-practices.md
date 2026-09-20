# Best Practices: Data Scientist

> Design principles, patterns, and frameworks that guide high-quality machine learning, statistical analysis, and experimentation work.

## Design Principles

- **Business Problem First**: Define the decision that the model will improve.
  Do this before you write code — a perfectly accurate model for the wrong question has zero value
- **Start Simple**: A logistic regression that stakeholders understand beats a gradient boosted ensemble they don't — prove value with interpretable baselines before adding complexity
- **Reproducibility by Default**: Every experiment must be reproducible from a seed — use version-controlled data snapshots, fixed seeds, and logged hyperparameters
- **Measure Business Impact, Not Just Accuracy**: Track how the model changes the metric that matters, such as revenue, churn or cost.
  Do not track AUC alone — model performance and business impact can diverge
- **Fail Fast on Data Quality**: Spend the first 20% of any project on data profiling.
  Assess the data quality too — a model trained on bad data is worse than no model
- **Models Decay**: All production models degrade over time due to distribution shift; plan for monitoring and retraining before deployment, not after
- **Interpretability as a Feature**: Stakeholders who understand why the model predicts X are more likely to act on it.
  They are also more likely to catch the errors.

## Key Patterns & Frameworks

- **CRISP-DM**: Cross-Industry Standard Process for Data Mining — Business Understanding → Data Understanding → Data Preparation → Modeling → Evaluation → Deployment.
  This is the canonical lifecycle of an ML project.
- **Train/Validation/Test Split**: Strict three-way data partitioning — the training set fits the model.
  The validation set tunes the hyperparameters. The test set is touched exactly once, for the final evaluation.
- **Cross-Validation (k-fold)**: Rotate training/validation splits to get stable performance estimates on small datasets; prevents overfitting to a single validation split
- **Feature Engineering Pipeline**: Encapsulate all feature transforms in a reproducible, versioned pipeline (scikit-learn Pipeline, Feature Store) that applies identically at training and serving time
- **Baseline-First Modeling**: Establish a naive baseline (majority class, mean prediction, business heuristic) before any ML; the model must beat this baseline to justify complexity
- **Experiment Tracking**: Log every run with the hyperparameters, the metrics, the data version, and the code commit.
  Examples of tools are MLflow, W&B and Neptune — this enables reproducibility and comparison across dozens of experiments
- **A/B Testing Framework**: A randomized controlled experiment with a pre-registered primary metric.
  It also has a power calculation for the sample size, and a holdout group — the gold standard for causal impact measurement
- **Causal Inference (DiD, Synthetic Control, IV)**: When randomization is impossible, use quasi-experimental designs to estimate causal effects from observational data
- **Model Cards**: Structured documentation of model purpose, training data, evaluation metrics, limitations, and intended/unintended use cases — required before production deployment
- **Shadow Mode Deployment**: Run new model in parallel with existing system, logging predictions without acting on them — validates production behavior before full rollout
- **Challenger/Champion Testing**: Route a small percentage of traffic to a new model, while the current model handles the other part.
  Compare the real-world outcomes before the full switch.
- **Concept Drift Detection**: Statistical tests (PSI, KS test, ADWIN) on feature distributions and prediction distributions to detect when the model's environment has changed

## Domain Concepts & Terminology

### Supervised Learning
- **Classification**: Predicting a discrete label (churn/no-churn, fraud/not-fraud); evaluate with precision, recall, F1, AUC-ROC
- **Regression**: Predicting a continuous value (LTV, demand, price); evaluate with RMSE, MAE, R²
- **Precision**: Of all positive predictions, the fraction that are truly positive — optimize when false positives are costly
- **Recall (Sensitivity)**: Of all actual positives, the fraction correctly predicted — optimize when false negatives are costly
- **AUC-ROC**: Area under the Receiver Operating Characteristic curve; measures ranking quality independent of threshold
- **Class Imbalance**: When the positive class is rare (e.g., 1% fraud rate); address with oversampling (SMOTE), undersampling, or class weights
- **Regularization**: Penalty terms (L1/Lasso, L2/Ridge) that constrain model complexity to reduce overfitting

### Unsupervised Learning
- **Clustering**: Grouping similar observations without labels (K-Means, DBSCAN, hierarchical); evaluate with silhouette score
- **Dimensionality Reduction**: Projecting high-dimensional data to lower dimensions (PCA, t-SNE, UMAP) for visualization or feature compression
- **Anomaly Detection**: Identifying observations that deviate significantly from expected patterns (Isolation Forest, Autoencoder)

### Feature Engineering
- **Feature Importance**: Measure of how much a feature contributes to model predictions (SHAP values, permutation importance, gain)
- **Target Encoding**: Replacing categorical values with the mean target value per category — powerful but prone to leakage if not done correctly
- **Feature Leakage**: Including information in training that would not be available at prediction time — the most common cause of unrealistically high validation metrics
- **Interaction Features**: New features created by combining existing ones (e.g., ratio, product) to capture non-linear relationships

### Experimentation
- **Type I Error (False Positive)**: Concluding an effect exists when it doesn't — controlled by significance threshold (α, typically 0.05)
- **Type II Error (False Negative)**: Missing a real effect — controlled by statistical power (1 - β, typically 0.80)
- **p-value**: Probability of observing the data (or more extreme) if the null hypothesis is true; not the probability the hypothesis is false
- **Effect Size**: The magnitude of the difference between groups, independent of sample size — small p-values with negligible effect sizes are not actionable
- **Multiple Testing Correction**: Adjusting significance thresholds when testing many hypotheses simultaneously (Bonferroni, Benjamini-Hochberg) to control false discovery rate
- **Novelty Effect**: Short-term behavior change due to users noticing something new, not the treatment itself — extend experiment duration to wash out

### Model Deployment & Monitoring
- **Concept Drift**: Change in the relationship between features and target over time (e.g., customer behavior shifts post-COVID)
- **Data Drift**: Change in the distribution of input features over time without a change in the relationship
- **Population Stability Index (PSI)**: Quantifies how much a variable's distribution has shifted between two time periods
- **Serving Latency**: Time from feature retrieval to prediction delivery — real-time models typically require P99 under 100ms

## Anti-Patterns to Avoid

- **Leaking the Future**: In training, you use features computed with data from after the prediction point.
  This is a leak — it produces models that are impossible to replicate in production
- **Optimizing the Wrong Metric**: You maximize accuracy on imbalanced data, or AUC, when the business cares about precision at a specific recall threshold.
  The correction is one rule — always anchor evaluation to the business decision
- **Skipping EDA**: Jumping directly to modeling without profiling the data — missing values, outliers, and distribution anomalies discovered after modeling waste weeks of work
- **Model Without a Baseline**: You present the model performance without a naive baseline.
  It is then impossible to judge whether the ML adds value over a simple heuristic.
- **One-Shot Deployment**: Deploying to 100% traffic without shadow mode or A/B validation — even well-validated models can behave unexpectedly in production
- **Ignoring Fairness and Bias**: You evaluate the model performance only on aggregate metrics.
  You do no sub-group analysis — models can perform well overall while being systematically biased against protected groups
- **Notebook as Production Code**: Deploying Jupyter notebooks to production without refactoring into testable, versioned modules — notebooks are for exploration, not serving

## Quality Indicators

- **Baseline Comparison**: Every model report includes a comparison against the naive baseline — improvement over baseline is the minimum bar for deployment
- **Reproducibility**: Any team member can re-run the experiment from the documented commit + data version and produce metrics within rounding error
- **Business Metric Lift**: Post-deployment measurement shows statistically significant improvement in the target business metric (not just model metric)
- **Feature Leakage Audit**: A systematic check that no feature in the training set contains future information relative to the prediction timestamp
- **Monitoring Coverage**: 100% of production models have active drift alerts and performance degradation thresholds configured before go-live
- **Experiment Documentation**: Every A/B test has a pre-registration document (hypothesis, primary metric, sample size, duration) filed before the experiment launches
- **Sub-Group Performance Analysis**: Model evaluation reports include performance breakdowns by key sub-groups (demographic, geographic, product segment) to surface hidden disparities

## Collaboration Touchpoints

- **With BI Specialist**: Integrate the model outputs into dashboards as first-class metrics. The outputs are scores, segments and predictions.
  Consume clean Gold-layer tables as model inputs — alignment on data contracts prevents costly rework
- **With Engineering**: Define model serving contracts (latency SLAs, input schema, versioning) early; models deployed without engineering partnership typically fail on reliability and scale
- **With Domain Experts**: Validate feature selection and model interpretations with subject matter experts before deployment — domain experts catch logical impossibilities that metrics miss
- **With Product / Business Stakeholders**: Translate model metrics into business impact estimates before presenting findings; stakeholders make decisions on business outcomes, not AUC scores
