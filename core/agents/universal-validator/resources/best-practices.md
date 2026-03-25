# Best Practices: Universal Validator

> Design principles, patterns, and frameworks that guide high-quality quality gate enforcement, evidence chain verification, and PASS/FAIL/REVISE verdict production.

## Design Principles

- **Skeptical by Default**: Begin every validation assuming there are gaps — zero findings on an initial scan is a red flag, not a success signal; dig deeper when nothing surfaces immediately
- **Evidence Over Claims**: "Tests pass" is not evidence — "npm test output shows 45/45 passing, including auth.test.ts lines 88-112" is evidence; every criterion requires concrete proof
- **Absence of Evidence is Failure**: If a claimed deliverable has no verifiable evidence, classify as NOT MET — do not give benefit of the doubt for missing proof
- **Challenge All Vague Completions**: When an agent claims "authentication is implemented correctly" without citing file paths and test results, that claim fails validation — specific evidence is mandatory
- **Sentinel Gate File Verification**: Every file claimed to exist must be verified on disk — `file_exists(path)` is the first check before any content evaluation
- **Confidence-Weighted Verdicts**: Every work item and every criterion carries a confidence score — items below 0.7 confidence receive additional scrutiny before a PASS verdict is accepted
- **PASS Must Be Earned**: A clean validation requires concrete evidence for every criterion; the default is NEEDS WORK until proof is provided

## Key Patterns & Frameworks

- **5-Phase Validation Protocol**: Phase 1 (Coordination File Verification) → Phase 2 (Question-Based Delegation Validation) → Phase 3 (Synthesis Quality Validation) → Phase 4 (Delegation Compliance Validation) → Phase 5 (Implementation Tasks Validation) — all five phases must complete before a PASS verdict is possible
- **Evidence Chain Pattern**: For each acceptance criterion: identify the claimed evidence → verify the evidence is concrete (file path, test output, metric) → verify the evidence actually demonstrates the criterion is met → record MET/NOT MET with the specific evidence — this chain is auditable and reproducible
- **Sentinel Gate Verification**: Before evaluating content quality, verify all expected artifacts exist on disk — a coordination_log that doesn't exist cannot pass Phase 1; a claimed output file that isn't present is automatic NOT MET for any criterion relying on it
- **PASS/FAIL/REVISE/PARTIAL_PASS Classification**: PASS (all gates pass, all criteria met with evidence) → PARTIAL_PASS (most pass, some dead-letter items) → FAIL (fixable issues, re-run controller with feedback) → REVISE (fundamental planning issues, re-plan with feedback) — maps to the /run state machine routing
- **Confidence Aggregation**: Overall validation confidence = weighted average of per-criterion confidences — items below 0.7 are flagged in `low_confidence_items` for extra scrutiny
- **Anti-Pattern Detection**: Scan coordination_log for self-answered questions (controller answered its own delegation), direct implementation evidence (controller used Edit/Write on non-planning files), and circular delegation (controller → controller chains without execution agents)
- **Test Execution Verification**: For engineering work items, run the actual test suite rather than trusting claimed results — `npm test`, `pytest`, or equivalent is the ground truth, not the agent's summary
- **DECISIONS.md Check (Tier 3+)**: Tier 3 and above require a DECISIONS.md log with at least one entry per major coordination decision — missing DECISIONS.md triggers FAIL for tier 3+ workflows
- **Revision Routing Intelligence**: FAIL routes back to PROMPTS_READY (re-run controller with the same plan but better-targeted prompts) — REVISE routes back to PLANNED (re-plan from scratch with validation feedback) — choose based on whether the issue is execution quality or planning quality

## Domain Concepts & Terminology

### Validation Classifications
- **PASS**: All quality gates pass, all acceptance criteria met with specific evidence — pipeline advances to VALIDATED (complete)
- **PARTIAL_PASS**: Most quality gates pass; some work items entered dead-letter queue — advances to VALIDATED but dead-letter items are reported for user awareness
- **FAIL**: Fixable issues that require re-executing the controller with feedback — routes back to PROMPTS_READY; examples: missing output files, test failures, incomplete synthesis
- **REVISE**: Fundamental issues requiring re-planning — routes back to PLANNED; examples: wrong controller selected, objectives not achievable with current approach, scope definition issues

### Quality Gates
- **Coordination File Gate**: coordination_log.yaml must exist, be structurally valid, and contain all required fields
- **Delegation Compliance Gate**: All work must have been delegated via Task tool — self-answered questions and direct implementation are blocking failures
- **Synthesis Quality Gate**: synthesized_solution must address all plan objectives, contain no placeholder text, and provide actionable implementation steps
- **Acceptance Criteria Gate**: Each criterion in work_items.yaml has a MET/NOT MET verdict with specific evidence
- **Implementation Tasks Gate**: Every work item in coordination_log's `implementation_tasks` has `status: completed`

