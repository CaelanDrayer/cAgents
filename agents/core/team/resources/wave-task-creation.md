# Wave Task Creation (GATE sentinel pattern)

Use the GATE sentinel pattern to enforce wave ordering:

```javascript
// Wave 0 tasks
TaskCreate({ subject: "TASK-01: {description}", description: "Execute via /run. Acceptance criteria: ...", activeForm: "Executing TASK-01" /* optional */ })
TaskCreate({ subject: "TASK-02: {description}", description: "Execute via /run. Acceptance criteria: ...", activeForm: "Executing TASK-02" /* optional */ })

// Gate 0 sentinel (blocked by all wave-0 tasks)
TaskCreate({ subject: "GATE-0: Foundation Ready", description: "Quality gate. All wave-0 tasks must complete.", activeForm: "Validating foundation" /* optional */ })
TaskUpdate({ taskId: "{gate_id}", addBlockedBy: ["{wave_0_task_ids}"] })

// Wave 1 tasks (blocked by GATE-0)
TaskCreate({ subject: "TASK-03: {description}", ... })
TaskUpdate({ taskId: "{task_id}", addBlockedBy: ["{gate_0_id}"] })
```
