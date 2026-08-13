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
| Fix/Debug | fix, bug, error, broken, crash | `/act` |
| Build/Create | build, create, implement, add, new feature | `/act` or `/team` |
| Plan/Design | plan, design, architect, spec | `/designer` |
| Review/Audit | review, audit, check, inspect | `/act review` (keyword router; v12.1.2+ — equivalent to legacy `/improve --mode review`) |
| Optimize | optimize, improve, speed up, reduce | `/act optimize` or `/act improve` (keyword router; v12.1.2+ — equivalent to legacy `/improve --mode optimize` / `--mode full`) |
| Multi-domain | launch, restructure, company-wide | `/team` (auto-enables strategic mode for multi-domain requests; v12.2.0+ — replaces removed `/org` skill) |
| Parallel/Large | parallel, team, big feature | `/team` |
| Learn/Help | how do I, what is, explain | `/helper` |

## Context Mode
`context: none` -- interactive, no agents spawned.
