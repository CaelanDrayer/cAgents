# Designer V2.0 Test Scenarios

**Version**: 2.0.0
**Date**: 2026-01-16
**Purpose**: Comprehensive test scenarios to validate Designer V2.0 functionality

## Test Overview

**Test Coverage**:
- ✅ 4-phase workflow execution
- ✅ Template library (all 6 templates)
- ✅ Artifact generation (user stories, specs, diagrams)
- ✅ Validation framework (all 4 validation types)
- ✅ Export formats (markdown, JSON, HTML, diagrams)
- ✅ Save/resume capability
- ✅ Command flags (all 10 flags)
- ✅ Backward compatibility (V6.7 migration)
- ✅ Pattern recommendations
- ✅ Real-time preview
- ✅ Continuous validation

**Test Types**:
- Unit tests: Individual features
- Integration tests: End-to-end workflows
- Regression tests: V6.7 compatibility
- Performance tests: Artifact generation speed
- User acceptance tests: Real-world scenarios

---

## Test Scenario 1: Standard Product Feature Design

**Objective**: Validate complete 4-phase workflow with artifact generation.

**Test Steps**:
```bash
1. Start session: /designer --template product-feature --preview-live --validate-continuous
2. Answer Discovery questions (problem, stakeholders, constraints, success criteria)
3. Answer Ideation questions (alternatives, selection, scope)
4. Answer Refinement questions (user flows, UI, data model, API, edge cases)
5. Phase 4 automatic artifact generation
6. Review artifacts and validation report
```

**Expected Results**:
- ✅ Session progresses through all 4 phases
- ✅ Quality gates validate at each phase transition
- ✅ Real-time preview updates design document after each answer
- ✅ Continuous validation shows progress
- ✅ Phase 4 generates:
  - 5+ user stories with acceptance criteria
  - Technical specification with architecture diagram
  - Implementation checklist with 15+ tasks
  - User flow diagram
  - Data model ERD
- ✅ Validation report shows >0.85 overall score
- ✅ design_document.md is complete and well-structured

**Validation**:
- Check session.yaml has version: "2.0"
- Check all 4 phases marked as completed
- Check artifacts/ folder has all generated files
- Check diagrams/ folder has mermaid and PNG files
- Check validation_report.yaml has all 4 validation scores

---

## Test Scenario 2: API Design Template

**Objective**: Validate API-specific template and OpenAPI generation.

**Test Steps**:
```bash
1. Start: /designer --template api-design --export json,diagrams
2. Discovery: API purpose (task management API), clients (web + mobile), resources (tasks, users, projects)
3. Ideation: REST API, URL versioning, JSON format, HTTP status codes, JWT auth
4. Refinement: Define endpoints (GET/POST /tasks, etc.), schemas, validation, pagination
5. Specification: Auto-generate OpenAPI spec, examples, integration guide
```

**Expected Results**:
- ✅ Template loads API-specific questions
- ✅ Generates OpenAPI 3.0 specification
- ✅ All endpoints have request/response schemas
- ✅ Authentication flow documented
- ✅ Example requests with curl commands
- ✅ Postman collection generated
- ✅ API architecture diagram
- ✅ Sequence diagram for key flows
- ✅ Exports in JSON and diagrams (PNG)

**Validation**:
- Check openapi_spec.yaml is valid (lint with validator)
- Check all endpoints have examples
- Check authentication is consistently applied
- Check schemas reference defined models

---

## Test Scenario 3: System Architecture Design

**Objective**: Validate architecture-specific template and complex diagramming.

**Test Steps**:
```bash
1. Start: /designer --template system-architecture --detail high --export html,diagrams
2. Discovery: E-commerce platform, 100K users, high availability, PCI compliance
3. Ideation: Microservices architecture, event-driven, hybrid data storage
4. Refinement: 8 services (auth, product, order, payment, etc.), data flows, deployment, resilience
5. Specification: Generate component diagram, deployment diagram, data flow, ADRs
```

