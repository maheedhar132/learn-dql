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
  if (!trimmed) return { records: [], columns: [], error: "Empty query" };
  return lastStage(parsePipeline(trimmed), sampleData);
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

/** Order-insensitive multiset equality of two record sets. */
export function recordsMatch(a: DQLRecord[], b: DQLRecord[]): boolean {
  if (a.length !== b.length) return false;
  const sa = a.map(canonicalRow).sort();
  const sb = b.map(canonicalRow).sort();
  return sa.every((v, i) => v === sb[i]);
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  userOutcome: RunOutcome;
  expectedOutcome: RunOutcome;
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
    return {
      passed: false,
      message: `Query error: ${userOutcome.error}`,
      userOutcome,
      expectedOutcome,
    };
  }
  const passed = recordsMatch(userOutcome.records, expectedOutcome.records);
  return {
    passed,
    message: passed
      ? "Correct — your result matches the expected output."
      : `Not yet. Your query returned ${userOutcome.records.length} record(s); ` +
        `the expected result has ${expectedOutcome.records.length}.`,
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
