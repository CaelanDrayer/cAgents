# Trigger V2.0 Optimization - Complete Instruction

**Date Created**: 2026-01-16
**Purpose**: Comprehensive instruction for optimizing the trigger workflow and trigger agent
**Context**: This is the 4th major workflow optimization following optimizer V7.0, reviewer V3.0, and designer V2.0
**Priority**: HIGH - Trigger is the foundation of all cAgents workflows

---

## Executive Summary

You are tasked with performing a **comprehensive optimization of the trigger workflow**, transforming it from V1.0 to V2.0. The trigger workflow is the universal entry point for ALL cAgents workflows and handles domain detection, instruction initialization, and orchestration delegation.

This optimization should make the trigger workflow **smarter, better, more effective, and more** by applying proven patterns from previous successful optimizations while innovating trigger-specific enhancements.

---

## Context: Previous Optimizations Completed

### 1. Optimizer V7.0 (COMPLETED)
**Results**: 5.6x faster, 92% accuracy, 100% safer
- Parallel execution with dependency analysis
- Framework-specific patterns (50+ patterns for Next.js, React, Django, etc.)
- Predictive modeling with confidence intervals
- Atomic rollback capability
- ML-ready pattern learning
- Real-time progress with streaming results

**Key Files**:
- `core/agents/optimizer.md` (802 lines, +189%)
- `Agent_Memory/_system/optimize/framework_patterns.yaml` (380 lines)
- `Agent_Memory/_system/optimize/scan_patterns.yaml` (525 lines)
- `docs/OPTIMIZER_V7_MIGRATION_GUIDE.md` (600 lines)

### 2. Reviewer V3.0 (COMPLETED)
**Results**: 4.5x faster, 90%+ accuracy, 95%+ actionable fixes
- Parallel execution (3 groups: Security, Quality, Performance)
- Framework-specific review patterns (35 patterns for 12 frameworks)
- Enhanced auto-fix engine with 3-tier safety classification
- Confidence scoring (0.0-1.0) with historical tracking
- Quality gates with automated validation
- Interactive mode with streaming results

**Key Files**:
- `core/commands/reviewer.md` (650+ lines)
- `Agent_Memory/_system/review/framework_patterns.yaml` (600+ lines)
- `Agent_Memory/_system/review/auto_fix_engine.yaml` (350+ lines)
- `docs/REVIEWER_V3_MIGRATION_GUIDE.md` (500+ lines)

### 3. Designer V2.0 (COMPLETED)
**Results**: 5x more structured, 10x more actionable, 20x faster artifacts
- Structured 4-phase workflow (Discovery → Ideation → Refinement → Specification)
- Template library (6 specialized templates)
- Design pattern library (12+ proven patterns)
- Artifact auto-generation (<1 min vs 20+ min manual)
- 4-level validation framework
- Multi-format export (markdown, JSON, HTML, diagrams)

**Key Files**:
- `core/commands/designer_v2.md` (25 KB)
- `Agent_Memory/_system/templates/designer/templates/` (6 templates, 62 KB)
- `Agent_Memory/_system/templates/designer/patterns/design_patterns_library.yaml` (17.9 KB)
- `docs/DESIGNER_V2_MIGRATION_GUIDE.md` (17.6 KB)

---

## Current State: Trigger Workflow V1.0

### Architecture Overview
The trigger workflow is the **universal entry point** for all cAgents requests:

```
User Request → /trigger command → Trigger Agent → Orchestrator → Universal Workflow
```

**Current Components**:
1. **Command**: `core/commands/trigger.md` - Entry point command
2. **Agent**: `core/agents/trigger.md` - Domain detection and initialization
3. **Orchestrator**: `core/agents/orchestrator.md` - Phase management
4. **Universal Agents**: Router, Planner, Executor, Validator, Self-Correct

**Current Workflow**:
```
1. User runs: /trigger "Fix authentication bug"
2. Command invokes trigger agent
3. Trigger detects domain (engineering)
4. Trigger creates instruction folder (inst_YYYYMMDD_NNN)
5. Trigger writes instruction.yaml and status.yaml
6. Trigger delegates to orchestrator
7. Orchestrator manages phases:
   - Routing (tier classification)
   - Planning (objectives + controller selection)
   - Coordinating (controller question-based delegation)
   - Executing (implementation)
   - Validating (quality checks)
```

