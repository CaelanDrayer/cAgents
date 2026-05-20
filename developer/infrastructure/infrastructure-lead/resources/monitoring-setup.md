# Monitoring & Observability

Reference for setting up monitoring, alerting, and observability.

## Three Pillars of Observability

### 1. Metrics (Numeric time-series data)

**Golden Signals** (Google SRE):
| Signal | What It Measures | Example Metric |
|--------|-----------------|----------------|
| Latency | Request duration | `http_request_duration_seconds` |
| Traffic | Request volume | `http_requests_total` |
| Errors | Failure rate | `http_errors_total` |
| Saturation | Resource utilization | `cpu_usage_percent`, `memory_usage_bytes` |

**RED Method** (Request-focused):
- **R**ate: Requests per second
- **E**rrors: Errors per second
- **D**uration: Distribution of request latency

**USE Method** (Resource-focused):
- **U**tilization: Percentage of resource busy
- **S**aturation: Queue depth, backlog
- **E**rrors: Error events on resource

### 2. Logs (Structured event records)

**Structured Logging Format**:
```json
{
  "timestamp": "2026-01-15T10:30:00Z",
  "level": "error",
  "service": "api-server",
  "traceId": "abc123",
  "spanId": "def456",
  "userId": "user_789",
  "message": "Payment processing failed",
  "error": "timeout after 30s",
  "metadata": {
    "paymentId": "pay_xyz",
    "amount": 9999,
    "provider": "stripe"
  }
}
```

**Log Levels**:
| Level | Use For | Alert? |
|-------|---------|--------|
| ERROR | Failures requiring attention | Yes |
| WARN | Degraded but functional | Threshold-based |
| INFO | Normal operations, milestones | No |
| DEBUG | Diagnostic details | No (dev/staging only) |

### 3. Traces (Distributed request flow)

**Trace Propagation**:
```
[Client] --trace_id:abc--> [API Gateway] --trace_id:abc--> [Order Service]
                                                            |
                                                   span_id:span1
                                                            |
                              [Payment Service] <--trace_id:abc--
                                span_id:span2
                                                            |
                              [Notification Service] <--trace_id:abc--
                                span_id:span3
```

## Prometheus Setup

### Metric Types

| Type | Use For | Example |
|------|---------|---------|
| Counter | Monotonically increasing values | Total requests, errors |
| Gauge | Values that go up and down | Current connections, temperature |
| Histogram | Distribution of values | Request latency, response size |
| Summary | Pre-calculated quantiles | Client-side latency percentiles |

### Key Queries (PromQL)

```promql
# Request rate (per second, 5m window)
rate(http_requests_total[5m])

# Error rate percentage
rate(http_errors_total[5m]) / rate(http_requests_total[5m]) * 100

# 99th percentile latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# CPU usage per pod
sum(rate(container_cpu_usage_seconds_total[5m])) by (pod)

# Memory usage percentage
container_memory_usage_bytes / container_spec_memory_limit_bytes * 100
```

## Alerting Rules

### Alert Severity Levels

| Severity | Response Time | Notification | Example |
|----------|--------------|--------------|---------|
| Critical | < 5 min | PagerDuty + Slack | Service down, data loss risk |
| Warning | < 30 min | Slack channel | Error rate elevated, disk 80% |
| Info | Next business day | Email digest | New deployment, scaling event |

### Alert Best Practices

- **Alert on symptoms, not causes**: Alert on "high error rate," not "CPU spike"
- **Include runbook links**: Every alert should link to remediation steps
- **Set meaningful thresholds**: Based on SLO, not arbitrary numbers
- **Avoid alert fatigue**: If an alert never requires action, remove it
- **Use inhibition rules**: Suppress downstream alerts when root cause is known

### Example Alert Rules

```yaml
groups:
- name: api-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_errors_total[5m]) / rate(http_requests_total[5m]) > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Error rate above 1% for 5 minutes"
      runbook: "https://runbooks.internal/api/high-error-rate"

  - alert: HighLatency
    expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "p99 latency above 2 seconds"
```

## Dashboard Layout

### Service Overview Dashboard

```
Row 1: [Request Rate] [Error Rate] [p50/p95/p99 Latency] [Uptime]
Row 2: [CPU Usage]    [Memory]     [Disk I/O]            [Network]
Row 3: [Active Connections] [Queue Depth] [Cache Hit Rate]
Row 4: [Recent Deployments] [Active Alerts] [Error Log Stream]
```

### SLO Dashboard

| SLI | SLO Target | Current | Budget Remaining |
|-----|-----------|---------|-----------------|
| Availability | 99.9% | 99.95% | 72% |
| Latency (p99) | < 500ms | 320ms | 85% |
| Error Rate | < 0.1% | 0.05% | 90% |

## Tool Stack Recommendations

| Category | Tool | Alternative |
|----------|------|-------------|
| Metrics | Prometheus | Datadog, CloudWatch |
| Visualization | Grafana | Datadog, Kibana |
| Logs | Loki / ELK | Datadog, CloudWatch Logs |
| Traces | Jaeger / Tempo | Datadog APM, X-Ray |
| Alerting | Alertmanager | PagerDuty, OpsGenie |
| Uptime | Uptime Robot | Pingdom, StatusCake |
