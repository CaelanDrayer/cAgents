"use strict";
//
// ste100 rule engine — the SINGLE place any STE-100 check is implemented.
//
// CONTRACT
//   check(filePath, content) -> [{ line, check, message }]
//
//   Pure. No process.exit, no console output, no file IO. The exported function
//   is require-able in-process, so scripts/ci/validate-ste100.sh and a hook
//   share one implementation and cannot drift apart (controller decision CD-3).
//
// CD-7 TRAP 1 — mawk 1.3.4 reads the interval -{3,} as ONE literal dash, so an
//   awk line classifier silently voids every markdown bullet. Proven on this
//   box: echo 'a-b' | awk '/-{3,}/{print "M"}' prints M. ALL line
//   classification therefore lives in this file, in JavaScript, never in awk.
//
// CD-7 TRAP 2 — .claude/hooks/hook-utils.cjs holds a literal NUL byte. GNU grep
//   calls the file binary and emits nothing for it, which cost the survey 79 em
//   dashes and 779 comment lines. This engine never shells to grep; the caller
//   hands it bytes read with fs.readFileSync and NUL is one more character.
//   countedLines() is exported so that fact stays provable.
//
// WHAT IS NOT MEASURED
//   fenced code blocks (tracked per file, so an unbalanced fence cannot leak
//   into the next file), inline code spans, YAML frontmatter, headings, table
//   rows, horizontal rules. For .cjs/.js/.mjs: everything except comment lines.
//
// -----------------------------------------------------------------------------

const MASK = "·"; // masked character: never a letter, digit, quote or dot

const CHECKS = {
  SENTENCE_20: "sentence-20-procedural",
  SENTENCE_25: "sentence-25-descriptive",
  EM_DASH: "em-dash",
  PARAGRAPH_6: "paragraph-6",
  NOUN_CLUSTER: "noun-cluster-3",
  PASSIVE: "passive-voice",
  DESCRIPTION: "description-budget",
};

const LIMITS = {
  procedural_words: 20,
  descriptive_words: 25,
  paragraph_sentences: 6,
  noun_cluster: 3,
  // CD-12: two-tier. 400 when the description carries a mode roster, else 300.
  // A single number either fails compliant mode-bearing agents or gates nothing.
  description_base: 300,
  description_mode: 400,
};

const RE_MODE_BEARING = /Modes?:|metadata\.mode|mode=<value>/;

