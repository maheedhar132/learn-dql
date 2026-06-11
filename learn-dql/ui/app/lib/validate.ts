// Offline result-based validation.
// A learner's query passes a step when its final-stage records match the
// records produced by the step's reference pipeline on the same sample data.
// Comparison is multiset-based (row order ignored) so multiple valid DQL
// solutions are accepted — mirroring the real "Learn DQL" product.

import { parsePipeline } from "./dql/parser";
import { runPipeline } from "./dql/engine";
import type {
  DQLRecord,
  DQLColumn,
  PipelineStage,
} from "./types/dql";

export interface RunOutcome {
  records: DQLRecord[];
  columns: DQLColumn[];
  error?: string;
}

function lastStage(pipeline: PipelineStage[], data: DQLRecord[]): RunOutcome {
  try {
    const stages = runPipeline(pipeline, data);
    const last = stages[stages.length - 1];
    if (!last) return { records: data, columns: [] };
    return { records: last.data, columns: last.columns };
  } catch (e) {
    return {
      records: [],
      columns: [],
      error: e instanceof Error ? e.message : "Query failed to execute",
    };
  }
}

/** Copy pre-seeded right-side records (lookup/join/append sub-query data) from
 *  a reference pipeline into a freshly parsed user pipeline. The offline parser
 *  cannot resolve live `[fetch …]` sub-queries, so scenarios seed the records on
 *  the expected pipeline; the user's stage of the same command inherits them. */
function seedSubqueryRecords(pipeline: PipelineStage[], reference?: PipelineStage[]): void {
  if (!reference) return;
  const SEEDABLE = new Set(["lookup", "join", "append"]);
  for (const stage of pipeline) {
    if (!SEEDABLE.has(stage.command)) continue;
    const args = stage.args as Record<string, unknown>;
    if (args.records) continue;
    const ref = reference.find(
      (r) => r.command === stage.command && (r.args as Record<string, unknown>).records,
    );
    if (ref) {
      stage.args = { ...args, records: (ref.args as Record<string, unknown>).records };
    }
  }
}

/** Execute a raw DQL string against sample data (offline engine).
 *  `reference` (optional) supplies pre-seeded sub-query records. */
export function runQuery(
  query: string,
  sampleData: DQLRecord[],
  reference?: PipelineStage[],
): RunOutcome {
  const trimmed = query.trim();
  if (!trimmed) return { records: [], columns: [], error: "Empty query — type a DQL command to get started." };
  let pipeline: PipelineStage[];
  try {
    pipeline = parsePipeline(trimmed);
  } catch (e) {
    return { records: [], columns: [], error: e instanceof Error ? e.message : "Query parse error" };
  }
  seedSubqueryRecords(pipeline, reference);
  return lastStage(pipeline, sampleData);
}

/** Execute a known-good reference pipeline against sample data. */
export function runExpected(
  expected: PipelineStage[],
  sampleData: DQLRecord[],
): RunOutcome {
  return lastStage(expected, sampleData);
}

function canonicalRow(row: DQLRecord): string {
  const keys = Object.keys(row).sort();
  const obj: Record<string, unknown> = {};
  for (const k of keys) obj[k] = row[k];
  return JSON.stringify(obj);
}

function canonicalRowValues(row: DQLRecord): string {
  return JSON.stringify(Object.values(row).map((v) => JSON.stringify(v)).sort());
}

export interface MatchOptions {
  /** Compare rows in order (for lessons whose point is sorting). */
  ordered?: boolean;
  /** Require exact column names (for rename/projection lessons) — disables
   *  the values-only alias fallback. */
  strictNames?: boolean;
}

/** Multiset (or ordered-sequence) equality. By default falls back to a
 *  values-only comparison so different column aliases (cnt vs total) pass. */
export function recordsMatch(a: DQLRecord[], b: DQLRecord[], opts: MatchOptions = {}): boolean {
  if (a.length !== b.length) return false;
  const order = (arr: string[]) => (opts.ordered ? arr : [...arr].sort());
  const sa = order(a.map(canonicalRow));
  const sb = order(b.map(canonicalRow));
  if (sa.every((v, i) => v === sb[i])) return true;
  if (opts.strictNames) return false;
  const va = order(a.map(canonicalRowValues));
  const vb = order(b.map(canonicalRowValues));
  return va.every((v, i) => v === vb[i]);
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  userOutcome: RunOutcome;
  expectedOutcome: RunOutcome;
}

function diagnoseFailure(query: string, userCount: number, expectedCount: number): string {
  const q = query.toLowerCase();
  if (/filter\s+\w[\w.]*\s*=[^=]/.test(query)) return "Check your comparison operator — DQL uses == not =.";
  if (/filter\s+\w[\w.]*\s*==\s*[^"'\d()\s]/.test(query)) return "String values need double quotes, e.g. == \"ERROR\".";
  if (userCount === 0 && expectedCount > 0) return "Your query returned no records — check your filter conditions and field names.";
  if (userCount > expectedCount) return `Too many records — your filter may be too broad (${userCount} vs ${expectedCount} expected).`;
  if (userCount < expectedCount) return `Too few records — your filter may be too narrow (${userCount} vs ${expectedCount} expected).`;
  return "Record counts match but values differ — check field names and aggregation aliases.";
}

/** Derive comparison strictness from what the reference pipeline teaches. */
function matchOptionsFor(expected: PipelineStage[]): MatchOptions {
  return {
    // If the lesson includes a sort, row order is the point — compare in order.
    ordered: expected.some((s) => s.command === "sort"),
    // If the lesson renames or projects fields, column names are the point.
    strictNames: expected.some(
      (s) => s.command === "fieldsRename" || s.command === "fields" || s.command === "fieldsKeep",
    ),
  };
}

/** Validate a learner query for a step by comparing results. */
export function validateStep(
  query: string,
  expected: PipelineStage[],
  sampleData: DQLRecord[],
): ValidationResult {
  const userOutcome = runQuery(query, sampleData, expected);
  const expectedOutcome = runExpected(expected, sampleData);

  if (userOutcome.error) {
    let msg = userOutcome.error;
    if (/=[^=]/.test(query) && !/==/.test(query)) msg += " — tip: use == for comparison, not =";
    else if (msg === "Empty query — type a DQL command to get started.") msg = "Query is empty — type a DQL command first.";
    return {
      passed: false,
      message: msg,
      userOutcome,
      expectedOutcome,
    };
  }
  const opts = matchOptionsFor(expected);
  const passed = recordsMatch(userOutcome.records, expectedOutcome.records, opts);
  let message: string;
  if (passed) {
    message = "Correct — your result matches the expected output.";
  } else if (opts.ordered && recordsMatch(userOutcome.records, expectedOutcome.records, { ...opts, ordered: false })) {
    message = "The records are right but the row order differs — check your sort field and direction.";
  } else if (opts.strictNames && recordsMatch(userOutcome.records, expectedOutcome.records, { ...opts, strictNames: false })) {
    message = "The values are right but the column names differ — check your rename or field projection.";
  } else {
    message = diagnoseFailure(query, userOutcome.records.length, expectedOutcome.records.length);
  }
  return { passed, message, userOutcome, expectedOutcome };
}

/** Reconstruct the reference query string from a pipeline (for "show solution"). */
export function pipelineToQuery(pipeline: PipelineStage[]): string {
  return pipeline
    .map((s, i) => (i === 0 ? s.raw.trim() : `| ${s.raw.replace(/^\|\s*/, "").trim()}`))
    .join("\n");
}