**Expected Results**:
- ✅ Comprehensive architecture diagrams:
  - Component diagram (8 services)
  - Deployment diagram with infrastructure
  - Data flow diagram
  - Sequence diagrams for key operations
- ✅ Architecture Decision Records (ADRs) for key decisions
- ✅ Implementation roadmap with 4 phases
- ✅ Operational runbook (deployment, monitoring, rollback)
- ✅ Security architecture diagram
- ✅ HTML export with styled diagrams
- ✅ All diagrams exported as PNG

**Validation**:
- Check all mermaid diagrams render correctly
- Check ADRs document key decisions
- Check implementation roadmap is phased
- Check operational runbook covers deployment

---

## Test Scenario 4: Business Process Design

**Objective**: Validate business process template and BPMN generation.

**Test Steps**:
```bash
1. Start: /designer --template business-process
2. Discovery: Employee onboarding process, current pain points, stakeholders (HR, IT, manager)
3. Ideation: 3 process alternatives (manual, semi-automated, fully-automated)
4. Refinement: Detailed steps, decision points, handoffs, KPIs
5. Specification: Generate SOP, BPMN diagram, implementation plan
```

**Expected Results**:
- ✅ BPMN process diagram (swimlanes for each role)
- ✅ Standard Operating Procedure (SOP) document
- ✅ RACI matrix (Responsible, Accountable, Consulted, Informed)
- ✅ Decision tree for exception handling
- ✅ Implementation plan with change management
- ✅ Training materials outline
- ✅ Before/after comparison

**Validation**:
- Check BPMN diagram is complete
- Check SOP is step-by-step and actionable
- Check RACI matrix covers all steps
- Check KPIs are measurable

---

## Test Scenario 5: Creative Content Design

**Objective**: Validate creative template and story structure.

**Test Steps**:
```bash
1. Start: /designer --template creative-content
2. Discovery: Fantasy novel, hero's journey, young adult audience, themes (coming of age, power)
3. Ideation: Protagonist (orphan with magic), antagonist (dark sorcerer), world (medieval magic realm)
4. Refinement: 3-act plot structure, 15 key scenes, character arcs, world-building details
5. Specification: Generate story bible, character profiles, scene cards
```

