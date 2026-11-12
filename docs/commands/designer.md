# /designer - Interactive Design Engine

`/designer` runs a guided design session. It asks you questions, one phase at a time, and it builds a design document from your answers. Use it before you build, to make the requirements clear.

The canonical behavior is in `.claude/skills/designer/SKILL.md`. The flags and the phases are defined in `.claude/skills/_MODE_REGISTRY.md` § /designer.

## Usage

```bash
/designer <topic>
/designer Design a user authentication system
/designer Plan a 6-week course on prompt engineering
/designer --resume <session_id>
```

## Flags

| Flag | Effect |
|------|--------|
| `--deep` | Spawns the research agents in all 6 phases. Without it, they spawn only in Refinement and Specification. |
| `--resume <id>` | Resumes a paused session. |
| `--template <name>` | Starts from a domain template. |
| `--brief <path>` | Reads a strategic brief (for example, from `/team` strategic mode) and pre-fills Empathize and Define. |
| `--iterate <session_id>` | Starts from a completed design. Skips Empathize and Define, and saves the changes as a new session. |

## How It Works

1. Research agents prepare a list of questions for each phase.
2. The designer asks each question with `AskUserQuestion`. It can select, reorder, skip, or adapt the questions.
3. The research for the next phase starts while the current phase ends.
4. The designer sends follow-up research when an answer needs it.
5. The designer assembles the design document from the phase files on disk.

`/designer` is interactive. It waits for your answer at every question. It does not advance a phase on its own. It is exempt from the auto-proceed rule.

## 6 Phases

1. **Empathize**: Users, stakeholders, pain points, and context.
2. **Define**: Problem statement, constraints, and success criteria.
3. **Conceptualize**: High-level framings, the design domain, and the scope.
4. **Ideation**: 2 to 4 alternatives, their trade-offs, and the selected approach.
5. **Refinement**: Architecture, flows, data model, security, and tests.
6. **Specification**: Stories, specs, diagrams, and checklists. The designer enters this phase only when the ambiguity score is below 20%.

Refinement is the default state. After Specification, the designer offers more refinement first. It shows the build and export options only when you say that you are done.

## Build Integration

When you choose a build option, the designer starts `/act` or `/team` with the design session as input. Other exits are export, share, manual execution, and save and pause.

## Context Mode

`context: none`. The skill runs inline in the main session.

## Output

The session folder is `cagents-memory/sessions/designer_{slug}_{YYMMDD}_{NNN}/`. It holds:

- `design_document.md`: the main design document.
- `session.yaml`: the phase, the question count, and the progress.
- `qa_log.yaml`: the questions and answers of the active phase.
- `question_prep/`: the output of the research agents.
- `phases/`: one output file for each completed phase.
- `artifacts/`: one file for each generated artifact.
- `waypoints/`: checkpoint snapshots at each phase transition.
