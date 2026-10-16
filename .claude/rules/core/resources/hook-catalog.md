---
paths:
  - ".claude/rules/core/resources/hook-catalog.md"
  - ".claude/rules/core/hooks.md"
  - ".claude/rules/playbooks/pat-concurrent-session-hooks.md"
  - ".claude/hooks/**"
  - ".claude/settings*.json"
  - "cagents-memory/_system/config/hooks.yaml"
  - "scripts/lint-hooks.cjs"
  - "tests/hooks/**"
  - "tests/regressions/hooks-md-event-mapping.test.js"
  - "docs/SECURITY_BASH_GUARD_THREAT_MODEL.md"
---

# Hook Catalog Detail

Per-hook detail for the active cAgents hook system. The parent file
`.claude/rules/core/hooks.md` keeps the architecture overview, the factory, and
the I/O contract. This catalog carries the purpose, the matcher, the inputs, the
outputs, and the side effects of each hook.

## Cross-Cutting Contracts (v12.76.0)

These contracts live in `hook-utils.cjs` and apply to many hooks. Session
`team_hook-session-fixes_261015_001` added them. Each row names its change id.

### Payload Policy for the Guard Hooks

The guard hooks are `BashValidator`, `WriteEditDispatch`, and `AgentDispatch`.
They are the members of `NO_PAYLOAD_FAIL_CLOSED`.

| stdin status | What arrived | Verdict of a guard hook |
|---|---|---|
| `parsed`, `eof` | A complete JSON object | The guard evaluates the payload. |
| `timeout-partial` | Some bytes, but no complete JSON object before EOF, before the 2000 ms deadline, or before a stdin `error` | Fail closed: deny with a `[FAIL-CLOSED]` reason. |
| `eof-empty`, `timeout-empty` | No bytes at EOF, at the deadline, or before a stdin `error` | Fail open: allow with exactly one `[FAIL-OPEN]` systemMessage. |

- **HS-3 and H6 (WI-2)**: the reader parses the payload as soon as the bytes
  form a complete JSON object. It does not wait for EOF. After the verdict the
  factory destroys stdin, so the process can exit. An unref'd 1.5 s backstop
  timer calls `process.exit` if another handle keeps the process alive.
- **W5 (WI-2)**: the `eof-empty` row is new. Before, an empty payload at EOF
  allowed with no message.
- **F1 (WI-19)**: a stdin `error` maps to `timeout-partial` when bytes arrived,
  and to `timeout-empty` when none arrived.
- **HS-7 (WI-2, WI-19 F2)**: `SessionInitGate` left `NO_PAYLOAD_FAIL_CLOSED`
  and `FAIL_CLOSED_HOOKS`. It is advisory. It runs inside `AgentDispatch`,
  which stays in both sets.
- A hook that is not a guard keeps the old behavior. It evaluates `{}`.

### Dedup Backstop (HS-2, WI-4)

- The dedup marker in `os.tmpdir()` keys on a SHA-1 of the hook name and the
  full input.
- The marker stays for 5 s (`DEDUP_TTL_MS`). A marker that is older by mtime
  never suppresses.
- The first run records its verdict in the marker. A duplicate run replays that
  verdict. It waits up to 1.5 s (`DEDUP_REPLAY_WAIT_MS`) for it.
- Two identical payloads with no `tool_use_id` inside 5 s count as one event.
  An example is the same Notification twice.
- Set `CAGENTS_HOOK_DEDUP_DISABLE=1` to turn dedup off.

### Session Resolution: resolveSession (HS-1, WI-7)

`resolveSession(input, { purpose, includeTerminal, claimHint, allowEnv })`
tries these steps in order:

1. The session that the payload transcript owns (`resolveOwnedSession`).
2. An absolute `SESSION_DIR` hint, or `CAGENTS_SESSION_ID`, in
   `tool_input.prompt`. The session must be unclaimed or owned. When
   `claimHint` is true, the hint claims the session.
3. A non-UUID cAgents session id in `session_id`, which is a legacy or test
   pin. If there is no pin, the `CAGENTS_ACTIVE_SESSION` env var.
   `allowEnv: false` skips the env var.
4. `null`.

The chain has no newest-mtime step. Two live sessions with no owner, no pin,
no hint, and no env var give `null`. The chain drops a result whose marker
names another transcript. `purpose: 'gate'` rejects a terminal session.
`purpose: 'record'`, the default, accepts it.

| Hook | Call |
|------|------|
| `session-init-gate.cjs` | `purpose: 'gate'` |
| `controller-delegation-validator.cjs` | `purpose: 'gate'`, `claimHint: false` |
| `post-write-validator.cjs` | `purpose: 'gate'`, `claimHint: false` |
| `subagent-tracker.cjs`, `subagent-stop-tracker.cjs` | `purpose: 'record'` |
| `verify-completion.cjs` | `purpose: 'record'`, `claimHint: false` |
| `team-stop.cjs` Phase 1 | `purpose: 'record'`, `claimHint: false`, `allowEnv: false` |

8 hooks still call `findActiveSession`, which is also deterministic:
`pre-compact-save`, `post-compact-restore`,
`instructions-loaded`, `goal-evaluator-logger`, `model-routing-advisor`,
`tool-failure-tracker`, `spawn-footprint`, and `stop-failure-handler`.

`claimFromAnyWrite(input)` claims a session for a Write, an Edit, or a Bash
command that writes `sessions/{sid}/status.yaml` or
`sessions/{sid}/instruction.yaml`. See PostToolUse[Bash] below.

### Spawn Events: events.jsonl (HS-6, WI-7)

- The trackers append each spawn and each stop to `workflow/events.jsonl`,
  one JSON object per line. Each append is one `O_APPEND` write of less than
  4 KB, so it needs no lock.
- `events.jsonl` is the source of truth. `workflow/agent_tree.yaml` is a view
  that hooks derive from it. The hooks rewrite the tree with
  `updateYamlLocked` and `writeFileAtomic`.
- If the tree lock is busy, the event line is enough.
  `reconcileTreeFromEvents` adds the missing rows on the next write.
- If the tree is not valid YAML, `loadAgentTreeTolerant` moves it to a
  quarantine file and rebuilds it from `events.jsonl`.
- A spawn with no `agent_id` gets the id `anon_<type>_<ts>_<pid>` from
  `fallbackAgentId`. The matching stop is a `stop_anon` event.
- Do not edit `agent_tree.yaml` by hand. Agents do not self-register in it.
- At Stop, a running child counts as live only when its `spawned_at` is
  inside `CAGENTS_STALE_CHILD_MS` (default 30 min). A row with a missing
  `spawned_at` counts as stale.

### Stop-Path Rules (HS-4, HS-10, HS-11, idle lead)

| Id | Rule |
|----|------|
| HS-4 (c), WI-10 | `liveAtStop` is true when the session has a running child or a fresh heartbeat. A live session keeps its state. Stop writes no force-terminal stamp on it. |
| WI-13, WI-13b | An idle `/team` lead between waves also counts as live at Stop. `teamIdleBetweenWaves` in `team-stop.cjs` is the one copy of that predicate. `verify-completion.cjs` loads it with `require`. |
| HS-4 (e), WI-10 | `team-stop.cjs` writes `phase: completed` and `pipeline_state: VALIDATED` only when `sessionGenuinelyValidated` finds a real validator PASS on disk. |
| HS-4 (d), WI-10 | `validator-evidence-recheck.cjs` resolves a relative evidence path against `PROJECT_ROOT`. It does not use `input.cwd`. |
| HS-10, WI-12 | No hook writes a stub `validation_report.yaml` or a stub `execution_summary.yaml`. `autoResolveWarnings` was removed. `repairSession` repairs state from evidence and never changes a verdict. |
| HS-11, WI-10 | Stop shows at most one warning line. Stop does not show the same warning set twice. Advisory text goes to stderr. The PRE, MID, and SELF-CHECK blocks were removed. |

The 24 h staleness skip in `verify-completion.cjs` is unchanged. It runs
before the idle-lead predicate. See the Stop, SessionEnd, and SessionStart
sections below for the detail.

## Session Lifecycle

### SessionStart: session-catchup.cjs

- **Purpose**: Detect incomplete sessions on startup, offer resume options, inject cAgents behavioral context.
- **Also**: Initializes session state. It replaces on-session-start.sh. It also
  carries the prompt guidance that a separate prompt hook held before. Claude
  Code does not support prompt hooks for SessionStart.
- **Creates**: `cagents-memory/_system/incomplete_sessions.json`
- **Repair sweep (HS-10, WI-12, v12.76.0)**: for each session that is not
  live, the hook calls `repairSession(sessionDir, { mode: 'sweep' })`. Sweep
  mode does the repairs of stop mode (see the Stop section). It also closes an
  open `agent_tree.yaml` row when the session has had no activity for 24 h
  and the row is older than `CAGENTS_STALE_CHILD_MS` (default 30 min). The
  repair reads every `_system/logs/agent_spawns*.log` file, but only for a
  session with open rows. On this repo that added about 0.05 s to SessionStart.
- **Output**: `{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}`

### SessionEnd: team-stop.cjs

- **Purpose**: Multi-phase session teardown. The filename says team, but the
  hook runs for all session types, not only team_* sessions.
