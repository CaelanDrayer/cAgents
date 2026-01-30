# Parallel Execution Strategy

Execute independent optimizations simultaneously for 3-10x speedup.

## Grouping Strategy

Group optimizations by file dependencies:

```javascript
// Optimizations are independent if they don't touch the same files
const independentGroups = groupByIndependence(opportunities)
// Example:
// Group A: [opt_001, opt_003, opt_007] - different files, can run in parallel
// Group B: [opt_002, opt_004] - same file, must run sequentially
// Group C: [opt_005] - depends on Group A, runs after
```

## Parallel Execution Example

```javascript
for (const group of independentGroups) {
  // Launch all tasks in group simultaneously
  const taskIds = group.map(opt =>
    Task({
      subagent_type: opt.specialist,
      description: `Apply ${opt.name}`,
      run_in_background: true,
      prompt: `Apply optimization ${opt.id} from opportunities.yaml

      Use ATOMIC OPERATIONS:
      1. Create git stash before changes
      2. Apply optimization
      3. Run validation
      4. If success: commit, else: rollback

      Write results to: optimizations/${opt.id}/result.yaml`
    })
  )

  // Wait for all in group (with timeout)
  const results = await Promise.all(
    taskIds.map(id => TaskOutput({task_id: id, block: true, timeout: 300000}))
  )

  // Check for failures, rollback group if any fail
  if (results.some(r => r.status === 'failed')) {
    await rollbackGroup(group)
  }
}
```

## Atomic Operations with Rollback

```bash
# Before each optimization
optimization_id="opt_001"
git stash push -m "Pre-optimization snapshot $optimization_id"
git branch "optimization-$optimization_id"
git checkout "optimization-$optimization_id"

# Apply optimization
# ... changes here ...

# Validate
if npm test && npm run build; then
  # Success - merge back
  git checkout main
  git merge "optimization-$optimization_id"
  git branch -d "optimization-$optimization_id"
  echo "status: success" > optimizations/$optimization_id/result.yaml
else
  # Failure - rollback
  git checkout main
  git branch -D "optimization-$optimization_id"
  git stash pop
  echo "status: failed" > optimizations/$optimization_id/result.yaml
fi
```

## Real-Time Progress Tracking

```javascript
// Update progress as each optimization completes
const totalOpts = opportunities.length
let completed = 0

// Stream results as they complete
for (const result of completedOptimizations) {
  completed++
  console.log(`✓ ${result.id}: ${result.name} [${result.safety}] (${result.impact})`)
}
```

## Dry-Run Mode

```javascript
if (dryRun) {
  for (const opt of opportunities) {
    const preview = await previewOptimization(opt)
    console.log(`\n[DRY-RUN] ${opt.id}: ${opt.name}`)
    console.log(`Files changed: ${preview.files.length}`)
    console.log(`Estimated impact: ${opt.predicted_impact}`)
    console.log(`\nDiff preview:`)
    console.log(preview.diff)
  }
}
```
