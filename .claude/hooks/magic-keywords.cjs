#!/usr/bin/env node
/**
 * Magic Keywords Hook - Natural Language Routing
 * cAgents V10.17.0
 *
 * UserPromptSubmit hook that detects natural language triggers and suggests
 * the appropriate skill. Inspired by oh-my-claudecode's magic keywords pattern.
 *
 * Examples:
 *   "build a login page" -> suggests /run
 *   "review the auth module" -> suggests /run review (v12.1.2 keyword router)
 *   "optimize database queries" -> suggests /run optimize (v12.1.2 keyword router)
 *   "design a new dashboard" -> suggests /designer
 *   "team up to build the API" -> suggests /team
 *
 * V11.0: /review and /optimize were unified into /improve --mode <mode>.
 * v12.1.2: /improve folded into /run via first-word keyword router
 *          (`improve|review|audit|optimize <target>`).
 *
 * Advisory mode: suggests but does not auto-route.
 */

const { createHook } = require('./hook-utils.cjs');

// Keyword patterns mapped to skills
// Each entry: [regex, skill, description]
// Patterns require the keyword near the start or as a clear verb phrase
const KEYWORD_ROUTES = [
  // /run triggers - action verbs for single-agent execution
  [/^(?:build|create|implement|add|make|write|code|develop|set up|scaffold|generate)\b/i, '/run', 'execute via agent pipeline'],
  [/^(?:fix|debug|repair|patch|resolve|troubleshoot)\b/i, '/run', 'fix via agent pipeline'],
  [/^(?:refactor|restructure|reorganize|clean up|migrate)\b/i, '/run', 'refactor via agent pipeline'],
  [/^(?:update|upgrade|modify|change|edit|adjust)\b/i, '/run', 'update via agent pipeline'],
  [/^(?:deploy|release|publish|ship)\b/i, '/run', 'deploy via agent pipeline'],

  // Improve modes inside /run (v12.1.2: /improve folded into /run via keyword router)
  [/^(?:review|audit|check|inspect|analyze|assess|evaluate)\b/i, '/run review', 'review with specialist agents (keyword router -> --mode review)'],
  [/^(?:code review|security review|performance review)\b/i, '/run review', 'review with specialist agents (keyword router -> --mode review)'],
  [/^(?:optimize|speed up|improve performance|benchmark|profile|tune)\b/i, '/run optimize', 'optimize with before/after metrics (keyword router -> --mode optimize)'],
  [/^(?:reduce|minimize|compress|shrink)\b.*(?:size|bundle|latency|memory|load)/i, '/run optimize', 'optimize with before/after metrics (keyword router -> --mode optimize)'],

  // /designer triggers
  [/^(?:design|explore|brainstorm|prototype|sketch|wireframe|mockup)\b/i, '/designer', 'interactive design exploration'],
  [/^(?:help me think|let's think about|figure out|plan out)\b/i, '/designer', 'interactive design exploration'],

  // /team triggers - explicit parallel/team keywords
  [/^(?:team|parallel|coordinate|orchestrate)\b/i, '/team', 'parallel multi-agent execution'],
  [/^(?:team up|work together|split up|divide and conquer)\b/i, '/team', 'parallel multi-agent execution'],

  // /team strategic mode triggers - strategic/company-wide
  [/^(?:strategy|strategic|company-wide|cross-department|organization)\b/i, '/team', 'cross-domain C-suite orchestration (strategic mode)'],
];

// Phrases that should NOT trigger suggestions (questions, meta-commands, etc.)
const SUPPRESSION_PATTERNS = [
  /^(?:what|how|why|when|where|who|which|can you|could you|would you|should|is there|are there|do you|does|did)\b/i,
  /^(?:explain|describe|tell me|show me|list|help|summarize)\b/i,
  /^(?:\/\w)/,  // Already a slash command
  /^(?:yes|no|ok|sure|thanks|thank you|please|y|n)\b/i,
  /^(?:continue|go ahead|proceed|next|done|stop|cancel|abort)\b/i,
];

createHook('MagicKeywords', async (input) => {
  // UserPromptSubmit receives the user's prompt text
  const prompt = (input.user_prompt || input.prompt || '').trim();

  if (!prompt || prompt.length < 5) return null;

  // Check suppression patterns first
  for (const pattern of SUPPRESSION_PATTERNS) {
    if (pattern.test(prompt)) return null;
  }

  // Check keyword routes
  for (const [pattern, skill, description] of KEYWORD_ROUTES) {
    if (pattern.test(prompt)) {
      return {
        continue: true,
        systemMessage: `Magic keyword detected: consider using \`${skill}\` to ${description}. The user said: "${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}". If they want the full agent pipeline, suggest \`${skill} ${prompt}\`. Otherwise, answer directly.`
      };
    }
  }

  return null;
});
