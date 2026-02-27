# /review Skill Analysis

## Current State Summary

The /review skill is a universal review orchestrator that runs parallel specialist agents across 3 execution groups to analyze code, documentation, content, designs, processes, data, and infrastructure. It features framework-specific pattern detection (12 frameworks), confidence-based scoring (0.0-1.0), an auto-fix engine with safety classification, quality gates (strict/standard/relaxed), and rich reporting.

## Strengths

1. **Parallel execution model** with 3 agent groups providing 3-5x speed improvement
2. **Framework-specific patterns** for 12+ frameworks (Next.js, React, Django, etc.)
3. **Confidence scoring** on all findings enables intelligent filtering
4. **Auto-fix engine** with safety levels (SAFE/MEDIUM/RISKY) and test validation
5. **Quality gates** with configurable strictness and rollback capability
6. **Universal coverage** across 7 review types (code, docs, content, design, process, data, infra)
7. **Rich flag system** with 35+ flags for fine-grained control
8. **Cross-skill integration** with /run (fix) and /optimize (improve)

## Weaknesses and Gaps

### 1. No Incremental/Differential Review Memory
Each review starts from scratch. There is no mechanism to track which findings have been acknowledged, suppressed, or fixed in previous reviews. Users see the same findings repeatedly across sessions.

### 2. No Custom Rule Engine
Users cannot define project-specific review rules. The framework patterns are built-in but not extensible. Teams with custom coding standards, naming conventions, or architectural rules cannot codify them.

### 3. Static Agent Groups
The 3-group parallel execution model is fixed. Agent selection does not adapt based on the target (e.g., a purely Python backend should not spawn accessibility-checker or frontend-focused agents).

### 4. No PR/MR Integration
Despite having `--pr-context <branch>` and `--scope changed` flags, there is no direct GitHub/GitLab PR integration. Reviews cannot be posted as PR comments, and there is no way to review a PR by URL.

### 5. Limited Non-Code Review Depth
Non-code review agent groups (documentation, content, design, process, data, infrastructure) have fewer specialized agents than code reviews. The documentation review uses 3 agents vs code review's 9.

### 6. No Baseline/Trend Tracking
Reviews do not track quality trends over time. There is no way to see "security issues trending down" or "code quality improving over the last 5 reviews."

### 7. Auto-Fix Engine Lacks Complexity
The auto-fix engine classifies fixes as SAFE/MEDIUM/RISKY but does not handle multi-file fixes, refactoring suggestions, or fixes that require coordination across components.

### 8. No Interactive Review Mode Post-Execution
The `--interactive` flag asks preferences before the review starts, but there is no interactive mode after findings are generated (e.g., triage findings one by one, mark as false positive, request more detail).

### 9. Missing /org Integration
Like /designer, there is no awareness of /org strategic briefs. A review requested by a C-suite agent through /org should inherit strategic context.

### 10. No Review Policies/Profiles
There is no mechanism to save and reuse review configurations. Teams that always run security-focused reviews with strict gates must specify flags every time.