### Current Capabilities (V1.0)
✅ Domain detection from keywords
✅ Instruction folder creation
✅ Orchestration delegation
✅ Multi-domain support (8 domains)
✅ Tier classification (0-4)

### Current Limitations (V1.0)
❌ No confidence scoring on domain detection
❌ No context-aware routing (git history, project structure)
❌ No intent classification beyond keywords
❌ No pre-flight validation (feasibility checks)
❌ No workflow recommendations
❌ No parallel workflow support
❌ No workflow templates
❌ Limited error recovery
❌ No workflow analytics
❌ No learning from past workflows

---

## Optimization Goals

Transform the trigger workflow to be:

### 1. Smarter Detection
- **Context-aware domain detection** (project structure, git history, file types)
- **Intent classification** (bug fix, feature, refactor, question, etc.)
- **Confidence scoring** (0.0-1.0) on domain detection
- **Ambiguity detection** (ask user when multiple domains likely)
- **Framework detection** (Next.js, React, Django, etc.)
- **Historical learning** (learn from past workflows)

### 2. Better Initialization
- **Pre-flight validation** (feasibility checks before starting)
- **Workflow templates** (common workflow patterns)
- **Smart defaults** (infer tier, controllers, execution mode)
- **Context collection** (gather relevant context upfront)
- **Dependency detection** (identify related workflows)

### 3. More Effective Orchestration
- **Parallel workflow support** (run multiple workflows simultaneously)
- **Workflow chaining** (automatic follow-up workflows)
- **Adaptive execution** (change strategy based on progress)
- **Real-time optimization** (adjust based on performance)
- **Predictive planning** (estimate duration, resources)

### 4. Enhanced User Experience
- **Interactive mode** (ask preferences before starting)
- **Dry-run mode** (preview workflow without executing)
- **Real-time progress** (streaming updates with ETA)
- **Workflow recommendations** (suggest better approaches)
- **Error prevention** (catch issues before they occur)

### 5. Analytics & Learning
- **Workflow metrics** (success rate, duration, efficiency)
- **Pattern recognition** (common workflows, bottlenecks)
- **Success prediction** (confidence in workflow completion)
- **Continuous improvement** (learn from every workflow)

---

## Required Enhancements

### A. Enhanced Domain Detection

**Create**: `Agent_Memory/_system/trigger/domain_detection_v2.yaml`

**Requirements**:
- **Keyword-based detection** (current approach, keep)
- **Context-based detection** (NEW):
  - Project structure analysis (package.json, requirements.txt, etc.)
  - Git history analysis (recent commits, hot spots)
  - File type distribution (code vs docs vs config)
  - Framework detection (Next.js, Django, etc.)
- **Intent classification** (NEW):
  - Bug fix, feature addition, refactor, optimization, question, documentation
  - Confidence scoring per intent type
- **Multi-domain workflows** (NEW):
  - Detect when request spans multiple domains
  - Suggest primary + supporting domains
- **Confidence scoring** (NEW):
  - 0.0-1.0 confidence on domain detection
  - Threshold for asking user confirmation (< 0.7)
- **Historical learning** (NEW):
  - Track user corrections to domain detection
  - Improve future detection accuracy

**Example Structure**:
```yaml
domain_detection_v2:
  methods:
    keyword_based:
      weight: 0.3
      patterns: [current keyword patterns]

    context_based:
      weight: 0.4
      project_structure:
        - file: package.json
          indicates: [engineering, product]
          confidence_boost: 0.2
      git_history:
        - pattern: "fix.*auth"
          indicates: engineering
          confidence_boost: 0.15

    framework_detection:
      weight: 0.3
      frameworks:
        - name: nextjs
          indicators: ["next.config.js", "app/"]
          domains: [engineering, product]
          confidence: 0.9

  intent_classification:
    patterns:
      - intent: bug_fix
        keywords: ["fix", "bug", "issue", "error"]
        confidence: 0.8
      - intent: feature
        keywords: ["add", "implement", "create", "new"]
        confidence: 0.85

  confidence_thresholds:
    auto_proceed: 0.7
    ask_user: 0.7
    suggest_alternatives: 0.5
```

