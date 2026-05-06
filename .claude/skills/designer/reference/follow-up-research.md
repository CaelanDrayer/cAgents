# Follow-Up Research Dispatch and Graceful Fallback

When the user reveals new information during a phase that the original research did not cover, the designer dispatches a follow-up research agent to investigate before continuing.

## When to Dispatch Follow-Up Research

- User mentions an integration point not in the codebase scan
- User reveals an unexpected constraint (regulatory, vendor, legacy)
- User describes a pain point or workflow not surfaced in Empathize research
- User selects "Research this for me" on a question
- User's answer contradicts a finding from the prep research (verify before proceeding)

## Dispatch Pattern

```javascript
Agent({
  subagent_type: "cagents:backend-developer",  // or appropriate specialist
  description: "Follow-up research: ${new_topic}",
  prompt: `Follow-up research for /designer.
TOPIC: ${topic}
NEW INFO FROM USER: "${answer_excerpt}"
INVESTIGATE: ${specific_questions}
Write to: ${session_dir}/question_prep/followup_${phase}_${timestamp}.yaml`
})
```

Keep prompts under 300 tokens. The follow-up agent writes findings to the same `question_prep/` directory used for prep research, namespaced with the `followup_` prefix.

## Graceful Fallback

If a research agent fails to spawn, returns no findings, or writes a malformed file, the designer MUST gracefully degrade rather than blocking the phase:

| Failure Mode | Fallback Action |
|--------------|-----------------|
| Agent tool unavailable | Use inline analysis (Glob/Grep/Read) instead |
| Research agent times out | Continue with template-based questions from `cagents-memory/_system/templates/designer/{domain}_chunks.yaml` |
| Question_prep file is empty or malformed | Skip that file, fall back to chunk templates |
| All research agents fail | Switch to fully inline mode for that phase, log the failure |
| Specialist validation agent fails (Refinement) | Note in design document, continue without validation |

The research is an **enhancement**, not a hard requirement. The designer must complete the phase regardless of research availability.

## Specialist Validation (Refinement)

Refinement phase optionally spawns specialist validation agents in addition to research agents:

```
designer -> Agent(cagents:architect, "Validate proposed architecture against {constraints}")
designer -> Agent(cagents:security-specialist, "Validate security design for {sensitive_areas}")
designer -> Agent(cagents:qa-lead, "Validate testability of proposed design")
```

Trigger criteria: tier 3+ designs, system architecture concerns, auth/privacy components.
- Research agents prepare QUESTIONS.
- Specialists validate ANSWERS.
- Keep prompts under 300 tokens.

If a specialist agent fails, document the gap in the design document and proceed.