- **Model note (v2.1.178+)**: `team-start.cjs`, `teammate-idle-handler.cjs`, and
  `team-task-complete.cjs` serve the experimental path only. `team-stop.cjs`
  does not. Its universal teardown runs for every session, and that includes a
  default concurrent-Agent `/team` run. The universal teardown is Phase 1
  agent-tree cleanup, Phase 2 `execution_summary.yaml`, and Phase 5 SDK-UUID
  pointer unlink. Phase 3 team metrics is the one phase that is scoped to
  `team_*` sessions. It fires for those sessions on the default path and on the
  experimental path alike. This teardown does not depend on `TeamCreate` or on
  `TeamDelete`, which version 2.1.178 removed. Cleanup of an implicit team is
  automatic.
- **Resolution (v12.76.0, HS-1)**: Phase 1 calls
  `resolveSession(input, { allowEnv: false })`. An env var is not ownership, so
  SessionEnd skips the `CAGENTS_ACTIVE_SESSION` step. A non-UUID payload is an
  exact session-id pin. Phase 2 takes a team session only when `isOwnedBy`
  holds for the UUID, and it is skipped when the payload has no `session_id`.
  There is no `fallbackHeuristic` and no newest-session guess. With no owned
  session the hook skips session finalization. `resolveMemoryRoot` returns
  `AGENT_MEMORY_DIR` (WI-10).
- **Idle lead between waves (WI-13, v12.76.0)**: before Phase 1 the hook calls
  `teamIdleBetweenWaves(sessionDir, statusContent)`. The predicate is true only
  when all five conditions hold:
  1. The session dir is `team_*`.
  2. The phase exists and is not terminal.
  3. The latest `workflow/gate_validations/wave_<K>.yaml` says `overall: PASS`
     or `overall: CONDITIONAL_PASS`. `wave_5b` sorts after `wave_5`.
  4. A later wave is pending in `workflow/work_meta.yaml`, in `total_waves`, or
     in `team/task_list.yaml`.
  5. The last activity is younger than `CAGENTS_IDLE_LEAD_MAX_MS` (default
     24 h). The activity sources are the `last_updated_at` heartbeat, the latest
     gate mtime, and the `workflow/events.jsonl` mtime. The mtimes of
     `status.yaml` and `agent_tree.yaml` do not count, because hooks rewrite
     those files.

  When the predicate is true, the hook skips the Phase 1b `execution_summary.yaml`, the timing
  `completed_at`, and every `status.yaml` write. It shows one line:
  `Team <sid>: paused between waves (wave_K passed, last wave N).` On any error
  the predicate returns false, so the hook keeps the normal teardown. The
  module exports `teamIdleBetweenWaves` for `verify-completion.cjs`. Set
  `CAGENTS_DISPATCH_IMPORT=1` before the `require`, or the SessionEnd handler
  runs and reads stdin.
- **Phase 1, agent tree cleanup (all session types)**: Marks any unstopped agent
  in `workflow/agent_tree.yaml` with `stopped_at`. It computes
  `duration_seconds` from `spawned_at`. It uses `yaml.load` with a regex
  fallback.
- **Phase 2, execution_summary.yaml generation (all session types)**: If
  `workflow/execution_summary.yaml` does not exist yet, the hook writes a minimal
  summary. That summary holds `session_id`, `final_state`, `status`,
  `agent_count`, `duration_seconds`, `started_at`, and `completed_at`. It parses
  `agent_count` with `yaml.load` of `agent_tree.yaml`. Version 12.12.2 corrected
  that parse, which used a regex against the wrong key before. The hook does not
  overwrite a summary that a skill generated.
- **Phase 3, team metrics and status (team_* sessions only)**: Finalizes
  `team/metrics/timing.yaml`, where it sets `completed_at` and
  `total_duration_seconds`. It reads `team/task_list.yaml` for items_completed
  and total. It reads `team/metrics/parallelism.yaml` for speedup_factor. It then
  fills the `completed_at` and `result: success|partial` placeholders in
  `status.yaml`. Since v12.76.0 (HS-4 e, WI-10) it writes `phase: completed`
  and `pipeline_state: VALIDATED` only when every item is complete and
  `sessionGenuinelyValidated` finds a real validator PASS on disk. A safety-net
  stub report is not a PASS. Without a genuine PASS the hook leaves the phase
  and the pipeline state as they are, and it writes a note to stderr. An
  actively working session keeps its phase and its pipeline state. An idle lead
  between waves gets no `status.yaml` write at all.
- **SessionEnd message (HS-11, WI-10)**: one line,
  `Team <sid>: x/y work items completed in Ns.` The speedup, the pattern
  extraction, the session GC line, and the list of non-terminal items go to
  stderr.
- **Phase 4, pattern extractor (24h throttle, fire-and-forget)**: Spawns
  `scripts/knowledge/pattern-extractor.cjs extract --save` as a detached child
  process. It does so only if `_knowledge/patterns/.last-extracted` is older than
  24h. It honors `CAGENTS_PATTERN_EXTRACTOR_OVERRIDE` for tests. It never blocks
  team-stop.
- **Phase 5, SDK-UUID pointer unlink (all session types, v12.32.0)**: Reads the
  `session.sdk_id` marker of the finishing session. It then calls
  `removeSdkPointer(uuid)` to delete the reverse pointer of that session from
  `cagents-memory/_system/sdk_session_map/`. `removeSdkPointer` is
  `SDK_UUID_RE`-guarded, idempotent, and `withFileLock`-protected. This is the
  explicit unlink layer of the three-layer GC. The other two layers are the lazy
  reap inside `resolveSdkUuidToSession` and the opportunistic prune on upsert.
  Together the three layers keep the registry bounded to live sessions and to
  sessions that ended recently, so a dead UUID or a reused UUID cannot
  mis-resolve.
- **createHook label**: `'SessionEnd'`. It matches the registered event name. It
  was `'SessionStop'` before v12.12.2. Version 12.12.2 corrected it and removed
  the 3-name mismatch between the source and the event.
- **Updates**: `workflow/agent_tree.yaml`, `workflow/execution_summary.yaml`, `team/metrics/timing.yaml`, `status.yaml`, `_knowledge/patterns/.last-extracted`, `_system/sdk_session_map/{uuid}` (pointer unlink).

## Tool Validation

### PreToolUse[Bash]: bash-validator.cjs

- **Matcher**: `Bash`
- **Purpose**: Two-tier command safety. Tier 1 denies a catastrophic command
  automatically. Tier 2 asks the user to confirm a command that is close to
  dangerous, and it shows a safe alternative.

**Tier 1, blocked (deny, auto-reject)**:

- **Destructive**: `rm -rf /`, `rm -rf ~`, fork bombs, `mkfs` (and the
  `mkfs.<fstype>` variants), `dd if=/dev/zero`, `> /dev/sda`, `sudo`, `doas`,
  `pkexec`, `su`, `crontab`. **B3/B4 (v12.18.0)**: the hook matches `mkfs`, `su`,
  `crontab`, and the new `doas` and `pkexec` as whole words or as
  command-position tokens, with a regex. It does not match them as bare
  `includes()` substrings. A benign command that only contains the text is
  therefore no longer wrongly hard-denied. Three examples are a `node -e` string
  that mentions `mkfsutil`, a path such as `mycrontab-helper`, and `gh issue`.
- **Data exfiltration**: `curl` with POST data, `wget --post-file`, a `nc` pipe
  or a `netcat` pipe, and `socat`
- **Obfuscation**: `base64 -d | bash/sh`, `eval "$(..."`, `python3 -c` with
  `os.system` or `subprocess`, `perl -e` with `system`, `curl|wget` piped to a
  shell, `node -e` with `child_process`, `ruby -e` with `exec` or `system`, and
  `php -r` with `exec` or `system`

**Tier 2, HITL (ask, the user confirms and a safe alternative is shown)**:

- **Git destructive (v12.76.0, K1, W1, W3, W2, WI-21)**: the evaluator reads
  the `git` argv after the global options. It does not match a raw-string
  regex. `gitArgvMessage` asks for these forms:
  - A force push: `-f` (also inside a flag cluster), `--force`, a `+refspec`,
    `--mirror`, `--delete`, `-d`, a `:ref` refspec, `--prune`, an abbreviation
    of a long option such as `--fo`, and an alias or a push setting that `-c`,
    `--config-env=`, or a `GIT_CONFIG_*` variable sets.
    `--force-with-lease` and `--force-if-includes` do not ask.
  - A history rewrite (W3): `filter-branch`, `filter-repo`, `update-ref -d`,
    `update-ref --stdin`, `reflog expire`, `reflog delete`, `prune` without
    `-n`, and `gc --prune=<any value except never>`.
  - A discard of work (W2, `gitDiscardMessage`): `reset --hard` in any
    position, `clean --force` without `-n`, a `checkout` of a pathspec or of
    `--ours`/`--theirs`, `restore` of the worktree, `switch --discard-changes`
    or `--force`, `stash drop`, `stash clear`, `branch -D`,
    `worktree remove --force`, and `-c clean.requireForce`.
  - A file write (W21-1, `gitOutputMessage`): a `--output` long option or an
    abbreviation of it, `-o` on `format-patch` or `archive`, and
    `bundle create`.
  - A git subcommand or argument that is an expanded word: a variable, a
    substitution, a brace, a tilde, a glob, or `$'..'`. A single
    double-quoted `-b` or `-m` value is exempt.
  - A `git` command or a test runner that can read a planted repo, config, or
    `package.json` (W21-3). A `cd`, `pushd`, or `env -C` to a directory other
    than the project root before the command asks. So do `git -C <dir>`,
    `--git-dir`, `--work-tree`, and `--exec-path` that point away from the root.
    A hook cwd outside the project root asks, unless it is a verified worktree
    of this project. An env prefix such as `GIT_*`, `NODE_OPTIONS`, `PATH`, or
    `HOME` before the command also asks.
