# {SUPER-DOMAIN} Super-Domain Quick Reference

**Purpose**: {Capability description}
**Agent Count**: {N}
**Controllers**: {N}
**Execution Agents**: {N}

---

## Common Workflows

### {Category 1} Workflows

```bash
# {Workflow 1}
/trigger {example request 1}

# {Workflow 2}
/trigger {example request 2}

# {Workflow 3}
/trigger {example request 3}

# Review/Optimize
/reviewer {target}
/optimize {target}
```

### {Category 2} Workflows

```bash
# {Workflow 1}
/trigger {example request 1}

# {Workflow 2}
/trigger {example request 2}
```

---

## Key Controllers (Tier 2)

### {controller-1}

- **Use for**: {Use cases}
- **Questions asked**: {N-M}
- **Typical duration**: {time range}
- **Example**: "{request}" → {outcome}

### {controller-2}

- **Use for**: {Use cases}
- **Questions asked**: {N-M}
- **Typical duration**: {time range}
- **Example**: "{request}" → {outcome}

### {controller-3}

- **Use for**: {Use cases}
- **Questions asked**: {N-M}
- **Typical duration**: {time range}
- **Example**: "{request}" → {outcome}

---

## Key Execution Agents (Tier 3)

### {execution-agent-1}

- {What it does}
- Answers questions about {topics}

### {execution-agent-2}

- {What it does}
- Answers questions about {topics}

### {execution-agent-3}

- {What it does}
- Answers questions about {topics}

---

## Configuration Files

```
{domain}/config/
├── router_config.yaml       # Tier classification for {DOMAIN}
├── planner_config.yaml      # Controller selection ({N} controllers)
├── executor_config.yaml     # Execution monitoring
├── validator_config.yaml    # Quality gates
└── self_correct_config.yaml # Recovery patterns
```

---

## Common Patterns

### Question-Based Delegation (Controllers)

1. Controller receives objectives from plan.yaml
2. Breaks into {N-M} specific questions
3. Delegates to execution agents ({list})
4. Synthesizes answers into coherent solution
5. Creates implementation tasks
6. Writes coordination_log.yaml

### Answer-and-Execute (Execution Agents)

1. Receives question from controller
2. Provides expert answer with context
3. If assigned implementation task, executes it
4. Reports completion to controller

---

## Success Metrics

- **Tier 2 Success Rate**: {percentage}
- **Avg Questions Asked**: {N}
- **Avg Tasks Generated**: {N}
- **Avg Token Usage**: {N}
- **Avg Duration**: {time}

---

## Tips

✅ **DO**:
- Use {controller} for {use case}
- Provide context in your request
- Include success criteria
- Specify constraints upfront

❌ **DON'T**:
- Skip testing in objectives
- Request work without clear success criteria
- Use tier 4 unless HITL approval needed
- Omit important context

---

**Version**: 1.0
**Super-Domain**: {domain}
**Part of**: cAgents V7.0
**Last Updated**: {date}
