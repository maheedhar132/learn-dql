import { findMatcher, allMatcherNamesPattern, type DplMatcher } from "./matchers";

/**
 * DPL pattern executor.
 *
 * A DPL pattern is a sequence of:
 *   - literal text (matched verbatim, whitespace is forgiving)
 *   - matchers `TYPE`            → matched and discarded
 *   - matchers `TYPE:fieldName`  → matched and bound to a named field
 *
 * Example pattern:  `'Failed login from IP:attacker_ip for user:user_name'`
 * Example input:    `'Failed login from 10.0.0.5 for alice'`
 * Result:           `{ attacker_ip: "10.0.0.5", user_name: "alice" }`
 *
 * This is a pragmatic subset of the official DPL grammar. It does not yet
 * support: alternatives groups `(A|B)`, sequence groups `(...)`, modifiers
 * `(parse:value)`, JSON path, KVP, arrays, structures, or macros. Add them
 * here as scenarios need them. The authoritative grammar lives in
 * `.ai/docs/dpl/grammar.md`.
 */

export interface DplCompileResult {
  regex: RegExp;
  /** Field names extracted, in pattern order. */
  fields: string[];
  /** Matcher used for each field (parallel to `fields`). */
  matchers: DplMatcher[];
}

export interface DplParseResult {
  matched: boolean;
  fields: Record<string, string | number | boolean | null>;
  /** True if every named matcher in the pattern produced a value. */
  complete: boolean;
}

export class DplCompileError extends Error {
  constructor(message: string, public readonly position?: number) {
    super(message);
    this.name = "DplCompileError";
  }
}

const TOKEN_PATTERN_SOURCE = (() => {
  const matcherNames = allMatcherNamesPattern();
  // Tokens we recognize at the top level of a pattern:
  //   1. A matcher with optional :fieldName binding   →  e.g. INT:count, IPADDR
  //   2. Quoted string literal                         →  e.g. "Failed login"
  //   3. Whitespace                                    →  collapsed to flexible \s+
  //   4. Any other run of non-special characters       →  literal text
  return [
    `(?<matcher>(?:${matcherNames})(?::[A-Za-z_][A-Za-z0-9_]*)?)`,
    `(?<quoted>"(?:[^"\\\\]|\\\\.)*")`,
    `(?<ws>\\s+)`,
    `(?<literal>[^\\s"A-Z]+|[A-Z](?!(?:${matcherNames})\\b))`,
  ].join("|");
})();

const TOKEN_RE = new RegExp(TOKEN_PATTERN_SOURCE, "g");

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile a DPL pattern into a JS regex with named capture groups.
 * Throws DplCompileError on malformed input.
 */
export function compilePattern(pattern: string): DplCompileResult {
  if (typeof pattern !== "string" || pattern.length === 0) {
    throw new DplCompileError("Pattern is empty");
  }

  let regexSource = "";
  const fields: string[] = [];
  const matchers: DplMatcher[] = [];
  const seen = new Set<string>();

  TOKEN_RE.lastIndex = 0;
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(pattern)) !== null) {
    if (match.index > lastEnd) {
      // Untokenized residue — treat as literal
      regexSource += escapeRegex(pattern.slice(lastEnd, match.index));
    }
    lastEnd = match.index + match[0].length;

    const groups = match.groups ?? {};

    if (groups.matcher) {
      const [typeName, fieldName] = groups.matcher.split(":");
      const matcher = findMatcher(typeName);
      if (!matcher) {
        throw new DplCompileError(`Unknown matcher type: ${typeName}`, match.index);
      }
      if (fieldName) {
        if (seen.has(fieldName)) {
          throw new DplCompileError(`Duplicate field binding: ${fieldName}`, match.index);
        }
        seen.add(fieldName);
        fields.push(fieldName);
        matchers.push(matcher);
        regexSource += `(?<${fieldName}>${matcher.regex})`;
      } else {
        regexSource += `(?:${matcher.regex})`;
      }
    } else if (groups.quoted) {
      // Strip surrounding quotes, unescape \", treat as literal
      const literal = groups.quoted
        .slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      regexSource += escapeRegex(literal);
    } else if (groups.ws) {
      regexSource += "\\s+";
    } else if (groups.literal) {
      regexSource += escapeRegex(groups.literal);
    }
  }

  if (lastEnd < pattern.length) {
    regexSource += escapeRegex(pattern.slice(lastEnd));
  }

  if (fields.length === 0) {
    throw new DplCompileError("Pattern has no field bindings (TYPE:name) — nothing would be extracted.");
  }

  return {
    regex: new RegExp(regexSource),
    fields,
    matchers,
  };
}

