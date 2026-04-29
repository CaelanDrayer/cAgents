# /improve Baseline & Suppression System

Track acknowledged findings across reviews to eliminate finding fatigue. Users focus on new issues only.

## Baseline File Schema

```yaml
# cagents-memory/_system/commands/review/baseline.yaml
version: 1
last_updated: "{ISO_TIMESTAMP}"
last_session: review_{slug}_{YYMMDD}_{NNN}
baselines:
  "{file_path}":
    - finding_id: F-{NNN}
      description: "{finding description}"
      severity: critical|high|medium|low
      confidence: 0.0-1.0
      category: "{finding category -- security, performance, quality, etc.}"
      status: acknowledged|suppressed|deferred
      acknowledged_at: "{ISO_DATE}"
      review_session: review_{slug}_{YYMMDD}_{NNN}
      suppress_reason: "{optional reason for suppression}"
      deferred_until: "{optional ISO_DATE for deferred findings}"
```

## Finding Statuses

| Status | Meaning | Behavior with --baseline |
|--------|---------|--------------------------|
| `acknowledged` | Finding seen and noted | Filtered from results |
| `suppressed` | Explicitly suppressed by user | Filtered from results |
| `deferred` | Deferred to future date | Filtered until `deferred_until` date passes, then shown |

## Finding Matching Algorithm

When `--baseline` is active, each new finding is compared against baseline entries using this algorithm:

1. **File path match**: Finding must be in the same file as baseline entry
2. **Description similarity**: Compute similarity score between finding description and baseline description
3. **Threshold**: Score >= 0.85 counts as a match (handles minor wording changes)
4. **Severity escalation**: If a matched finding has a HIGHER severity than the baseline entry, it is shown as "escalated" (not filtered)

```
For each finding in current review:
  1. Look up file path in baseline
  2. If no baseline entries for this file: NEW finding (show)
  3. For each baseline entry in same file:
     a. Compute description similarity
     b. If similarity >= 0.85 AND status in [acknowledged, suppressed]:
        - If finding.severity > baseline.severity: ESCALATED (show with escalation note)
        - Else: BASELINE (filter)
     c. If similarity >= 0.85 AND status == deferred:
        - If today >= deferred_until: DEFERRED_EXPIRED (show)
        - Else: DEFERRED (filter)
  4. If no match found: NEW finding (show)
```

## Baseline Operations

### Auto-Update After Review

After every review completes (Phase 6), all findings are written to the baseline file:
- New findings: `status: acknowledged`
- Existing findings: retain their current status
- Findings no longer appearing: removed from baseline (issue was fixed)

### Manual Suppression

```bash
/review --suppress F-001
/review --suppress F-001 --reason "Known limitation, tracked in JIRA-1234"
```

Updates the baseline file entry for F-001 to `status: suppressed` with optional reason.

### Reset Baseline

```bash
/review --reset-baseline
```

Clears the entire baseline file. Next review starts fresh with all findings shown.

### Deferred Findings

Findings can be manually edited in the baseline file to set `status: deferred` with a `deferred_until` date. The review will filter them until that date passes.

## Report Integration

When `--baseline` is used, the report includes a "Baseline Summary" section:

```markdown
## Baseline Summary

- **Total findings this review**: 45
- **Baseline-filtered**: 32 (acknowledged: 28, suppressed: 4)
- **New findings**: 11
- **Escalated findings**: 2 (severity increased since last review)
- **Deferred (expired)**: 0

Showing 13 findings (11 new + 2 escalated).
```

## Quality Trend Integration

The baseline system feeds into quality trend tracking. Each review session records:
- Total findings (before baseline filtering)
- Baseline-filtered count
- New finding count
- Fixed findings (baseline entries that no longer appear)

This enables trend analysis: "Your codebase had 45 known issues. 3 were fixed since last review, 2 new ones appeared."
