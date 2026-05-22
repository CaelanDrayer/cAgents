#!/usr/bin/env node
/**
 * Prompt Router Hook (cAgents v12.7.1, P1-7)
 *
 * Replaces the two pre-consolidation hooks:
 *   - delegation-enforcer.cjs (UserPromptSubmit, 116 lines, full kill-list)
 *   - magic-keywords.cjs (UserPromptSubmit, 85 lines, natural-language routing)
 *
 * Behavior:
 *   - UserPromptSubmit:
 *       1. If the prompt starts with /run or /team, inject a 5-line
 *          systemMessage that references @.claude/rules/core/delegation.md
 *          (the canonical kill-list).
 *       2. Otherwise, detect natural-language intent keywords (build, fix,
 *          design, review, optimize) and suggest the matching skill — but
 *          ONLY when the prompt is ≤2 sentences (length gating cuts noise
 *          in conversational mode).
 *   - PreToolUse[Agent]: pass-through (no-op). Reserved for future
 *     controller-spawn validation if needed; controller-delegation-validator
 *     handles the Write/Edit deny path.
 *
 * The huge multi-paragraph delegation mandate that delegation-enforcer.cjs
 * injected (~3000 chars) is gone — the model is asked to read the canonical
 * rule file once instead. Net token saving on every /run + /team invocation.
 */

const { createHook } = require('./hook-utils.cjs');

const ENFORCED_SKILLS = ['/run', '/team'];

const KEYWORD_ROUTES = [
  // /run triggers
  [/^(?:build|create|implement|add|make|write|code|develop|set up|scaffold|generate)\b/i, '/run', 'execute via agent pipeline'],
  [/^(?:fix|debug|repair|patch|resolve|troubleshoot)\b/i, '/run', 'fix via agent pipeline'],
  [/^(?:refactor|restructure|reorganize|clean up|migrate)\b/i, '/run', 'refactor via agent pipeline'],
  [/^(?:update|upgrade|modify|change|edit|adjust)\b/i, '/run', 'update via agent pipeline'],
  [/^(?:deploy|release|publish|ship)\b/i, '/run', 'deploy via agent pipeline'],
  // Improve-mode keyword routing (v12.1.2 folded /improve into /run)
  [/^(?:review|audit|check|inspect|analyze|assess|evaluate)\b/i, '/run review', 'review with specialist agents'],
  [/^(?:optimize|speed up|improve performance|benchmark|profile|tune)\b/i, '/run optimize', 'optimize with metrics'],
  // /designer triggers
  [/^(?:design|explore|brainstorm|prototype|sketch|wireframe|mockup)\b/i, '/designer', 'interactive design exploration'],
  // /team triggers
  [/^(?:team|parallel|coordinate|orchestrate)\b/i, '/team', 'parallel multi-agent execution'],
  [/^(?:strategy|strategic|company-wide|cross-department|organization)\b/i, '/team', 'cross-domain strategic mode'],
];

const SUPPRESSION_PATTERNS = [
  /^(?:what|how|why|when|where|who|which|can you|could you|would you|should|is there|are there|do you|does|did)\b/i,
  /^(?:explain|describe|tell me|show me|list|help|summarize)\b/i,
  /^\//, // already a slash command
  /^(?:yes|no|ok|sure|thanks|thank you|please|y|n)\b/i,
  /^(?:continue|go ahead|proceed|next|done|stop|cancel|abort)\b/i,
];

function detectSkillInvocation(prompt) {
  const trimmed = prompt.trim();
  for (const skill of ENFORCED_SKILLS) {
    if (
      trimmed.startsWith(skill + ' ') ||
      trimmed === skill ||
      trimmed.startsWith(skill + '\n')
    ) {
      return skill;
    }
  }
  return null;
}

function sentenceCount(text) {
  // Crude split on sentence terminators followed by whitespace or EOS.
  const parts = text.split(/[.!?](?:\s|$)/).map((s) => s.trim()).filter(Boolean);
  return parts.length;
}

function buildDelegationReminder(skill) {
  return `DELEGATION ACTIVE for ${skill}. See @.claude/rules/core/delegation.md for the Rationalization Kill List. All work goes to subagents via the Agent tool — no direct implementation, no matter how small the task.`;
}

createHook('PromptRouter', async (input) => {
  // Handle PreToolUse[Agent] pass-through case (no-op for now).
  if (input.tool_name === 'Agent') {
    return null;
  }

  const prompt = (input.user_prompt || input.prompt || '').trim();
  if (!prompt) return null;

  // Layer 1: enforced skill invocations get the canonical delegation
  // reminder (replaces the full delegation-enforcer mandate).
  const skill = detectSkillInvocation(prompt);
  if (skill) {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildDelegationReminder(skill),
      },
    };
  }

  // Layer 2: natural-language routing suggestions (replaces magic-keywords).
  // Length gating: skip routing nudges for ≥3 sentences (conversational mode).
  if (prompt.length < 5) return null;
  if (sentenceCount(prompt) >= 3) return null;

  for (const pattern of SUPPRESSION_PATTERNS) {
    if (pattern.test(prompt)) return null;
  }

  for (const [pattern, suggestedSkill, description] of KEYWORD_ROUTES) {
    if (pattern.test(prompt)) {
      const preview = prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt;
      return {
        continue: true,
        systemMessage: `Routing suggestion: \`${suggestedSkill}\` (${description}). User prompt: "${preview}". If they want the full agent pipeline, suggest \`${suggestedSkill} ${prompt}\`. See @.claude/rules/core/delegation.md for the delegation contract.`,
      };
    }
  }

  return null;
});