/**
 * Apply a compiled pattern (or raw pattern string) to one input line.
 */
export function parseLine(pattern: string | DplCompileResult, input: string): DplParseResult {
  const compiled = typeof pattern === "string" ? compilePattern(pattern) : pattern;
  const m = compiled.regex.exec(input);
  if (!m || !m.groups) {
    return { matched: false, fields: {}, complete: false };
  }

  const out: Record<string, string | number | boolean | null> = {};
  for (let i = 0; i < compiled.fields.length; i++) {
    const name = compiled.fields[i];
    const matcher = compiled.matchers[i];
    const raw = m.groups[name];
    out[name] = raw === undefined ? null : coerce(raw, matcher);
  }
  return { matched: true, fields: out, complete: Object.values(out).every((v) => v !== null) };
}

/**
 * Apply a pattern to an array of input lines and return per-line results.
 */
export function parseLines(pattern: string, inputs: string[]): DplParseResult[] {
  const compiled = compilePattern(pattern);
  return inputs.map((line) => parseLine(compiled, line));
}

function coerce(raw: string, matcher: DplMatcher): string | number | boolean {
  switch (matcher.resultType) {
    case "long": {
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) ? n : raw;
    }
    case "double": {
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : raw;
    }
    case "boolean":
      return raw.toLowerCase() === "true";
    case "json":
      return raw; // keep as string; caller decides whether to JSON.parse
    case "ip":
    case "timestamp":
    case "string":
    default:
      return raw;
  }
}

/**
 * Validate a player's pattern against an expected reference: do they extract
 * the same field set with equivalent values across the provided inputs?
 *
 * Used by scenario validators. Returns a structured diagnosis so the UI can
 * show "you're missing field X" or "field Y didn't match the expected value".
 */
export interface PatternEquivalenceResult {
  ok: boolean;
  missingFields: string[];
  extraFields: string[];
  mismatchedLines: Array<{ index: number; expected: Record<string, unknown>; actual: Record<string, unknown> }>;
}

export function comparePatterns(
  playerPattern: string,
  expectedPattern: string,
  inputs: string[],
): PatternEquivalenceResult {
  const expected = parseLines(expectedPattern, inputs);
  let player: DplParseResult[];
  try {
    player = parseLines(playerPattern, inputs);
  } catch {
    return {
      ok: false,
      missingFields: compilePattern(expectedPattern).fields,
      extraFields: [],
      mismatchedLines: [],
    };
  }

  const expectedFields = new Set(compilePattern(expectedPattern).fields);
  const playerFields = new Set(compilePattern(playerPattern).fields);

  const missingFields = [...expectedFields].filter((f) => !playerFields.has(f));
  const extraFields = [...playerFields].filter((f) => !expectedFields.has(f));

  const mismatchedLines: PatternEquivalenceResult["mismatchedLines"] = [];
  for (let i = 0; i < inputs.length; i++) {
    const e = expected[i].fields;
    const p = player[i].fields;
    const mismatch = [...expectedFields].some((f) => String(e[f] ?? "") !== String(p[f] ?? ""));
    if (mismatch) {
      mismatchedLines.push({ index: i, expected: e, actual: p });
    }
  }

  return {
    ok: missingFields.length === 0 && mismatchedLines.length === 0,
    missingFields,
    extraFields,
    mismatchedLines,
  };
}
