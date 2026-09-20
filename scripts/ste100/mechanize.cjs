#!/usr/bin/env node
"use strict";
//
// ste100 mechanical rewriter. Four DETERMINISTIC transforms live in this file.
// The COMMAND LINE runs TWO of them, per decision D6: the em-dash transform and
// the ALL-CAPS transform. A transform that needs judgement is not here. It stays
// with a human, or with the prose work items of phase P5.
//
// USAGE
//   node scripts/ste100/mechanize.cjs --dry-run <path|glob> [<path|glob> ...]
//   node scripts/ste100/mechanize.cjs --apply   <path|glob> [<path|glob> ...]
//   node scripts/ste100/mechanize.cjs --from-file <list.txt> --dry-run
//   node scripts/ste100/mechanize.cjs --from-file <list.txt> --apply
//
//   --dry-run prints a unified diff to stdout and writes nothing.
//   --apply writes each changed file in place.
//   Quote a glob so this script expands it. A * crosses a directory boundary,
//   which is the semantics that scripts/ste100/exempt.txt documents.
//   A glob resolves against the repo root, never against the caller cwd.
//
// OTHER FLAGS
//   --root <dir>            treat <dir> as the root. The idempotence proof uses
//                           it to work on a scratch copy of the corpus.
//   --no-exempt             ignore scripts/ste100/exempt.txt.
//   --skip-transform <name> emdash | caps. Repeatable. It only ADDS a name to
//                           the skip set, which already holds slash and words.
//   --stats                 print a per-transform count, and the advisory rows
//                           that need a human, to stderr.
//   --quiet                 drop the per-file skip lines.
//
// DECISION D6. THE COMMAND LINE SHIPS TWO TRANSFORMS, NOT FOUR.
//   Three independent review rounds rejected the full transform set. The
//   command line therefore runs the em-dash transform (SINGLE dashes only) and
//   the ALL-CAPS transform, and nothing else. Two transform families are
//   DROPPED, permanently:
//     slash   the slash-to-" or " conversion
//     words   the WI-011 substitution table
//   The skip set in main() STARTS with both names in it, so neither is
//   REACHABLE FROM THE COMMAND LINE. No flag re-enables either one.
//   A third shape is dropped inside the em-dash transform itself: the PAIRED
//   parenthetical. See the comment block above classifyDash.
//
//   transformSlash(), transformWords() and their tables STAY in this file. They
//   remain reachable from the MODULE API, FOR UNIT TESTS ONLY: a test that calls
//   transformText() with no skip list still exercises them, which is what the
//   transform 3 and transform 4 describes in tests/ste100/mechanize.test.js
//   document. No corpus run can reach them.
//
// EXIT CODES
//   0  the run finished
//   1  an internal invariant broke (the run wrote nothing)
//   2  bad usage
//
// WHAT IT NEVER EDITS
//   The list below is absolute. Each item is enforced by a unit test in
//   tests/ste100/mechanize.test.js that asserts a byte-identical return.
//     1. a fenced code block and every line inside it
//     2. an inline code span
//     3. a string literal in a .cjs, .js or .mjs file. In a code file this
//        script reads comment lines and nothing else.
//     4. YAML frontmatter, which holds the agent description line
//     5. a markdown heading, because invariant 1 of
//        scripts/ste100/invariants.sh freezes every heading byte
//     6. a table row, a horizontal rule and an HTML comment
//     7. a path matched by scripts/ste100/exempt.txt
//     8. CHANGELOG.md and docs/RELEASE_NOTES.md
//     9. a link target, a URL, an @reference and a path token
//    10. quoted example text, for ALL FOUR transforms. M10 protects it. A dash
//        inside a quoted span is skipped, not softened to a comma.
//    11. a bare filename token that carries no slash, such as
//        verify-completion.cjs or plan.yaml. maskProtected masks it.
//    12. a hyphenated compound. A substitution row never fires on one
//        component of one, so just-rewritten and highest-leverage stay whole.
//    13. an alignment gutter. A dash behind two or more spaces is a layout
//        glyph in an ASCII table, not sentence punctuation, so the em-dash
//        transform skips it and the tidy step never closes the gutter.
//    14. a multi-word ALL-CAPS run that holds one protected or one
//        non-emphasis token. Transform 2 reduces a run whole or not at all.
//
// TRAP 1 (mawk). mawk 1.3.4 on this box reads the interval -{3,} as one
//   literal dash. This file uses zero awk. Every classifier is JavaScript.
//
// TRAP 2 (NUL byte). .claude/hooks/hook-utils.cjs holds a literal NUL byte.
//   GNU grep calls that file binary and stops. This file never shells to grep.
//   It reads bytes with fs.readFileSync, so NUL is one more character.
//
// MANDATE M6. This script never deletes an article, a copula or any other
//   function word. The one deletion class it performs is the filler adverb,
//   which .claude/rules/quality/resources/ste100-word-choices.md lists with the
//   cell "delete it" and states is not a breach of M6.
//
// MANDATE M10. Quoted example text is quoted because its exact wording is the
//   point. A dash inside a quoted span is therefore SKIPPED, not softened to a
//   comma. It is reported under --stats so a human sees it. A dash elsewhere on
//   the same line is still transformed, so this is not a blanket line skip.
//
// ROWS THIS SCRIPT DELIBERATELY DOES NOT REWRITE
//   verified, verifies, verifying   an adjective and a participle, and the
//     literal name of a pass-rate counter. The bare verb verify -> make sure
//     stays, because that row is grammatical.
//   permitted, permits, permitting  ungrammatical as a passive participle:
//     "three permitted values" is not "three let values".
//   might -> can                    a modal meaning inversion. "can not
//     convert" is not "might not convert".
//   is capable of                   the approved word leaves a bare gerund
//     behind, so it is an advisory row that a human resolves.
//
// SHARED MASKING. Line classification comes from scripts/ste100/rules.cjs. The
//   checker and this rewriter therefore agree on what counts as prose.
//
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const rules = require("./rules.cjs");

const { maskCode, maskQuotes, blank, MASK } = rules.masking;

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TRANSFORMS = ["emdash", "caps", "slash", "words"];

// ===========================================================================
// SECTION 1. Named constants a reviewer can read in one place.
// ===========================================================================

// An acronym or an initialism. This script never lowercases a member.
const ACRONYM_ALLOWLIST = new Set([
  "ACL", "ADR", "AI", "API", "APIS", "ASCII", "ASD", "ASVS", "AWS",
  "BDD", "BI", "BRD", "B2B", "B2C",
  "CC", "CCPA", "CD", "CI", "CJS", "CLI", "CPU", "CRM", "CSS", "CSV", "CTA", "CTR",
  "DB", "DBA", "DNS", "DRY", "DS",
  "E2E", "ECS", "EDA", "ELT", "ESM", "ETL", "EU", "EOF", "ENV",
  "FAQ", "FMOD", "FS",
  "GCP", "GDD", "GDPR", "GPU", "GTM", "GUI",
  "HITL", "HR", "HRBP", "HTML", "HTTP", "HTTPS",
  "IAM", "ICP", "ID", "IDE", "IDS", "IO", "IP",
  "JSON", "JWT",
  "KPI", "K8S",
  "LCS", "LLM", "LSP",
  "MCP", "ML", "MJS", "MVP",
  "NB", "NPM", "NUL",
  "OAUTH", "OKR", "OS", "OWASP",
  "PII", "PIA", "PR", "PRS", "POC",
  "QA", "QBR",
  "RAG", "RAM", "REST", "RFC", "ROI",
  "SAAS", "SDK", "SEO", "SERP", "SLA", "SLO", "SOW", "SQL", "SSH", "SSL", "STE", "STP",
  "TCP", "TDD", "TLS", "TSV", "TUI",
  "UI", "UK", "URI", "URL", "URLS", "US", "UTF", "UX",
  "VM", "VPC",
  "WCAG", "WIP", "WI",
  "XML", "YAGNI", "YAML",
]);

// A pipeline state, a verdict or a status token. These carry machine meaning.
const PIPELINE_STATES = new Set([
  "INIT", "ORCHESTRATED", "PLANNED", "COORDINATED", "VALIDATED",
  "PASS", "FAIL", "REVISE", "BLOCKED", "DONE", "MET",
  "NEEDS_CONTEXT", "DONE_WITH_CONCERNS", "CONDITIONAL_PASS",
  "PENDING", "IN_PROGRESS", "COMPLETED", "DELETED", "SKIPPED",
  "PEAK", "GOOD", "DEGRADING", "POOR",
  "ROBUST", "WEAK", "INVALID", "MEASURED", "ESTIMATE",
  "TRUE", "FALSE", "NULL", "OK", "ERROR", "WARN", "WARNING", "DEBUG", "INFO",
  "TODO", "FIXME", "XXX", "HACK",
]);