### Blocking Failures (Always BLOCKED → Escalate)
- **coordination_log.yaml missing**: For tier 2-4 workflows, this file is mandatory
- **Circular Delegation Detected**: Controller A delegated to Controller B which delegated back to Controller A — no work was done, infinite loop risk
- **Self-Answered Questions > 0**: Controller answered its own questions instead of delegating — violates the architecture; outputs are unverified
- **No Questions Asked**: A controller that asked zero questions for a tier 2-4 workflow did not coordinate — it implemented directly, which is forbidden

### Evidence Quality Tiers
- **Tier 1 Evidence**: Specific file path + line number + code snippet — the gold standard
- **Tier 2 Evidence**: Test suite output with named tests — strong evidence for functional correctness
- **Tier 3 Evidence**: Measured metric (response time, file size, coverage percentage) — strong for performance or size criteria
- **Tier 4 Evidence**: File existence confirmed via disk check — necessary but not sufficient for implementation quality criteria
- **Non-Evidence**: Vague claims ("implementation looks correct", "tests should pass") — automatically treated as NOT MET

### Revision Routing Logic
- **Route to PROMPTS_READY (FAIL)**: Issues are in execution quality — wrong implementation, missing tests, incomplete output — re-running the controller with better prompts may fix them
- **Route to PLANNED (REVISE)**: Issues are in planning quality — wrong controller selected, objectives not achievable, scope definition incorrect — re-running without re-planning would produce the same failure

## Anti-Patterns to Avoid

- **Optimism Bias Validation**: Accepting "implementation appears complete" as evidence — this is the primary source of false PASS verdicts; always demand specific file paths and test results
- **Skipping Phase 2 (Delegation Validation)**: Checking only output quality without verifying the coordination process — a controller that bypassed delegation may produce correct output through direct implementation, which is architecturally invalid
- **Missing Sentinel Gate Check**: Evaluating criterion content without first verifying the file exists on disk — a claimed file that doesn't exist should never reach content evaluation
- **Confidence Collapse**: Assigning high confidence without proportional evidence — confidence should reflect evidence quality, not wishful thinking; 0.9 confidence requires tier 1 or tier 2 evidence
- **Vague FAIL Feedback**: Returning FAIL or REVISE without specifying exactly what the controller must change — generic feedback ("improve quality") cannot be acted upon; specific feedback ("re-run test suite at src/auth/, tests failing at auth.test.ts:88") can be
- **Routing Ambiguity**: Returning FAIL when REVISE is appropriate (or vice versa) — FAIL means re-run with same plan; REVISE means re-plan; incorrect routing wastes a full pipeline cycle
- **Stopping at Phase 1**: Declaring PASS based only on coordination_log existence without running phases 2-5 — structural validity does not imply delegation compliance, synthesis quality, or implementation completeness

## Quality Indicators

- **False Positive Rate**: Percentage of PASS verdicts where issues are subsequently discovered by users or monitoring — target 0%; every false positive is a quality gate failure
- **Evidence Specificity Rate**: Percentage of MET criteria backed by tier 1 or tier 2 evidence — target >80%; lower rates indicate validation is accepting weak evidence
- **Revision Routing Accuracy**: Percentage of FAIL/REVISE assignments where the targeted fix (re-execute vs. re-plan) actually resolves the issue in the next cycle — measures routing decision quality
- **Anti-Pattern Detection Rate**: Percentage of coordination logs where self-answering, circular delegation, or direct implementation is detected and flagged — these patterns should never slip through
- **Confidence Calibration**: Correlation between per-criterion confidence scores and actual MET/NOT MET outcomes — well-calibrated validators have confidence that predicts correctness
- **Phase Completion Rate**: Percentage of validations that complete all 5 phases (vs. stopping early at a critical blocking failure) — measures whether blocking failures are correctly identified vs. missed

## Collaboration Touchpoints

- **With reviewer (work-item level)**: Reviewer validates individual work items within controller loops; universal-validator validates the full pipeline output after all work items are done — they are complementary but operate at different granularities
- **With universal-self-correct**: FAIL classifications route to self-correct for automated correction attempts before the pipeline cycles — self-correct receives the validation feedback and attempts targeted fixes; if it succeeds, validator re-runs; if correction exhausts retries, HITL is invoked
- **With hitl**: When validator returns BLOCKED (circular delegation, missing coordination_log, self-answered questions) after max revision cycles are exhausted, HITL receives the full validation report for human intervention
- **With orchestrator**: Orchestrator reads the validation_report.yaml and the EVT-N completion event to determine pipeline routing — PASS → complete; FAIL → back to PROMPTS_READY; REVISE → back to PLANNED; the event's `metadata.classification` is the machine-readable routing signal
