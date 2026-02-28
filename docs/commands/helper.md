# /helper - Interactive Command Guide

## Usage
```bash
/helper                              # General guidance
/helper What command should I use?   # Recommendation
/helper --troubleshoot               # Troubleshooting mode
```

## How It Works

Provides guidance on which cAgents command to use for a given task. Uses intent classification to recommend the right command.

## Intent Classification

| Intent | Keywords | Command |
|--------|----------|---------|
| Fix/Debug | fix, bug, error, broken, crash | `/run` |
| Build/Create | build, create, implement, add, new feature | `/run` or `/team` |
| Plan/Design | plan, design, architect, spec | `/designer` |
| Review/Audit | review, audit, check, inspect | `/review` |
| Optimize | optimize, improve, speed up, reduce | `/optimize` |
| Multi-domain | launch, restructure, company-wide | `/org` |
| Parallel/Large | parallel, team, big feature | `/team` |
| Learn/Help | how do I, what is, explain | `/helper` |

## Context Mode
`context: none` -- interactive, no agents spawned.