const HTTP_VERBS = new Set([
  "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE", "CONNECT",
]);

// The only ALL-CAPS tokens this script converts. A closed target list is safer
// than a closed exclusion list, because a new acronym cannot leak into it.
const EMPHASIS_WORDS = new Set([
  "ABSOLUTELY", "ALL", "ALWAYS", "ANY", "BANNED", "BOTH", "CANNOT",
  "COMPLETELY", "CRITICAL", "DO", "DON'T", "EACH", "ENTIRELY", "EVERY",
  "EXACTLY", "EXPLICITLY", "FORBIDDEN", "IMMEDIATELY", "IMPORTANT",
  "MANDATORY", "MUST", "NEVER", "NONE", "NOT", "NOTHING", "ONLY",
  "REQUIRED", "STRICTLY", "UNCHANGED", "VERY", "WITHOUT", "ZERO",
]);

// A slash pair that stays. "and/or" is the one slash that M7 permits. The rest
// are established compound terms, where " or " would change the meaning. The
// second group is a compound technical NAME: try/catch is one control-flow
// construct, not a choice between "try" and "catch".
const SLASH_KEEP = new Set([
  "and/or", "ci/cd", "i/o", "tcp/ip", "a/b", "km/h", "n/a", "w/o",
  "read/write", "pass/fail",
  "try/catch", "fork/exec", "producer/consumer", "request/response",
  "client/server", "setuid/setgid", "upstream/downstream", "input/output",
  "encode/decode", "push/pull", "start/stop", "open/close", "deny/allow",
]);

// A directory name. A slash next to one of these is a path, not prose.
const DIRECTORY_WORDS = new Set([
  "agents", "archive", "benchmarks", "bin", "build", "cagents", "ci", "claude",
  "commands", "config", "core", "dist", "docs", "domains", "evals", "examples",
  "fixtures", "helpers", "hooks", "infrastructure", "integration", "lib",
  "main", "master", "memory", "metrics", "migration", "outputs", "playbooks",
  "plugin", "quality", "regressions", "resources", "rules", "schemas",
  "scripts", "sessions", "skills", "src", "tasks", "team", "templates", "tests",
  "validation", "waypoints", "workflow",
]);

// A finite verb or a modal. The em-dash classifier uses this set to decide
// whether a side of the dash is an independent clause. The set is closed, so an
// unknown verb makes the classifier fall back to the comma, which is safe.
const FINITE_VERBS = new Set([
  "is", "are", "was", "were", "am", "has", "have", "had", "does", "did",
  "can", "cannot", "could", "will", "would", "shall", "should", "may",
  "might", "must", "ought", "needs", "isn't", "aren't", "wasn't", "weren't",
  "doesn't", "didn't", "won't", "don't", "can't", "hasn't", "haven't",
  "adds", "allows", "applies", "belongs", "breaks", "brings", "builds",
  "calls", "carries", "causes", "changes", "checks", "comes", "costs",
  "counts", "covers", "creates", "decides", "depends", "drives", "drops",
  "ends", "exists", "expects", "fails", "finds", "fires", "fixes", "gets",
  "gives", "goes", "handles", "happens", "helps", "holds", "keeps", "knows",
  "lands", "leaves", "lets", "lists", "lives", "loses", "makes", "marks",
  "matches", "means", "moves", "names", "opens", "owns", "passes", "picks",
  "points", "prevents", "produces", "proves", "provides", "reads", "remains",
  "removes", "returns", "runs", "says", "sees", "sends", "sets", "shows",
  "solves", "stays", "stops", "takes", "tells", "treats", "turns", "uses",
  "wants", "wins", "works", "writes", "yields",
  "added", "allowed", "applied", "broke", "brought", "built", "called",
  "came", "carried", "caused", "changed", "checked", "covered", "created",
  "dropped", "ended", "expected", "failed", "fixed", "gave", "got", "held",
  "kept", "knew", "landed", "left", "listed", "lost", "made", "marked",
  "matched", "meant", "moved", "named", "opened", "passed", "picked",
  "prevented", "produced", "proved", "provided", "remained", "removed",
  "returned", "ran", "said", "saw", "sent", "showed", "stayed", "stopped",
  "took", "told", "turned", "used", "wanted", "won", "worked", "wrote",
]);

// A lowercase token that cannot open a sentence. The classifier never breaks a
// sentence in front of one.
const NON_STARTERS = new Set([
  "and", "but", "or", "nor", "so", "yet", "because", "which", "who", "whom",
  "whose", "that", "than", "while", "although", "though", "since", "unless",
  "until", "whereas", "plus", "just", "only", "even", "especially",
  "particularly", "including", "such", "not", "rather", "namely", "etc",
]);

// A cue that a colon follows. The cue wins over the clause test.
const COLON_CUES = [
  "the following", "as follows", "namely", "for example", "for instance",
  "such as", "that is", "as in", "in short",
];

// The WI-011 substitution table, read from
// .claude/rules/quality/resources/ste100-word-choices.md. Each row names the
// approved word that this script writes. A row whose cell offers two approved
// words carries one choice here, so the output is deterministic and a reviewer
// sees the choice. No row is invented.
const SUBSTITUTIONS = [
  // ASD rows: verbs
  { from: "accomplish", to: "do" },
  { from: "execute", to: "do" },
  { from: "perform", to: "do" },
  { from: "acquire", to: "get" },
  { from: "obtain", to: "get" },
  { from: "procure", to: "get" },
  { from: "adhere to", to: "obey" },
  { from: "comply with", to: "obey" },
  { from: "ascertain", to: "find" },
  { from: "determine", to: "find" },
  { from: "assist", to: "help" },
  { from: "aid", to: "help" },
  { from: "attempt", to: "try" },
  { from: "cease", to: "stop" },
  { from: "terminate", to: "stop" },
  { from: "discontinue", to: "stop" },
  { from: "commence", to: "start" },
  { from: "initiate", to: "start" },
  { from: "conduct", to: "do" },
  { from: "depress", to: "push" },
  { from: "desire", to: "want" },
  { from: "endeavor", to: "try" },
  { from: "ensure", to: "make sure" },
  { from: "examine", to: "do a check of" },
  { from: "inspect", to: "do a check of" },
  { from: "facilitate", to: "help" },
  { from: "illuminate", to: "light" },
  { from: "indicate", to: "show" },
  { from: "locate", to: "find" },
  { from: "modify", to: "change" },
  { from: "observe", to: "look at" },
  { from: "permit", to: "let" },
  { from: "purchase", to: "buy" },
  { from: "rectify", to: "correct" },
  { from: "remedy", to: "correct" },
  { from: "replenish", to: "fill" },
  { from: "require", to: "need" },
  { from: "retain", to: "keep" },
  { from: "transmit", to: "send" },
  { from: "utilize", to: "use" },
  { from: "verify", to: "make sure" },
  // ASD rows: nouns
  { from: "aperture", to: "hole" },
  { from: "assistance", to: "help" },
  { from: "commencement", to: "start" },
  { from: "illumination", to: "light" },
  { from: "malfunction", to: "fault" },
  { from: "personnel", to: "persons" },
  { from: "portion", to: "part" },
  { from: "the remainder", to: "the other part" },
  { from: "remainder", to: "the other part" },
  { from: "requirement", to: "need" },
  { from: "termination", to: "end" },
  { from: "utilization", to: "use" },
  { from: "vicinity", to: "area" },
  // ASD rows: adjectives and adverbs
  { from: "adequate", to: "enough" },
  { from: "sufficient", to: "enough" },
  { from: "adjacent", to: "near" },
  { from: "approximately", to: "about" },
  { from: "additional", to: "more" },
  { from: "initial", to: "first" },
  { from: "numerous", to: "many" },
  { from: "multiple", to: "many" },
  { from: "optimum", to: "best" },
  { from: "previous", to: "earlier" },
  { from: "principal", to: "main" },
  { from: "rapidly", to: "quickly" },
  { from: "subsequent", to: "next" },
  // ASD rows: phrases
  { from: "a number of", to: "some" },
  { from: "at this time", to: "now" },
  { from: "due to the fact that", to: "because" },
  { from: "for the purpose of", to: "to" },
  { from: "in accordance with", to: "as in" },
  { from: "in conjunction with", to: "with" },
  { from: "in order to", to: "to" },
  { from: "in the event that", to: "if" },
  { from: "in the vicinity of", to: "near" },
  // "is capable of" is an ADVISORY row, not a substitution row. See ADVISORY_ROWS.
  { from: "it is necessary to", to: "you must" },
  { from: "prior to", to: "before" },
  { from: "subsequent to", to: "after" },
  { from: "with regard to", to: "about" },
  // cAgents-local rows
  { from: "basically", to: "", filler: true },
  { from: "essentially", to: "", filler: true },
  { from: "simply", to: "", filler: true },
  { from: "just", to: "", filler: true },
  { from: "actually", to: "", filler: true },
  { from: "really", to: "", filler: true },
  { from: "very", to: "", filler: true },
  { from: "quite", to: "", filler: true },
  { from: "somewhat", to: "", filler: true },
  { from: "fairly", to: "", filler: true },
  { from: "rather", to: "", filler: true },
  // No "might" -> "can" row. It inverts the modal: "might not convert" states a
  // possibility, "can not convert" states an inability. See HEDGE_NAMES.
  { from: "could potentially", to: "can" },
  { from: "it is important to note that", to: "", opener: true },
  { from: "please note that", to: "", opener: true },
  { from: "note that", to: "", opener: true },
  { from: "leverage", to: "use" },
  { from: "delve", to: "look at" },
];