const RE_CODE_FILE = /\.(cjs|js|mjs)$/i;
const RE_COMMENT = /^\s*(\/\/|\/\*|\*)/;
const RE_FENCE = /^\s*(```|~~~)/;
const RE_HEADING = /^\s*#{1,6}(\s|$)/;
const RE_TABLE = /^\s*\|/;
const RE_HR = /^\s*(-{3,}|\*{3,}|_{3,}|={3,})\s*$/;
const RE_HTML = /^\s*<!--/;
const RE_LIST = /^(\s*)([-*+]|\d+[.)])\s+/;
const RE_TASKBOX = /^\[[ xX]\]\s*/;
const RE_QUOTEMARK = /^\s*>\s?/;

// Metrics-harness stoplist, reproduced verbatim from scripts/ste100/metrics.sh
// so the noun-cluster heuristic here and the corpus number there agree.
const STOP = new Set(
  ("a an the of in on at to for with by from as and or but nor so yet " +
   "is are was were be been being am that this these those it its if then than not no per " +
   "via into onto over under above below about up down out off through during before after " +
   "between within without across against when where which who whom whose what why how all " +
   "any each every both few more most other some such only own same too very can will just " +
   "should now do does did has have had may might must shall would could you your we our " +
   "they their he she his her i me my them us").split(" ")
);

// A sentence is PROCEDURAL when it is an imperative — STE-100 M4 ("Start each
// instruction with the verb"). Everything else is descriptive and gets the
// looser 25-word cap. A closed list, so a noun is never read as a command.
const IMPERATIVE = new Set(
  ("abort accept add allow always append apply ask assert assign assume avoid " +
   "bind break build bump call cancel capture change check choose clear close collect " +
   "commit compare compute configure confirm consider consult continue copy count cover create " +
   "declare define delegate delete deploy derive describe disable discard dispatch do document drop " +
   "edit emit enable end enforce ensure enter escalate exclude execute exit expand explain export extract " +
   "fetch fill filter find finish fix flag flush fold follow force format gather generate get give go grep group " +
   "handle hold honor honour identify ignore implement import include increment index initialize insert inspect install invoke " +
   "join keep kill know label land launch leave let limit link list load lock log look make map mark match measure merge " +
   "migrate mind modify monitor move name narrow note obey omit open order override " +
   "pack parse pass pause pick pin pipe place plan point poll pop prefer prepare preserve press prevent print proceed " +
   "produce prove provide pull push put query queue quote raise read rebuild recheck record redirect reduce refer refuse " +
   "register reject release reload remember remove rename render repair repeat replace report request require rerun reset " +
   "resolve restart restore retain retry return reuse review revert rewrite roll route run save say scan search see select " +
   "send separate serve set shorten show shut sign skip sort spawn specify split stage start state stop store strip submit " +
   "substitute summarize summarise support suppress swap sweep switch sync tag take tell terminate test throw tie toggle " +
   "trace track translate treat trim trust try turn type unblock undo unpack update upgrade use validate verify view wait " +
   "walk want warn watch weigh widen wire withdraw work wrap write yield").split(" ")
);

const RE_LEAD_COND = /^(if|when|where|before|after|once|unless|while|to)\b[^,]{0,120},\s*(.+)$/i;
const RE_LEAD_NEG = /^(do not|don't|never|always|also|then|first|next|finally|please|instead|rather|only|still|otherwise)\s+(.+)$/i;
const RE_SUBORDINATOR = /\b(that|which|when|where|because|while|whose|who|whom|if|unless|since|although|though)\b/i;
const RE_PASSIVE = /\b(is|are|was|were|be|been|being)\s+([a-z]+(?:ed|en))\b/;
const RE_ABBREV = /(^|[\s(\[])(e\.g|i\.e|etc|vs|cf|approx|resp|al|no|fig|eq|ref|inc|ltd|jr|sr|st|dr|mr|mrs|ms|prof|a\.m|p\.m|[A-Za-z])\.$/;

// --- masking: length-preserving, so every character offset stays valid -------
function blank(s) {
  return s.replace(/\S/g, MASK);
}

// Inline code spans. Masked BEFORE sentence splitting, because a span such as
// `foo.md` would otherwise read as a sentence boundary.
function maskCode(line) {
  return line.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, blank);
}

// Quoted example text. Masked AFTER sentence splitting, because a quoted
// sentence still ends a sentence, and only for the pattern checks: M10 protects
// a quoted example from rewriting, so the em dash, passive and noun-cluster
// patterns must not fire inside one. The word count keeps the tokens.
function maskQuotes(text) {
  return text.replace(/"[^"\n]*"/g, blank).replace(/“[^”\n]*”/g, blank);
}

// --- shared line classification ----------------------------------------------
// The ONE walk over a file's lines. Every consumer uses it (the em-dash check
// below, and scripts/ste100/mechanize.cjs), so the answer to "what is masked"
// is written once and cannot drift. Each record carries:
//
//   n        1-based line number
//   raw      the line exactly as read
//   skipped  true when this engine reads nothing on the line
//   kind     frontmatter | fence | fenced | code | heading | table | hr |
//            html | blank | prose
//   text     what this engine reads (the comment body in a code file, else raw)
//   pre, body, post   pre + body + post === raw, so a rewriter may edit body
//                     alone and never disturb a comment marker
//
// A rewriter must touch only kind === "prose". A heading is byte-frozen by
// invariant 1 in scripts/ste100/invariants.sh, and a table row carries column
// structure, so both are reported here and edited by nobody.
function classifyLines(filePath, content) {
  const isCode = RE_CODE_FILE.test(String(filePath).replace(/\\/g, "/"));
  const lines = String(content).split("\n");
  const out = [];
  let inFence = false;
  let fenceMark = "";
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const rec = { n: i + 1, raw, skipped: true, kind: "", text: "", pre: "", body: "", post: "" };

    if (!isCode) {
      if (i === 0 && /^---\s*$/.test(raw)) {
        inFrontmatter = true;
        rec.kind = "frontmatter";
        out.push(rec);
        continue;
      }
      if (inFrontmatter) {
        if (/^---\s*$/.test(raw)) inFrontmatter = false;
        rec.kind = "frontmatter";
        out.push(rec);
        continue;
      }
    }

    let text = raw;
    if (isCode) {
      if (!RE_COMMENT.test(raw)) { rec.kind = "code"; out.push(rec); continue; }
      text = raw
        .replace(/^\s*\/\*+/, "")
        .replace(/^\s*\/\//, "")
        .replace(/^\s*\*+\/?/, "");
    }

    const fence = RE_FENCE.exec(text);
    if (fence) {
      if (!inFence) { inFence = true; fenceMark = fence[1]; }
      else if (fence[1] === fenceMark) { inFence = false; fenceMark = ""; }
      rec.kind = "fence";
      out.push(rec);
      continue;
    }
    if (inFence) { rec.kind = "fenced"; out.push(rec); continue; }

    rec.skipped = false;
    rec.text = text;
    rec.pre = raw.slice(0, raw.length - text.length);
    const tail = isCode ? text.match(/\*\/\s*$/) : null;
    rec.post = tail ? tail[0] : "";
    rec.body = rec.post ? text.slice(0, text.length - rec.post.length) : text;

    if (text.trim() === "") rec.kind = "blank";
    else if (RE_HR.test(text)) rec.kind = "hr";
    else if (RE_HEADING.test(text)) rec.kind = "heading";
    else if (RE_TABLE.test(text)) rec.kind = "table";
    else if (RE_HTML.test(text)) rec.kind = "html";
    else rec.kind = "prose";
    out.push(rec);
  }
  return out;
}

// --- sentence splitting ------------------------------------------------------
function splitSentences(text) {
  const out = [];
  const re = /([.!?]+)(["'”’)\]*_`]*)(\s+|$)/g;
  let start = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const endIdx = m.index + m[1].length + m[2].length;
    const rest = text.slice(endIdx + m[3].length);
    const atEnd = rest.trim() === "";
    if (!atEnd && !/^[A-Z0-9"'(\[*_`·“#<•]/.test(rest)) continue;
    const chunk = text.slice(start, endIdx);
    if (!atEnd && RE_ABBREV.test(chunk)) continue;
    if (chunk.trim()) out.push({ start, end: endIdx, text: chunk.trim() });
    start = endIdx + m[3].length;
  }
  if (start < text.length && text.slice(start).trim()) {
    out.push({ start, end: text.length, text: text.slice(start).trim() });
  }
  return out;
}

