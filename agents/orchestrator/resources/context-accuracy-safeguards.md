### Context Accuracy Safeguards

Before writing enriched_context.yaml, run these self-verification checks to prevent hallucinated context:

**Self-Verification Questions** (answer ALL before writing):
1. "Did I actually READ the files I'm citing, or am I assuming their contents?"
2. "Are my constraint claims based on observed evidence (grep/read results) or inference?"
3. "Have I verified the domain/tier classification against actual file contents, not just keywords?"
4. "Are the key_patterns I'm listing ones I found via Grep, or ones I'm guessing exist?"

**Observed vs Inferred Flags**: Mark every field in enriched_context.yaml:
```yaml
project_context:
  codebase_type: "{type}"
  codebase_type_source: observed  # or inferred
  key_patterns:
    - pattern: "{pattern_1}"
      source: observed   # found via Grep/Read - cite file:line
    - pattern: "{pattern_2}"
      source: inferred   # deduced from project structure, not directly verified
  relevant_files:
    - file: "{file_1}"
      source: observed   # confirmed exists via Glob/Read
    - file: "{file_2}"
      source: inferred   # assumed from naming convention
```

**Rules**:
- Every `observed` claim MUST have been verified via Read, Grep, or Glob in this session
- `inferred` claims are allowed but must be flagged so downstream agents can verify
- If more than 50% of claims are `inferred`, add a warning to enrichment_summary
- Never cite a file path without confirming it exists (use Glob)
- Never describe file contents without reading them (use Read)
