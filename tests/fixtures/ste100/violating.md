---
paths:
  - "tests/**"
---

# Violating STE-100 Fixture

This file trips every prose check in `scripts/ste100/rules.cjs`. The gate must
name each file, each line and each failing check, and must exit 1.

<!-- trips: sentence-20-procedural (an imperative sentence over the 20-word cap, M3) -->
## sentence-20-procedural

Read the whole work item, then run the guard command, then record the exit code,
then write the evidence, and finally report the status back to the controller.

<!-- trips: sentence-25-descriptive (a descriptive sentence over the 25-word cap, M3) -->
## sentence-25-descriptive

The gate is a thin wrapper around a rule engine that is required in process by
the continuous integration script and by the hook, so that both consumers share
exactly one implementation of every check and can never drift apart over time.

<!-- trips: em-dash (a U+2014 in instructional prose, M7) -->
## em-dash

The em dash is banned in instructional prose — M7 says so, and the corpus survey
counted 5947 of them across the seven surfaces that this session owns.

<!-- trips: paragraph-6 (a paragraph over the 6-sentence cap, M9) -->
## paragraph-6

The gate counts each sentence in a paragraph. It stops at 6. This paragraph
holds 7. The cap comes from M9. A long paragraph is hard to read. A long
paragraph is hard to translate. Split it, or use a list.

<!-- trips: noun-cluster-3 (a noun pile over the cap of 3 nouns) -->
## noun-cluster-3

Check the runway light approach system control panel indicator lamp before the
flight.

<!-- trips: passive-voice (a passive signal inside an instruction, M4) -->
## passive-voice

Report the finding after the coordination log was updated by the controller.

<!-- trips: NOTHING. A fence is skipped, so this block must stay silent. -->
## Fenced blocks must NOT be counted

```text
This fenced line is a long descriptive sentence that runs well past twenty five
words in total and carries an em dash — and a runway light approach system
control panel noun pile, and the gate must ignore every part of it.
```

<!-- trips: NOTHING. An inline span is masked, so this text must stay silent. -->
## Inline code spans must NOT be counted

Read `scripts/ste100/rules.cjs` and `scripts/ci/validate-ste100.sh` before you
change a check.