- **find deletes (W4)**: `find -delete`, or `find -exec` with an `rm`-family
  command, an interpreter, a variable command, or a shell payload that names
  `rm`. It asks unless every root is a temp path: `/tmp/<sub>`, the hook
  `TMPDIR` subtree, or an H5 `mktemp` variable.
- **SQL destructive (H8)**: `DROP TABLE/DATABASE/SCHEMA` (suggest backup),
  `TRUNCATE TABLE` (suggest `DELETE ... WHERE`), `DELETE FROM` without `WHERE`
  (suggest adding `WHERE`). Since v12.76.0 these ask only when a database
  client such as `psql`, `mysql`, `sqlite3`, or `bq` is in the command. An SQL
  keyword in `grep` or `echo` data allows.
- **Permission escalation**: `chmod 777`, `chmod -R 777`, and `chmod -R 666`
  (suggest `755` or `644`), `chown -R root` (suggest a check of the path)
- **Process management**: `kill -9 -1` (suggest SIGTERM), `killall` (suggest specific PID), `pkill -9` (suggest SIGTERM first)
- **System control (H1, G10)**: `shutdown` and `poweroff` (suggest `shutdown -c`),
  `reboot` (suggest saving the work first), `halt` (suggest `shutdown -h +1`).
  Since v12.76.0 a power verb asks only in command position, and the wrapper
  scan finds it after `nohup`, `env`, `timeout`, `xargs`, `ssh`, and
  `bash -c`. A `systemctl` or `loginctl` power verb or power target asks. So do
  `kexec`, `runlevel0.target`, `runlevel6.target`, a `login1` reboot through
  `busctl` or `dbus-send`, and a redirect to `/proc/sysrq-trigger`.
- **Network and firewall**: `iptables -F` (suggest `iptables-save` first),
  `ufw disable` (suggest per-port rules)
- **Service management**: `systemctl stop` and `systemctl disable` (suggest a
  check of the dependents first)
- **Container cleanup**: `docker system prune -a` (suggest the same command
  without `-a`), `docker volume prune` (suggest `volume ls` first)
- **Disk operations**: `mkswap` (suggest a check of the device), `fdisk`
  (suggest a backup of the partition table)

**dontAsk mode (v12.72.2)**: if the hook payload has
`permission_mode: dontAsk`, the hook drops each Tier 2 `ask`. A headless
session cannot answer a prompt, so an `ask` only fails the tool call. The
permission policy of the session, which is its allow rules and its deny rules,
then decides. Each Tier 1 deny still applies in every mode.

**Obfuscation detection** (strengthened by F7-1, audit
run_fable-plugin-review_260609_001): the static regexes now catch three more
obfuscation shapes, which the guard missed before:

- **Tier 1 (deny)**: `eval` of a bare variable, as in `eval $VAR`, `eval "$VAR"`,
  and `eval ${VAR}`. This is execution through variable indirection. It does not
  match the command-substitution style of `eval $(cmd)`.
- **Tier 1 (deny)**: a two-step download and execute inside one command string,
  as in `curl ... -o x.sh; bash x.sh` and `wget -O /tmp/i URL && sh /tmp/i`. The
  shape is a download flag or a redirect, and then a shell that executes that
  file in the same chain.
- **Tier 2 (ask)**: a bare variable in command position, which is the start of a
  command segment. Also a download and run with no explicit shell, where the
  command executes the file directly, as in
  `curl URL -o /tmp/x.sh && /tmp/x.sh`.

**GuardFall hardening (SHIPPED, v12.34.0)**: `bash-validator.cjs` delegates to a
fail-closed tokenize-and-canonicalize library,
`.claude/hooks/bash-guard-evaluator.cjs`. The validator require's that library,
and the library holds 5 ordered components. The library reads the **RAW**
command string. It is wrapped in its own try/catch, and that catch returns
**deny**. An evaluator error therefore denies, and the guard no longer fails
open. The legacy static denylist stays in place as a Stage-2 and Stage-3 belt.
The most-restrictive verdict wins.

This closes the named single-command GuardFall bypass shapes in Classes A to E:

- Quote-removal token-merge: `r''m -rf /`
- `$IFS` field-splitting: `rm$IFS-rf$IFS/`
- Command substitution, including substitution inside double quotes:
  `$(echo rm) -rf /`
- A decoder pipe or a fetch pipe into an interpreter: `base64 --decode | python3`
- The long tail of alternative argv, of destructive flags, and of sensitive-path
  exfiltration: `dd of=/dev/sda`, `cat ~/.aws/credentials | curl --data-binary @-`

A 35-probe regression corpus for Classes A to E gates CI. It runs as an
`it.each` Vitest suite over `tests/hooks/fixtures/guardfall-corpus.json` and
`tests/hooks/bash-guard-guardfall.test.js`.

**Belt relaxation and mode override (REC-08/09, v12.50.0)**: the
OBFUSCATION-class regexes of the legacy Stage-2 and Stage-3 belt cover
`python3 -c`, `node -e`, `ruby -e`, `base64|sh`, `eval`, the two-step download,
and more. Each regex used to match `.*` across the whitespace-collapsed RAW
string. An interpreter and a keyword that appeared only as **quoted data** was
therefore denied falsely. Two examples are the `echo` argument in
`echo 'python3 -c "os.system(1)"'` and the `grep` argument in
`grep -rn 'node -e child_process' src/`. Each obfuscation entry now carries an
`obf` command-name list, and the belt confirms that list against the evaluator's
exported `tokenize`. The flagged interpreter must be a **standalone command
word** before the belt denies. A word buried in a quoted multi-word token does
not count. The change only narrows a belt deny to an allow, and it never adds a
deny. Every true positive still denies, and that includes belt-only
`env python3 -c …` / `ruby -e '\`…\`'` and the whole evaluator floor.

The `CAGENTS_BASH_GUARD` env var is new. It takes `block`, which is the default,
`warn`, or `off`. An unrecognized value falls back to the fail-closed `block`.
The `env` block of `.claude/settings.json` declares it. Under `warn` it
downgrades a confirmed obfuscation belt deny to `ask`. Catastrophic literals and
the Stage-1 evaluator stay a hard deny, so `rm -rf /` stays denied under `warn`.
Under `off` it skips the belt. The sound evaluator still runs under `off`, so a
catastrophic shape is never disarmed. See
`docs/SECURITY_BASH_GUARD_THREAT_MODEL.md` §5.1.

**Fail-closed soft-fail (v12.62.1)**: an **un-parseable** command no longer
hard-denies. An un-parseable command is one the tokenizer chokes on. An example
is an apostrophe or an unbalanced quote inside a heredoc or inside `$(...)`,
such as `git commit -m "$(cat <<'EOF' … the model's unit … EOF)"`. The
evaluator tags a tokenize failure or a canonicalize failure with
`failClosed: true`. An evaluator *defect* or throw still hard-denies, because
broken machinery has to fail hard. `bash-validator.cjs` then defers to the
raw-string catastrophic belt. That belt is forced to run even under `off`,
because the sound floor is not available for un-parseable input. Only if the
belt **and** the HITL patterns are all silent does the validator downgrade to a
confirmation `ask` instead of a `deny`. Proven-destructive verdicts are
unchanged and still hard-deny, and those are the Classes A to E shapes, which
tokenize successfully.

Residual (§7.6): an un-parseable command that is destructive only in a way the
belt misses, such as the subpath `rm -rf /etc`, gets an `ask`. That `ask` is not
a guaranteed stop under `bypassPermissions`. Section 8 mitigates it with its
rule of no auto-yes on untrusted content. See
`docs/SECURITY_BASH_GUARD_THREAT_MODEL.md` §5.3 and the hook `ask` semantics
note in §5.

**Heredoc bodies skipped, not lexed (v12.69.0)**: §5.3 contained the damage from
an un-parseable command, but it left the cause in place. The lexer treated `<<`
as a redirect operator and never consumed the heredoc body, so it lexed body
text as shell. One odd apostrophe in a body threw `unterminated single quote`
and downgraded a benign command to a confirmation prompt. A commit message with
"it's" or "don't" is enough to do it. On a 439-command corpus of real session
history this was the single largest source of interactive approval prompts, at
8 of 22 friction events.

