# Best Practices: Performance Analyst

> Design principles, patterns, and frameworks that guide high-quality performance metrics analysis, bottleneck identification, capacity planning, and optimization recommendation work.

## Design Principles

- **Baseline Before Benchmarking**: Establish current-state measurements before making comparisons or recommendations — you cannot measure improvement without knowing the starting point.
- **Root Cause Over Symptom**: Rising response times, falling throughput, or increasing error rates are symptoms; the root cause is what must be addressed — resist premature optimization.
- **Measure Under Realistic Load**: Performance under synthetic or light load is not the same as production performance — test and measure under conditions that match actual usage patterns.
- **Prioritize by Impact**: Focus optimization efforts on the 20% of bottlenecks responsible for 80% of user-visible performance degradation — not every slow path matters equally.
- **Capacity Headroom Is Not Waste**: Running at 100% utilization leaves no room to absorb spikes — sustainable operations require planned headroom (typically 20-30% reserve).
- **Correlate, Then Investigate**: Correlation between metrics narrows the search space; causation requires controlled investigation — don't jump to fixes based on correlation alone.
- **Document Before and After**: Every optimization must have a before-and-after measurement with methodology documented — otherwise the improvement cannot be confirmed or attributed.

## Key Patterns & Frameworks

- **Performance Profiling Cycle**: Measure → Baseline → Hypothesize bottleneck → Test hypothesis → Optimize → Re-measure → Compare. Apply to every performance investigation systematically.
- **Amdahl's Law**: Theoretical maximum speedup from optimizing a component is limited by the fraction of time that component is used. Apply to prioritize which bottlenecks are worth addressing.
- **Little's Law (Applied)**: Average queue size = Arrival rate × Average time in system. Apply to diagnose queuing problems in service systems and calculate required capacity.
- **USE Method (Utilization, Saturation, Errors)**: For every resource (CPU, memory, disk, network): check utilization (how busy?), saturation (how much waiting?), and errors (are there failures?). Apply as systematic triage checklist.
- **RED Method (Rate, Errors, Duration)**: For every service: check request rate, error rate, and request duration. Apply to service-level performance analysis in distributed systems.
- **Percentile Analysis (P50/P95/P99)**: Median latency masks tail latency problems. P99 latency represents the worst experience for 1% of users — for high-traffic systems this is thousands of people. Always report both median and tail.
- **Capacity Planning Models**: Current utilization → Growth rate → Time to capacity exhaustion → Lead time for expansion = Target provision date. Apply quarterly to prevent reactive capacity crises.
- **Queueing Theory Application**: M/M/1 and M/M/c queue models for predicting wait times at different utilization levels. Apply to call center, service desk, and web server sizing decisions.
- **Regression Testing Baseline**: Capture performance profiles at release checkpoints and compare each new version against baseline. Apply to detect performance regressions before production deployment.
- **Heat Map Analysis**: Two-dimensional visualization of metric values across time and resource dimensions. Apply to identify patterns (diurnal cycles, peak periods, gradual degradation).

## Domain Concepts & Terminology

### Performance Metrics
- **Latency**: Time from request initiation to response completion; often reported as percentiles (P50, P95, P99)
- **Throughput**: Volume of requests, transactions, or units processed per unit of time
- **Error Rate**: % of requests failing relative to total requests — threshold-based alerting required
- **Availability**: % of time a system is operational and serving requests (99.9% = ~8.7 hours downtime/year)
- **Saturation**: Degree to which a resource is being over-demanded — queue length, wait times, or CPU steal time
- **Baseline**: Measured performance values at a defined starting point used as a reference for comparison

### Capacity & Load
- **Utilization**: Ratio of actual resource use to maximum available capacity
- **Peak Load**: Maximum demand experienced during a defined period — planning target for capacity provisioning
- **Sustained Load**: Average demand under normal operating conditions
- **Spike**: Short-duration demand surge above normal patterns, often caused by campaigns, events, or viral activity
- **Headroom**: Reserved capacity above expected peak load to absorb unexpected demand (target: 20-30%)
- **Scaling Trigger**: Defined utilization threshold at which additional capacity is automatically or manually provisioned

