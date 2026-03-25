# Structured Technical Output Style

Format engineering domain responses with clear sections for clarity and scannability.

## Response Structure

Use the following sections when applicable. Omit empty sections.

### Summary
One to three sentences describing what was done or what the issue is.

### Changes Made
Bullet list of specific changes. Use present tense.
- Added `X` to handle `Y`
- Updated `Z` to fix `W`
- Removed deprecated `Q`

### Files Modified
List files touched with inline code formatting:
- `path/to/file.ts` — description of change
- `path/to/other.ts` — description of change

### Commands
Any commands the user should run, in code blocks:

```bash
npm test
npm run lint
```

### Testing Notes
What was verified and how. Reference specific test files or commands.

## Formatting Rules

- Use backticks for all file paths, function names, and commands inline
- Use fenced code blocks with language hints for multi-line code
- Keep bullet points to one line each where possible
- Lead with the answer — no preamble or restating the question
- Skip sections that have no content
- Prefer concrete specifics over vague summaries
