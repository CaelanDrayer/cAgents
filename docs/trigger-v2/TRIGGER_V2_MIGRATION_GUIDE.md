# Trigger V2.0 Migration Guide

**From**: V1.0 (Simple keyword detection)
**To**: V2.0 (Context-aware detection, templates, validation, analytics)
**Migration Complexity**: LOW (100% backward compatible)
**Estimated Time**: 15-30 minutes

---

## Quick Start (TL;DR)

**Good News**: V1.0 usage continues to work without any changes!

**To access V2.0 features**:
1. Ensure 4 config files exist in `Agent_Memory/_system/trigger/` (should be there already)
2. Try: `/trigger Fix bug --interactive` to explore V2.0 features
3. Try: `/trigger Add feature --dry-run` to preview workflow
4. Read this guide for comprehensive V2.0 capabilities

**That's it!** V2.0 features activate automatically when config files present.

---

## What's Changed

### V1.0 → V2.0 Comparison

| Feature | V1.0 | V2.0 |
|---------|------|------|
| **Domain Detection** | Keyword-only | 3-method (keyword + context + framework) |
| **Confidence Scoring** | No | Yes (0.0-1.0) |
| **Intent Classification** | No | Yes (9 patterns) |
| **Workflow Templates** | No | Yes (13 templates) |
| **Pre-Flight Validation** | No | Yes (4 levels) |
| **Interactive Mode** | No | Yes (`--interactive`) |
| **Dry-Run Mode** | No | Yes (`--dry-run`) |
| **Framework Detection** | No | Yes (12+ frameworks) |
| **Analytics Tracking** | No | Yes (comprehensive) |
| **Success Prediction** | No | Yes (ML-ready) |
| **Backward Compatible** | N/A | ✅ 100% |

### What's Preserved

✅ **All V1.0 behavior unchanged**:
- Basic usage (`/trigger Fix bug`) works exactly as before
- instruction.yaml schema (extended, not changed)
- Orchestrator workflow (enhanced, not replaced)
- Universal agents (compatible with both versions)

---

## Migration Steps

### Step 1: Verify Config Files Exist

**Check if V2.0 config files present**:

```bash
ls -la Agent_Memory/_system/trigger/

# Expected files (should see 4 YAML files):
# - domain_detection_v2.yaml (386 lines)
# - workflow_templates.yaml (524 lines)
# - preflight_validation.yaml (501 lines)
# - workflow_analytics.yaml (430 lines)
```

**If missing**: These files should have been created during V2.0 installation. Contact support or check installation logs.

**Status Check**:
```bash
# V2.0 features enabled if:
if [ -f "Agent_Memory/_system/trigger/domain_detection_v2.yaml" ]; then
  echo "✅ V2.0 Enhanced Detection Enabled"
else
  echo "⚠️ V1.0 Fallback Mode (config files missing)"
fi
```

### Step 2: Verify Agent Files Updated

**Check trigger agent version**:

```bash
grep "version:" core/agents/trigger.md

# Expected: version: 2.0
```

**Check orchestrator version**:

```bash
grep "version:" core/agents/orchestrator.md

# Expected: version: 5.1 (V5.1 has Trigger V2.0 integration)
```

**Check trigger command version**:

```bash
grep "version:" core/commands/trigger.md

# Expected: version: "2.0"
```

### Step 3: Test V1.0 Compatibility

**Run basic V1.0 commands to verify backward compatibility**:

```bash
# Test 1: Simple bug fix (engineering domain)
/trigger Fix authentication timeout bug

# Should work exactly as before:
# - Domain detected: engineering
# - Instruction folder created
# - Workflow proceeds to orchestrator

# Test 2: Creative content (creative domain)
/trigger Write a short story about space pirates

# Should work exactly as before:
# - Domain detected: creative
# - Instruction folder created
# - Workflow proceeds

# Test 3: Question (tier 0, direct answer)
/trigger What is the authentication flow?

# Should work exactly as before:
# - Tier 0 detected
# - Direct answer provided
# - No workflow created
```

**Expected Result**: All V1.0 commands work without issues.

### Step 4: Explore V2.0 Features

**Test V2.0 enhanced detection**:

