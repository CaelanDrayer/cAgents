# Tool Development Patterns

## Editor Extension Types
- **Inspector**: Custom property display
- **Window**: Standalone tool window
- **Wizard**: Multi-step creation flow
- **Gizmo**: In-scene visualization
- **Menu**: Context and main menus

## Asset Pipeline Patterns

### Import Pipeline
1. Detect source file change
2. Parse/convert format
3. Validate content
4. Generate metadata
5. Write to asset database

### Batch Processing
- Queue-based processing
- Progress reporting
- Error handling and logging
- Resume on failure

## Best Practices

### UX for Tools
- Undo/redo support
- Clear feedback on actions
- Keyboard shortcuts
- Consistent with engine style

### Reliability
- Validate all inputs
- Graceful error handling
- No data loss on crash
- Atomic file operations

### Performance
- Async for long operations
- Progress bars for feedback
- Incremental processing
- Cache expensive operations

## Documentation Checklist
- [ ] What the tool does
- [ ] How to access it
- [ ] Basic workflow
- [ ] Common use cases
- [ ] Troubleshooting