### Analysis Techniques
- **Profiling**: Instrumented code execution measuring time spent in each function or subsystem
- **Tracing**: End-to-end request path tracking across distributed system components to identify latency contributors
- **Flame Graph**: Visualization of profiling data showing function call stacks proportional to time consumed
- **Cohort Analysis**: Comparing performance metrics across user cohorts, time windows, or system versions to isolate variables
- **A/B Performance Test**: Running two versions simultaneously to measure performance difference under identical conditions
- **Load Test**: Applying simulated production-level traffic to measure system performance under expected demand
- **Stress Test**: Applying traffic beyond expected peak to determine system behavior at and beyond capacity limits

### Business Impact
- **Cost of Latency**: Quantification of revenue or conversion impact from performance degradation (e.g., 100ms latency = 1% conversion drop)
- **SLA (Service Level Agreement)**: Contracted performance commitments to customers (latency, availability thresholds)
- **SLO (Service Level Objective)**: Internal performance targets that, if met, keep SLAs satisfied with buffer
- **Error Budget**: Amount of acceptable downtime or degradation within an SLA period — guides reliability investment decisions

## Anti-Patterns to Avoid

- **Premature Optimization**: Optimizing code paths without profiling data confirming they are actual bottlenecks. Fix: always profile first; optimize the hottest, most impactful paths only.
- **Median-Only Reporting**: Reporting only average or median latency while ignoring P99 tail latency that affects real users. Fix: always report P95 and P99 alongside median for all latency metrics.
- **Load Testing at Low Scale**: Running load tests at 10% of production volume and extrapolating linearly. Fix: test at production scale; many performance issues are non-linear and only appear at scale.
- **Ignoring Warmup Effects**: Measuring performance immediately after system start before caches, JIT compilers, and connection pools have warmed up. Fix: allow warmup period; measure steady-state performance.
- **Single-Metric Optimization**: Optimizing throughput at the expense of latency, or latency at the expense of resource cost. Fix: define balanced success criteria covering latency, throughput, and cost before optimizing.
- **Correlation as Causation**: Concluding two correlated metrics have a causal relationship and optimizing based on that assumption. Fix: confirm causation through controlled experiments before investing in optimization.
- **No Production Monitoring**: Running load tests in isolation without correlating findings with production telemetry. Fix: instrument production; many performance patterns only appear under real user behavior.

## Quality Indicators

- **Baseline Documentation Rate**: % of analyzed processes with documented current-state baseline metrics before optimization (target: 100%).
- **P99 Latency Trend**: Week-over-week trajectory of tail latency — rising P99 with stable median signals specific user-population impact.
- **Capacity Utilization vs. Target Headroom**: Current peak utilization against 70-80% target — above 90% warrants immediate capacity planning action.
- **Optimization Validation Rate**: % of optimization recommendations with before/after measurements confirming impact (target: 100%).
- **Bottleneck Identification Accuracy**: % of identified bottlenecks that, when resolved, produced measurable system improvement — validates analysis methodology.
- **Forecast Accuracy (Capacity)**: Variance between capacity forecast and actual demand at 90-day horizon — high variance signals model improvement opportunity.
- **Time to Root Cause**: Average duration from performance incident detection to root cause identified — measures analysis effectiveness.

## Collaboration Touchpoints

- **With Operations Manager**: Quality looks like performance findings translated into operational decisions, capacity plans aligned to demand forecasts, and optimization recommendations prioritized by operational impact.
- **With Engineering / Backend Developer**: Quality looks like profiling data delivered in developer-actionable format (flame graphs, specific function paths), optimization hypotheses validated before implementation, and regression baselines shared for release gates.
- **With Strategic Planner**: Quality looks like long-range capacity requirements derived from growth scenarios, performance investment cases supported with cost-of-latency analysis, and infrastructure roadmap informed by capacity forecasts.
- **With Finance Manager**: Quality looks like optimization ROI quantified (cost reduction, revenue impact), capacity investments with break-even analysis, and operational cost trends explained by performance data.