```bash
# Test context-aware detection (Next.js project)
cd my-nextjs-project/
/trigger Fix the authentication bug

# V2.0 enhancements you'll see:
# - Domain: engineering (confidence: 0.92)
# - Framework: Next.js (confidence: 0.95)
# - Intent: bug_fix (confidence: 0.90)
# - Template: bug_fix (confidence: 0.85)
# - Pre-flight: PASSED (score: 0.82)
```

**Test interactive mode**:

```bash
/trigger Fix authentication bug --interactive

# You'll be prompted:
# ? Proceed with these settings? (Y/n)
# ? Change tier? (N/y)
# ? Change controller? (N/y)
# ? Execution mode? › Sequential (recommended)
```

**Test dry-run mode**:

```bash
/trigger Add payment gateway integration --dry-run

# You'll see preview:
# - Detection results (domain, intent, framework, confidence)
# - Pre-flight validation results
# - Estimated tier, duration, success probability
# - Workflow phases (routing → planning → ... → validating)
# - No instruction folder created, no execution
```

### Step 5: Update Team Documentation (Optional)

**If you have team docs**, update them to reference V2.0 capabilities:

**Before (V1.0)**:
```markdown
## Trigger Workflow
Use `/trigger <request>` to start a workflow.
Domain is detected from keywords.
```

**After (V2.0)**:
```markdown
## Trigger Workflow V2.0
Use `/trigger <request>` to start a workflow.

V2.0 Features:
- Context-aware detection (90%+ accuracy)
- Use `--interactive` for first-time workflows
- Use `--dry-run` to preview before executing
- Use `--template <name>` for common workflows

Examples:
- `/trigger Fix bug --interactive` (guided workflow)
- `/trigger Add feature --dry-run` (preview first)
- `/trigger Create budget --template budget_creation` (use template)
```

---

## V2.0 Feature Adoption

### Feature 1: Interactive Mode

**When to Use**:
- First time using trigger for a task type
- Ambiguous requests (could be multiple domains)
- Want to customize tier, controller, or execution mode
- Need to verify detection accuracy

**How to Use**:
```bash
/trigger <request> --interactive
```

**Example**:
```bash
/trigger Implement OAuth2 authentication --interactive

# Workflow Summary:
#   Domain: engineering (85% confidence)
#   Intent: Feature (80% confidence)
#   Template: feature_addition
#   Framework: Next.js
#   Pre-flight: PASSED (0.78)
#   Estimated tier: 3
#   Success probability: 75%
#
# ? Proceed with these settings? (Y/n)
```

**Benefits**:
- Verify detection accuracy
- Customize before executing
- Learn V2.0 capabilities

### Feature 2: Dry-Run Mode

**When to Use**:
- Unfamiliar with workflow type
- Want to estimate time/cost
- Verify detection before committing
- Learn what phases will execute

**How to Use**:
```bash
/trigger <request> --dry-run
```

**Example**:
```bash
/trigger Migrate to microservices --dry-run

# Workflow Preview (Dry-Run Mode):
#   Domain: engineering (0.92)
#   Intent: refactor (0.85)
#   Template: architecture_migration
#   Tier: 4 (expert, requires HITL)
#   Duration: 4-12 weeks
#   Token budget: 200,000
#   Success probability: 70%
#
# Phases:
#   1. Routing → Tier 4, executive oversight
#   2. Planning → CTO + Architect + Manager
#   3. Coordinating → 50 questions max
#   4. Executing → Phased rollout
#   5. Validating → Comprehensive gates
#
# [Preview only, no execution]
```

**Benefits**:
- Risk-free preview
- Understand scope before committing
- Budget time/resources accurately

### Feature 3: Template-Based Workflows

**When to Use**:
- Common workflow types (bug fix, feature, budget, etc.)
- Want to use proven patterns
- Need consistent approach across team

**How to Use**:
```bash
/trigger <request> --template <template_name>
```