### B. Workflow Templates

**Create**: `Agent_Memory/_system/trigger/workflow_templates.yaml`

**Requirements**:
- **Pre-defined templates** for common workflows:
  - Bug fix template (tier 2, engineering)
  - Feature addition template (tier 3, engineering + product)
  - Content creation template (tier 2, creative)
  - Analysis request template (tier 2, multiple domains)
  - Architecture refactor template (tier 4, engineering + HITL)
- **Template matching** based on intent and domain
- **Template customization** (user can override defaults)
- **Template suggestions** (recommend template based on request)

**Example Structure**:
```yaml
workflow_templates:
  bug_fix:
    name: "Bug Fix Workflow"
    applies_to:
      intents: [bug_fix]
      domains: [engineering]
      confidence_min: 0.7

    defaults:
      tier: 2
      primary_controller: engineering:engineering-manager
      execution_mode: sequential
      validation_level: standard

    phases:
      - routing: {quick: true}
      - planning: {detail: balanced}
      - coordinating: {parallel_questions: true}
      - executing: {incremental: true}
      - validating: {regression_tests: true}

    pre_flight_checks:
      - exists: reproduction_steps
      - exists: expected_vs_actual
      - optional: error_logs

  feature_addition:
    name: "Feature Addition Workflow"
    applies_to:
      intents: [feature, enhancement]
      domains: [engineering, product]

    defaults:
      tier: 3
      primary_controller: engineering:engineering-manager
      supporting: [product:product-manager]
      execution_mode: pipeline

    phases:
      - routing: {multi_domain: true}
      - planning: {detail: high, user_stories: true}
      - coordinating: {parallel_teams: true}
      - executing: {incremental: true, tests_first: true}
      - validating: {user_acceptance: true}
```

### C. Pre-Flight Validation

**Create**: `Agent_Memory/_system/trigger/preflight_validation.yaml`

**Requirements**:
- **Feasibility checks** before starting workflow:
  - Required context available
  - Sufficient information to proceed
  - No blocking dependencies
  - Estimated success probability
- **Resource checks**:
  - Required agents available
  - Estimated token budget
  - Estimated duration
- **Conflict detection**:
  - Check for conflicting workflows in progress
  - Detect dependency on incomplete workflows
- **User confirmation** for high-risk workflows (tier 4)

**Example Structure**:
```yaml
preflight_validation:
  checks:
    context_completeness:
      required:
        - domain_detected
        - intent_classified
      optional:
        - reproduction_steps
        - acceptance_criteria
      scoring:
        weight: 0.3
        threshold: 0.6

    feasibility:
      checks:
        - name: sufficient_detail
          condition: "request length > 10 words"
          weight: 0.2
        - name: realistic_scope
          condition: "estimated_tier <= 3 OR hitl_available"
          weight: 0.3
      threshold: 0.7

    resources:
      token_budget:
        tier_0: 5000
        tier_1: 15000
        tier_2: 50000
        tier_3: 100000
        tier_4: 200000
      check_available: true

    conflicts:
      check_parallel_workflows: true
      check_dependencies: true
      max_concurrent: 5

  actions:
    if_failed:
      - show_issues_to_user
      - suggest_improvements
      - ask_proceed_anyway
    if_passed:
      - proceed_automatically
      - show_summary
```

### D. Enhanced Trigger Agent

**Update**: `core/agents/trigger.md`

**Requirements**:
- **Enhanced capabilities**:
  - Context-aware domain detection (V2)
  - Intent classification
  - Workflow template matching
  - Pre-flight validation
  - Confidence scoring
  - Interactive mode
- **New workflow**:
  1. Analyze request context (git, project, history)
  2. Detect domain + intent with confidence scores
  3. Match to workflow template (if available)
  4. Run pre-flight validation
  5. Present summary to user (if interactive mode)
  6. Create instruction with enhanced metadata
  7. Delegate to orchestrator with recommendations