// An inflected form of a row above. The base row gives the mapping. This list
// is explicit so a reviewer reads every form that the script writes.
const INFLECTED_VERBS = [
  { from: "utilizes", to: "uses" }, { from: "utilized", to: "used" }, { from: "utilizing", to: "using" },
  { from: "requires", to: "needs" }, { from: "required", to: "needed" }, { from: "requiring", to: "needing" },
  { from: "modifies", to: "changes" }, { from: "modified", to: "changed" }, { from: "modifying", to: "changing" },
  { from: "retains", to: "keeps" }, { from: "retained", to: "kept" }, { from: "retaining", to: "keeping" },
  { from: "indicates", to: "shows" }, { from: "indicated", to: "showed" }, { from: "indicating", to: "showing" },
  { from: "locates", to: "finds" }, { from: "located", to: "found" }, { from: "locating", to: "finding" },
  { from: "attempts", to: "tries" }, { from: "attempted", to: "tried" }, { from: "attempting", to: "trying" },
  { from: "ensures", to: "makes sure" }, { from: "ensured", to: "made sure" }, { from: "ensuring", to: "making sure" },
  // No verifies/verified/verifying row. "verified" is an adjective and a
  // participle here ("**Last verified**", "sentinel-verified"), and it is the
  // literal name of a pass-rate counter. Bare "verify" -> "make sure" stays.
  { from: "leverages", to: "uses" }, { from: "leveraged", to: "used" }, { from: "leveraging", to: "using" },
  { from: "facilitates", to: "helps" }, { from: "facilitated", to: "helped" }, { from: "facilitating", to: "helping" },
  { from: "assists", to: "helps" }, { from: "assisted", to: "helped" }, { from: "assisting", to: "helping" },
  { from: "determines", to: "finds" }, { from: "determined", to: "found" }, { from: "determining", to: "finding" },
  // No permits/permitted/permitting row. "let" is ungrammatical as a passive
  // participle: "three permitted values" is not "three let values". Bare
  // "permit" -> "let" stays.
  { from: "obtains", to: "gets" }, { from: "obtained", to: "got" }, { from: "obtaining", to: "getting" },
  { from: "acquires", to: "gets" }, { from: "acquired", to: "got" }, { from: "acquiring", to: "getting" },
];

// A row of the table whose approved cell asks a human to state a condition, a
// count or a property. No machine can write that. This script reports these and
// never edits them.
const ADVISORY_ROWS = [
  { from: "generally", note: "say when it is true" },
  { from: "typically", note: "say when it is true" },
  { from: "usually", note: "say when it is true" },
  { from: "often", note: "give the count or the rate" },
  { from: "as needed", note: "state the condition" },
  { from: "as required", note: "state the condition" },
  { from: "where appropriate", note: "state the condition" },
  { from: "robust", note: "say what it resists" },
  { from: "seamless", note: "say what the user does not do" },
  { from: "comprehensive", note: "say what it covers" },
  { from: "holistic", note: "say what it covers" },
  { from: "tapestry", note: "delete it, and name the thing" },
  { from: "is capable of", note: "name the action: \"can fail\", not \"can failing\"" },
];

// A hedging word that the corpus ENUMERATES by name. The mention guard reads
// this set beside the substitution sources, because .claude/rules/quality/
// anti-slop.md lists "might" next to "could potentially" inside one
// parenthetical and no substitution row names "might" any more.
const HEDGE_NAMES = new Set([
  "might", "could", "maybe", "perhaps", "possibly", "potentially",
  "arguably", "seemingly", "somehow", "sort of", "kind of",
]);

// A path this script refuses even when exempt.txt is off.
const HARD_EXCLUDE = ["CHANGELOG.md", "docs/RELEASE_NOTES.md"];

// ===========================================================================
// SECTION 2. Masking on top of the shared masking of rules.cjs.
// ===========================================================================