**Available Templates**:
- `bug_fix` - Bug fixes (tier 2)
- `feature_addition` - New features (tier 3)
- `code_refactor` - Code refactoring (tier 3)
- `architecture_migration` - Major migrations (tier 4)
- `content_creation` - Content/blog/copy (tier 2)
- `story_development` - Stories/novels (tier 3)
- `campaign_planning` - Marketing campaigns (tier 3)
- `sales_forecast` - Sales forecasting (tier 2)
- `analysis_request` - General analysis (tier 2)
- `budget_creation` - Budget creation (tier 3)
- `documentation_creation` - Documentation (tier 2)

**Example**:
```bash
/trigger Create Q4 operating budget --template budget_creation

# Template defaults applied:
#   Tier: 3
#   Controller: fp-and-a-manager
#   Supporting: financial-analyst
#   Execution: sequential
#   Max questions: 20
#   Validation: [completeness, accuracy, assumptions]
```

**Benefits**:
- Faster initialization (defaults eliminate guesswork)
- Proven patterns (based on successful workflows)
- Consistency across team

### Feature 4: Domain/Tier Overrides

**When to Use**:
- Detection incorrect for edge cases
- Know domain/tier from experience
- Want to force specific routing

**How to Use**:
```bash
/trigger <request> --domain <domain>
/trigger <request> --tier <N>
```

**Example**:
```bash
# Force engineering domain (might be detected as product)
/trigger Analyze API usage patterns --domain engineering

# Force tier 3 (might be classified as tier 2)
/trigger Refactor auth module --tier 3
```

**Benefits**:
- Override incorrect detection
- Control workflow complexity
- Use domain expertise

---

## Understanding V2.0 Output

### Enhanced Instruction Metadata

**V1.0 instruction.yaml**:
```yaml
id: inst_20260116_001
domain: engineering
confidence: 0.85
raw_input: "Fix authentication bug"
```

**V2.0 instruction.yaml** (enhanced):
```yaml
id: inst_20260116_001
domain: engineering

# V2.0: Detection metadata
detection:
  confidence: 0.92
  method: context_aware_v2
  alternatives: [{domain: product, confidence: 0.35}]
  intent:
    primary: bug_fix
    confidence: 0.90
  framework:
    name: nextjs
    confidence: 0.95

# V2.0: Template metadata
template:
  matched: bug_fix
  confidence: 0.85
  defaults:
    tier: 2
    controller: engineering:engineering-manager
    max_questions: 15

# V2.0: Pre-flight results
preflight:
  status: PASSED
  score: 0.82
  warnings: []

# V2.0: Recommendations
recommendations:
  tier: 2
  estimated_duration: "15-45 minutes"
  estimated_token_budget: 35000
  success_probability: 0.85
  based_on_history: 47_similar_workflows
```

**What to look for**:
- **detection.confidence**: >= 0.7 is good, < 0.5 needs review
- **template.matched**: Shows which template used (or null if custom)
- **preflight.status**: PASS/WARN/FAIL (PASS proceeds automatically)
- **recommendations.success_probability**: Predicted success (higher is better)

### Pre-Flight Validation Reports

**Location**: `Agent_Memory/{instruction_id}/workflow/preflight_validation.yaml`

**Structure**:
```yaml
overall_result: PASS  # or WARN, FAIL
overall_score: 0.82

levels:
  context_completeness: {score: 0.88, result: PASS}
  feasibility: {score: 0.85, result: PASS}
  resources: {score: 0.78, result: PASS}
  conflicts: {score: 0.90, result: PASS}

issues:
  critical: []
  major: []
  minor: ["Question utilization 80% (acceptable)"]

recommendations:
  - "All checks passed, safe to proceed"

next_action: proceed
```

**How to interpret**:
- **PASS** (score >= 0.70): Workflow can proceed safely
- **WARN** (score 0.50-0.70): Issues detected, review before proceeding
- **FAIL** (score < 0.50): Critical issues, workflow blocked

**Common WARN triggers**:
- Domain confidence < 0.7 but >= 0.5
- Resource constraints (token budget tight)
- Parallel workflow conflicts (same files being edited)

**Common FAIL triggers**:
- Domain confidence < 0.5 (cannot determine domain)
- Required resources unavailable (controller not found)
- Critical conflicts (blocking dependency)

---

## Troubleshooting

### Issue 1: "Config file not found"

