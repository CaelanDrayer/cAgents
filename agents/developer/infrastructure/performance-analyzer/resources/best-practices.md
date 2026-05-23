# Best Practices: Performance Analyzer

> Design principles, patterns, and frameworks that guide high-quality performance analysis, bottleneck detection, and throughput optimization.

## Design Principles

- **Measure, Don't Guess**: Every performance hypothesis must be validated with profiling data — intuition about bottlenecks is wrong as often as right.
- **Profile Under Production Load**: Micro-benchmarks in isolation are misleading; profile the system under realistic traffic patterns and data volumes.
- **Percentiles Over Averages**: P50, P95, and P99 latency are more actionable than average latency — averages hide tail behavior that real users experience.
- **Bottleneck Focus**: Optimizing a non-bottleneck provides no throughput improvement — identify the system's constraint first.
- **Baseline Before Optimizing**: Establish a performance baseline before making changes; verify improvement after — without baseline, "optimization" is unmeasurable.
- **Root Cause, Not Symptom**: High CPU usage is a symptom; N+1 database queries or an inefficient algorithm is a root cause — optimize root causes.
- **Regression Prevention is Continuous**: Performance must be measured in CI on every significant change — regressions are cheapest to fix immediately after introduction.

## Key Patterns & Frameworks

- **RED Method**: Rate (requests per second), Errors (error rate), Duration (latency) — primary metrics for any service under analysis.
- **USE Method**: Utilization (% busy), Saturation (queue depth), Errors — primary metrics for any resource (CPU, memory, disk, network).
- **Flame Graph Analysis**: Visualize CPU time hierarchically by call stack — identify which functions consume the most time and in what context.
- **Latency Percentile Profiling**: Collect P50, P95, P99, P999 — P999 latency often reveals timeout configurations, GC pauses, and lock contention.
- **Distributed Tracing Analysis**: Use Jaeger, Zipkin, or OpenTelemetry to trace requests across services — identify cross-service latency and the critical path.
- **Database Query Plan Analysis**: Run EXPLAIN ANALYZE on slow queries to identify full table scans, missing indexes, and poor join order decisions.
- **Heap Profiler / Allocation Profiler**: Identify excessive object allocation, large allocations, and memory leaks — tools: Py-Spy, async-profiler (JVM), pprof (Go), heapdump (Node.js).
- **Load Testing Protocol**: Apply realistic load shapes (ramp-up, steady state, spike) and measure throughput, latency, and error rate at each stage.
- **Cache Hit Rate Analysis**: Measure cache hit/miss ratio and eviction rate — low hit rates indicate cache sizing or key design issues.
- **Concurrency Analysis**: Identify lock contention, thread pool saturation, and connection pool exhaustion — tools: thread dumps, lock profilers, connection pool metrics.
- **N+1 Query Detection**: Identify patterns where N queries are issued to fetch data for N items — use query logging and ORM-level monitoring.

## Domain Concepts & Terminology

### Latency Analysis
- **P50 (Median)**: 50% of requests are faster than this value
- **P95**: 95% of requests are faster; 5% are slower — important for SLO definition
- **P99**: 99% of requests are faster; often the tail experience for power users
- **P999**: 1 in 1,000 requests; often reveals rare but significant issues (GC pauses, cold cache starts, lock contention)
- **Tail Latency**: The slowest percentile of requests — disproportionately affects user experience in distributed systems
- **Latency Budget**: Allocated time budget for each component in a request's critical path

### Resource Metrics
- **CPU Utilization**: Percentage of available CPU time being used — sustained > 80% indicates capacity concern
- **Memory Utilization**: Percentage of available memory in use; watch for steady growth (memory leak)
- **Disk I/O Throughput**: MB/s read/write; saturation causes queuing and latency spikes
- **Network Throughput**: MB/s in/out; bandwidth saturation causes packet loss and retransmission
- **Connection Pool Saturation**: When pool size is exhausted, new requests queue — visible as latency spikes under load

### Database Performance
- **Query Execution Plan**: Database optimizer's chosen strategy for executing a query
- **Sequential Scan**: Reading the entire table — usually a sign of a missing index
- **Index Scan**: Using an index to locate rows — generally fast for selective queries
- **Join Type**: Nested Loop (good for small sets), Hash Join (good for large sets), Merge Join (good for sorted inputs)
- **Table Statistics**: Row counts and column distribution used by the query optimizer — stale statistics cause poor plan choices
- **Index Bloat**: Dead index entries from updates/deletes — periodic VACUUM/REINDEX reclaims space

### Application Performance
- **Hot Path**: Code executed on every request by every user — must be profiled and optimized first
- **Cold Start**: First invocation penalty for functions that cache state — relevant for serverless and Lambda functions
- **GC Pause**: Stop-the-world garbage collection pause — causes latency spikes (Java, Go, .NET, JavaScript)
- **Lock Contention**: Multiple threads waiting for the same lock — reduces effective parallelism
- **Thundering Herd**: Many processes simultaneously waking and competing for the same resource after a shared event

## Anti-Patterns to Avoid

- **Optimizing Without Profiling**: Changing code based on assumptions about what's slow — often misses the actual bottleneck.
- **Optimizing Non-Bottlenecks**: Making the fast path faster when the slow path is the actual constraint — provides no throughput improvement.
- **Average Latency Obsession**: Reporting average latency as the key metric while ignoring P95/P99 — misrepresents user experience.
- **Micro-Benchmark Fallacy**: Benchmarking code in isolation without the production context (database, network, cache state) — leads to optimizations that don't materialize in production.
- **Missing Production Baseline**: Optimizing without first establishing a baseline — "improvement" cannot be measured without a starting point.
- **Ignoring Memory**: Focusing on CPU performance while ignoring memory allocation rate, GC pressure, and heap fragmentation.
- **Single-Metric Focus**: Optimizing latency while ignoring throughput, or optimizing throughput while ignoring error rate — performance is a multi-dimensional attribute.

## Quality Indicators

- **P95 Latency Within SLO**: P95 latency for all critical endpoints is within the agreed service level objective.
- **Zero Unaddressed P99 Regressions**: Any P99 latency regression detected in CI is resolved before merge.
- **CPU Utilization < 70% at Peak**: Production CPU utilization has headroom below 80% at peak traffic.
- **Cache Hit Rate > 90%**: Application caches (Redis, CDN, in-memory) have high hit rates — measured via cache metrics.
- **No Full Table Scans on Large Tables**: Database query monitoring shows no sequential scans on tables over 100k rows.
- **Memory Growth Rate Flat**: Heap profiler shows stable memory usage over time — no steady upward trend indicating a leak.
- **Load Test Passes at 2x Expected Traffic**: System handles 2x expected peak load without exceeding latency SLOs or producing errors.

## Collaboration Touchpoints

- **With Backend Developer**: Provide specific evidence for performance findings (flame graph excerpts, query plans, profiler screenshots) — make the optimization actionable, not just identified.
- **With DBA**: Coordinate on database query analysis — performance analyzer identifies slow queries, DBA designs index and schema remediation.
- **With DevOps Engineer**: Integrate performance benchmarks into CI — performance regressions should be detected automatically before they reach production.
- **With Tech Lead**: Report on performance trends and budget compliance — P95 latency breaching SLO is a delivery risk that needs escalation.