// Mask a link target, a URL, an @reference and a path token. Invariants 4, 6
// and 7 of scripts/ste100/invariants.sh freeze all of them. Masking is length
// preserving, so every character offset stays valid.
function maskProtected(line) {
  let out = line;
  out = out.replace(/\]\([^)\n]*\)/g, blank);
  out = out.replace(/<[^\s>\n]+>/g, blank);
  out = out.replace(/\bhttps?:\/\/[^\s)\]}>"']+/g, blank);
  out = out.replace(/@[A-Za-z0-9_][A-Za-z0-9_./-]*/g, blank);
  out = out.replace(/\bv?\d+\.\d+\.\d+[A-Za-z0-9.-]*/g, blank);
  out = out.replace(/[A-Za-z0-9_.{}*-]+\/[A-Za-z0-9_.{}/*-]*/g, (tok) => {
    const slashes = (tok.match(/\//g) || []).length;
    const looksLikePath = slashes >= 2 || /\/$/.test(tok) || /\.[A-Za-z0-9]{1,5}$/.test(tok);
    return looksLikePath ? blank(tok) : tok;
  });
  // A BARE FILENAME, written with no directory in front of it. The rule above
  // only sees a token that carries a slash, so "verify-completion.cjs" reached
  // the substitution table and came back as "make sure-completion.cjs". A
  // filename is an identifier, so it is masked whole and length-preservingly.
  // The mask character is not in the token class, so a path that this function
  // already blanked cannot match a second time.
  out = out.replace(
    /\b[A-Za-z0-9_][A-Za-z0-9_.-]*\.(?:cjs|js|mjs|md|sh|ya?ml|json|txt|ts|tsx|py)\b/g,
    blank
  );
  return out;
}

// A second fence scanner, written to the rule that scripts/ste100/invariants.sh
// applies: a fence closes only on a line that holds fence characters and no
// more, of at least the opening length. rules.cjs closes on any line that opens
// with the same fence mark. The two answers differ when a fenced block nests a
// second fence, as docs/templates/UNIVERSAL_AGENT_TEMPLATE.md does.
//
// This rewriter protects the UNION of the two answers. A line that either
// scanner calls fenced is never edited. The union is strictly safer than either
// scanner alone, and it is what keeps invariant 2 (FENCE) true.
function invariantFenceLines(filePath, content) {
  const isCode = /\.(cjs|js|mjs)$/i.test(String(filePath).replace(/\\/g, "/"));
  const protectedLines = new Set();
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;
  const lines = String(content).split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (isCode) {
      if (!/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
      line = line.replace(/^\s*\/\*+/, "").replace(/^\s*\/\//, "").replace(/^\s*\*+\/?/, "");
    }
    if (inFence) {
      protectedLines.add(i + 1);
      const t = line.trim();
      const only = fenceChar === "`" ? /^`+$/ : /^~+$/;
      if (only.test(t) && t.length >= fenceLen) { inFence = false; fenceChar = ""; fenceLen = 0; }
      continue;
    }
    const open = /^[ \t]*(`{3,}|~{3,})/.exec(line);
    if (open) {
      inFence = true;
      fenceChar = open[1][0];
      fenceLen = open[1].length;
      protectedLines.add(i + 1);
    }
  }
  return protectedLines;
}

// Build a masked view of a block. Masking runs per line, which is the unit that
// rules.cjs masks, so the two stay in step. Length is preserved.
function maskView(text, withQuotes) {
  return text
    .split("\n")
    .map((l) => {
      const m = maskCode(l);
      return maskProtected(withQuotes ? maskQuotes(m) : m);
    })
    .join("\n");
}

// Collect every ALL-CAPS token and every slash token that the file uses inside
// a code span or a fenced block. A token in this set is an identifier, so no
// transform touches it anywhere in the file.
function collectCodeTokens(content) {
  const caps = new Set();
  const slashes = new Set();
  const harvest = (s) => {
    for (const m of s.match(/[A-Z][A-Z0-9_'-]*[A-Z0-9]/g) || []) caps.add(m);
    for (const m of s.match(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g) || []) slashes.add(m.toLowerCase());
  };
  let inFence = false;
  for (const line of String(content).split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; harvest(line); continue; }
    if (inFence) { harvest(line); continue; }
    for (const m of line.match(/(`+)(?:(?!\1)[\s\S])*?\1/g) || []) harvest(m);
  }
  return { caps, slashes };
}

// ===========================================================================
// SECTION 3. Edit application.
// ===========================================================================

// Apply a list of { start, end, text } edits to a string. Edits run from the
// right, so an earlier offset stays valid. An overlapping edit is dropped.
function applyEdits(source, edits) {
  const sorted = edits.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const kept = [];
  let last = -1;
  for (const e of sorted) {
    if (e.start < last) continue;
    kept.push(e);
    last = e.end;
  }
  let out = source;
  for (let i = kept.length - 1; i >= 0; i--) {
    out = out.slice(0, kept[i].start) + kept[i].text + out.slice(kept[i].end);
  }
  // Where each edit landed in the new string. The tidy step needs it, because
  // it may clean up only the text that an edit produced.
  const windows = [];
  let delta = 0;
  for (const e of kept) {
    const start = e.start + delta;
    windows.push([start, start + e.text.length]);
    delta += e.text.length - (e.end - e.start);
  }
  return { text: out, applied: kept.length, windows };
}

// Collapse a doubled space and a space in front of punctuation. Two guards keep
// it safe. It cleans only text inside an edit window, so spacing that no
// transform produced is left alone. It skips any match that holds a mask
// character, so an inline code span and a path keep their own spacing. The
// second guard is the one that invariant 3 (INLINE_CODE) demands.
function tidyRegions(text, windows, pad) {
  if (windows.length === 0) return text;
  const reach = pad === undefined ? 3 : pad;
  const masked = maskView(text, false);
  const inWindow = (s, e) => windows.some(([ws, we]) => s <= we + reach && e >= ws - reach);
  // A run of spaces is closed only when an edit landed ON the run. The reach of
  // inWindow is deliberately not used here: a run of two or more spaces that an
  // edit merely sits NEAR is an alignment gutter in an ASCII table, and closing
  // it leaves the sibling rows of the table ragged.
  const touchesEdit = (s, e) => windows.some(([ws, we]) => s <= we && e >= ws);
  const edits = [];
  const collect = (re, make, gutter) => {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(masked)) !== null) {
      if (m[0].includes(MASK)) continue;
      const s = m.index;
      const e = s + m[0].length;
      if (gutter ? !touchesEdit(s + 1, e - 1) : !inWindow(s, e)) continue;
      const rep = make(m);
      if (rep !== m[0]) edits.push({ start: s, end: e, text: rep });
    }
  };
  collect(/(\S) {2,}(\S)/g, (m) => m[1] + " " + m[2], true);
  collect(/(\S) +([,.;:!?])/g, (m) => m[1] + m[2]);
  collect(/([,;:]) *([,;:])/g, (m) => m[1]);
  return applyEdits(text, edits).text;
}

// ===========================================================================
// SECTION 4. Segment and clause analysis.
// ===========================================================================

// Split a block into segments. A segment is the scope of a parenthetical pair.
// A boundary is sentence-final punctuation, or a newline in front of a list
// item. A pair never spans a boundary.
function splitSegments(text) {
  const bounds = [0];
  const re = /[.!?]["'”’)\]]*[ \t]+(?=[^\s])/g;
  let m;
  while ((m = re.exec(text)) !== null) bounds.push(m.index + m[0].length);
  const li = /\n(?=[ \t]*(?:[-*+]|\d+[.)])[ \t])/g;
  while ((m = li.exec(text)) !== null) bounds.push(m.index + 1);
  bounds.push(text.length);
  const uniq = Array.from(new Set(bounds)).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < uniq.length - 1; i++) {
    if (uniq[i + 1] > uniq[i]) out.push({ start: uniq[i], end: uniq[i + 1] });
  }
  return out;
}

function words(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []);
}

function firstWordToken(text) {
  const m = text.match(/^[\s*_`>("'[]*([A-Za-z][A-Za-z'-]*)/);
  return m ? m[1] : null;
}

// A side of the dash is an independent clause when it holds a finite verb, or
// when it opens with an imperative verb. STE-100 M4 makes the imperative a
// complete instruction, so it counts.
function isIndependentClause(text) {
  const w = words(text);
  if (w.length < 2) return false;
  for (const t of w) if (FINITE_VERBS.has(t)) return true;
  const first = firstWordToken(text);
  return Boolean(first && rules.masking.IMPERATIVE.has(first.toLowerCase()));
}

// True when a full stop may follow this text. A full stop after a path, an
// @reference or a version would extend that token and break invariant 4, 6
// or 7. A masked tail means a protected token sits there, so the answer is no.
function canTakeFullStop(text) {
  const t = text.replace(/[\s*_`)\]"'”’]+$/, "");
  if (t === "") return false;
  if (/[.!?:;,]$/.test(t)) return false;
  const lastTok = t.split(/[\s]/).pop() || "";
  if (lastTok.includes(MASK)) return false;
  if (/[./@\\]/.test(lastTok)) return false;
  return /[A-Za-z0-9)\]"'”’]$/.test(t);
}

// ===========================================================================
// SECTION 5. Transform 1. Context-sensitive dash replacement.
// ===========================================================================

// Find every dash that is used as a dash.
//
// THE EN DASH (U+2013) IS NEVER A CANDIDATE. In this corpus an en dash is a
// RANGE joiner, not sentence punctuation: Class A-E, `5000`-`10000` ms,
// V10.26.30-V10.26.35, v9-v12, 0.0-1.0, 3-5. Rule 0 below only skipped a dash
// sitting between two BARE digits, so every other range shape fell through and
// was rewritten: "Class A-E" became "Class A. E", and a recommended timeout
// SPAN became two discrete values. A shape-by-shape range detector cannot be
// trusted here, because a detector written from the rewriter's own assumptions
// confirms those assumptions instead of probing past them (that is exactly how
// the first screen reported this class as 0 and was wrong). Excluding the
// character is the one rule no unanticipated range shape can slip past.
//
// Measured cost of the exclusion: 94 en dashes live in the corpus and the old
// classifier rewrote 22 of them, of which 19 were destroyed ranges. Restricting
// the transform to the em dash (U+2014) therefore gives up at most 3 defensible
// removals and stops 19 corruptions. An en dash is left byte-identical for the
// phase P5 human pass.
function findDashes(masked) {
  const out = [];
  const re = /—/g;
  let m;
  while ((m = re.exec(masked)) !== null) {
    const i = m.index;
    const before = masked.slice(0, i);
    const after = masked.slice(i + 1);
    // A numeric range written with an em dash and no spaces. Kept for the rare
    // 3—5, even though the en dash is now excluded wholesale above.
    if (/\d$/.test(before) && /^\d/.test(after)) continue;
    // An ALIGNMENT GUTTER. Two or more spaces in front of the dash means the
    // dash is a column separator in an ASCII table drawn inside a comment, not
    // sentence punctuation. The replacement region is [ \t]*<dash>[ \t]*, so
    // rewriting one eats the gutter and the sibling rows go ragged. The line is
    // left byte-identical, and the dash falls to the phase P5 prose work items.
    if (/[ \t]{2}$/.test(before)) continue;
    out.push(i);
  }
  return out;
}

// Decide the replacement for one dash, and return the edit list for it.
//
//   (a) REMOVED. See below.
//   (b) a single dash in front of an expansion, a definition or a list becomes
//       a colon
//   (c) REMOVED. See below.
//
// CASE (a) IS DISABLED, GLOBALLY, IN EVERY CONTEXT.
//
// It used to turn a PAIR of dashes bracketing an aside into a COMMA PAIR. The
// defect class: a comma pair DESTROYS A RUN-IN BOLD LABEL AND AN APPOSITIVE.
// The line
//
//   - **Gate**: the check —a cheap one— runs first
//
// came back as "- **Gate**: the check, a cheap one, runs first", which reads as
// a three-item list and loses the aside entirely. 119-182 sites carry this shape
// in the corpus, measured across the review rounds.
//
// Which mark a bracketing pair should take, and whether the aside should stay an
// aside at all, is a judgement about what the sentence is SAYING. The shape
// therefore falls to the phase P5 HUMAN JUDGEMENT PASS, and both dashes of a
// detected pair are left BYTE-IDENTICAL for that pass to find.
//
// THE FALL-THROUGH IS "skip", NEVER "comma". This is load bearing. The
// paired-set computation in transformDashes() stays, so a pair is still
// DETECTED; detection now feeds a no-change verdict instead of a comma pair.
// Letting a paired dash fall through to the single-dash path below would write a
// bare comma at exactly the site the defect class names.
//
// CASE (c) IS DISABLED, GLOBALLY, IN EVERY CONTEXT.
//
// It used to turn a single dash between two independent clauses into a SENTENCE
// BREAK: a full stop, plus a capital on the next word. That one rule produced
// four defect classes at once.
//
//   R14  it capitalised a lowercase identifier. "team-stop must never fail"
//        became "Team-stop must never fail", and a capitalised hook basename
//        names nothing.
//   R16  it dropped a full stop inside an unclosed parenthesis, so the opening
//        ( was left hanging and the closing ) ended a sentence that never began.
//   R17  it left a sentence fragment, because a finite verb on the right side
//        is not the same thing as a subject and a finite verb.
//   R18  it moved dashes onto the colon and comma paths in ways that put a
//        second colon on a line that already carried one.
//
// Splitting one sentence into two needs judgement about what the second
// sentence is ABOUT, which is not something a deterministic rewriter can read.
// So this is not a mechanical transform at all. It belongs to the phase P5
// human pass, and the dash is left there untouched for that pass to find.
//
// THE FALL-THROUGH IS "skip", NEVER "comma". This is load bearing. A bare-comma
// default would collapse a cell whose entire content is a lone dash (an n/a
// marker; 45 of them live in this corpus) into a bare comma, which is a worse
// defect than the one this removal fixes. Leaving a byte exactly as the author
// wrote it can never be worse than what is already on disk. The ban is GLOBAL
// and not scoped to tables, because a table-scoped ban would leave that
// comma default in place everywhere else and bless precisely that collapse.
//
// The classifier may now emit only a comma, a colon or a skip.
function classifyDash(masked, dashIndex, segment, pairPartner) {
  const segText = masked.slice(segment.start, segment.end);
  const left = masked.slice(segment.start, dashIndex);
  const right = masked.slice(dashIndex + 1, segment.end);

  // Case (a). A detected pair is left byte-identical. See the block above.
  if (pairPartner !== null) return { kind: "skip" };

  const leftTrim = left.replace(/[ \t]+$/, "");
  const rightTrim = right.replace(/^[ \t]+/, "");

  // A colon may not follow a colon (no doubled colon). The test used to be
  // scoped to the SEGMENT, and that span is too narrow, which is R18.
  //
  // splitSegments cuts on sentence-final punctuation, so a markdown list line
  // such as
  //
  //   - **Leading Questions**: Phrasing a question to suggest an answer
  //     ("How much do you love our new feature?") — introduces response bias
  //
  // is TWO segments: the "?" inside the parenthesis ends the first one. The
  // run-in bold label's colon sits in segment 1 and the dash sits in segment 2,
  // so the segment test saw no colon and a SECOND colon landed on the line.
  //
  // The span is therefore widened to the enclosing LINE up to the dash. A
  // run-in bold label's colon occupies the whole line, so no second colon may
  // join it. `masked` already blanks a code span, a URL and a path, so the
  // colon inside `foo.md:18` or `https://x` never counts.
  const lineStart = masked.lastIndexOf("\n", dashIndex - 1) + 1;
  const lineHead = masked.slice(lineStart, dashIndex);

  const rightIsClause = isIndependentClause(rightTrim);
  const leftIsClause = isIndependentClause(leftTrim);
  const cueHit = COLON_CUES.some((c) => leftTrim.toLowerCase().trimEnd().endsWith(c));

  // A dash in front of a conjunction is an abrupt turn, never an introducer.
  // "It works - but only on Linux." takes a comma.
  const firstRight = firstWordToken(rightTrim);
  if (firstRight && NON_STARTERS.has(firstRight.toLowerCase())) return { kind: "comma" };

  // The three shapes that ask for a colon: a cue word on the left, an
  // expansion with a clause on neither side, and a list that runs to the end
  // of the line.
  const wantsColon =
    cueHit ||
    (!rightIsClause && !leftIsClause && rightTrim.trim() !== "") ||
    (rightTrim.trim() === "" && !leftIsClause);

  if (wantsColon) {
    // The SEGMENT already carries a colon. Pre-existing behaviour, unchanged:
    // fall through to the comma. The WI-041 review of the dry-run diff raised
    // no defect class against it.
    if (segText.includes(":")) return { kind: "comma" };
    // Only the LINE carries one, which is the R18 shape: a run-in bold label
    // such as "- **Leading Questions**:" that splitSegments cut away. A comma
    // here would splice two clauses that were never a comma shape, so the dash
    // is left alone. Which of the two colons should survive is a judgement
    // call, and judgement belongs to phase P5.
    if (lineHead.includes(":")) return { kind: "skip" };
    return { kind: "colon" };
  }

  // The former case (c). A dash between two independent clauses is the shape
  // that used to become a sentence break. It is now left byte-identical.
  if (leftIsClause && rightIsClause) return { kind: "skip" };
  return { kind: "comma" };
}

function transformDashes(text) {
  const masked = maskView(text, false);
  // The same view with quotes masked. A dash that is masked here sits inside
  // quoted example text, which M10 protects, so it takes a comma and no more.
  const quoted = maskView(text, true);
  const segments = splitSegments(masked);
  const edits = [];
  let count = 0;

  for (const seg of segments) {
    // M10. A dash inside quoted example text is dropped from the candidate list
    // before anything else looks at it. The exact wording of an example is the
    // point of quoting it, so the dash is SKIPPED, not softened to a comma.
    // Dropping it here and not at the verdict keeps it out of the pair finder
    // too, so a quoted dash can never drag an unquoted one into a pair.
    const all = findDashes(masked)
      .filter((i) => i >= seg.start && i < seg.end)
      .filter((i) => quoted[i] !== MASK);
    if (all.length === 0) continue;

    // A parenthetical pair: exactly two dashes in the segment, with text on
    // both outer sides. Consume them in order, two at a time. Case (a) is
    // disabled, so membership of this set now means NO EDIT for either dash;
    // the set is still computed so both dashes of a pair stay byte-identical
    // instead of one of them falling through to the single-dash comma path.
    const paired = new Set();
    if (all.length >= 2) {
      for (let i = 0; i + 1 < all.length; i += 2) {
        const a = all[i];
        const b = all[i + 1];
        const aside = masked.slice(a + 1, b);
        const tail = masked.slice(b + 1, seg.end);
        const head = masked.slice(seg.start, a);
        if (aside.trim() === "" || tail.trim() === "" || head.trim() === "") continue;
        if (/[.!?]\s/.test(aside)) continue;
        paired.add(a);
        paired.add(b);
      }
    }

    for (const idx of all) {
      const partner = paired.has(idx) ? idx : null;
      const verdict = classifyDash(masked, idx, seg, partner);

      // NO CHANGE. The former case (a) and the former case (c). No edit is
      // pushed and the dash is not counted, so the line stays byte-identical
      // and the run stays idempotent.
      if (verdict.kind === "skip") continue;

      // The replaced region never crosses a newline, so line structure holds.
      let start = idx;
      let end = idx + 1;
      while (start > 0 && /[ \t]/.test(masked[start - 1])) start--;
      while (end < masked.length && /[ \t]/.test(masked[end])) end++;

      const atLineEnd = end >= masked.length || masked[end] === "\n";
      const atLineStart = start === 0 || masked[start - 1] === "\n";
      // Only two marks remain, and only case (b) reaches the colon. The "pair"
      // kind is gone: a pair is a skip now, so the comma branch below is fed by
      // the single-dash comma verdict alone. Case (c) was the only producer of
      // a full stop and it is disabled, so no verdict writes one.
      const mark = verdict.kind === "colon" ? ":" : ",";

      if (atLineStart) {
        // A dash that opens a line is a list marker or a continuation. Leave the
        // leading whitespace alone and write the mark against the next word.
        edits.push({ start: idx, end, text: "" });
      } else {
        edits.push({ start, end, text: atLineEnd ? mark : mark + " " });
      }
      count++;
    }
  }
  return { edits, count };
}

// ===========================================================================
// SECTION 6. Transform 2. ALL-CAPS emphasis reduction.
// ===========================================================================

function isProtectedCaps(token, codeCaps) {
  if (token.length < 2) return true;
  if (/[0-9_]/.test(token)) return true;
  if (/^[IVXLCDM]+$/.test(token)) return true;
  if (ACRONYM_ALLOWLIST.has(token)) return true;
  if (PIPELINE_STATES.has(token)) return true;
  if (HTTP_VERBS.has(token)) return true;
  if (codeCaps.has(token)) return true;
  return false;
}

// NOT is an emphasis word on its own, and it is also half of the verdict token
// "NOT MET", which work_items.yaml writes as "MET/NOT MET". Lowercasing one half
// of a machine-readable verdict produces "MET/not MET", which is neither the
// verdict nor prose. True when the token beside NOT, across ONE space or ONE
// slash, is itself a protected ALL-CAPS token.
function joinsProtectedCaps(masked, start, end, codeCaps) {
  const left = /([A-Z][A-Z0-9_'-]*[A-Z0-9])[ /]$/.exec(masked.slice(0, start));
  const right = /^[ /]([A-Z][A-Z0-9_'-]*[A-Z0-9])/.exec(masked.slice(end));
  for (const m of [left, right]) {
    if (m && isProtectedCaps(m[1], codeCaps)) return true;
  }
  return false;
}

// True when the token opens a sentence, so the replacement keeps a capital.
function opensSentence(masked, start) {
  let i = start - 1;
  while (i >= 0 && /[\s*_`>[("'#]/.test(masked[i])) i--;
  if (i < 0) return true;
  if (masked[i] === "\n") return true;
  if (/[.!?:;]/.test(masked[i])) return true;
  // a list marker such as "- " or "1. "
  const lineStart = masked.lastIndexOf("\n", i) + 1;
  const head = masked.slice(lineStart, start);
  return /^[\s]*(?:[-*+]|\d+[.)])[\s*_`]*$/.test(head);
}

// True when this ONE token is an emphasis word that nothing protects.
function isConvertibleCaps(token, codeCaps) {
  if (token.includes("-")) {
    const parts = token.split("-");
    if (parts.length < 2) return false;
    if (!parts.every((p) => EMPHASIS_WORDS.has(p))) return false;
    return !parts.some((p) => isProtectedCaps(p, codeCaps));
  }
  return EMPHASIS_WORDS.has(token) && !isProtectedCaps(token, codeCaps);
}

// The transform works on a RUN, not on a token. A run is one or more ALL-CAPS
// tokens joined by a SINGLE SPACE, which is how a multi-word ALL-CAPS label is
// written. A token-by-token decision half-cases such a label: "MUST NOT" became
// "MUST not" and "NEVER ASK USER FOR PERMISSION" became "Never ASK USER FOR
// PERMISSION". Half a label reads worse than either whole form, so a run of two
// or more tokens is reduced ONLY when every token in it is convertible. One
// protected token, or one token that is not an emphasis word, freezes the whole
// run. A single isolated token keeps the original behaviour.
function transformCaps(text, codeCaps) {
  const masked = maskView(text, true);
  const edits = [];
  let count = 0;

  // The token scan reads the RAW text, not the masked view, so that a masked
  // neighbour still counts as a member of the run. "EVERY FAIL/REVISE/BLOCKED"
  // is one four-word run, but maskProtected blanks FAIL/REVISE/BLOCKED as a
  // path, and a scan of the masked view would see EVERY standing alone and
  // lowercase it. A masked token is protected by definition, so a run that
  // holds one is frozen whole.
  const toks = [];
  const re = /\b[A-Z][A-Z0-9_'-]*[A-Z0-9](?:'[A-Z]+)?\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    toks.push({ token: m[0], start, end, visible: masked.slice(start, end) === m[0] });
  }

  const runs = [];
  for (const t of toks) {
    const last = runs.length ? runs[runs.length - 1] : null;
    const prev = last ? last[last.length - 1] : null;
    if (prev && t.start === prev.end + 1 && text[prev.end] === " ") last.push(t);
    else runs.push([t]);
  }

  for (const run of runs) {
    // A run is joined by a space, so it cannot see across a slash. "MET/NOT MET"
    // needs the slash test as well, or the NOT half of the verdict is lowered.
    if (run.some((t) => t.token === "NOT" && joinsProtectedCaps(masked, t.start, t.end, codeCaps))) continue;
    if (!run.every((t) => t.visible && isConvertibleCaps(t.token, codeCaps))) continue;

    for (const t of run) {
      let replacement = t.token.toLowerCase();
      if (opensSentence(masked, t.start)) {
        replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      if (replacement === t.token) continue;
      edits.push({ start: t.start, end: t.end, text: replacement });
      count++;
    }
  }
  return { edits, count };
}

// ===========================================================================
// SECTION 7. Transform 3. Slash removal.
// ===========================================================================

// True when one side of a slash is an acronym, an initialism or a pipeline
// state. Such a token carries machine meaning, so " or " changes what the line
// says. The shape test is primary; the allowlists are a case-insensitive
// secondary test, so "Rest/GraphQL" written in prose case is caught too.
function isAcronymSide(side) {
  if (/^[A-Z0-9]{2,}$/.test(side)) return true;
  const up = side.toUpperCase();
  return ACRONYM_ALLOWLIST.has(up) || PIPELINE_STATES.has(up);
}

function transformSlash(text, codeSlashes) {
  const masked = maskView(text, true);
  const edits = [];
  let count = 0;
  const re = /\b([A-Za-z]{2,})\/([A-Za-z]{2,})\b/g;
  let m;
  while ((m = re.exec(masked)) !== null) {
    const whole = m[0];
    const start = m.index;
    const end = start + whole.length;
    if (text.slice(start, end) !== whole) continue;

    const before = start > 0 ? masked[start - 1] : "";
    const after = end < masked.length ? masked[end] : "";
    if (/[/.@\\:_~$-]/.test(before)) continue;
    if (/[/.@\\:_~$-]/.test(after)) continue;

    const lower = whole.toLowerCase();
    if (SLASH_KEEP.has(lower)) continue;
    if (codeSlashes.has(lower)) continue;
    if (DIRECTORY_WORDS.has(m[1].toLowerCase())) continue;
    if (DIRECTORY_WORDS.has(m[2].toLowerCase())) continue;
    // An ACRONYM PAIR or a PIPELINE-STATE PAIR is not a disjunction. FAIL/REVISE
    // names one loop, LTV/CAC names a ratio and the slash is a division, and
    // MET/NOT MET is one verdict. The caps transform already guards these; the
    // slash transform must guard them the same way or it undoes that work. The
    // ALL-CAPS SHAPE is the primary test, so an acronym that no list names is
    // still caught; the two allowlists are the secondary test and compare
    // case-insensitively.
    if (isAcronymSide(m[1]) || isAcronymSide(m[2])) continue;

    edits.push({ start, end, text: m[1] + " or " + m[2] });
    count++;
  }
  return { edits, count };
}

// ===========================================================================
// SECTION 8. Transform 4. The WI-011 substitution table.
// ===========================================================================

const SUB_ROWS = SUBSTITUTIONS.concat(INFLECTED_VERBS)
  .slice()
  .sort((a, b) => b.from.length - a.from.length);

// The deletion rows, as a plain set. The mention guard reads it.
const FILLER_WORDS = new Set(SUB_ROWS.filter((r) => r.to === "" && !r.opener).map((r) => r.from));

// Every word that this script's tables NAME, whether or not a row rewrites it.
// The parenthetical mention guard reads it.
const MENTION_SOURCES = new Set(
  SUB_ROWS.map((r) => r.from).concat(ADVISORY_ROWS.map((r) => r.from))
);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Keep the case of the source. A capital first letter stays a capital.
function matchCase(sample, replacement) {
  if (replacement === "") return "";
  if (/^[A-Z]/.test(sample)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

function transformWords(text) {
  const masked = maskView(text, true);
  const edits = [];
  const taken = [];
  let count = 0;

  const overlaps = (s, e) => taken.some((t) => s < t.end && e > t.start);

  // MENTION GUARD. A line that lists filler adverbs as bare comma-separated
  // items is NAMING them, not using them. .claude/rules/quality/anti-slop.md
  // holds exactly such a line. Deleting the words there destroys the meaning,
  // so no deletion runs on a line with two or more adjacent bare filler items.
  // A substitution row still runs on that line, and a filler adverb used inside
  // a sentence on any other line is still deleted.
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (off) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1;
    }
    return lo;
  };
  const mentionLines = new Set();
  masked.split("\n").forEach((line, i) => {
    const items = line.split(",").map((x) => x.trim().replace(/^[*_`"']+|[*_`"'.;:]+$/g, "").toLowerCase());
    let run = 0;
    for (const item of items) {
      if (FILLER_WORDS.has(item)) { run++; if (run >= 2) { mentionLines.add(i); return; } }
      else run = 0;
    }
  });
  const isMentionLine = (off) => mentionLines.has(lineOf(off));

  // MENTION GUARD, PARENTHETICAL FORM. The guard above covers the deletion rows
  // on a whole line. This one covers the SUBSTITUTION rows as well, and it is
  // scoped to the parenthetical, so the rest of the line is still rewritten.
  // A parenthetical that holds two or more BARE comma-separated table sources,
  // such as "(might, could potentially, perhaps, arguably)", is NAMING those
  // words. Rewriting one there collapses two distinct entries onto one token.
  const mentionSpans = [];
  {
    const re = /\(([^()\n]*)\)/g;
    let pm;
    while ((pm = re.exec(masked)) !== null) {
      const items = pm[1]
        .split(",")
        .map((x) => x.trim().replace(/^[*_`"']+|[*_`"'.;:]+$/g, "").toLowerCase());
      if (items.length < 2) continue;
      let named = 0;
      for (const item of items) {
        if (item !== "" && (MENTION_SOURCES.has(item) || HEDGE_NAMES.has(item))) named++;
      }
      if (named >= 2) mentionSpans.push([pm.index, pm.index + pm[0].length]);
    }
  }
  const inMentionSpan = (s, e) => mentionSpans.some(([a, b]) => s < b && e > a);

  for (const row of SUB_ROWS) {
    const pattern = row.from.split(" ").map(escapeRe).join("[ \\t\\n]+");
    const re = new RegExp("\\b" + pattern + "\\b", "gi");
    let m;
    while ((m = re.exec(masked)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      const actual = text.slice(start, end);
      if (actual !== m[0]) continue;
      if (actual === actual.toUpperCase() && /[A-Z]{2}/.test(actual)) continue;
      if (overlaps(start, end)) continue;
      if (inMentionSpan(start, end)) continue;

      // HYPHEN GUARD. A hyphenated compound is ONE word. A row that matches only
      // a component of one must not fire. It covers two shapes at once: a
      // filler adverb welded into a compound, where deleting it eats the space
      // in front and produces "the-rewritten", and a substitution row that
      // matches a component of a compound adjective, where "highest-leverage"
      // becomes "highest-use". One character on each side decides both.
      if (masked[start - 1] === "-" || masked[end] === "-") continue;

      // Guard: "rather than" is not the filler adverb "rather".
      if (row.from === "rather" && /^[ \t\n]+than\b/i.test(masked.slice(end))) continue;
      // Guard: "just" that means "at the same time as" or a quantity.
      if (row.from === "just" && /^[ \t\n]+(as|like|now|then|before|after|one|two|three|\d)\b/i.test(masked.slice(end))) continue;
      // Guard: never empty a bold or an italic span.
      if (row.to === "" && /[*_`]$/.test(masked.slice(0, start)) && /^[*_`]/.test(masked.slice(end))) continue;

      if (row.to === "") {
        // A filler adverb is deleted with one adjacent separator, so the
        // deletion never strands a doubled comma. M6 is safe here: the
        // word-choices file states that a filler adverb carries no meaning, and
        // no article, copula or other function word is ever a deletion row.
        if (isMentionLine(start)) continue;
        let dStart = start;
        let dEnd = end;
        let capNext = false;

        if (row.opener) {
          if (!opensSentence(masked, start)) continue;
          while (dEnd < masked.length && /[ \t]/.test(masked[dEnd])) dEnd++;
          capNext = true;
        } else {
          const afterComma = masked.slice(end).match(/^,[ \t]+/);
          const beforeComma = masked.slice(0, start).match(/,[ \t]+$/);
          if (afterComma && beforeComma) dStart = start - beforeComma[0].length;
          else if (afterComma) { dEnd = end + afterComma[0].length; capNext = opensSentence(masked, start); }
          else if (/^[ \t]/.test(masked.slice(end))) dEnd = end + 1;
          else if (/[ \t]$/.test(masked.slice(0, start))) dStart = start - 1;
          else continue;
        }

        const c = capNext ? text[dEnd] : null;
        const tail = c && /[a-z]/.test(c) ? c.toUpperCase() : null;
        const stop = dEnd + (tail ? 1 : 0);
        if (overlaps(dStart, stop)) continue;
        edits.push({ start: dStart, end: stop, text: tail || "" });
        taken.push({ start: dStart, end: stop });
        count++;
        continue;
      }

      edits.push({ start, end, text: matchCase(actual, row.to) });
      taken.push({ start, end });
      count++;
    }
  }
  return { edits, count };
}

// ===========================================================================
// SECTION 9. The file transform.
// ===========================================================================

// Run one transform to a FIXED POINT. One sweep can leave work behind when two
// edits sit next to each other, because applyEdits drops the second of an
// overlapping pair. Without the loop that leftover would be picked up by the
// NEXT --apply run, which would break idempotence. The cap is 8 sweeps.
const MAX_SWEEPS = 8;

// Run the WHOLE four-transform sequence to a fixed point as well.
//
// The em-dash classifier now has a NO-CHANGE verdict, and that introduced a
// cross-transform dependency the old code could not have: a dash that transform
// 1 leaves alone is still on the line when transform 4 rewrites a word beside
// it, and the new word can change the verdict. Two real corpus lines do exactly
// this, both by turning a word that is not in FINITE_VERBS into one that is:
//
//   determines -> finds   agents/operations-manager/resources/
//                         supply-chain-best-practices.md:109
//   utilized   -> used    agents/team-lead/resources/best-practices.md:47
//
// The first run left the dash, the NEXT run replaced it, and the corpus was not
// idempotent. Repeating the sequence until the text stops moving settles that
// inside one run. Two passes is the observed worst case; the cap is 4.
const MAX_PASSES = 4;

function runTransform(text, fn) {
  let work = text;
  let changed = false;
  for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
    const { edits } = fn(work);
    if (edits.length === 0) break;
    const { text: next, windows } = applyEdits(work, edits);
    const tidied = tidyRegions(next, windows);
    if (tidied === work) break;
    work = tidied;
    changed = true;
  }
  return { text: work, changed };
}

// Transform one file. Pure: no file IO, no console output. A unit test calls
// this directly. The return is byte-identical input when nothing applies.
function transformText(filePath, content, opts) {
  const options = opts || {};
  const skip = new Set(options.skip || []);
  const records = rules.classifyLines(filePath, content);
  const fenced = invariantFenceLines(filePath, content);
  const codeTokens = collectCodeTokens(content);
  const stats = { emdash: 0, caps: 0, slash: 0, words: 0 };

  // Group consecutive prose lines into a block, so a parenthetical pair that
  // wraps across two lines is still one pair.
  const blocks = [];
  let cur = null;
  for (const rec of records) {
    if (!rec.skipped && rec.kind === "prose" && !fenced.has(rec.n)) {
      if (!cur) { cur = { recs: [] }; blocks.push(cur); }
      cur.recs.push(rec);
    } else {
      cur = null;
    }
  }

  const out = records.map((r) => r.raw);
  for (const block of blocks) {
    const before = block.recs.map((r) => r.body).join("\n");
    let work = before;

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const passStart = work;
      if (!skip.has("emdash")) {
        const r = runTransform(work, (t) => { const x = transformDashes(t); stats.emdash += x.count; return x; });
        work = r.text;
      }
      if (!skip.has("caps")) {
        const r = runTransform(work, (t) => { const x = transformCaps(t, codeTokens.caps); stats.caps += x.count; return x; });
        work = r.text;
      }
      if (!skip.has("slash")) {
        const r = runTransform(work, (t) => { const x = transformSlash(t, codeTokens.slashes); stats.slash += x.count; return x; });
        work = r.text;
      }
      if (!skip.has("words")) {
        const r = runTransform(work, (t) => { const x = transformWords(t); stats.words += x.count; return x; });
        work = r.text;
      }
      if (work === passStart) break;
    }

    if (work === before) continue;
    const newLines = work.split("\n");
    if (newLines.length !== block.recs.length) {
      throw new Error(
        "mechanize: a transform changed the line count in " + filePath +
        " (" + block.recs.length + " -> " + newLines.length + "). No file was written."
      );
    }
    for (let i = 0; i < block.recs.length; i++) {
      const rec = block.recs[i];
      out[rec.n - 1] = rec.pre + newLines[i] + rec.post;
    }
  }

  const text = out.join("\n");
  if (text.split("\n").length !== content.split("\n").length) {
    throw new Error("mechanize: line count changed in " + filePath + ". No file was written.");
  }
  return { text, stats, changed: text !== content };
}

// Report the advisory rows that a human must resolve. It never edits.
function advisories(filePath, content) {
  const hits = [];
  for (const rec of rules.classifyLines(filePath, content)) {
    if (rec.skipped || rec.kind !== "prose") continue;
    const code = maskCode(rec.body);
    const quoted = maskQuotes(code);
    // M10. The em-dash transform SKIPS a dash inside a quoted example, so the
    // dash survives and a human has to decide. Report it here, or the skip is
    // invisible.
    for (let i = 0; i < code.length; i++) {
      if (!/[—–]/.test(code[i]) || quoted[i] !== MASK) continue;
      hits.push({ line: rec.n, word: "em dash in quoted text", note: "M10 freezes the wording; you decide" });
      break;
    }
    const masked = maskProtected(quoted);
    for (const row of ADVISORY_ROWS) {
      const re = new RegExp("\\b" + escapeRe(row.from) + "\\b", "gi");
      if (re.test(masked)) hits.push({ line: rec.n, word: row.from, note: row.note });
    }
  }
  return hits;
}

// ===========================================================================
// SECTION 10. Unified diff.
// ===========================================================================

// A transform never adds or removes a line, so the diff is a set of changed
// line numbers. This builds the hunks directly and needs no diff algorithm.
function unifiedDiff(relPath, before, after, contextLines) {
  const ctx = contextLines === undefined ? 3 : contextLines;
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length !== b.length) throw new Error("unifiedDiff: line count differs for " + relPath);

  const changed = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed.push(i);
  if (changed.length === 0) return "";

  const groups = [];
  let g = [changed[0]];
  for (let i = 1; i < changed.length; i++) {
    if (changed[i] - g[g.length - 1] <= ctx * 2) g.push(changed[i]);
    else { groups.push(g); g = [changed[i]]; }
  }
  groups.push(g);

  const parts = ["--- a/" + relPath, "+++ b/" + relPath];
  for (const grp of groups) {
    const start = Math.max(0, grp[0] - ctx);
    const end = Math.min(a.length - 1, grp[grp.length - 1] + ctx);
    const n = end - start + 1;
    const body = [];
    for (let i = start; i <= end; i++) {
      if (a[i] === b[i]) body.push(" " + a[i]);
      else { body.push("-" + a[i]); body.push("+" + b[i]); }
    }
    parts.push("@@ -" + (start + 1) + "," + n + " +" + (start + 1) + "," + n + " @@");
    parts.push(...body);
  }
  return parts.join("\n") + "\n";
}

// ===========================================================================
// SECTION 11. Path selection.
// ===========================================================================

const WALK_SKIP = new Set([".git", "node_modules", ".omc", "vendor_repos"]);

function walk(dir, root, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return acc; }
  for (const ent of entries) {
    if (WALK_SKIP.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, root, acc);
    else if (/\.(md|cjs|js|mjs)$/i.test(ent.name)) acc.push(path.relative(root, full).replace(/\\/g, "/"));
  }
  return acc;
}

function readExempt(root) {
  const file = path.join(root, "scripts", "ste100", "exempt.txt");
  const out = [];
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); } catch (e) { return out; }
  for (let line of raw.split("\n")) {
    line = line.replace(/\r$/, "");
    if (line === "" || line.startsWith("#")) continue;
    line = line.replace(/#.*$/, "").trim();
    if (line) out.push(line);
  }
  return out;
}

function resolveInputs(root, patterns, fromFile) {
  const candidates = [];
  if (fromFile) {
    const raw = fs.readFileSync(fromFile, "utf8");
    for (let line of raw.split("\n")) {
      line = line.replace(/\r$/, "").trim();
      if (line === "" || line.startsWith("#")) continue;
      candidates.push(line);
    }
  }
  let tree = null;
  for (const pat of patterns) {
    const abs = path.isAbsolute(pat) ? pat : path.join(root, pat);
    let st = null;
    try { st = fs.statSync(abs); } catch (e) { st = null; }
    if (st && st.isFile()) { candidates.push(path.relative(root, abs).replace(/\\/g, "/")); continue; }
    if (st && st.isDirectory()) { walk(abs, root, candidates); continue; }
    if (tree === null) tree = walk(root, root, []);
    const norm = pat.replace(/^\.\//, "");
    const hits = tree.filter((p) => rules.globMatch(p, norm));
    if (hits.length === 0) process.stderr.write("mechanize: WARNING no match for pattern: " + pat + "\n");
    candidates.push(...hits);
  }
  return Array.from(new Set(candidates.map((p) => p.replace(/^\.\//, "")))).sort();
}

// ===========================================================================
// SECTION 12. Command line.
// ===========================================================================

function usage(msg) {
  if (msg) process.stderr.write("mechanize: " + msg + "\n");
  process.stderr.write(
    "usage: node scripts/ste100/mechanize.cjs --dry-run|--apply <path|glob> [...]\n" +
    "       node scripts/ste100/mechanize.cjs --from-file <list.txt> --dry-run|--apply\n" +
    "       flags: --root <dir> --no-exempt --skip-transform <name> --stats --quiet\n" +
    "       --skip-transform takes emdash or caps, and only ADDS to the skip set.\n" +
    "       slash and words are DROPPED per decision D6: they start in the skip\n" +
    "       set and no flag makes them reachable from the command line.\n"
  );
  return 2;
}

function main(argv) {
  let mode = "";
  let fromFile = "";
  let root = REPO_ROOT;
  let useExempt = true;
  let stats = false;
  let quiet = false;
  // DECISION D6. The skip set STARTS with slash and words in it, so neither
  // transform is reachable from the command line. --skip-transform may only ADD
  // a name; no flag removes one.
  const skip = ["slash", "words"];
  const patterns = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") mode = "dry-run";
    else if (arg === "--apply") mode = "apply";
    else if (arg === "--from-file") { fromFile = argv[++i] || ""; if (!fromFile) return usage("--from-file needs a path"); }
    else if (arg === "--root") { root = path.resolve(argv[++i] || ""); }
    else if (arg === "--no-exempt") useExempt = false;
    else if (arg === "--stats") stats = true;
    else if (arg === "--quiet") quiet = true;
    else if (arg === "--skip-transform") {
      const name = argv[++i] || "";
      if (!TRANSFORMS.includes(name)) return usage("unknown transform: " + name);
      skip.push(name);
    } else if (arg === "-h" || arg === "--help") return usage("");
    else if (arg.startsWith("--")) return usage("unknown flag " + arg);
    else patterns.push(arg);
  }

  if (!mode) return usage("pass --dry-run or --apply");
  if (!fromFile && patterns.length === 0) return usage("no inputs. Pass paths or globs, or --from-file <path>");
  if (fromFile && !fs.existsSync(fromFile)) return usage("--from-file not found: " + fromFile);

  const exempt = useExempt ? readExempt(root) : [];
  const inputs = resolveInputs(root, patterns, fromFile);

  const files = [];
  let skippedExempt = 0;
  let skippedMissing = 0;
  for (const rel of inputs) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { skippedMissing++; continue; }
    if (HARD_EXCLUDE.includes(rel) || exempt.some((g) => rules.globMatch(rel, g))) {
      skippedExempt++;
      if (!quiet) process.stderr.write("mechanize: skip (exempt) " + rel + "\n");
      continue;
    }
    files.push(rel);
  }

  process.stderr.write(
    "mechanize: " + files.length + " file(s) to process (exempt-skipped " +
    skippedExempt + ", missing " + skippedMissing + ")\n"
  );

  const total = { emdash: 0, caps: 0, slash: 0, words: 0 };
  let changedFiles = 0;
  const advice = [];

  for (const rel of files) {
    const abs = path.join(root, rel);
    let content;
    try { content = fs.readFileSync(abs, "utf8"); }
    catch (e) { process.stderr.write("mechanize: WARNING unreadable " + rel + "\n"); continue; }

    let result;
    try { result = transformText(rel, content, { skip }); }
    catch (e) { process.stderr.write("mechanize: ERROR " + e.message + "\n"); return 1; }

    for (const k of TRANSFORMS) total[k] += result.stats[k];
    if (stats) for (const a of advisories(rel, content)) advice.push(rel + ":" + a.line + ": " + a.word + " (" + a.note + ")");

    if (!result.changed) continue;
    changedFiles++;
    if (mode === "dry-run") process.stdout.write(unifiedDiff(rel, content, result.text));
    else fs.writeFileSync(abs, result.text, "utf8");
  }

  process.stderr.write(
    "mechanize: " + mode + " finished. " + changedFiles + " file(s) changed. " +
    "em-dash " + total.emdash + ", caps " + total.caps + ", slash " + total.slash +
    ", words " + total.words + "\n"
  );
  if (stats && advice.length) {
    process.stderr.write("mechanize: " + advice.length + " advisory hit(s) that need a human:\n");
    for (const a of advice) process.stderr.write("  " + a + "\n");
  }
  return 0;
}

module.exports = {
  transformText,
  invariantFenceLines,
  unifiedDiff,
  advisories,
  maskProtected,
  maskView,
  collectCodeTokens,
  splitSegments,
  isIndependentClause,
  canTakeFullStop,
  ACRONYM_ALLOWLIST,
  PIPELINE_STATES,
  HTTP_VERBS,
  EMPHASIS_WORDS,
  SLASH_KEEP,
  DIRECTORY_WORDS,
  FINITE_VERBS,
  NON_STARTERS,
  SUBSTITUTIONS,
  INFLECTED_VERBS,
  ADVISORY_ROWS,
  HARD_EXCLUDE,
  TRANSFORMS,
};

if (require.main === module) process.exit(main(process.argv.slice(2)));
