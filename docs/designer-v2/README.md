# Designer V2.0 Documentation

**Version**: 2.0
**Status**: Production Ready
**Last Updated**: 2026-01-16

## Overview

Designer V2.0 is an interactive design assistant with smart chunking, context discovery, and adaptive questioning that runs until the user cancels.

## Key Features

- **Smart Chunking**: Breaks large designs into manageable sections
- **Context Discovery**: Asks questions to understand requirements
- **Adaptive Questioning**: Adjusts questions based on answers
- **Continuous Mode**: Runs until user cancels (unlike traditional workflows)
- **Multi-Domain**: Works across all domains (engineering, creative, revenue, etc.)

## Documentation Files

### Overview & Summary
- **`DESIGNER_V2_OPTIMIZATION_SUMMARY.md`** - V2.0 improvements overview
  - Executive summary of enhancements
  - Feature comparison (V1.0 vs V2.0)
  - Implementation details
  - Benefits and use cases

### Migration & Usage
- **`DESIGNER_V2_MIGRATION_GUIDE.md`** - V1.0 → V2.0 upgrade guide
  - What's new in V2.0
  - Migration steps
  - Usage examples
  - Best practices
  - Troubleshooting

### Testing & Validation
- **`DESIGNER_V2_TEST_SCENARIOS.md`** - Comprehensive test cases
  - Unit tests
  - Integration tests
  - E2E scenarios
  - Edge cases
  - Performance validation

## Quick Start

### Using Designer V2.0

```bash
# Start interactive design session
/designer Design a user authentication system

# Designer will ask questions like:
# - What authentication methods do you want to support?
# - Do you need multi-factor authentication?
# - What password requirements should we enforce?
# - Should we support social login (Google, GitHub, etc.)?

# Session continues until you say "done" or cancel
```

### V2.0 Improvements

1. **Smarter Question Generation**:
   - Context-aware questions based on domain
   - Adaptive follow-ups based on previous answers
   - Avoids redundant questions

2. **Better Chunking**:
   - Breaks complex designs into logical sections
   - Handles large designs without overwhelming user
   - Progressive refinement

3. **Context Discovery**:
   - Automatically identifies missing context
   - Asks targeted questions to fill gaps
   - Builds complete understanding before implementation

4. **Continuous Mode**:
   - Runs until user cancels
   - No premature workflow exits
   - User controls when design is complete

5. **Multi-Domain Support**:
   - Works across all domains
   - Domain-specific question patterns
   - Adapts to domain conventions

## Configuration

Designer V2.0 uses configuration in `Agent_Memory/_system/designer/`:

- `designer_config.yaml` - Question patterns, chunking rules, domain settings
- `question_templates.yaml` - Domain-specific question templates

## Agent Location

- **Command**: `core/commands/designer.md`
- **Agent**: `core/agents/designer.md`

## Workflow Pattern

1. **Initiation**: User provides high-level design goal
2. **Question Phase**: Designer asks clarifying questions
3. **Refinement**: User answers, designer asks follow-ups
4. **Chunking**: Break large designs into sections
5. **Iteration**: Repeat for each section
6. **Completion**: User decides when design is complete

## Use Cases

- **System Design**: "Design a microservices architecture"
- **Feature Design**: "Design a recommendation engine"
- **Content Design**: "Design a blog content strategy"
- **Campaign Design**: "Design a product launch campaign"
- **Process Design**: "Design an onboarding workflow"

## Best Practices

1. **Start Broad**: Provide high-level goal, let designer ask specifics
2. **Answer Thoroughly**: Detailed answers lead to better designs
3. **Iterate Freely**: Designer adapts to your answers
4. **Control Completion**: You decide when design is ready
5. **Use Across Domains**: Works for engineering, creative, revenue, etc.

## Questions?

See:
- **V2.0 Summary**: `DESIGNER_V2_OPTIMIZATION_SUMMARY.md`
- **Migration Guide**: `DESIGNER_V2_MIGRATION_GUIDE.md`
- **Test Scenarios**: `DESIGNER_V2_TEST_SCENARIOS.md`
- **Main Docs**: `../README.md`

---

**Designer V2.0** - Interactive design through smart questioning
