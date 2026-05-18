/**
 * DPL matcher registry — the TYPE keywords that appear in DPL patterns.
 *
 * Each matcher exposes a regex fragment that, when wrapped in a named-capture
 * group, matches one logical token in a log line. This is intentionally a
 * pragmatic subset of Dynatrace's full DPL grammar — it covers the matchers
 * used across our learning scenarios. The authoritative reference is in
 * `.ai/docs/dpl/`.
 */
export interface DplMatcher {
  /** Canonical name as it appears in a DPL pattern (uppercase). */
  name: string;
  /** Common aliases (also uppercase). */
  aliases?: string[];
  /**
   * Regex source (without delimiters or flags) that matches one instance of
   * this token. Must NOT contain capturing groups — use `(?:...)` for grouping.
   */
  regex: string;
  /** Inferred result type if the matcher binds to a field. */
  resultType: "string" | "long" | "double" | "boolean" | "timestamp" | "ip" | "json";
  /** Plain-English description for ExplainerCards / UI. */
  description: string;
  /** Example log fragment this matcher would extract. */
  example: string;
}

export const DPL_MATCHERS: DplMatcher[] = [
  {
    name: "INTEGER",
    aliases: ["INT", "LONG"],
    regex: "-?\\d+",
    resultType: "long",
    description: "Matches a whole number (positive or negative).",
    example: "42",
  },
  {
    name: "DOUBLE",
    aliases: ["FLOAT"],
    regex: "-?\\d+\\.\\d+(?:[eE][-+]?\\d+)?",
    resultType: "double",
    description: "Matches a decimal number (with optional scientific notation).",
    example: "3.14",
  },
  {
    name: "HEXNUM",
    aliases: ["HEX"],
    regex: "(?:0x)?[0-9a-fA-F]+",
    resultType: "string",
    description: "Matches a hexadecimal number, with or without the 0x prefix.",
    example: "0xDEADBEEF",
  },
  {
    name: "IPADDR",
    aliases: ["IP", "IPV4"],
    regex: "(?:\\d{1,3}\\.){3}\\d{1,3}",
    resultType: "ip",
    description: "Matches an IPv4 address.",
    example: "192.168.1.45",
  },
  {
    name: "IPV6",
    regex: "(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}",
    resultType: "ip",
    description: "Matches an IPv6 address.",
    example: "2001:db8::1",
  },
  {
    name: "TIMESTAMP",
    aliases: ["ISOTIME", "DATETIME"],
    regex: "\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?",
    resultType: "timestamp",
    description: "Matches an ISO-8601 timestamp.",
    example: "2024-01-15T08:30:00Z",
  },
  {
    name: "DATE",
    regex: "\\d{4}-\\d{2}-\\d{2}",
    resultType: "string",
    description: "Matches a YYYY-MM-DD date.",
    example: "2024-01-15",
  },
  {
    name: "TIME",
    regex: "\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?",
    resultType: "string",
    description: "Matches an HH:MM:SS time, optional fractional seconds.",
    example: "08:30:00",
  },
  {
    name: "STRING",
    aliases: ["QSTRING"],
    regex: '"(?:[^"\\\\]|\\\\.)*"',
    resultType: "string",
    description: "Matches a double-quoted string (escaped quotes allowed).",
    example: '"hello world"',
  },
  {
    name: "WORD",
    regex: "\\S+",
    resultType: "string",
    description: "Matches a sequence of non-whitespace characters.",
    example: "auth-service",
  },
  {
    name: "ALPHA",
    regex: "[A-Za-z]+",
    resultType: "string",
    description: "Matches one or more letters.",
    example: "ERROR",
  },
  {
    name: "ALNUM",
    regex: "[A-Za-z0-9]+",
    resultType: "string",
    description: "Matches one or more alphanumeric characters.",
    example: "abc123",
  },
  {
    name: "LD",
    aliases: ["DATA", "ANY"],
    regex: ".*?",
    resultType: "string",
    description: "Lazy data: matches the smallest amount of any character. Use when the next literal in the pattern decides where this stops.",
    example: "(any text)",
  },
  {
    name: "JSON",
    regex: "\\{(?:[^{}]|\\{[^{}]*\\})*\\}",
    resultType: "json",
    description: "Matches a JSON object (one level of nesting).",
    example: '{"k":"v"}',
  },
  {
    name: "UUID",
    aliases: ["GUID"],
    regex: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
    resultType: "string",
    description: "Matches a UUID/GUID.",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  },
  {
    name: "BOOL",
    aliases: ["BOOLEAN"],
    regex: "true|false|TRUE|FALSE",
    resultType: "boolean",
    description: "Matches a boolean literal.",
    example: "true",
  },
  {
    name: "EOL",
    regex: "(?:\\r?\\n|$)",
    resultType: "string",
    description: "Matches end-of-line.",
    example: "\\n",
  },
];

/** Resolve a name (canonical or alias) to its matcher, or undefined. */
export function findMatcher(name: string): DplMatcher | undefined {
  const upper = name.toUpperCase();
  return DPL_MATCHERS.find((m) => m.name === upper || m.aliases?.includes(upper));
}

/** All matcher names + aliases as an alternation regex source (longest first). */
export function allMatcherNamesPattern(): string {
  const names = new Set<string>();
  for (const m of DPL_MATCHERS) {
    names.add(m.name);
    m.aliases?.forEach((a) => names.add(a));
  }
  return Array.from(names)
    .sort((a, b) => b.length - a.length)
    .join("|");
}
