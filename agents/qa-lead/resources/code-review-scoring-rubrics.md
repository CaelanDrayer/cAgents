# Code Reviewer: Scoring Rubrics

Reference catalogs for the code-reviewer agent's anti-pattern enforcement and prose-quality scoring. The SKILL.md body keeps the review posture, severity guide, simplicity override, and success criteria; this file carries the language-specific anti-pattern tables, the composite quality score, and the prose-quality review rubric.

## Language-Specific Anti-Pattern Enforcement (V10.18.0)

Forbidden patterns by language. Each violation deducts from the composite quality score.

### TypeScript Anti-Patterns
| Pattern | Severity | Score Deduction | Why |
|---------|----------|----------------|-----|
| `@ts-ignore` | CRITICAL | -15 | Silences type safety; use `@ts-expect-error` with explanation if truly needed |
| `any` type (non-generic) | HIGH | -10 | Defeats TypeScript's purpose; use `unknown` + type guards |
| Deleted/skipped tests | CRITICAL | -20 | Test deletion is a regression vector; comment with ticket if temporary |
| `as` type assertion (non-test) | MEDIUM | -5 | Often hides bugs; prefer type guards or generics |
| `!` non-null assertion | MEDIUM | -5 | Runtime null crash waiting to happen; use optional chaining |

### Python Anti-Patterns
| Pattern | Severity | Score Deduction | Why |
|---------|----------|----------------|-----|
| Bare `except:` | CRITICAL | -15 | Catches SystemExit, KeyboardInterrupt; always specify exception type |
| Blanket `# noqa` | HIGH | -10 | Silences all warnings; use specific codes (`# noqa: E501`) |
| `eval()` / `exec()` | CRITICAL | -20 | Code injection vector; use `ast.literal_eval` or structured parsing |
| Mutable default arguments | HIGH | -10 | Shared state bug; use `None` + conditional assignment |
| `import *` | MEDIUM | -5 | Namespace pollution; import specific names |

### JavaScript Anti-Patterns
| Pattern | Severity | Score Deduction | Why |
|---------|----------|----------------|-----|
| `eval()` | CRITICAL | -20 | Code injection + CSP violation; use structured alternatives |
| `var` (instead of let/const) | HIGH | -10 | Hoisting bugs; always use `const` (prefer) or `let` |
| `==` (loose equality) | MEDIUM | -5 | Type coercion surprises; use `===` |
| `arguments` object | MEDIUM | -5 | Use rest parameters (`...args`) instead |
| `document.write()` | HIGH | -10 | XSS vector + overwrites document; use DOM manipulation |

### Composite Quality Score

```
base_score = 100
final_score = base_score - sum(deductions)
```

| Score Range | Rating | Action |
|------------|--------|--------|
| 90-100 | Excellent | PASS |
| 75-89 | Good | PASS with suggestions |
| 60-74 | Needs Work | REVISE required |
| < 60 | Poor | CRITICAL - block merge |

## Prose Quality Review for Documentation and Content (V10.22.1)

When reviewing work items that produce documentation, README files, API docs, comments, or content output, add a **prose quality dimension** to Stage 2 (Code Quality Review). This catches AI slop patterns that undermine documentation clarity.

### Prose Quality Checks

| Check | What to Flag | Severity |
|-------|-------------|----------|
| **False agency** | "The system handles", "The pipeline manages" -- name the component or agent | MEDIUM |
| **Vague declaratives** | "The implementation is robust", "The approach is comprehensive" -- require specific evidence | HIGH |
| **Throat-clearing** | "It's worth noting that", "Here's the thing" -- cut and start with the point | MEDIUM |
| **Passive voice** | "Tests were written", "The feature was deployed" -- name who acts | MEDIUM |
| **Business jargon** | "Deep dive", "game-changer", "leverage", "paradigm shift" -- use plain language | LOW |
| **Filler adverbs** | "fundamentally", "essentially", "significantly" without measurement | LOW |

### Prose Quality Scoring

For documentation-heavy work items, compute a prose quality sub-score:

```
prose_deductions = false_agency_count * -3 + vague_declarative_count * -5 + throat_clearing_count * -2 + passive_voice_count * -2
prose_score = max(0, 100 + prose_deductions)
```

| Score | Rating | Action |
|-------|--------|--------|
| 80-100 | Clean prose | No action |
| 60-79 | Needs cleanup | Recommend revision (LOW) |
| < 60 | Slop-heavy | REVISE required (MEDIUM) |

Apply prose quality scoring only to: `.md` files, `README` files, API documentation, inline documentation blocks (JSDoc, docstrings), and content output files. Do not apply to code, configuration, or test files.

See `.claude/rules/quality/anti-slop.md` for the full anti-slop ruleset.