- **New metadata in instruction.yaml**:
  ```yaml
  detection:
    domain: engineering
    confidence: 0.85
    method: context_based
    alternatives: [product: 0.4]

  intent:
    primary: bug_fix
    confidence: 0.9
    secondary: [feature: 0.3]

  template:
    matched: bug_fix
    customizations: []

  preflight:
    status: passed
    score: 0.82
    warnings: []

  recommendations:
    tier: 2
    controller: engineering:engineering-manager
    execution_mode: sequential
    estimated_duration: "15-30 minutes"
    success_probability: 0.85
  ```

### E. Enhanced Orchestrator

**Update**: `core/agents/orchestrator.md`

**Requirements**:
- **Use enhanced metadata** from instruction.yaml
- **Adaptive execution**:
  - Adjust strategy based on preflight recommendations
  - Switch execution mode if performance degrades
  - Escalate tier if complexity higher than expected
- **Real-time optimization**:
  - Monitor phase durations
  - Detect bottlenecks
  - Suggest optimizations
- **Parallel orchestration**:
  - Support multiple concurrent workflows
  - Manage dependencies between workflows
  - Prevent resource conflicts

### F. Workflow Analytics

**Create**: `Agent_Memory/_system/trigger/workflow_analytics.yaml`

**Requirements**:
- **Track metrics** for every workflow:
  - Success/failure rate
  - Duration per phase
  - Token usage
  - Controller efficiency
  - Validation pass rate
- **Pattern recognition**:
  - Common workflow types
  - Bottleneck detection
  - Success predictors
  - Failure patterns
- **Learning system**:
  - Improve domain detection accuracy
  - Refine tier classification
  - Optimize template matching
  - Adjust success predictions
- **Reporting**:
  - Daily/weekly summaries
  - Trend analysis
  - Recommendations for improvement

### G. Interactive Mode

**Enhance**: `core/commands/trigger.md`

**Requirements**:
- **New flags**:
  - `--interactive` - Ask user preferences before starting
  - `--dry-run` - Preview workflow without executing
  - `--template <name>` - Use specific template
  - `--domain <name>` - Override domain detection
  - `--tier <N>` - Override tier classification
  - `--parallel` - Enable parallel execution
  - `--stream` - Real-time progress updates
  - `--confidence <N>` - Set confidence threshold
- **Interactive prompts**:
  ```
  Domain detected: engineering (confidence: 0.85)
  Intent: Bug fix (confidence: 0.9)
  Template: bug_fix

  ? Proceed with these settings? (Y/n)
  ? Estimated tier: 2, change? (N/y)
  ? Execution mode: sequential, use parallel? (N/y)

  Pre-flight validation: PASSED (score: 0.82)
  Estimated duration: 15-30 minutes
  Success probability: 85%

  Starting workflow...
  ```

---

## Success Criteria

The enhanced trigger workflow should achieve:

### Performance Metrics
- ✅ **2-3x faster initialization** (< 5 seconds vs ~15 seconds)
- ✅ **90%+ domain detection accuracy** (vs ~80% current)
- ✅ **95%+ intent classification accuracy**
- ✅ **85%+ success prediction accuracy**
- ✅ **50% reduction in failed workflows** (better pre-flight validation)

### Quality Metrics
- ✅ **100% backward compatible** (V1.0 usage still works)
- ✅ **Zero breaking changes**
- ✅ **Comprehensive validation** (preflight checks prevent issues)
- ✅ **Clear user feedback** (confidence scores, warnings, suggestions)

### User Experience Metrics
- ✅ **5x better transparency** (streaming progress, confidence scores)
- ✅ **3x faster problem resolution** (better routing, fewer retries)
- ✅ **10x more actionable feedback** (workflow recommendations)

### Learning Metrics
- ✅ **Continuous improvement** (learn from every workflow)
- ✅ **Pattern recognition** (identify common workflows)
- ✅ **Accuracy improvement** (domain detection, tier classification)

---

## Implementation Approach

### Phase 1: Analysis (Research)
1. Read all trigger-related files:
   - `core/commands/trigger.md`
   - `core/agents/trigger.md`
   - `core/agents/orchestrator.md`
   - Universal workflow agents (router, planner, executor, validator)
