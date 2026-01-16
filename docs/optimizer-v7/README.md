# Optimizer V7.0 Documentation

**Version**: 7.0 (V6.8 → V7.0 upgrade)
**Status**: Production Ready
**Last Updated**: 2026-01-16

## Overview

Optimizer V7.0 is a universal optimizer with trigger-style workflow, controller-centric coordination, and zero-arg invocation for automatic optimization target detection.

## Key Features

- **Zero-Arg Invocation**: `opt` with no arguments auto-detects targets
- **Natural Language Goals**: "Make the app faster" → performance optimization
- **8 Optimization Types**: code, content, process, data, infrastructure, campaign, creative, sales
- **Instruction-Based**: Full `inst_{id}` folder with workflow tracking
- **Controller Coordination**: Question-based delegation to specialists
- **60+ Detection Patterns**: Comprehensive auto-scan across all types
- **Continuous Mode**: Background optimization monitoring
- **Before/After Metrics**: Comprehensive impact measurement

## Documentation Files

### Migration & Usage
- **`OPTIMIZER_V7_MIGRATION_GUIDE.md`** - V6.0 → V7.0 upgrade guide
  - What's new in V7.0
  - Migration steps
  - Invocation patterns
  - Configuration updates
  - Best practices

### Testing & Validation
- **`OPTIMIZER_V7_TEST_RESULTS.md`** - Test results and validation
  - Test scenarios
  - Performance benchmarks
  - Success criteria validation
  - Edge case handling

## Quick Start

### Using Optimizer V7.0

**Zero-Arg Invocation** (NEW in V7.0):
```bash
/optimize                              # Auto-detect everything
```

**Natural Language Goals**:
```bash
/optimize "Make the app faster"        # Performance optimization
/optimize "Reduce bundle size"         # Code optimization
/optimize "Improve user experience"    # UX optimization
```

**Specific Target** (V6.0 compatible):
```bash
/optimize src/ --type code             # Optimize code in src/
/optimize docs/ --type content         # Optimize documentation
```

**Continuous Monitoring** (NEW):
```bash
/optimize --continuous --interval 1d   # Daily background monitoring
```

### V7.0 Workflow (5 Phases)

1. **Detection**: Auto-detect optimization opportunities
   - Scans project using 60+ patterns
   - Classifies by type (code, content, process, etc.)
   - Estimates impact and complexity

2. **Analysis**: Analyze baseline and opportunities
   - Measures current state
   - Identifies high-priority opportunities
   - Estimates improvement potential

3. **Planning**: Create optimization plan
   - Controller: Appropriate controller based on type
   - Objectives: What to optimize
   - Approach: Question-based delegation

4. **Execution**: Apply optimizations
   - Controller asks questions to specialists
   - Synthesizes optimization strategy
   - Implements changes incrementally

5. **Validation**: Measure impact
   - Compare before/after metrics
   - Validate improvements
   - Track regression risks

## 8 Optimization Types

1. **Code**: Performance, bundle size, quality
2. **Content**: Clarity, consistency, SEO
3. **Process**: Efficiency, automation, bottlenecks
4. **Data**: Schema, queries, storage
5. **Infrastructure**: Scaling, costs, reliability
6. **Campaign**: Conversion, engagement, ROI
7. **Creative**: Quality, consistency, impact
8. **Sales**: Pipeline, close rate, efficiency

## Configuration

Optimizer V7.0 uses configuration in `Agent_Memory/_system/optimize/`:

- `intent_patterns.yaml` - Natural language goal mapping
- `scan_patterns.yaml` - 60+ detection patterns
- `optimization_plan.yaml` - Plan template

## Agent Location

- **Command**: `core/commands/optimize.md`
- **Agent**: `core/agents/optimizer.md`

## V7.0 Improvements

**From V6.0**:
- ✅ Zero-arg invocation (auto-detect targets)
- ✅ Natural language goals ("make it faster")
- ✅ Instruction-based workflow (full tracking)
- ✅ Controller coordination (question-based delegation)
- ✅ 60+ detection patterns (comprehensive scanning)
- ✅ Continuous monitoring mode (background optimization)
- ✅ Before/after metrics (impact measurement)

**Backward Compatibility**:
- V6.0 usage (specific target + type) still works
- All existing optimization types preserved
- No breaking changes

## Use Cases

- **Performance**: "Make the app faster" → Bundle size, lazy loading, caching
- **Quality**: "Improve code quality" → Linting, refactoring, tests
- **UX**: "Improve user experience" → Navigation, feedback, accessibility
- **SEO**: "Optimize for search" → Metadata, content, structure
- **Infrastructure**: "Reduce costs" → Scaling, caching, resource usage

## Best Practices

1. **Start with Auto-Detection**: Let optimizer scan and find opportunities
2. **Prioritize High-Impact**: Focus on optimizations with biggest benefit
3. **Measure Impact**: Always compare before/after metrics
4. **Incremental Changes**: Apply optimizations gradually
5. **Continuous Mode**: For long-running projects, use background monitoring

## Questions?

See:
- **Migration Guide**: `OPTIMIZER_V7_MIGRATION_GUIDE.md`
- **Test Results**: `OPTIMIZER_V7_TEST_RESULTS.md`
- **Main Docs**: `../README.md`

---

**Optimizer V7.0** - Universal optimization with auto-detection
