import type { DQLRecord, DQLColumn, PipelineStage } from "@/lib/types/dql";
import { executeCommand } from "./commands";

export interface StageResult {
  stageId: string;
  command: string;
  data: DQLRecord[];
  columns: DQLColumn[];
  recordCount: number;
  previousData: DQLRecord[];
  previousColumns: DQLColumn[];
}

export function runPipeline(
  pipeline: PipelineStage[],
  initialData: DQLRecord[]
): StageResult[] {
  const results: StageResult[] = [];
  let currentData = [...initialData];
  let currentColumns = inferColumns(currentData);

  for (const stage of pipeline) {
    const prevData = currentData;
    const prevCols = currentColumns;
    const { data, columns } = executeCommand(stage.command, currentData, currentColumns, stage.args);
    currentData = data;
    currentColumns = columns;
    results.push({
      stageId: stage.id,
      command: stage.command,
      data: currentData,
      columns: currentColumns,
      recordCount: currentData.length,
      previousData: prevData,
      previousColumns: prevCols,
    });
  }

  return results;
}

export function inferColumns(data: DQLRecord[]): DQLColumn[] {
  if (data.length === 0) return [];
  const keys = new Set<string>();
  for (const row of data) {
    Object.keys(row).forEach((k) => keys.add(k));
  }
  return Array.from(keys).map((name) => {
    const val = data.find((r) => r[name] !== undefined && r[name] !== null)?.[name];
    return { name, type: inferType(val) };
  });
}

function inferType(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "long" : "double";
  }
  if (value instanceof Date) return "timestamp";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return "timestamp";
    if (/^-?\d+$/.test(value)) return "long";
    if (/^-?\d+\.\d+$/.test(value)) return "double";
    return "string";
  }
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "record";
  return "unknown";
}
