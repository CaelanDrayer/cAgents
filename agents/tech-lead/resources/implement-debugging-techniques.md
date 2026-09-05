# Senior Developer Debugging Techniques

Systematic approaches to troubleshooting and debugging.

## Debugging Framework

```yaml
debug_methodology:
  1_reproduce:
    goal: "Consistently trigger the issue"
    actions:
      - "Get exact reproduction steps"
      - "Identify affected environments"
      - "Note frequency (always, sometimes, rarely)"

  2_isolate:
    goal: "Narrow down the cause"
    actions:
      - "Binary search through code changes"
      - "Disable components to find culprit"
      - "Check if issue is data-dependent"

  3_understand:
    goal: "Know exactly why it happens"
    actions:
      - "Trace execution flow"
      - "Examine state at failure point"
      - "Identify root cause vs symptoms"

  4_fix:
    goal: "Correct the issue properly"
    actions:
      - "Fix root cause, not symptom"
      - "Consider edge cases"
      - "Add regression test"

  5_verify:
    goal: "Confirm the fix works"
    actions:
      - "Test original reproduction"
      - "Test related scenarios"
      - "Monitor after deployment"
```

## Browser Debugging

### Console Techniques

```javascript
// Conditional breakpoints
console.assert(condition, 'Failed condition:', data);

// Grouped logging
console.group('API Request');
console.log('URL:', url);
console.log('Params:', params);
console.groupEnd();

// Table view for arrays/objects
console.table(users.map(u => ({ id: u.id, name: u.name })));

// Timing operations
console.time('fetchData');
await fetchData();
console.timeEnd('fetchData'); // fetchData: 234.56ms

// Stack trace
console.trace('How did we get here?');

// Count occurrences
function handleClick() {
  console.count('click'); // click: 1, click: 2, etc.
}
```

### Network Debugging

```yaml
network_issues:
  slow_requests:
    check:
      - "Server response time (TTFB)"
      - "Download time (payload size)"
      - "DNS/connection time"
    tools:
      - "Network tab waterfall"
      - "Performance tab timing"

  failed_requests:
    check:
      - "Response status code"
      - "Response body for error message"
      - "Request payload correctness"
      - "CORS headers"

  caching_issues:
    check:
      - "Cache-Control headers"
      - "ETag/Last-Modified"
      - "Service Worker interception"
```

### React DevTools

```yaml
react_debugging:
  component_tree:
    - "Find component in tree"
    - "Inspect props and state"
    - "Track render count with Profiler"

  render_debugging:
    - "Highlight updates option"
    - "Record why components rendered"
    - "Identify unnecessary re-renders"

  hooks_inspection:
    - "View hook values in real-time"
    - "Track state changes"
    - "Debug custom hooks"
```

## Node.js Debugging

### Built-in Debugger

```bash
# Start with inspector
node --inspect server.js

# Break on first line
node --inspect-brk server.js

# Connect via Chrome DevTools
# chrome://inspect
```

### Logging Strategies

```javascript
// Structured logging
const log = {
  debug: (msg, data) => console.log(JSON.stringify({
    level: 'debug',
    timestamp: new Date().toISOString(),
    message: msg,
    ...data
  })),
  error: (msg, error) => console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    message: msg,
    error: error.message,
    stack: error.stack
  }))
};

// Contextual logging
function processOrder(order) {
  const ctx = { orderId: order.id, userId: order.userId };
  log.debug('Processing order', ctx);
  // ... processing
  log.debug('Order processed', { ...ctx, duration: elapsed });
}
```

### Memory Leak Detection

```javascript
// Heap snapshot comparison
// 1. Take snapshot before operation
// 2. Perform suspected operation
// 3. Take snapshot after
// 4. Compare retained objects

// Common leak patterns:
// - Event listeners not removed
// - Closures holding references
// - Growing arrays/maps without cleanup
// - Timers/intervals not cleared

// Detection script
const used = process.memoryUsage();
console.log({
  heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
  heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
  external: Math.round(used.external / 1024 / 1024) + ' MB'
});
```

## Database Debugging

### Query Analysis

```sql
-- Explain query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Check for missing indexes
-- Look for: Seq Scan on large tables
-- Look for: High cost estimates
-- Look for: Actual time >> estimated time
```

### Common Issues

