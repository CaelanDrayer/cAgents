# Frontend Performance

## Bundle Size

Check for:
- Large dependencies
- Missing code splitting
- No tree shaking

## Re-render Issues

### BAD - Creates new object every render
```javascript
<Component style={{ margin: 10 }} />
```

### GOOD - Memoized style object
```javascript
const style = useMemo(() => ({ margin: 10 }), []);
<Component style={style} />
```

## Integration with Tools

- **Chrome DevTools** - Performance profiling, memory snapshots
- **Lighthouse** - Performance audits
- **webpack-bundle-analyzer** - Bundle size analysis
- **React DevTools Profiler** - Component render analysis
- **New Relic / DataDog** - Production performance monitoring

## Example Performance Test

```javascript
// Benchmark function execution time
console.time('operation');
expensiveOperation();
console.timeEnd('operation');

// Memory usage
const before = process.memoryUsage().heapUsed;
operationThatMightLeak();
const after = process.memoryUsage().heapUsed;
console.log(`Memory increase: ${(after - before) / 1024 / 1024} MB`);
```

## Best Practices

- Bundle size under 500KB (gzipped)
- Images optimized and lazy-loaded
- Code splitting implemented for large apps
- Expensive computations memoized
- Pagination implemented for large lists
- No blocking operations on main thread
