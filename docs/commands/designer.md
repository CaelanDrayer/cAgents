# /designer - Interactive Design Engine

## Usage
```bash
/designer <topic>
/designer Design a user authentication system
/designer Plan a mobile app architecture
```

## How It Works

1. Research agents pre-build context-rich question lists per phase
2. Designer presents questions inline (select, reorder, skip, adapt)
3. Phase-overlap: next-phase research begins during current phase
4. Follow-up research dispatched as needed
5. Design document generated from accumulated answers

## 4 Phases
1. **Discovery**: Understand requirements and constraints
2. **Architecture**: Define system structure and patterns
3. **Detail**: Flesh out specific components
4. **Validation**: Verify completeness and consistency

## Key Features
- Subagent-delegated question preparation
- Inline controller pattern (not forked)
- 28 behavioral rules for question management
- Graceful fallback when research agents unavailable

## Context Mode
`context: none` -- interactive, runs inline.

## Output
- `design_document.md` - Main design document
- `qa_log.yaml` - Q&A with phases
- `artifacts/` - Generated diagrams and specs