2. Understand current workflow end-to-end
3. Identify gaps and improvement opportunities
4. Study optimizer V7.0, reviewer V3.0, designer V2.0 for patterns

### Phase 2: Design (Architecture)
1. Design enhanced domain detection (V2)
2. Design workflow template system
3. Design pre-flight validation framework
4. Design workflow analytics system
5. Design interactive mode
6. Create architecture document

### Phase 3: Implementation (Build)
1. Create `domain_detection_v2.yaml`
2. Create `workflow_templates.yaml`
3. Create `preflight_validation.yaml`
4. Create `workflow_analytics.yaml`
5. Update `trigger.md` agent
6. Update `orchestrator.md` agent
7. Update `trigger.md` command
8. Create enhanced instruction.yaml schema

### Phase 4: Testing (Validation)
1. Test domain detection accuracy (10+ scenarios)
2. Test workflow templates (6+ templates)
3. Test pre-flight validation (5+ scenarios)
4. Test interactive mode
5. Test backward compatibility
6. Performance benchmarking

### Phase 5: Documentation (Communication)
1. Create `TRIGGER_V2_ARCHITECTURE.md`
2. Create `TRIGGER_V2_MIGRATION_GUIDE.md`
3. Create `TRIGGER_V2_TEST_SCENARIOS.md`
4. Create `TRIGGER_V2_OPTIMIZATION_SUMMARY.md`
5. Update command documentation
6. Update agent documentation

---

## Deliverables Checklist

**Core Files** (8 required):
- [ ] `Agent_Memory/_system/trigger/domain_detection_v2.yaml`
- [ ] `Agent_Memory/_system/trigger/workflow_templates.yaml`
- [ ] `Agent_Memory/_system/trigger/preflight_validation.yaml`
- [ ] `Agent_Memory/_system/trigger/workflow_analytics.yaml`
- [ ] `core/agents/trigger.md` (updated with V2.0 capabilities)
- [ ] `core/agents/orchestrator.md` (updated for adaptive execution)
- [ ] `core/commands/trigger.md` (updated with new flags)
- [ ] `Agent_Memory/_system/templates/instruction_v2_schema.yaml` (enhanced schema)

**Documentation** (4 required):
- [ ] `docs/TRIGGER_V2_ARCHITECTURE.md` (complete architecture specification)
- [ ] `docs/TRIGGER_V2_MIGRATION_GUIDE.md` (V1.0 → V2.0 guide)
- [ ] `docs/TRIGGER_V2_TEST_SCENARIOS.md` (test scenarios and benchmarks)
- [ ] `docs/TRIGGER_V2_OPTIMIZATION_SUMMARY.md` (complete summary)

**Total**: 12 files minimum

---

## Key Patterns to Apply (From Previous Optimizations)

### From Optimizer V7.0:
- ✅ **Parallel execution** - Apply to workflow orchestration
- ✅ **Framework detection** - Detect project frameworks
- ✅ **Confidence scoring** - Apply to domain detection
- ✅ **Predictive modeling** - Predict workflow success
- ✅ **ML-ready structure** - Learn from workflow history

### From Reviewer V3.0:
- ✅ **Multi-level validation** - Apply to pre-flight checks
- ✅ **Quality gates** - Apply to phase transitions
- ✅ **Interactive mode** - Apply to trigger initialization
- ✅ **Real-time progress** - Apply to workflow execution
- ✅ **Streaming results** - Apply to orchestration

### From Designer V2.0:
- ✅ **Template system** - Apply to workflow templates
- ✅ **Phase-based workflow** - Apply to trigger phases
- ✅ **Validation framework** - Apply to pre-flight validation
- ✅ **Pattern library** - Apply to workflow patterns

### Trigger-Specific Innovations:
- ✅ **Context-aware routing** - Use project context for better detection
- ✅ **Intent classification** - Classify request intent beyond domain
- ✅ **Workflow recommendations** - Suggest optimal workflow configuration
- ✅ **Adaptive orchestration** - Adjust strategy during execution
- ✅ **Cross-workflow coordination** - Manage dependencies between workflows