function wordCount(s) {
  const t = s.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

function isProcedural(sentence) {
  let t = sentence.replace(/^[\s*_`>"'(\[·•-]+/, "");
  const cond = t.match(RE_LEAD_COND);
  if (cond) t = cond[2];
  const neg = t.match(RE_LEAD_NEG);
  if (neg) t = neg[2];
  const w = t.match(/^([A-Za-z][A-Za-z'-]*)/);
  return w ? IMPERATIVE.has(w[1].toLowerCase()) : false;
}

// Verbatim port of the metrics.sh noun-pile heuristic: maximal runs of 4 or
// more consecutive qualifying tokens, one hit per run. A token qualifies when
// it is pure lowercase ASCII and is not a function word.
function nounClusterRuns(text) {
  const toks = text.split(/\s+/);
  const hits = [];
  let run = 0;
  let runStart = 0;
  for (let i = 0; i < toks.length; i++) {
    if (/^[a-z]+$/.test(toks[i]) && !STOP.has(toks[i])) {
      if (run === 0) runStart = i;
      run++;
      continue;
    }
    if (run >= 4) hits.push(toks.slice(runStart, runStart + run).join(" "));
    run = 0;
  }
  if (run >= 4) hits.push(toks.slice(runStart, runStart + run).join(" "));
  return hits;
}

// A **Run-in heading.** that opens a paragraph is a heading, not a sentence.
// Headings are already out of scope, so strip it before the sentence count.
function stripRunInHeading(text) {
  const m = text.match(/^\*\*([^*]{1,160}?[.:!?])\*\*\s*/);
  return m ? " ".repeat(m[0].length) + text.slice(m[0].length) : text;
}

// --- paragraph assembly ------------------------------------------------------
// A paragraph is a contiguous run of prose lines, and each list item is its own
// paragraph. Every paragraph keeps an offset-to-line map, so a violation can
// name the line that carries it.
function collectParagraphs(filePath, content) {
  const isCode = RE_CODE_FILE.test(filePath);
  const lines = content.split("\n");
  const paragraphs = [];
  let cur = null;
  let counted = 0;
  let inFence = false;
  let fenceMark = "";
  let inFrontmatter = false;

  const flush = () => {
    if (cur && cur.parts.length) paragraphs.push(cur);
    cur = null;
  };
  const push = (n, text) => {
    if (!cur) cur = { parts: [], firstLine: n };
    cur.parts.push({ n, text });
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;

    if (!isCode) {
      if (i === 0 && /^---\s*$/.test(raw)) { inFrontmatter = true; continue; }
      if (inFrontmatter) { if (/^---\s*$/.test(raw)) inFrontmatter = false; continue; }
    }

    let text = raw;
    if (isCode) {
      if (!RE_COMMENT.test(raw)) continue;
      text = raw
        .replace(/^\s*\/\*+/, "")
        .replace(/^\s*\/\//, "")
        .replace(/^\s*\*+\/?/, "")
        .replace(/\*\/\s*$/, "");
    }

    const fence = RE_FENCE.exec(text);
    if (fence) {
      if (!inFence) { inFence = true; fenceMark = fence[1]; }
      else if (fence[1] === fenceMark) { inFence = false; fenceMark = ""; }
      flush();
      continue;
    }
    if (inFence) continue;

    counted++;
    text = text.replace(RE_QUOTEMARK, "");
    if (text.trim() === "") { flush(); continue; }
    if (RE_HR.test(text)) { flush(); continue; }
    if (RE_HEADING.test(text)) { flush(); continue; }
    if (RE_TABLE.test(text)) { flush(); continue; }
    if (RE_HTML.test(text)) { flush(); continue; }

    const li = RE_LIST.exec(text);
    if (li) {
      flush();
      text = text.slice(li[0].length).replace(RE_TASKBOX, "");
    }
    push(lineNo, text.trim());
  }
  flush();

  for (const p of paragraphs) {
    let off = 0;
    p.map = [];
    const rebuilt = [];
    for (const part of p.parts) {
      const masked = maskCode(part.text);
      if (rebuilt.length) off += 1;
      p.map.push({ offset: off, line: part.n });
      rebuilt.push(masked);
      off += masked.length;
    }
    p.text = rebuilt.join(" ");
  }
  return { paragraphs, countedLines: counted };
}

function lineAt(p, offset) {
  let line = p.firstLine;
  for (const e of p.map) {
    if (e.offset <= offset) line = e.line;
    else break;
  }
  return line;
}

// Exported for the CD-7 TRAP 2 proof: a NUL-carrying file must report a
// non-zero count here, because this engine reads bytes and never calls grep.
function countedLines(filePath, content) {
  return collectParagraphs(String(filePath).replace(/\\/g, "/"), String(content)).countedLines;
}

// --- em dash: every counted line, code spans masked ---------------------------
function emDashViolations(filePath, content) {
  const out = [];
  for (const rec of classifyLines(filePath, content)) {
    if (rec.skipped) continue;
    const n = (maskCode(rec.text).match(/—/g) || []).length;
    if (n > 0) {
      out.push({
        line: rec.n,
        check: CHECKS.EM_DASH,
        message: n + " em dash" + (n === 1 ? "" : "es") +
          " (U+2014) in instructional prose. M7 bans it. Use a comma, a full stop or a colon.",
      });
    }
  }
  return out;
}

// --- agent description budget (CD-12, two-tier) -------------------------------
const RE_AGENT_PATH = /(^|\/)agents\/[^/]+\.md$/;

function descriptionViolations(filePath, content) {
  if (!RE_AGENT_PATH.test(filePath)) return [];
  const lines = content.split("\n");
  if (!/^---\s*$/.test(lines[0] || "")) return [];
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (/^---\s*$/.test(lines[i])) { end = i; break; }
  }
  if (end === -1) return [];

  let keyLine = -1;
  let value = null;
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^description:\s*(.*)$/);
    if (!m) continue;
    keyLine = i + 1;
    let v = m[1].trim();
    if (/^[>|][-+]?$/.test(v)) {
      const buf = [];
      for (let j = i + 1; j < end; j++) {
        if (lines[j].trim() === "") { buf.push(""); continue; }
        if (!/^\s+\S/.test(lines[j])) break;
        buf.push(lines[j].trim());
      }
      v = buf.join(" ").trim();
    } else if (/^".*"$/.test(v)) v = v.slice(1, -1);
    else if (/^'.*'$/.test(v)) v = v.slice(1, -1);
    value = v;
    break;
  }
  if (value === null) return [];

  const modeBearing = RE_MODE_BEARING.test(value);
  const limit = modeBearing ? LIMITS.description_mode : LIMITS.description_base;
  if (value.length <= limit) return [];
  return [{
    line: keyLine,
    check: CHECKS.DESCRIPTION,
    message: "agent description is " + value.length + " characters, over the " + limit +
      "-character budget for a " + (modeBearing ? "mode-bearing" : "plain") +
      " agent. CD-12 sets 400 when the description carries a mode roster, and 300 when it does not.",
  }];
}

function excerpt(s) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= 72 ? t : t.slice(0, 69) + "...";
}

// --- the exported check -------------------------------------------------------
function check(filePath, content) {
  const path = String(filePath).replace(/\\/g, "/");
  const text = String(content);
  const violations = [];

  violations.push(...emDashViolations(path, text));
  violations.push(...descriptionViolations(path, text));

  const { paragraphs } = collectParagraphs(path, text);
  for (const p of paragraphs) {
    const sentences = splitSentences(stripRunInHeading(p.text));
    if (sentences.length === 0) continue;

    if (sentences.length > LIMITS.paragraph_sentences) {
      violations.push({
        line: p.firstLine,
        check: CHECKS.PARAGRAPH_6,
        message: "paragraph has " + sentences.length + " sentences, over the " +
          LIMITS.paragraph_sentences + "-sentence cap (M9). Split it, or use a list.",
      });
    }

    for (const s of sentences) {
      const line = lineAt(p, s.start);
      const words = wordCount(s.text);
      const procedural = isProcedural(s.text);
      const masked = maskQuotes(s.text);

      if (procedural && words > LIMITS.procedural_words) {
        violations.push({
          line,
          check: CHECKS.SENTENCE_20,
          message: "procedural sentence has " + words + " words, over the " +
            LIMITS.procedural_words + "-word cap (M3): " + excerpt(s.text),
        });
      } else if (!procedural && words > LIMITS.descriptive_words) {
        violations.push({
          line,
          check: CHECKS.SENTENCE_25,
          message: "descriptive sentence has " + words + " words, over the " +
            LIMITS.descriptive_words + "-word cap (M3): " + excerpt(s.text),
        });
      }

      if (procedural) {
        const pm = masked.split(RE_SUBORDINATOR)[0].match(RE_PASSIVE);
        if (pm) {
          violations.push({
            line,
            check: CHECKS.PASSIVE,
            message: "passive voice " + pm[0] +
              " in an instruction. M4 asks for the active voice and the imperative.",
          });
        }
      }

      for (const run of nounClusterRuns(masked)) {
        violations.push({
          line,
          check: CHECKS.NOUN_CLUSTER,
          message: "noun cluster of " + run.split(/\s+/).length + " nouns, over the cap of " +
            LIMITS.noun_cluster + ": " + run + ". Break it with prepositions.",
        });
      }
    }
  }

  violations.sort((a, b) => a.line - b.line || a.check.localeCompare(b.check));
  return violations;
}

// Bash-style glob match. A * crosses /, which is the semantics that
// scripts/ste100/metrics.sh documents for exempt.txt.
function globMatch(path, glob) {
  const re = new RegExp("^" +
    glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
  return re.test(path);
}

// `masking` is the shared surface for a rewriter. scripts/ste100/mechanize.cjs
// imports it so that the checker and the rewriter agree, character for
// character, on what is prose and what is protected.
module.exports = {
  check,
  countedLines,
  globMatch,
  classifyLines,
  masking: { MASK, blank, maskCode, maskQuotes, IMPERATIVE },
  CHECKS,
  LIMITS,
};