**Symptom**:
```
Warning: domain_detection_v2.yaml not found
Falling back to V1.0 keyword detection
```

**Cause**: V2.0 config files missing from `Agent_Memory/_system/trigger/`

**Solution**:
1. Check if files exist: `ls Agent_Memory/_system/trigger/*.yaml`
2. If missing, verify V2.0 installation completed
3. Contact support or check installation logs
4. Temporary workaround: V1.0 fallback still works

### Issue 2: "Pre-flight validation failed"

**Symptom**:
```
Pre-flight Validation: FAIL (score: 0.45)
Issues:
  - Domain confidence too low (0.42)
  - Required controller not found
Workflow blocked.
```

**Cause**: Pre-flight validation detected issues preventing workflow execution

**Solutions**:
- **Low domain confidence**: Use `--domain <domain>` to override
- **Controller not found**: Verify domain agents installed, or use `--skip-preflight` (not recommended)
- **Resource constraints**: Simplify request, or use `--tier` to override

**Example fix**:
```bash
# Original (failed):
/trigger Analyze user behavior

# Fixed (domain override):
/trigger Analyze user behavior --domain engineering
```

### Issue 3: "Template confidence low"

**Symptom**:
```
Template matched: bug_fix (confidence: 0.58)
Suggestion: Consider custom workflow
```

**Cause**: Request partially matches template but not strongly

**Solutions**:
- **Proceed with template**: Defaults still helpful (confidence >= 0.6)
- **Force custom workflow**: Clearer if confidence < 0.6
- **Use --template**: Explicitly specify template if you know which one

**Example**:
```bash
# Let V2.0 decide (may use template or custom):
/trigger Fix intermittent timeout issue

# Force specific template:
/trigger Fix intermittent timeout issue --template bug_fix
```

### Issue 4: "V1.0 commands behaving differently"

**Symptom**: V1.0 commands seem slower or different

**Cause**: V2.0 adds context gathering and pre-flight validation

**Solutions**:
- **Normal**: V2.0 adds ~3-5 seconds for context gathering + validation
- **Still faster overall**: Saves time later (fewer retries, better routing)
- **Skip if urgent**: Use `--skip-preflight` for emergency workflows

**Comparison**:
```
V1.0: 15 seconds init → 30 minutes execution → 5 minutes retry → 50 minutes total
V2.0: 18 seconds init → 25 minutes execution → 0 minutes retry → 43 minutes total
        ↑ (+3s context) ↓ (better routing) ↓ (no retry needed) ↓ (7 min faster)
```

---

## Best Practices

### 1. Use Interactive Mode for New Workflow Types

**Do**:
```bash
# First time creating a sales forecast:
/trigger Create Q1 sales forecast --interactive

# Review detection, verify template, proceed
```

**Don't**:
```bash
# Blindly execute unfamiliar workflow:
/trigger Create Q1 sales forecast

# May succeed, but you miss learning/verification opportunity
```

### 2. Use Dry-Run for High-Risk Workflows

**Do**:
```bash
# Preview tier 4 migration before executing:
/trigger Migrate to microservices --dry-run

# Review estimated duration (4-12 weeks), cost (200K tokens)
# Verify HITL gates, controllers, phases
# Then execute if confident
```

**Don't**:
```bash
# Execute tier 4 workflow without preview:
/trigger Migrate to microservices

# May be surprised by scope, duration, resource requirements
```

### 3. Use Templates for Consistency

**Do**:
```bash
# Use bug_fix template for all bug fixes:
/trigger Fix authentication bug --template bug_fix
/trigger Fix payment processing error --template bug_fix

# Consistent approach across team
```

**Don't**:
```bash
# Mix templates or custom workflows for same task type:
/trigger Fix bug A  # Uses template
/trigger Fix bug B --tier 3  # Overrides, inconsistent
```

### 4. Review Pre-Flight Warnings

**Do**:
```bash
# If pre-flight shows WARN:
# Pre-flight: WARN (score: 0.65)
# Warnings:
#   - Token budget 90% utilized
#   - Parallel workflow conflict with inst_20260116_002

# Review warnings, decide:
# - Increase token budget? Use --skip-preflight?
# - Wait for other workflow to complete?
```