---

## Example: V1.0 vs V2.0 Workflow

### Before (V1.0)
```bash
$ /trigger Fix authentication bug in login flow

# Simple keyword-based detection
Domain detected: engineering
Creating instruction folder...
Delegating to orchestrator...

[Workflow proceeds with basic routing]
```

### After (V2.0)
```bash
$ /trigger Fix authentication bug in login flow --interactive

Analyzing request...
  ✓ Context collected (git history, project structure)
  ✓ Framework detected: Next.js 14 (confidence: 0.95)
  ✓ Domain detected: engineering (confidence: 0.92)
  ✓ Intent classified: bug_fix (confidence: 0.88)
  ✓ Template matched: bug_fix

Pre-flight validation:
  ✓ Context completeness: 0.85 (PASS)
  ✓ Feasibility: 0.90 (PASS)
  ✓ Resources available: PASS
  ✓ No conflicts: PASS
  Overall score: 0.87 (PASS)

Workflow recommendations:
  Domain: engineering (primary)
  Tier: 2 (moderate complexity)
  Controller: engineering:engineering-manager
  Template: bug_fix
  Execution mode: sequential
  Estimated duration: 15-30 minutes
  Success probability: 85%

? Proceed with these settings? [Y/n]

Starting workflow inst_20260116_001...
  ✓ Instruction created with enhanced metadata
  ✓ Delegating to orchestrator with recommendations
  ✓ Streaming progress enabled

[Orchestrator proceeds with adaptive execution]
```

---

## Risk Assessment

### High Risk Items
- **Breaking changes**: Ensure 100% backward compatibility
- **Performance regression**: V2.0 must be faster, not slower
- **Complexity**: Don't over-engineer the core workflow system

### Mitigation Strategies
- **Backward compatibility**: V1.0 usage works exactly as before
- **Feature flags**: New features opt-in via command flags
- **Gradual rollout**: Can disable V2.0 features if issues arise
- **Comprehensive testing**: 15+ test scenarios before deployment
- **Rollback plan**: Can revert to V1.0 if critical issues found

---

## Testing Requirements

### Domain Detection Tests (10 scenarios)
1. Keyword-based detection (current approach)
2. Context-based detection (new)
3. Framework detection (new)
4. Multi-domain requests (new)
5. Ambiguous requests (confidence < 0.7)
6. Low-confidence detection (ask user)
7. Historical learning (improve over time)
8. Intent classification accuracy
9. Alternative domain suggestions
10. User override handling

### Template Matching Tests (6 templates)
1. Bug fix template
2. Feature addition template
3. Content creation template
4. Analysis request template
5. Architecture refactor template
6. Custom template support

### Pre-Flight Validation Tests (5 scenarios)
1. Insufficient context (fail)
2. Conflicting workflows (warn)
3. Resource constraints (fail)
4. High-risk workflow (ask confirmation)
5. All checks pass (proceed)

### Performance Benchmarks
- Domain detection speed: < 5 seconds (vs ~15 seconds V1.0)
- Template matching speed: < 2 seconds
- Pre-flight validation: < 3 seconds
- Total initialization: < 10 seconds (vs ~15-20 seconds V1.0)

### Backward Compatibility Tests (12 scenarios)
- All V1.0 trigger commands work unchanged
- No breaking changes to instruction.yaml schema (extend only)
- Orchestrator handles both V1.0 and V2.0 instructions
- Universal agents work with both versions

---

## Best Practices

### DO:
- ✅ Study previous optimizations (optimizer V7.0, reviewer V3.0, designer V2.0)
- ✅ Apply proven patterns (confidence scoring, templates, validation)
- ✅ Focus on user experience (interactive mode, streaming progress)
- ✅ Ensure backward compatibility (100% V1.0 usage works)
- ✅ Create comprehensive documentation (4 docs minimum)
- ✅ Test extensively (15+ scenarios)
- ✅ Use TodoWrite for progress tracking

