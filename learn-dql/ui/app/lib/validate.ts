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

/** Execute a raw DQL string against sample data (offline engine). */
export function runQuery(query: string, sampleData: DQLRecord[]): RunOutcome {
  const trimmed = query.trim();
  if (!trimmed) return { records: [], columns: [], error: "Empty query — type a DQL command to get started." };
  let pipeline: PipelineStage[];
  try {
    pipeline = parsePipeline(trimmed);
  } catch (e) {
    return { records: [], columns: [], error: e instanceof Error ? e.message : "Query parse error" };
  }
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

/** Order-insensitive multiset equality. Falls back to values-only comparison
 *  so different column aliases (e.g. cnt vs total) still pass. */
export function recordsMatch(a: DQLRecord[], b: DQLRecord[]): boolean {
  if (a.length !== b.length) return false;
  const sa = a.map(canonicalRow).sort();
  const sb = b.map(canonicalRow).sort();
  if (sa.every((v, i) => v === sb[i])) return true;
  const va = a.map(canonicalRowValues).sort();
  const vb = b.map(canonicalRowValues).sort();
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

/** Validate a learner query for a step by comparing results. */
export function validateStep(
  query: string,
  expected: PipelineStage[],
  sampleData: DQLRecord[],
): ValidationResult {
  const userOutcome = runQuery(query, sampleData);
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
  const passed = recordsMatch(userOutcome.records, expectedOutcome.records);
  return {
    passed,
    message: passed
      ? "Correct — your result matches the expected output."
      : diagnoseFailure(query, userOutcome.records.length, expectedOutcome.records.length),
    userOutcome,
    expectedOutcome,
  };
}

/** Reconstruct the reference query string from a pipeline (for "show solution"). */
export function pipelineToQuery(pipeline: PipelineStage[]): string {
  return pipeline
    .map((s, i) => (i === 0 ? s.raw.trim() : `| ${s.raw.replace(/^\|\s*/, "").trim()}`))
    .join("\n");
}