`tokenize()` now consumes a heredoc body to its terminator, and it matches bash
exactly: the delimiter stands alone on its line, `<<-` strips leading tabs, and
an unterminated body runs to EOF. A `<<<` herestring is unaffected. The skip is
sound for the same reason the `#`-comment skip is sound: bash feeds the body to
the command on **stdin** and never executes it. One shape is executed, and that
is a shell reading its script from a heredoc, as in `bash <<'EOF' … EOF`. The
evaluator recurses into that shape like a `-c` payload, so it still denies. A
computed delimiter such as `<<$D` is deliberately not skipped, because the body
extent is unknowable, so the old fail-closed behaviour is kept.

Version 12.69.0 also shipped **constant propagation** for a recursive-force
delete whose target is a bare `$VAR` assigned a literal earlier in the same
command string, as in `S=/tmp/scratch; rm -rf $S`. It is sharper in both
directions. It denies when the resolved literal is a protected path, and it no
longer prompts for an ordinary scratch path. A variable assigned elsewhere stays
unknown and still asks. The regression suite is
`tests/hooks/bash-guard-heredoc.test.js`. See §5.4.

**Rule changes in v12.76.0 (WI-6, WI-8, WI-15, WI-20, WI-21)**: these changes
cut false asks and close bypass shapes. See
`docs/SECURITY_BASH_GUARD_THREAT_MODEL.md` §5.5 for the full list.