### DON'T:
- ❌ Break existing functionality
- ❌ Over-engineer (keep it simple and effective)
- ❌ Skip testing (validation is critical)
- ❌ Ignore performance (V2.0 must be faster)
- ❌ Forget documentation (comprehensive guides required)
- ❌ Rush implementation (this is the core system)

---

## Automatic Workflow Progression

**CRITICAL**: Apply the automatic workflow progression policy documented in `docs/AUTOMATIC_WORKFLOW_PROGRESSION.md`.

**Proceed automatically** through all phases WITHOUT asking permission unless:
1. Tier 4 HITL approval gates
2. Unrecoverable errors/blockers
3. Ambiguous requirements that cannot be inferred
4. Validation BLOCKED status

**DO NOT ask**:
- "Would you like me to continue with the next phase?"
- "Would you prefer to review the requirements first?"
- Permission to proceed with standard workflow steps

Just proceed automatically and keep user informed with TodoWrite.

---

## Final Notes

### Priority
This is a **HIGH PRIORITY** optimization because the trigger workflow is the foundation of ALL cAgents workflows. Any improvement here benefits every single workflow execution.

### Complexity
This is the **MOST COMPLEX** optimization yet because it touches the core orchestration system. Be thorough, test extensively, and ensure nothing breaks.

### Impact
Success here means:
- **Every workflow** becomes smarter (better routing)
- **Every workflow** becomes faster (better initialization)
- **Every workflow** becomes more reliable (pre-flight validation)
- **Every workflow** provides better feedback (confidence scores, progress)

### Time Estimate
- Analysis: 1 hour
- Design: 2 hours
- Implementation: 4-6 hours
- Testing: 2 hours
- Documentation: 2 hours
**Total**: 11-13 hours

### Success Definition
Trigger V2.0 is successful when:
1. ✅ All 12 deliverables created
2. ✅ All success criteria met
3. ✅ All tests passing
4. ✅ 100% backward compatible
5. ✅ Documentation complete
6. ✅ Ready for production deployment

---

## Execution Command

When you're ready to execute this optimization, use:

```bash
/trigger do a full optimize of the trigger workflow. make it smarter, make it better, more effective, and more

# Then reference this instruction document:
# "Follow the complete specification in docs/TRIGGER_V2_OPTIMIZATION_INSTRUCTION.md"
```

Or simply say:

```
Execute TRIGGER_V2_OPTIMIZATION_INSTRUCTION.md - comprehensive trigger workflow optimization with all requirements, success criteria, and deliverables specified in the instruction document.
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-16
**Status**: Ready for execution
**Estimated Completion**: 11-13 hours

---

## Quick Reference Checklist

### Pre-Execution
- [ ] Read all trigger-related files
- [ ] Review optimizer V7.0, reviewer V3.0, designer V2.0
- [ ] Understand current workflow end-to-end

### Core Implementation
- [ ] Create domain_detection_v2.yaml (context-aware, confidence scoring)
- [ ] Create workflow_templates.yaml (6 templates minimum)
- [ ] Create preflight_validation.yaml (4-level validation)
- [ ] Create workflow_analytics.yaml (metrics, learning)
- [ ] Update trigger.md agent (V2.0 capabilities)
- [ ] Update orchestrator.md agent (adaptive execution)
- [ ] Update trigger.md command (new flags)
- [ ] Create instruction_v2_schema.yaml (enhanced metadata)

### Documentation
- [ ] TRIGGER_V2_ARCHITECTURE.md (complete spec)
- [ ] TRIGGER_V2_MIGRATION_GUIDE.md (V1.0 → V2.0)
- [ ] TRIGGER_V2_TEST_SCENARIOS.md (15+ scenarios)
- [ ] TRIGGER_V2_OPTIMIZATION_SUMMARY.md (results)

### Validation
- [ ] Domain detection tests (10 scenarios, 90%+ accuracy)
- [ ] Template matching tests (6 templates)
- [ ] Pre-flight validation tests (5 scenarios)
- [ ] Performance benchmarks (2-3x faster initialization)
- [ ] Backward compatibility tests (12 scenarios, 100% pass)

### Completion
- [ ] All deliverables created
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Git commit with comprehensive message
- [ ] Ready for production deployment

**GO!** 🚀