```yaml
database_issues:
  slow_queries:
    diagnose:
      - "Check query plan (EXPLAIN ANALYZE)"
      - "Look for missing indexes"
      - "Check for N+1 patterns"
      - "Verify table statistics current"

  connection_issues:
    diagnose:
      - "Check connection pool exhaustion"
      - "Verify network connectivity"
      - "Check for long-running transactions"

  data_issues:
    diagnose:
      - "Check for constraint violations"
      - "Verify data integrity"
      - "Look for encoding issues"
```

## Performance Debugging

### Frontend Performance

```javascript
// Measure paint timing
const paintEntries = performance.getEntriesByType('paint');
console.log('First Paint:', paintEntries[0]?.startTime);
console.log('First Contentful Paint:', paintEntries[1]?.startTime);

// Measure Long Tasks
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Long task:', entry.duration, 'ms', entry);
  }
});
observer.observe({ entryTypes: ['longtask'] });

// React profiling
<Profiler id="Component" onRender={onRenderCallback}>
  <Component />
</Profiler>

function onRenderCallback(
  id, phase, actualDuration, baseDuration,
  startTime, commitTime, interactions
) {
  console.log(`${id} rendered in ${actualDuration}ms (phase: ${phase})`);
}
```

### Backend Performance

```javascript
// Request timing middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // ms

    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration.toFixed(2)}ms`
    });
  });

  next();
});

// Database query timing
const queryWithTiming = async (sql, params) => {
  const start = Date.now();
  try {
    const result = await db.query(sql, params);
    console.log(`Query took ${Date.now() - start}ms: ${sql.slice(0, 50)}...`);
    return result;
  } catch (error) {
    console.error(`Query failed after ${Date.now() - start}ms:`, error);
    throw error;
  }
};
```

## Error Tracking

### Error Boundaries (React)

```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    console.error('Caught error:', error, errorInfo);
    trackError(error, {
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Global Error Handlers

```javascript
// Browser
window.onerror = (message, source, line, col, error) => {
  trackError(error || message, { source, line, col });
};

window.onunhandledrejection = (event) => {
  trackError(event.reason, { type: 'unhandledRejection' });
};

// Node.js
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  trackError(error, { type: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  trackError(reason, { type: 'unhandledRejection' });
});
```

## Debugging Checklist

### When Starting Debug Session

```yaml
initial_checklist:
  - [ ] Can I reproduce the issue?
  - [ ] What changed recently? (code, data, config)
  - [ ] Is it environment-specific?
  - [ ] Do I have access to logs/monitoring?
  - [ ] What's the impact/urgency?
```

### During Debugging

```yaml
investigation_checklist:
  - [ ] Check error messages and stack traces
  - [ ] Review recent commits/deployments
  - [ ] Check for similar past issues
  - [ ] Verify data integrity
  - [ ] Test with minimal reproduction
  - [ ] Check external dependencies (APIs, services)
```

### After Fixing

```yaml
completion_checklist:
  - [ ] Regression test added
  - [ ] Root cause documented
  - [ ] Related code reviewed for similar issues
  - [ ] Monitoring/alerting added if needed
  - [ ] Team notified of resolution
```

## Common Bug Patterns

```yaml
bug_patterns:
  race_conditions:
    symptoms: "Intermittent failures, order-dependent"
    debug: "Add logging with timestamps, use tools like race detector"
    fix: "Proper synchronization, abort controllers"

  memory_leaks:
    symptoms: "Gradual performance degradation"
    debug: "Heap snapshots over time"
    fix: "Clean up subscriptions, listeners, intervals"

  off_by_one:
    symptoms: "Missing first/last item, array bounds"
    debug: "Log array lengths and indices"
    fix: "Review loop conditions carefully"

  null_reference:
    symptoms: "Cannot read property of undefined"
    debug: "Trace data flow, check optional chaining"
    fix: "Defensive coding, TypeScript strict null checks"

  state_mutation:
    symptoms: "UI not updating, stale data"
    debug: "Check for direct mutations, React DevTools"
    fix: "Immutable updates, spread operators"

  timezone_issues:
    symptoms: "Dates off by hours, wrong day"
    debug: "Log dates with timezone info"
    fix: "Consistent UTC storage, explicit timezone handling"
```