| Id | Change |
|----|--------|
| H2 | A `$VAR` in command position with one literal assignment in the same command is resolved and judged. `C='rm #'; $C -rf /etc` denies. |
| H3 | A literal inline program that is a pipe consumer is data, unless it holds dynamic code such as `exec`, `eval`, `spawn`, `require(`, or a decoder. |
| H5 | `T=$(mktemp -d); rm -rf $T` allows. A `..` after the variable is not checked, so `rm -rf $T/../../etc` also allows. That is gap G5. |
| H7 | `.env.example`, `.env.sample`, `.env.template`, `.env.dist`, and `.env.defaults` are not credential files. |
| R1 | `rm -rf /etc` inside `if`, `while`, `until`, `{ }`, or after `!` denies. Before, it allowed. |
| WI-8 REV2 | The wrapper scans share a budget of 400 steps (`SCAN_STEP_LIMIT`). The command asks when the budget runs out. |
| WI-20 | A non-ASCII character or an escape in an inline program that a pipe feeds asks. An opaque context, such as a `-c` payload or a process substitution, also gets a scan of its inner text. A nest deeper than the depth cap asks. A heredoc joins a `\`-newline before it finds the terminator. |
| A1 | `settings.json` allows `npx vitest run --config tests/vitest.config.js`, `npm test`, and each `scripts/ci/` script. `runnerMessage()` asks for a `../` path, `--root`, `--dir`, `--prefix`, a setup file, a `--config` other than `tests/vitest.config.js`, a code-loading option, an npm option before `--`, a variable or substituted argument, an absolute path, and an unknown flag. |
| W21-2 | If `bash-guard-evaluator.cjs` fails to load, `bash-validator.cjs` denies every Bash call and names the load error. |

**Honest residuals (§7, still OPEN)**: no single-string evaluator can catch the
shapes below, so do not treat them as closed:

- Cross-Bash-call sequential payloads, where one call builds a payload and a
  later call executes it.
- Heredoc-built payloads.
- Runtime-constructed indirection.
- The command-position single-variable case, such as `$CMD file`, under
  `bypassPermissions`.
- Interiors that are not a sandbox, such as a Makefile target or an npm script.
- Single-call shapes that the evaluator allows today (G4 to G11): `xargs rm`,
  `rm -rf $T/../..` after `mktemp`, a command name built from parts, `git send-pack --force`, a `.env*` glob,
  an SQL comment between keywords, a bare `TRUNCATE`, and `FLUSHALL`. The
  threat model §7.2 lists each one with its probe verdict.

See `docs/SECURITY_BASH_GUARD_THREAT_MODEL.md` for the full threat model, the
per-class scorecard, and the complete residual list.

### PreToolUse[Write|Edit|NotebookEdit]: write-edit-dispatch.cjs

- **Matcher**: `Write|Edit|NotebookEdit`
- **Purpose**: D1b consolidating dispatcher (v12.19.0, WI-5). It is a single
  PreToolUse[Write|Edit] hook. It runs the 3 pure Write|Edit sub-validators
  in-process. Before v12.19.0 each Write|Edit fired 3 separate
  `node run-hook.cjs <name>` child processes, and each one paid a cold start.
  This dispatcher drops the cold starts per Write|Edit from 3 to 1. See
  `scripts/benchmarks/hook-perf-microbench.cjs` and
  `cagents-memory/_system/evals/perf/hook-perf-{before,after}.json`.
- **Order (deny-first, short-circuit on first deny)**:
  1. **secret-detection**, the security deny gate. It runs first, and it is
     fail-closed: a throw denies. It blocks a write to a protected path
     (`/etc/`, `/usr/`, `~/.ssh/`). It also blocks a file that holds a critical,
     a high, or a medium secret in block mode, and it sanitizes that file in
     sanitize mode. The handler is imported from `secret-detection.cjs`.
  2. **controller-delegation-validator**, the governance deny gate. It is
     fail-closed: a throw denies. It is controller-scoped, and it hard-denies a
     controller write to a reserved implementation path (`src/`, `lib/`,
     `components/`, `app/`, `services/`, `middleware/`), as
     `.claude/rules/core/delegation.md` requires. The handler is imported from
     `controller-delegation-validator.cjs`.
  3. **skill-size-monitor**, advisory. It runs last, and it is fail-open: a
     throw continues. It warns at 600 SKILL.md lines and blocks at 900. A real
     `deny` verdict is still honored, because the most-restrictive verdict wins.
     The handler is imported from `skill-size-monitor.cjs`.
- **Most-restrictive**: any sub-deny makes the dispatcher deny. The first deny
  short-circuits, and the dispatcher does not consult the later sub-handlers. A
  deny reason is therefore always the reason with the highest priority. That
  priority order is security, then governance, then size.
- **Fail-closed and fail-open**: the dispatcher wraps the security gate and the
  governance gate in its own try/catch, and both fail closed: a throw denies.
  They do not rely on the try/catch inside `createHook`, which fails open. The
  advisory gate fails open, so a throw continues.
- **Sub-hook registration**: the 3 sub-modules still call `createHook()`
  standalone. They therefore work if anyone registers them one by one, and their
  existing unit tests still pass. `CAGENTS_DISPATCH_IMPORT` suppresses that
  standalone registration while the dispatcher require()s them, because the
  dispatcher wants only their `handler`. `.claude/settings.json` does not
  register them one by one. It registers `write-edit-dispatch` alone. The
  consolidated sub-hook notes below cover the behavior of each gate. Those notes
  are `secret-detection.cjs`, `controller-delegation-validator.cjs`, and
  `skill-size-monitor.cjs`. They describe handler behavior even though Claude
  Code no longer registers those files directly.

**Consolidated sub-validator: secret-detection.cjs** (dispatched first, FAIL-CLOSED security gate; not independently registered)

- **Purpose**: Block writes to protected paths and detect secrets.
- **Three phases**:
  1. A check of the protected paths.
  2. A warning about a sensitive file, which means `.env` and similar filenames.
     This phase only warns. It does not block.
  3. A secret scan by pattern match. In block mode it blocks on critical, high,
     and medium severity. See `secret-detection.cjs:476` for critical and high,
     and `:482` for medium.
- **Blocked**: System paths (`/etc/`, `/usr/`, `~/.ssh/`), files with critical/high/medium secrets (block mode).

**Consolidated sub-validator: controller-delegation-validator.cjs** (dispatched second, FAIL-CLOSED governance gate; not independently registered)

- **Purpose**: Enforce the aggressive-delegation rule from
  `.claude/rules/core/delegation.md`. A controller such as tech-lead, architect,
  or marketing-strategist coordinates through the Agent tool. A controller must
  not write or edit an implementation file in a protected path.
- **Detects**: Active controller from `workflow/agent_tree.yaml`, implementation file patterns.
- **Scoping (B1, v12.18.0)**: enforcement is controller-scoped. It fires only
  when the hook detects an active cAgents controller in the
  `workflow/agent_tree.yaml` of the current session. An active controller is a
  controller-tier agent with `stopped_at: null`. With no active cAgents session
  and no active controller, the hook is a no-op. It then never blocks an
  ordinary direct user edit to `src/`, to `services/`, or to any other path.
  This reverses the unconditional hard-deny of P1-7 (v12.7.1). That hard-deny
  rested on depth-1 `Agent`-tool stripping, which made `agent_tree` unreliable.
  The justification is obsolete as of v12.17.0. Claude Code 2.1.172 added
  nesting, and since CC 2.1.219 a subagent retains `Agent` by default and
  the trackers record its spawns reliably. Scoping prevents
  the footgun where a default-on `block` mode would deny the user's own
  legitimate edits.
- **Session resolution (v12.73.0, strict ownership)**: the current session is
  the one the payload transcript owns. The hook tries `resolveOwnedSession`
  first. It then tries `findActiveSession` and keeps that result only when it
  is unclaimed or owned. A foreign or missing session means a no-op allow.
  There is no newest-session fallback, so one transcript's controller never
  blocks another transcript's writes.
- **Output (hard deny for protected paths)**: When a controller is active, the
  hook returns `permissionDecision: "deny"` in `block` mode. It does so for a
  Write or an Edit that targets `src/`, `lib/`, `components/`, `app/`,
  `services/`, or `middleware/`. `CAGENTS_DELEGATION_ENFORCEMENT=block` is the
  canonical environment toggle. It is the cAgents default, and the `env` block
  of `.claude/settings.json` sets it. Set
  `CAGENTS_DELEGATION_ENFORCEMENT=warn` to downgrade the hook to advisory
  warnings. Set it to `off` to disable the hook. The hook always allows a write
  to a workflow file (`workflow/*.yaml`, `coordination_log.yaml`), to a YAML or
  Markdown file, and to `cagents-memory/`.
- **Output (advisory for softer implementation paths)**: The hook emits a
  `systemMessage` warning and never denies when an active controller writes to a
  softer implementation file. Those files are `tests/`, `scripts/`, `utils/`,
  `content/`, `*.ts`, `*.js`, and files of a similar kind. These dual-use paths
  warn in `warn` mode and in `block` mode alike.

**Consolidated sub-validator: skill-size-monitor.cjs** (dispatched last, ADVISORY/FAIL-OPEN; not independently registered)

- **Purpose**: Prevent a regression into SKILL.md bloat. It counts the lines of
  any `SKILL.md` that a tool writes or edits. It then surfaces a warning or a
  block when the content passes a threshold.
- **Thresholds**: warns at 600 lines (`CAGENTS_SKILL_WARN_LINES`), blocks at 900 lines (`CAGENTS_SKILL_BLOCK_LINES`).
- **Behavior**: at the warn threshold it returns a `systemMessage`. That message
  recommends a split into `resources/*.md`, as Three-Tier Progressive Disclosure
  describes. At the block threshold it returns `deny` with the same
  recommendation, and the dispatcher honors that deny under its most-restrictive
  rule. A write to a file that is not a SKILL.md passes through.
- **Override**: set `CAGENTS_SKILL_BLOCK_LINES` higher to allow a one-off oversized write (e.g., during a refactor), then re-tighten.

(A2-02) The `approval-gate.cjs` hook was deleted. It was structurally dead. It
read `process.env.AGENT_MEMORY_DIR`, which the `env` block of
`.claude/settings.json` never set. It also read a
`cagents-memory/_data/policies/` directory, which never existed in production.
Its deny path could therefore never fire. It paid a cold-start node spawn on
every Bash, Write, and Edit only to `return null`. A hard denial is now the job
of `bash-validator.cjs` for Bash, and of the security gates inside
`write-edit-dispatch.cjs` for Write and Edit.

### PreToolUse[Agent]: agent-dispatch.cjs

- **Matcher**: `Agent`
- **Timeout (F3, WI-19, v12.76.0)**: 5 s in `.claude/settings.json` and
  `.claude/hooks.json`. It was 3 s, which tied the stdin deadline.
- **Purpose**: A2-12 consolidating dispatcher. It is a single PreToolUse[Agent]
  hook. It runs the 2 pure PreToolUse[Agent] sub-validators in-process. Before
  the consolidation, every Agent spawn fired separate `node run-hook.cjs <name>`
  child processes, and each one paid a cold start. A2-04 dropped the former
  `prompt-router.cjs` PreToolUse[Agent] `return null` no-op. This dispatcher
  drops the cold starts per Agent spawn from 3 to 1. It mirrors the proven D1b
  pattern from `write-edit-dispatch.cjs`.
- **Order (deny-first, short-circuit on first deny)**:
  1. **session-init-gate**, the session-presence gate. It runs first. It is
     advisory, and it fails open (HS-7, v12.76.0). The handler is imported from
     `session-init-gate.cjs`.
  2. **model-routing-advisor**, advisory. It runs last, and it is fail-open: a
     throw continues. The handler is imported from `model-routing-advisor.cjs`.
- **Most-restrictive**: any sub-deny makes the dispatcher deny. The first deny
  short-circuits. Once session-init-gate denies, the dispatcher does not consult
  the advisory gate.
- **Fail-open gates, fail-closed dispatcher (HS-7, WI-19 F2, v12.76.0)**: the
  dispatcher wraps the session-presence gate in its own try/catch. A logic throw
  in that gate allows the spawn. The dispatcher then adds one systemMessage,
  `[FAIL-OPEN] session-init-gate threw (<msg>); advisory gate skipped, Agent
  spawn allowed.`, and writes one `FAILED OPEN (logic throw)` line to stderr. It
  records no denied spawn. An I/O error in the gate also allows (RF-4). The
  advisory gate fails open, so a throw continues. `AgentDispatch` stays in
  `FAIL_CLOSED_HOOKS`, so a fault outside the sub-gate try/catch denies. A
  truncated payload denies, and an empty payload allows with one warning. See
  § Payload Policy for the Guard Hooks at the top of this file.
- **Heterogeneous returns**: with no deny, the dispatcher merges any
  `systemMessage` in gate order. It also preserves the `hookSpecificOutput` of
  session-init-gate, whose alias-resolution case carries a
  `permissionDecisionReason`. The emitted verdict is therefore the same as the
  verdict each sub-handler produced standalone.
- **Sub-hook registration**: both sub-modules still call `createHook()`
  standalone, so their existing unit tests pass through a direct
  `node <name>.cjs` call. `CAGENTS_DISPATCH_IMPORT` suppresses that standalone
  registration while the dispatcher require()s them, because the dispatcher
  wants only their handler. `.claude/settings.json` does not register them one
  by one. It registers `agent-dispatch` alone.

**Consolidated sub-validator: session-init-gate.cjs** (dispatched first, ADVISORY/FAIL-OPEN session-presence gate since v12.76.0; not independently registered)

- **Purpose**: Two-phase check before any Agent spawn. Both phases are
  advisory. Neither phase denies a spawn.
- **Output (Phase 1, the session-presence gate)**: Advisory. It resolves the
  session with `resolveSession(input, { purpose: 'gate' })` (HS-1, WI-7). A
  terminal session does not count. There is no newest-session fallback. When session dirs exist but none is owned by
  this transcript, it allows the spawn in silence (stderr only, no notice). A
  notice therefore never names another transcript's session. When no session
  dir exists at all, it self-heals the scaffold and allows with an absence
  notice.
- **Output (Phase 2, the alias check)**: An advisory `systemMessage` only. It
  does not block. It resolves a `cagents:*` alias through `v12-aliases.yaml`.
- **Agent registry (HS-8, WI-11, v12.76.0)**: `loadRegisteredAgents()` reads
  the `agents` array of `.claude-plugin/plugin.json` first. If the manifest is
  missing, or its list is absent or empty, it reads the `agents/` directory.
  The cache key is the manifest path plus its mtime, so an edited manifest is
  read again. Each read writes one stderr line:
  `agent registry read from <path> (<kind>, N agents).` Each alias, suggest,
  and unknown advisory ends with `(registry: <path>, N agents)`. If neither
  source can be read, the advisory is skipped.
  A1-06 removed the former Phase 3 advisory, which downgraded trust on
  `metadata.data_access_level`. No agent adopted it, so it never fired.
- **Ownership seeding (v12.73.0)**: on a confident resolution it calls
  `claimSession(sessionDir, input.session_id)`. The claim never overwrites a
  foreign marker. It is fail-open and never changes the verdict. The primary
  claim path is claim-on-write in `post-write-validator.cjs`.
- **Bypass**: Set `CAGENTS_SESSION_ID` to skip the presence gate during tests or out-of-session work.

**Consolidated sub-validator: model-routing-advisor.cjs** (dispatched second, ADVISORY/FAIL-OPEN; not independently registered)

- **Purpose**: Advisory hook that suggests optimal model selection before agent spawns.
- **Configuration**: see `.claude/rules/infrastructure/model-routing.md` for model routing configuration and aliases.

## Workflow Events

### Stop: verify-completion.cjs

- **Purpose**: Verify completion criteria before allowing stop.
- **Also**: Stop-workflow cleanup. It replaces stop-workflow.sh.
- **Creates**: `completion_summary.yaml`
- **Can block**: Returns `{decision: "block", reason: "..."}` for incomplete workflows.
- **Resolution (v12.76.0, HS-1)**: `resolveSession(input, { purpose: 'record',
  claimHint: false })`. A terminal session counts. With no session the hook
  allows the stop and writes nothing. It never falls back to the newest
  session. A non-UUID payload keeps the legacy exact-name pin, but a session
  with an owner marker is treated as foreign and left alone. One change from
  v12.73.0: a UUID payload with no owned session can now resolve an unclaimed
  session that `CAGENTS_ACTIVE_SESSION` names. SessionEnd does not take that
  step.
- **Actively-working discriminator (FIX 2, v12.32.0)**:
  `sessionActivelyWorking(sessionDir, statusContent)` returns true in two cases.
  The first case is a spawned child agent that still runs, which is an
  `agent_tree.yaml` `agents:` entry with `stopped_at: null`. That scan excludes
  the top-level `root:` block, which is always null. The second case is a fresh
  `last_updated_at` heartbeat in `status.yaml`, which means a heartbeat inside
  `CAGENTS_SESSION_LIVENESS_MS`, and that defaults to 60s. On any error it
  returns false, so it fails toward blocking, which is the safe direction.
- **Applied at all three block paths so they agree**: Path A is the branch for
  the active pipeline state and the next-stage agent. Path B is coordination_log
  enforcement. Path C is the branch for the enrichment-artifacts phase. A
  session that is legitimately mid-flight drops from `decision: 'block'` to a
  warning (`continue: true`) when `sessionActivelyWorking` is true. One such
  session is a mid-COORDINATED session that yields for a background wait. A
  session that is truly abandoned still blocks, and that means no running child
  and a stale heartbeat together. The skip past 24h of staleness is unchanged.
  Record: session `run_hook-session-id_260701_001`.
- **liveAtStop (HS-4 c, WI-10; WI-13b)**: `liveAtStop` is true when
  `sessionActivelyWorking` is true, or when `teamIdleBetweenWaves` from
  `team-stop.cjs` is true. A live session keeps its state, and Stop writes no
  force-terminal stamp on it. Stop writes one stderr line:
  `session is live at Stop; skipping force-terminal stamp (signal:
  active-work|idle-between-waves)`. The 24 h staleness skip runs first, so a
  session with a heartbeat older than 24 h never reaches the predicate. If
  `team-stop.cjs` does not load, the idle signal is absent and only
  `sessionActivelyWorking` counts.
- **No stub writes (HS-10, WI-12)**: `autoResolveWarnings` was removed. The hook
  never writes a stub `validation_report.yaml` or a stub
  `execution_summary.yaml`. A legacy stub on disk with `generated_by:
  verify-completion-hook-safety-net` still gets the check 7b warning, and a
  legacy UNKNOWN stub report gives `Validation status: UNKNOWN`.
- **repairSession, stop mode (HS-10, WI-12)**: after the checks the hook calls
  `repairSession(sessionDir, { mode: 'stop' })` from `hook-utils.cjs`. Stop mode
  repairs only from evidence:
  - R1: an unparseable `agent_tree.yaml` is rebuilt from `events.jsonl`. If
    `events.jsonl` has no spawn rows, the hook leaves the file and adds a
    `needs_user` warning.
  - R2: an open tree row is closed when a global spawn log has its stop line,
    or when it is the root row of a terminal session.
  - R3: a missing or stub `execution_summary.yaml` is derived from the
    artifacts, but only for a session with a genuine validator PASS.

  Each repair is idempotent, and each one appends a line to
  `workflow/repairs.jsonl`. A repair never changes `validation_report.yaml`, a
  coordination status, or `pipeline_state`. The age close is for sweep mode
  only.
- **Warning hygiene (HS-11, WI-10)**: the systemMessage is one line,
  `cAgents warning: <first> (+N more in <summary>)`. The full list goes to
  `completion_summary.yaml`. If the warning set is the same as on the last Stop,
  the hook shows nothing. The PRE and MID checkpoint warnings and the
  graceful-degradation note go to stderr. The SELF-CHECK systemMessage was
  removed. The `designer_` sessions and the live sessions need no validation
  report (S2, S8).

### Stop: goal-evaluator-logger.cjs

- **Purpose**: Capture the latest `/goal` evaluator reason into
  `workflow/goal_evaluator_log.yaml` of the active session. `cagents:self-correct`
  then reads it as one more revision signal (V11.3.0, REC-4).
- **Activation**: Only when `/goal` is active in the Stop hook payload. It never
  blocks. It is a no-op when `/goal` is inactive, when no cAgents session is
  active, or when there is no reason to capture.
- **Creates / appends**: `cagents-memory/sessions/{active}/workflow/goal_evaluator_log.yaml`
- **Consumed by**: `core/self-correct/SKILL.md` Step 2 (reads most recent 3-5 entries as revision signal).

### Stop: secret-restore.cjs

- **Purpose**: Companion to the sanitize mode of `secret-detection.cjs`
  (v12.0.4, REC-1). When `CAGENTS_SECRET_MODE=sanitize` is active, the PreToolUse
  hook replaces each secret with a `BLOCK_<hex>` placeholder during the session.
  It also backs up the original content. This Stop hook restores every
  backed-up file at the end of the session, so the workspace returns to the
  state it had before the sanitize.
- **Reads**: `cagents-memory/_system/secret-backups/{session_id}/manifest.yaml`
- **Restores**: Every `file_path` that the manifest lists. It reads the matching
  `.orig` file, which carries 0600 perms, and writes that content back. It then
  deletes the consumed `.orig` files and the manifest.
- **Idempotent**: A no-op when no manifest exists. Each entry has its own
  try/catch. A partial failure logs to
  `cagents-memory/_system/logs/secret-restore_{date}.log`, and it never fails the
  Stop.
- **Output**: Always returns `{continue: true}`. Never blocks.
- **Protocol doc**: `.claude/hooks/SECRET-SANITIZE.md`.

### SubagentStart: subagent-tracker.cjs + team-start.cjs + role-manifest-injector.cjs

- **subagent-tracker.cjs**: Logs each agent spawn. It appends a `spawn` event
  to `workflow/events.jsonl` and to the global audit log at
  `_system/logs/agent_spawns.log`. It then updates `workflow/agent_tree.yaml`
  with `updateYamlLocked` and `writeFileAtomic` (HS-6, WI-7). If the lock is
  busy, the event line is enough, and the next writer reconciles the tree from
  `events.jsonl`. A spawn with no `agent_id` gets one fallback id from
  `fallbackAgentId`. The `additionalContext` tells the agent that hooks own
  `agent_tree.yaml`. Agents do not self-register and do not edit the tree.
- **subagent-tracker.cjs, session resolution (v12.76.0, HS-1)**:
  `resolveSession(input, { purpose: 'record' })`. A prompt hint claims the
  session. The resolver drops any result whose marker names another UUID. There
  is no newest-session guess. With no session it writes only to the global log.
  The claim never overwrites a foreign marker, and a failure never blocks the
  spawn.
- **team-start.cjs**: Initializes the team monitoring directories and the
  metrics files. **It serves the experimental named-background-teammate path
  only**, and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` gates it. It is a no-op on
  the default concurrent-Agent wave model, which needs no per-teammate monitoring
  directory. It is not part of the default subagent model. It stays registered
  under `SubagentStart`, and its event name is unchanged.
- **role-manifest-injector.cjs**: Injects a per-role context bundle into every
  spawned agent. Surface (d) of WO-03 added it, in session
  `team_load-cut-program_260804_001`. It is the restoration half of the load cut
  in that same work order. Surfaces (a), (b), and (c) narrowed the
  `.claude/rules/**` context that loaded unconditionally, which came from the
  `@`-imports in CLAUDE.md and from the `paths:` predicates. A spawn therefore no
  longer eats every rule file. A hook can only add context, and it can never
  un-load context, so this hook hands the spawned role a compact pointer in place
  of the bulk.
- **role-manifest-injector.cjs, resolution**: `extractAgentName()` reads the base
  name out of `agent_type`, `subagent_type`, or `tool_input.subagent_type`, and
  it matches `cagents:{name}`. If none of those carry a name, it falls back to a
  `cagents:{name}` reference inside the description or the prompt. `resolveRole()`
  maps that name to one of five role keys. It reads the `LEADERSHIP`, `REVIEW`,
  `PIPELINE`, and `CONTROLLER` name sets, in that order of precedence. A
  `cagents:*` name that no set lists is an `execution` agent. A type that is
  absent, or that is not a cAgents type, gets the `default` key.
- **role-manifest-injector.cjs, bundle shape**: `buildRoleBundle()` is the one
  assembly point. It selects the pointer text of the role from `ROLE_POINTERS`.
  `ROLE_POINTERS` is an L1 index. It names the `.claude/rules/**` files that
  matter for that role, and the agent then `Read`s them on demand. It carries
  pointers only, and never rule content. `buildRoleBundle()` then concatenates
  `MEMORY_LAYOUT_STANZA` every time. That stanza is defined exactly once, and it
  is never copied into a role pointer. No other code path emits a bundle. A
  future contributor who adds a key to `ROLE_POINTERS` therefore inherits the
  stanza without knowing that it exists, and the fallback key inherits it too.
  The stanza is a digest of `.claude/rules/memory/agent-memory.md` and of
  `agent-memory-reference.md`. Without it, an agent would be asked to write
  session artifacts into `cagents-memory/` with no description of the layout.
- **Output**: `{"hookSpecificOutput": {"hookEventName": "SubagentStart", "additionalContext": "<role bundle>"}}`.
- **It never blocks, and it is fail-open**: the hook is purely additive.
  `SubagentStart` cannot block in any case. See `.claude/rules/core/hooks.md`
  § Exit Codes. The handler also wraps its own body in a try/catch that returns
  `null`, which becomes `{"continue": true}`. That sits on top of the catch
  inside `createHook()`. A defect therefore degrades to no injection, and not to
  a failed spawn. The hook writes no file and reads no session state. To revert
  it, delete its single registration in `.claude/settings.json`.

### SubagentStop: subagent-stop-tracker.cjs

- **Purpose**: Track when subagents finish, capturing completion summaries and duration metrics.
- **Also**: Appends stop events with summaries to the global audit log.
- **Updates**: `workflow/events.jsonl` (a `stop` event, or `stop_anon` with no `agent_id`) and `workflow/agent_tree.yaml` (adds `stopped_at`, `completion_summary`, `duration_seconds`).
- **Captures**: `last_assistant_message` from SubagentStop input (truncated to 300 chars for audit trail).
- **Resolution**: the same passes as `subagent-tracker.cjs`, so a start and its
  stop land in one session. A foreign-owned result is dropped. There is no
  newest-session guess, so an unowned stop goes to the global log only.

### PostToolUse[Write|Edit|NotebookEdit]: post-write-validator.cjs

- **Matcher**: `Write|Edit|NotebookEdit`
- **Purpose**: Validate file syntax after a successful Write or Edit. Log every
  write to the file_changes audit trail of the session.
- **Validates**: JSON parsing, YAML tab detection, duplicate YAML top-level keys, anti-slop patterns, SKILL.md schema.
- **Logs**: All file changes to `workflow/file_changes.log` with timestamps and validation status (`status: "warn"` when warnings are detected).
- **Claim-on-write (v12.73.0)**: a write to `sessions/{sid}/status.yaml` or
  `sessions/{sid}/instruction.yaml` calls `claimSession(sessionDir,
  input.session_id)`. The `{sid}` dir must be a direct child of `sessions/`. An
  unclaimed session becomes owned by the writing transcript. A foreign-owned
  session stays unchanged. The claim runs before the audit-trail line and is
  fail-open. This is the primary way a session gets its owner.
- **Output**: Returns `{ continue: true }` and no systemMessage. The
  thinking-block-immutability contract (run_team-thinking-400_260531_001) stops a
  PostToolUse hook from emitting a systemMessage. A warning surfaces through
  `console.error` instead, which reaches stderr and the verbose mode of the user.
  It also surfaces through the status field of file_changes.log. The hook does
  not block.

### PostToolUse[Bash]: post-write-validator.cjs

- **Matcher**: `Bash` (HS-1, WI-7). It is a separate entry, so
  `validator-evidence-recheck.cjs` does not run on Bash calls.
- **Purpose**: Claim-on-write for a session that a Bash command creates. A
  skill can write `status.yaml` with `cat >`, and the Write matcher does not
  see that write. `claimFromAnyWrite` in `hook-utils.cjs` reads
  `tool_input.command`. It finds a redirect, `tee`, `cp`, `mv`, or `install`
  that writes `sessions/{sid}/status.yaml` or `sessions/{sid}/instruction.yaml`.
  It then calls `claimSession` for the writing transcript. A command that only
  reads the file claims nothing. A foreign-owned session stays unchanged.
- **Output**: Returns `{ continue: true }`. It never blocks, and it writes only
  the ownership marker and the map pointer.
- **Cost**: each Bash call starts one more node process. The hook returns early
  when the command names no session file.
- **Known gap (LOW)**: a form such as `cp x $S/status.yaml 2>&1` does not
  claim. That fails safe: the session stays unclaimed.

### PostToolUseFailure: tool-failure-tracker.cjs

- **Purpose**: Track tool failures, detect patterns (3+ failures suggests alternatives).
- **Creates**: `workflow/tool_failures.yaml`

## Team Hooks

> **Scope (Claude Code v2.1.178+)**: the default execution model of `/team` is
> **concurrent-Agent waves**, which are implicit teams. Version 2.1.178 removed
> `TeamCreate` and `TeamDelete`. The `TeammateIdle` and `TaskCompleted` hooks
> below serve the optional **experimental named-background-teammate path** only,
> which `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` gates. They fire for a named
> background teammate. They are no-ops on the default synchronous
> concurrent-Agent path, which collects wave results directly and uses no idle
> callback and no completion callback. Both stay registered. Their **event names
> are unchanged**, and the counts of hook files, registered hooks, and events are
> unaffected.

### TeammateIdle: teammate-idle-handler.cjs

- **It serves the experimental named-teammate path only**. It is a no-op on the
  default concurrent-Agent subagent-wave model, and it is not part of the default
  subagent model.
- **Purpose**: Stop an idle teammate cleanly when all the work is done. Surface
  the available work through stderr.
- **V10.5.0**: Refactored to `createHook()`. It returns
  `{ continue: false, stopReason }` when every work item is complete. The
  teammate then stops cleanly instead of lingering idle.
- **Logic**: Three branches. Every work item complete gives
  `{ continue: false, stopReason }`, which is a new-turn-safe shutdown signal.
  Available work gives `{ continue: true }` and no systemMessage, and the item
  list goes to `console.error`. Anything else passes through as `null`. The
  thinking-block-immutability contract (run_team-thinking-400_260531_001) stops
  the available-work branch from emitting a systemMessage. A teammate self-claims
  by reading TaskList or task_list.yaml directly.

### TaskCompleted: team-task-complete.cjs

- **It serves the experimental named-teammate path only**. It is a no-op on the
  default concurrent-Agent subagent-wave model, and it is not part of the default
  subagent model.
- **Purpose**: Update the status in `task_list.yaml`. Check whether a dependency
  is unblocked. Stop the teammate when all the work is done.
- **Input fields**: `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name` (Claude Code API).
- **V10.5.0**: Refactored to `createHook()`. It returns
  `{ continue: false, stopReason }` when every work item is complete, and that is
  a new-turn-safe shutdown signal. The thinking-block-immutability contract
  (run_team-thinking-400_260531_001) stops the hook from announcing a
  newly-unblocked item through a systemMessage. A teammate finds those items by
  reading TaskList or task_list.yaml directly.
- **Side effects**: Updates `task_list.yaml`, writes completion message YAML to `team/messages/`, updates `team/metrics/timing.yaml`.
- **Output**: `{ continue: false, stopReason }` when all items complete, `{ continue: true }` otherwise. No systemMessage.

### PermissionRequest: no cAgents hook (WI-15, v12.76.0)

- **Removed**: `permission-handler.cjs` returned `null` in every branch. It added
  one node spawn and a "Checking permissions..." message to every permission
  dialog, and it changed nothing. WI-15 unregistered it and deleted the file.
- **Auto-approval source**: the `permissions.allow` patterns in
  `.claude/settings.json`. The bash guard asks for the git discard forms (W2)
  in every mode where an ask can reach a human.

## State Management

### PreCompact: pre-compact-save.cjs

- **Purpose**: Save critical workflow state to a waypoint file before context compaction.
- **Creates**: Waypoint file in `sessions/{id}/waypoints/`
- **Includes**: Coordination state, team state, 5-question reboot check (where_am_i, where_going, whats_the_goal, what_learned, what_done), resume instructions.
- **Output**: Returns `{ continue: true }` and no systemMessage. The
  thinking-block-immutability contract (run_team-thinking-400_260531_001) stops
  PreCompact from emitting a systemMessage. A message emitted right before
  context compaction risked attaching to the content array of the assistant turn
  that was about to freeze, and that breaks thinking-block immutability. The
  waypoint file is the authoritative resume artifact. `post-compact-restore.cjs`,
  which was also fixed, is the resume path.

### Notification: notification.cjs

- **Purpose**: Log notifications to daily files with 1MB rotation.
- **Creates**: `cagents-memory/_system/logs/notifications_{date}.log`

### UserPromptSubmit: prompt-router.cjs

- **Purpose**: Consolidated delegation enforcement and natural-language routing
  (P1-7, v12.7.1). It replaced the former `delegation-enforcer.cjs` and
  `magic-keywords.cjs`. Layer 1 is always on. When a prompt invokes `/act` or
  `/team`, Layer 1 injects a short delegation reminder that points at
  `@.claude/rules/core/delegation.md`, the canonical Rationalization Kill List.
  It fires only when the user invokes the skill explicitly. Layer 2 is opt-in and
  off by default (v12.43.0). It detects an intent keyword at the start of a
  prompt of 2 sentences or less, such as "build X", "fix Y", "review Z",
  "optimize", or "design". It then emits a routing suggestion of `/act`,
  `/act review`, `/act optimize`, `/designer`, or `/team`. Layer 2 used to fire
  on every intent-keyword prompt, which was noise in a session where the user did
  not want the plugin. The `CAGENTS_ROUTING_SUGGESTIONS` env var now gates it.
  Set that var to `1`, `true`, `on`, or `yes` to re-enable Layer 2, for example
  in the `env` block of `.claude/settings.json`. When the var is unset, Layer 2
  emits nothing.
- **Output**: Layer 1 always returns `hookSpecificOutput.additionalContext`.
  Layer 2 returns an advisory `systemMessage`, but only when
  `CAGENTS_ROUTING_SUGGESTIONS` is enabled. Otherwise Layer 2 returns `null`
  before any length check and before any keyword check. Neither layer blocks the
  prompt. It pairs with CLAUDE.md § CRITICAL: Aggressive Delegation.

(A2-04) The PreToolUse[Agent] registration of `prompt-router.cjs` was dropped. It
was a documented `return null` no-op, labelled "reserved for future
controller-spawn validation". It paid a cold start on every Agent spawn for
nothing. `prompt-router.cjs` stays registered under UserPromptSubmit, as shown
above, where its delegation-reminder layer and its natural-language-routing layer
carry load. The source of `prompt-router.cjs` still no-ops on
`tool_name === 'Agent'` as a defence, but it is no longer wired to that event.

### PostToolUse[Write|Edit|NotebookEdit]: validator-evidence-recheck.cjs

- **Matcher**: `Write|Edit|NotebookEdit`
- **Purpose**: Re-verify the evidence that validation_report.yaml cites. After a
  write, it re-runs the cited verification methods, which are `fs.existsSync`,
  `grep`, and a file:line content match. When claimed evidence does not verify
  mechanically, the hook mutates the report on disk. It downgrades the
  classification from PASS to FAIL. It also appends a `recheck:` block that lists
  the failing entries. See `pat-evidence-first-execution.md`.
- **v12.76.0 (HS-4 d, A3d, WI-10)**: the hook resolves a relative evidence
  path against `PROJECT_ROOT`. It does not use `input.cwd`, so a cwd drift
  cannot fail good evidence. An entry with no `verification_method` is
  unverifiable and does not fail the report. An entry with no evidence still
  fails.
- **Output**: Returns `{ continue: true }` and no systemMessage. The
  thinking-block-immutability contract (run_team-thinking-400_260531_001) stops a
  PostToolUse hook from emitting a systemMessage. The on-disk mutation of
  validation_report.yaml is the side effect that carries the load. The downgrade
  message surfaces through `console.error`, which reaches stderr and the verbose
  mode of the user.

### PostToolUse[Agent|Task]: spawn-footprint.cjs

- **Matcher**: `Agent|Task`
- **Purpose**: Diagnostic only. It records the token footprint of every spawned
  agent, so a spawn cost can be measured and not modelled. WO-01 added it, in
  session `team_load-cut-program_260804_001`. The goal was to make the
  `token_count` metadata real. `.claude/rules/core/controllers.md` § Task Result
  Metadata had already specified that field. Adoption before this hook was 0
  references in `.claude/hooks` and in `scripts`, and 0 of 142
  `coordination_log.yaml` files on disk.
- **It never blocks**: every code path returns `null`, which becomes
  `{"continue": true}`. It cannot deny. It cannot gate a merge. It cannot
  influence any allow decision or deny decision. To revert it, delete its single
  registration in `.claude/settings.json`. It deliberately holds **no threshold,
  no budget, no warning level, and no pass or fail comparison**.
  `tests/hooks/spawn-footprint.test.js` pins that absence.
- **Where the data lives (probed empirically, not assumed)**: a throwaway
  raw-payload probe ran on both events. It established that `SubagentStop`
  carries **no** token data and **no** usage data at all. Its keys are
  `session_id, transcript_path, cwd, prompt_id, permission_mode, agent_id,
  agent_type, effort, hook_event_name, stop_hook_active, agent_transcript_path,
  last_assistant_message, background_tasks, session_crons`. The `tool_response`
  of `PostToolUse[Agent]` does carry the data. Its keys are `status, prompt,
  agentId, agentType, content, resolvedModel, totalDurationMs, totalTokens,
  totalToolUseCount, usage, toolStats`. The registration is therefore on
  PostToolUse, and not on SubagentStop.
- **Field semantics**: `usage.input_tokens` on its own is the uncached input
  slice. It holds 1 or 2 tokens in most cases, so it does not answer the question
  "how big was this spawn". The recorded `token_count.input` is therefore the sum
  of `input_uncached`, `cache_read`, and `cache_creation`. It is a **superset** of
  `cache_read` and of `cache_creation`. The hook records those two beside it, so
  that nobody can mistake the aggregate for a raw API field.
- **Writes**: it always appends to `workflow/spawn_footprints.yaml`. When
  `workflow/coordination_log.yaml` already exists, it also attaches
  `token_count`, `tool_uses`, and `duration_seconds` to the
  `implementation_tasks` entry whose `agent_id` matches. It **never creates**
  `coordination_log.yaml`, so it cannot make an uncoordinated session look
  coordinated. A controller records `agent_id` only after its spawn returns.
  Every invocation therefore also runs an idempotent reconcile pass over every
  footprint recorded before. That pass back-fills an entry whose `agent_id` has
  appeared since.
- **Concurrency**: it resolves the session with
  `findActiveSession(input.session_id)`. It uses no newest-session heuristic, so
  a session it cannot resolve records nothing instead of writing into the files
  of a sibling. It brackets both writes in `withFileLock`.

### ConfigChange: config-change-logger.cjs

- **Purpose**: Log a configuration change to an audit trail when Claude Code
  emits a `ConfigChange` event. A change covers the user settings, the project
  settings, the local settings, and the skills. LP-17 wired it in v12.7.0.
- **Output**: Pass-through (never blocks).

## New Event Hooks

### StopFailure: stop-failure-handler.cjs

- **Purpose**: Capture workflow state (phase, domain, controller, pending/in-progress work items) into `recovery_state.yaml` when Claude fails to stop cleanly.
- **Creates**: `workflow/recovery_state.yaml`
- **Output**: Pass-through (never blocks).

### InstructionsLoaded: instructions-loaded.cjs

- **Purpose**: Validate `.claude/rules/` directory structure, count loaded rule files, inject active session mission as context.
- **Output**: `{"hookSpecificOutput": {"additionalContext": "...mission reminder..."}}`

### PostCompact: post-compact-restore.cjs

- **Purpose**: Log key workflow state (mission, domain, phase, work item progress counts) to disk after context compaction.
- **Creates**: `cagents-memory/_system/logs/post-compact_{YYYY-MM-DD}.log`. It
  writes one block per invocation, holding the goal, the state, the phase, and
  the work counts.
- **Output**: Returns `{ continue: true }` and no systemMessage. The
  thinking-block-immutability contract (run_team-thinking-400_260531_001) stops
  PostCompact from emitting a systemMessage. Context compaction is the one
  documented harness event that rewrites the conversation. A systemMessage
  emitted right after that rewrite risked attaching to the content array of the
  assistant turn that the harness had rewritten, and that breaks thinking-block
  immutability in the Anthropic API. The model resumes by reading `plan.yaml` and
  `coordination_log.yaml` directly after compaction. The disk log serves audit
  and troubleshooting only.

## CLI Tool (Not a registered hook)

### eval-runner.cjs

- **Purpose**: Run quality evaluations on sessions (standalone CLI tool).
- **Location**: `scripts/eval-runner.cjs`. A2-10 moved it out of
  `.claude/hooks/`, because it is a CLI and not a hook. It therefore no longer
  inflates the count of `.claude/hooks/*.cjs` files.
- **Usage**: `node scripts/eval-runner.cjs --session <session_id>`
- **Creates**: `sessions/{id}/evals/evaluation_report.yaml`

## Secret Detection Patterns

The `secret-detection.cjs` hook blocks these patterns:

### Critical (Blocked)

- GitHub tokens: `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`
- AWS keys: `AKIA...`
- Private keys: `-----BEGIN ... PRIVATE KEY-----`
- Slack tokens: `xox[baprs]-...`
- Stripe live keys: `sk_live_...`, `rk_live_...`
- Database connection strings with credentials
- Anthropic API keys: `sk-ant-...`
- OpenAI API keys: `sk-proj-...` (newer format), `sk-<48-50 chars>` (legacy)
- NPM/PyPI tokens

### High (Blocked)

- Google API keys: `AIza...`

### Medium (Warning)

- Generic API keys
- Generic secret keys

### Low (Logged)

- JWT tokens (could be test tokens)

### False Positive Filtering

Markdown scanning (changed by F7-2, audit run_fable-plugin-review_260609_001):
`*.md`, `README`, and `docs/` no longer carry a blanket exclusion. The hook scans
Markdown with the same full-token regexes that it uses on code. A live API key
pasted into a README or into a doc is therefore caught now. This gives zero false
positives on documentation that only refers to a secret *prefix*. This catalog,
for example, lists `ghp_`, `AKIA...`, and `sk-ant-...` as patterns to detect.
Each of those is a partial fragment or a prefix fragment, and not a full-length
token, so the full-token regexes do not match them.

Blanket-excluded (entire file skipped):

- Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- Example/sample/template/mock/fixture files (by filename pattern)

DOC_ALLOWLIST is a narrow per-file allowlist. It is anchored on the basename, and
it skips the whole file. It holds only the two repo docs that document the
secret-detection mechanism itself. Those two docs therefore carry secret-pattern
fragments as reference material, and they do so legitimately:

- `hook-catalog.md` (this file)
- `SECRET-SANITIZE.md`

The allowlist exists so that a later expansion of those two docs cannot
self-block the hook. Such an expansion could add a worked example. The allowlist
is anchored on the basename of the path, so a sibling directory with the same
name cannot widen it.

Test file scanning (targeted suppression, not blanket exclusion):

- Test files (`*.test.js`, `*.spec.ts`, `__tests__/`, etc.) ARE scanned for real secrets
- Explicit placeholder tokens suppressed: `test_`, `fake_`, `example_`, `your_key_here`, `REPLACE_ME` (matched against the token itself)
- Realistic-looking tokens in test files trigger alerts normally