**Expected Results**:
- ✅ Comprehensive story bible
- ✅ Detailed character profiles (protagonist, antagonist, 3 supporting)
- ✅ Scene cards (15 scenes with goals, conflicts, outcomes)
- ✅ Plot structure diagram (3-act or hero's journey)
- ✅ Character relationship map
- ✅ World reference guide
- ✅ Writing guide with style notes

**Validation**:
- Check story bible has all sections
- Check character profiles include arcs
- Check scene cards have goals/conflicts/outcomes
- Check plot structure is complete

---

## Test Scenario 6: UI/UX Design

**Objective**: Validate UI/UX template and component specifications.

**Test Steps**:
```bash
1. Start: /designer --template uiux-design --preview-live
2. Discovery: Dashboard redesign, 2 personas, pain points (cluttered, slow), WCAG 2.1 AA compliance
3. Ideation: 3 layout options, card-based design system, sidebar navigation
4. Refinement: 12 screens, user flows, component library (buttons, cards, forms), responsive breakpoints
5. Specification: Generate design specs, style guide, component library doc
```

**Expected Results**:
- ✅ Screen inventory (12 screens with purposes)
- ✅ User flow diagrams (primary + 2 alternate flows)
- ✅ Component specifications (15+ components with states)
- ✅ Style guide (colors, typography, spacing, elevation)
- ✅ Responsive behavior guide (mobile, tablet, desktop)
- ✅ Accessibility checklist (WCAG 2.1 AA)
- ✅ Developer handoff document
- ✅ Design file structure guide

**Validation**:
- Check all screens documented
- Check component specs include states
- Check style guide is complete
- Check accessibility requirements documented

---

## Test Scenario 7: Save and Resume

**Objective**: Validate save/resume capability across sessions.

**Test Steps**:
```bash
1. Start: /designer --template product-feature
2. Answer Discovery questions (Phase 1)
3. Start Ideation (Phase 2), answer 2 questions
4. Cancel/exit session
5. Resume: /designer --resume {session_id}
6. Verify progress restored
7. Complete remaining phases
```

**Expected Results**:
- ✅ Session saves after every question
- ✅ Resume loads session state correctly
- ✅ Shows progress summary on resume
- ✅ Continues from exact question where stopped
- ✅ All previous answers preserved
- ✅ Phase progress accurate
- ✅ Can complete remaining phases
- ✅ Artifacts generate normally at end

**Validation**:
- Check session.yaml has correct current_phase
- Check qa_log.yaml has all previous Q&A
- Check resumed session can complete normally
- Check artifacts match session content

---

## Test Scenario 8: V6.7 Backward Compatibility

**Objective**: Validate V6.7 session migration.

**Test Steps**:
```bash
1. Locate existing V6.7 session (version: "6.7" in session.yaml)
2. Resume with V2.0: /designer --resume {v6_7_session_id}
3. Observe migration process
4. Complete to Phase 4
5. Generate artifacts from migrated session
```

**Expected Results**:
- ✅ V6.7 session detected automatically
- ✅ Migration message displayed
- ✅ Chunks mapped to phases correctly
- ✅ session.yaml updated to version: "2.0"
- ✅ Phase structure added
- ✅ Can complete remaining phases
- ✅ Artifacts generate from existing Q&A
- ✅ No data loss during migration

**Validation**:
- Check version changed from 6.7 to 2.0
- Check phases field added
- Check qa_log migrated correctly
- Check artifacts generated successfully

---

## Test Scenario 9: Validation Framework

**Objective**: Validate all 4 validation types and quality gates.

**Test Steps**:
```bash
1. Start: /designer --template product-feature --validate-continuous
2. Phase 1: Skip required questions (test completeness validation)
3. Observe quality gate blocking transition
4. Answer missing questions
5. Phase 2: Provide contradictory answers (test consistency validation)
6. Phase 3: Specify unrealistic requirements (test feasibility validation)
7. Complete to Phase 4
8. Review comprehensive validation report
```

**Expected Results**:
- ✅ **Completeness validation**:
  - Blocks phase transition if required fields missing
  - Prompts for specific missing information
  - Shows completeness score
- ✅ **Consistency validation**:
  - Warns of contradictions
  - Suggests fixes
  - Allows proceeding with warnings
- ✅ **Feasibility validation**:
  - Identifies unrealistic requirements
  - Provides recommendations
  - Shows feasibility score
- ✅ **Quality validation**:
  - Checks design depth
  - Validates best practices
  - Shows quality score
- ✅ **Validation report**:
  - Overall score calculated
  - Specific issues listed
  - Recommendations provided
  - Ready-for-implementation flag

**Validation**:
- Check validation_report.yaml has all 4 scores
- Check issues are specific and actionable
- Check quality gates block when appropriate
- Check continuous validation shows progress

---

## Test Scenario 10: Export Formats

**Objective**: Validate all export formats.

**Test Steps**:
```bash
1. Complete full design session
2. Export with: /designer --resume {session_id} --export markdown,json,html,diagrams
3. Verify all export files generated
4. Validate each format
```

**Expected Results**:
- ✅ **Markdown export**:
  - design_document.md
  - Inline mermaid diagrams
  - Formatted tables
  - Code blocks
  - Table of contents
- ✅ **JSON export**:
  - design_document.json
  - Valid JSON syntax
  - Complete structured data
  - All artifacts included
- ✅ **HTML export**:
  - design_document.html
  - Styled with CSS
  - Rendered diagrams (PNG)
  - Collapsible sections
  - Print-friendly
- ✅ **Diagrams export**:
  - diagrams/*.mermaid files
  - diagrams/*.png files
  - High-DPI (2x for retina)
  - All diagrams rendered

**Validation**:
- Check markdown renders correctly
- Check JSON is valid (parse with JSON validator)
- Check HTML displays correctly in browser
- Check diagrams render at high quality
- Check all formats have same content

---

## Test Scenario 11: Pattern Recommendations

**Objective**: Validate pattern library integration.

**Test Steps**:
```bash
1. Start: /designer --template api-design
2. When asked about authentication, mention "need secure auth for SPA"
3. Observe pattern recommendation
4. Accept pattern recommendation
5. Verify pattern details included in design
```

**Expected Results**:
- ✅ Pattern recommendation appears contextually
- ✅ Recommendation includes:
  - Pattern name
  - Maturity/confidence score
  - When to use
  - Pros/cons
  - Implementation notes
- ✅ Accepting pattern pre-fills related questions
- ✅ Pattern details included in technical spec
- ✅ Pattern reference in artifacts

**Validation**:
- Check pattern recommended at right time
- Check pattern details accurate
- Check pattern applied consistently
- Check artifacts reference pattern

---

## Test Scenario 12: Interactive Mode

**Objective**: Validate interactive preference prompts.

**Test Steps**:
```bash
1. Start: /designer --interactive
2. Answer preference questions:
   - Focus: Technical
   - Detail: High
   - Live preview: Yes
   - Validation: Yes
3. Complete design session
4. Verify preferences applied
```

**Expected Results**:
- ✅ Preference prompts appear before session starts
- ✅ Preferences saved to session.yaml
- ✅ Questions adapt to preferences:
  - Technical focus: More technical questions
  - High detail: Comprehensive questioning
- ✅ Live preview enabled throughout
- ✅ Continuous validation active

**Validation**:
- Check session.yaml has flags set
- Check question count appropriate for detail level
- Check technical focus reflected in questions
- Check preview updates appeared

---

## Test Scenario 13: Parallel Multi-Domain Execution

**Objective**: Validate parallel specialist execution.

**Test Steps**:
```bash
1. Start: /designer --template product-launch --parallel
2. Design spans multiple domains (product + engineering + marketing)
3. Observe parallel specialist execution
4. Review synthesized results
```

**Expected Results**:
- ✅ Multiple specialists run simultaneously:
  - Product Designer: User flows, UI
  - Engineering Architect: Technical design
  - Marketing Strategist: Go-to-market
- ✅ Progress shown for all specialists
- ✅ Results synthesized into cohesive design
- ✅ Cross-domain consistency validated
- ✅ 3-5x faster than sequential

**Validation**:
- Check specialists ran in parallel (timestamps)
- Check synthesis combines all outputs
- Check no conflicts between domains
- Check execution time < sequential

---

## Test Scenario 14: Real-Time Live Preview

**Objective**: Validate live design document building.

**Test Steps**:
```bash
1. Start: /designer --preview-live
2. Answer each question
3. Observe design document updates after each answer
4. Check progress bar updates
```

**Expected Results**:
- ✅ After each answer:
  - Design document section added
  - Preview shown to user
  - Progress bar updated
  - Phase completion percentage shown
- ✅ Design document builds incrementally
- ✅ Preview format is readable
- ✅ Shows what was just added

**Validation**:
- Check preview appears after every answer
- Check preview shows new content
- Check progress bar accurate
- Check design_document.md updates in real-time

---

## Test Scenario 15: Performance Benchmarking

**Objective**: Validate performance targets.

**Test Steps**:
```bash
1. Complete 5 different design sessions (all templates)
2. Measure key performance metrics
3. Compare against targets
```

**Performance Targets**:

| Metric | Target | Acceptable |
|--------|--------|------------|
| **Artifact generation time** | <1 min | <2 min |
| **Session initialization** | <2 sec | <5 sec |
| **Question response time** | <500ms | <1 sec |
| **Diagram generation** | <3 sec per diagram | <5 sec |
| **Validation execution** | <2 sec | <5 sec |
| **Export all formats** | <30 sec | <60 sec |
| **V6.7 migration** | <5 sec | <10 sec |

**Expected Results**:
- ✅ All metrics meet target or acceptable thresholds
- ✅ No performance regressions from V6.7
- ✅ Artifact generation 20x faster than manual
- ✅ Session startup is fast
- ✅ Real-time updates don't lag

**Validation**:
- Measure and log all performance metrics
- Compare against baselines
- Identify any bottlenecks
- Optimize if needed

---

## Regression Test Suite

**V6.7 Feature Compatibility**:
- ✅ Universal opening question
- ✅ Domain detection
- ✅ Context discovery (software)
- ✅ Adaptive questioning (expertise-based)
- ✅ Chunk synthesis
- ✅ Session files (session.yaml, qa_log.yaml)
- ✅ Backward compatibility (V6.7 sessions work)

**Test Coverage**: Ensure all V6.7 features still work in V2.0.

---

## Success Criteria

**All test scenarios must pass with**:
- ✅ Zero critical bugs
- ✅ Zero data loss during migration
- ✅ Performance targets met
- ✅ 100% backward compatibility
- ✅ All artifacts generated correctly
- ✅ Validation framework accurate
- ✅ Export formats valid
- ✅ User experience smooth

---

## Test Execution Checklist

### Pre-Release Testing
- [ ] Test Scenario 1: Standard Product Feature Design
- [ ] Test Scenario 2: API Design Template
- [ ] Test Scenario 3: System Architecture Design
- [ ] Test Scenario 4: Business Process Design
- [ ] Test Scenario 5: Creative Content Design
- [ ] Test Scenario 6: UI/UX Design
- [ ] Test Scenario 7: Save and Resume
- [ ] Test Scenario 8: V6.7 Backward Compatibility
- [ ] Test Scenario 9: Validation Framework
- [ ] Test Scenario 10: Export Formats
- [ ] Test Scenario 11: Pattern Recommendations
- [ ] Test Scenario 12: Interactive Mode
- [ ] Test Scenario 13: Parallel Multi-Domain Execution
- [ ] Test Scenario 14: Real-Time Live Preview
- [ ] Test Scenario 15: Performance Benchmarking
- [ ] Regression Test Suite

### User Acceptance Testing
- [ ] Test with 5 real users
- [ ] Collect feedback on UX
- [ ] Measure satisfaction (target: >4.5/5)
- [ ] Identify usability issues
- [ ] Iterate based on feedback

### Performance Testing
- [ ] Load testing (100 concurrent sessions)
- [ ] Artifact generation benchmark
- [ ] Export format generation benchmark
- [ ] Validation execution benchmark
- [ ] Memory usage profiling

---

## Bug Tracking Template

```markdown
**Bug ID**: BUG-001
**Scenario**: Test Scenario 3 (System Architecture)
**Severity**: High | Medium | Low | Critical
**Description**: Diagram generation failed for deployment diagram
**Steps to Reproduce**:
1. Start architecture design
2. Complete refinement phase
3. Observe diagram generation in Phase 4

**Expected**: Deployment diagram generated
**Actual**: Error: "Invalid mermaid syntax"
**Root Cause**: [TBD]
**Fix**: [TBD]
**Status**: Open | In Progress | Fixed | Won't Fix
```

---

## Conclusion

This comprehensive test suite validates all Designer V2.0 features:
- ✅ 4-phase workflow
- ✅ 6 design templates
- ✅ Artifact generation
- ✅ Validation framework
- ✅ 4 export formats
- ✅ Save/resume
- ✅ 10+ command flags
- ✅ Backward compatibility
- ✅ Pattern recommendations
- ✅ Performance targets

**Test Execution**: Run all 15 test scenarios + regression suite before release.

**Success Criteria**: All tests pass with zero critical bugs and performance targets met.

🚀 **Ready for deployment!**