**Don't**:
```bash
# Ignore warnings and proceed blindly:
# May hit token limits mid-workflow
# May conflict with parallel workflow
```

---

## FAQs

### Q1: Do I need to change anything to use V2.0?

**A**: No! V1.0 usage continues to work. V2.0 features activate automatically when config files present. Use flags (`--interactive`, `--dry-run`, etc.) to access new capabilities.

### Q2: Will V2.0 break my existing workflows?

**A**: No. 100% backward compatible. Existing instruction folders, orchestrator logic, universal agents all work with both versions.

### Q3: How do I know if V2.0 is enabled?

**A**: Check for enhanced output:
- Domain detection includes confidence score (e.g., "engineering (0.92)")
- Intent classification shown (e.g., "Intent: bug_fix (0.90)")
- Pre-flight validation results displayed (e.g., "Pre-flight: PASSED (0.82)")
- Recommendations provided (tier, duration, success probability)

If you don't see these, V1.0 fallback is active (config files missing).

### Q4: Can I disable V2.0 features?

**A**: Yes, two ways:
1. **Remove config files**: Move `Agent_Memory/_system/trigger/*.yaml` to backup folder
2. **Use V1.0 style**: Don't use V2.0 flags (`--interactive`, `--dry-run`, etc.)

V2.0 detection/validation still runs (fast, non-intrusive) but you won't interact with it.

### Q5: What if pre-flight validation blocks my workflow incorrectly?

**A**: Use `--skip-preflight`:
```bash
/trigger Emergency hotfix --skip-preflight
```

This bypasses all validation (not recommended except for emergencies). Review validation report to understand why it failed, fix for future workflows.

### Q6: How do I create custom templates?

**A**: Edit `Agent_Memory/_system/trigger/workflow_templates.yaml`:
```yaml
my_custom_template:
  name: "My Custom Workflow"
  applies_to:
    intents: [feature]
    domains: [engineering]
  defaults:
    tier: 3
    primary_controller: engineering:my-controller
    execution_mode: parallel
```

Template will auto-match for future workflows matching intent + domain.

### Q7: Can I contribute to V2.0 improvements?

**A**: Yes! V2.0 learns from usage:
- Analytics track all workflows (metrics, patterns, successes, failures)
- Historical learning adjusts detection weights based on corrections
- Prediction model improves with more data
- Simply use V2.0, system learns automatically

For feature requests or bug reports, contact support.

---

## Getting Help

**Documentation**:
- `docs/TRIGGER_V2_OPTIMIZATION_SUMMARY.md` - Complete V2.0 overview
- `docs/TRIGGER_V2_ARCHITECTURE.md` - Technical architecture
- `docs/TRIGGER_V2_TEST_SCENARIOS.md` - Test scenarios and benchmarks
- `core/agents/trigger.md` - Trigger agent V2.0 implementation
- `core/agents/orchestrator.md` - Orchestrator V5.1 (V2.0 integration)

**Config Files**:
- `Agent_Memory/_system/trigger/domain_detection_v2.yaml` - Detection rules
- `Agent_Memory/_system/trigger/workflow_templates.yaml` - Template catalog
- `Agent_Memory/_system/trigger/preflight_validation.yaml` - Validation framework
- `Agent_Memory/_system/trigger/workflow_analytics.yaml` - Analytics config

**Support**:
- GitHub Issues: Report bugs, request features
- Team Chat: Ask questions, share experiences
- Email: support@cagents.example.com

---

## Summary

**Migration is simple**:
1. ✅ V1.0 usage continues to work (100% backward compatible)
2. ✅ V2.0 features activate automatically (config files present)
3. ✅ Try `--interactive` and `--dry-run` flags to explore V2.0
4. ✅ Review enhanced output (confidence scores, predictions, recommendations)
5. ✅ Adopt V2.0 features at your own pace

**Key takeaway**: You don't need to migrate anything. V2.0 is ready to use when you are.

---

**Version**: 2.0
**Date**: 2026-01-16
**Complexity**: LOW (backward compatible)
**Estimated Migration Time**: 15-30 minutes (mostly exploring V2.0 features)
