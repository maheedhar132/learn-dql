import type { DQLRecord, DQLColumn } from "../types/dql";

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return fallback; }
}

export function executeCommand(
  command: string,
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  switch (command) {
    case "fetch":
      return { data, columns };
    case "data":
      return execData(args);
    case "filter":
      return { data: execFilter(data, args), columns };
    case "filterOut":
      return { data: execFilterOut(data, args), columns };
    case "fields":
    case "fieldsKeep":
      return execFieldsKeep(data, args);
    case "fieldsAdd":
      return execFieldsAdd(data, columns, args);
    case "fieldsRemove":
      return execFieldsRemove(data, columns, args);
    case "fieldsRename":
      return execFieldsRename(data, columns, args);
    case "sort":
      return execSort(data, columns, args);
    case "limit":
      return { data: data.slice(0, Number(args.count) || 100), columns };
    case "summarize":
      return execSummarize(data, args);
    case "dedup":
      return execDedup(data, columns, args);
    case "search":
      return execSearch(data, columns, args);
    case "parse":
      return execParse(data, columns, args);
    case "lookup":
      return execLookup(data, columns, args);
    case "timeseries":
      return execTimeseries(data, columns);
    case "expand":
      return execExpand(data, columns, args);
    case "append":
      return execAppend(data, columns, args);
    case "makeTimeseries":
      return execMakeTimeseries(data, columns, args);
    case "join":
      return execJoin(data, columns, args);
    default:
      return { data, columns };
  }
}

function execData(args: Record<string, unknown>): { data: DQLRecord[]; columns: DQLColumn[] } {
  const raw = str(args.raw, "[]");
  try {
    const parsed: unknown = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : [parsed];
    const keys = new Set<string>();
    for (const r of records) {
      if (r && typeof r === "object") {
        Object.keys(r as Record<string, unknown>).forEach((k) => keys.add(k));
      }
    }
    const cols = Array.from(keys).map((name) => ({ name, type: "string" }));
    return { data: records as DQLRecord[], columns: cols };
  } catch {
    return { data: [], columns: [] };
  }
}

function execFilter(data: DQLRecord[], args: Record<string, unknown>): DQLRecord[] {
  const condition = str(args.condition);
  return data.filter((row) => evaluateCondition(condition, row));
}

function execFilterOut(data: DQLRecord[], args: Record<string, unknown>): DQLRecord[] {
  const condition = str(args.condition);
  return data.filter((row) => !evaluateCondition(condition, row));
}

function execFieldsKeep(
  data: DQLRecord[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const fieldList = str(args.fields).split(",").map((f) => f.trim()).filter(Boolean);
  const out = data.map((row) => {
    const obj: DQLRecord = {};
    for (const f of fieldList) {
      if (f in row) obj[f] = row[f];
    }
    return obj;
  });
  const cols = fieldList.map((name) => ({ name, type: "string" }));
  return { data: out, columns: cols };
}

function execFieldsAdd(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const assignments = str(args.assignments);
  const pairs = parseAssignments(assignments);
  const out = data.map((row) => {
    const clone = { ...row };
    for (const [name, expr] of pairs) {
      clone[name] = evaluateExpression(expr, row);
    }
    return clone;
  });
  const newCols = pairs.map(([name]) => ({ name, type: "string" }));
  return { data: out, columns: [...columns, ...newCols] };
}

function execFieldsRemove(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const fieldList = str(args.fields).split(",").map((f) => f.trim()).filter(Boolean);
  const out = data.map((row) => {
    const clone = { ...row };
    for (const f of fieldList) delete clone[f];
    return clone;
  });
  const cols = columns.filter((c) => !fieldList.includes(c.name));
  return { data: out, columns: cols };
}

function execFieldsRename(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  // DQL semantics: fieldsRename newName = oldName
  const pairs = parseAssignments(str(args.assignments));
  const out = data.map((row) => {
    const clone = { ...row };
    for (const [newName, oldNameExpr] of pairs) {
      const oldName = oldNameExpr.trim();
      if (oldName in clone) {
        clone[newName] = clone[oldName];
        delete clone[oldName];
      }
    }
    return clone;
  });
  const colMap = new Map(pairs.map(([newName, oldName]) => [oldName.trim(), newName]));
  const cols = columns.map((c) =>
    colMap.has(c.name) ? { ...c, name: colMap.get(c.name)! } : c
  );
  return { data: out, columns: cols };
}

function execSort(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const field = str(args.field, "timestamp");
  const direction = str(args.direction, "asc");
  const sorted = [...data].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return direction === "asc" ? 1 : -1;
    if (bv == null) return direction === "asc" ? -1 : 1;
    if (typeof av === "number" && typeof bv === "number") {
      return direction === "asc" ? av - bv : bv - av;
    }
    return direction === "asc"
      ? str(av).localeCompare(str(bv))
      : str(bv).localeCompare(str(av));
  });
  return { data: sorted, columns };
}

function computeAgg(aggregation: string, aggField: string, rows: DQLRecord[], condition?: string): number {
  // percentile(field, N): the parser delivers aggField as "field, N" — split it.
  let field = aggField;
  let pctN = 95;
  if (aggregation === "percentile") {
    const parts = aggField.split(",").map((s) => s.trim());
    field = parts[0];
    const n = Number(parts[1]);
    if (!isNaN(n) && n > 0 && n <= 100) pctN = n;
  }
  const nums = rows
    .filter((r) => !condition || evaluateCondition(condition, r))
    .map((r) => Number(r[field] ?? 0));
  if (aggregation === "count")   return condition ? nums.length : rows.length;
  if (aggregation === "sum")     return nums.reduce((a, b) => a + b, 0);
  if (aggregation === "avg")     return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  if (aggregation === "min")     return nums.length > 0 ? Math.min(...nums) : 0;
  if (aggregation === "max")     return nums.length > 0 ? Math.max(...nums) : 0;
  if (aggregation === "median") {
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  if (aggregation === "percentile") {
    if (nums.length === 0) return 0;
    const s = [...nums].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * (pctN / 100)))];
  }
  if (aggregation === "countdistinct") return new Set(rows.map((r) => r[field])).size;
  if (aggregation === "countif") return rows.filter((r) => evaluateCondition(aggField, r)).length;
  return 0;
}

function execSummarize(
  data: DQLRecord[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  // Support multiple aggs from args.aggs: [{alias, aggregation, aggField, condition}]
  // or fall back to single agg pattern
  const byFields = str(args.by).split(",").map((f) => f.trim()).filter(Boolean);
  const aggs: Array<{ alias: string; aggregation: string; aggField: string; condition?: string }> =
    (args.aggs as typeof aggs) ?? [{
      alias: str(args.alias, "count"),
      aggregation: str(args.aggregation, "count"),
      aggField: str(args.aggField),
      condition: args.condition as string | undefined,
    }];

  if (byFields.length === 0) {
    const obj: DQLRecord = {};
    for (const { alias, aggregation, aggField, condition } of aggs) {
      obj[alias] = computeAgg(aggregation, aggField, data, condition);
    }
    return {
      data: [obj],
      columns: aggs.map(({ alias }) => ({ name: alias, type: "long" })),
    };
  }

  const groups = new Map<string, DQLRecord[]>();
  for (const row of data) {
    const key = byFields.map((f) => str(row[f], "null")).join("||");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const out: DQLRecord[] = [];
  for (const [, rows] of groups) {
    const obj: DQLRecord = {};
    for (const f of byFields) obj[f] = rows[0][f];
    for (const { alias, aggregation, aggField, condition } of aggs) {
      obj[alias] = computeAgg(aggregation, aggField, rows, condition);
    }
    out.push(obj);
  }

  const cols: DQLColumn[] = [
    ...byFields.map((f) => ({ name: f, type: "string" })),
    ...aggs.map(({ alias }) => ({ name: alias, type: "long" })),
  ];
  return { data: out, columns: cols };
}

function execDedup(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const field = str(args.field);
  if (!field) return { data, columns };
  const seen = new Set<unknown>();
  const out = data.filter((row) => {
    const key = row[field];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { data: out, columns };
}

function execSearch(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const term = str(args.term).toLowerCase();
  if (!term) return { data, columns };
  return {
    data: data.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(term))
    ),
    columns,
  };
}

// ---------------------------------------------------------------------------
// Typed-capture helpers for execParse
// ---------------------------------------------------------------------------

/** Describes one named capture group extracted from a DQL typed pattern. */
interface TypedCapture {
  name: string;
  type: "string" | "long" | "double" | "timestamp";
}

/**
 * Compile a DQL typed pattern string into a RegExp plus an ordered list of
 * named captures so match groups can be mapped back to field names.
 *
 * Supported tokens:
 *   IPADDR:name  → (\d+\.\d+\.\d+\.\d+)
 *   INT:name     → (\d+)
 *   LONG:name    → (\d+)
 *   DOUBLE:name  → (\d+(?:\.\d+)?)
 *   DATA:name    → (\S+)
 *   STRING:name  → ("(?:[^"\\]|\\.)*"|\S+)
 *   TIMESTAMP:name → (\d{4}-\d{2}-\d{2}T[\d:.]+Z?)
 *   LD           → .*?   (skip)
 *   LD{DATA:x}   → .*?   (skip, the nested capture is ignored for simplicity)
 */
function compileTypedPattern(pattern: string): { regex: RegExp; captures: TypedCapture[] } | null {
  const captures: TypedCapture[] = [];

  // Replace typed tokens with regex fragments, collecting names in order.
  let regexSrc = pattern
    // Escape regex special chars EXCEPT our placeholder markers first.
    // We process token by token so we can safely escape the literal parts.
    .replace(/[-[\]{}()*+?.,\\^$|#]/g, (ch) => `\\${ch}`);

  // Now substitute the (escaped) typed tokens back.
  // After escaping, "IPADDR:name" stays as-is (letters and colon are not escaped).
  // We process longest-match types first to avoid partial matches.

  // LD{...} — skip (greedy skip over the nested part)
  regexSrc = regexSrc.replace(/LD\\\{[^}]*\\\}/g, ".*?");
  // LD alone
  regexSrc = regexSrc.replace(/\bLD\b/g, ".*?");

  const tokenRe = /\b(IPADDR|INT|LONG|DOUBLE|DATA|STRING|TIMESTAMP):([A-Za-z_][A-Za-z0-9_]*)/g;
  const captureOrder: Array<{ type: string; name: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(regexSrc)) !== null) {
    captureOrder.push({ type: m[1], name: m[2] });
  }

  regexSrc = regexSrc.replace(
    /\b(IPADDR|INT|LONG|DOUBLE|DATA|STRING|TIMESTAMP):([A-Za-z_][A-Za-z0-9_]*)/g,
    (_, type: string) => {
      switch (type) {
        case "IPADDR":    return "(\\d+\\.\\d+\\.\\d+\\.\\d+)";
        case "INT":
        case "LONG":      return "(\\d+)";
        case "DOUBLE":    return "(\\d+(?:\\.\\d+)?)";
        case "DATA":      return "(\\S+)";
        case "STRING":    return '("(?:[^"\\\\]|\\\\.)*"|\\S+)';
        case "TIMESTAMP": return "(\\d{4}-\\d{2}-\\d{2}T[\\d:.]+Z?)";
        default:          return "(\\S+)";
      }
    }
  );

  // Map type strings to DQLColumn types
  for (const { type, name } of captureOrder) {
    let colType: TypedCapture["type"] = "string";
    if (type === "INT" || type === "LONG") colType = "long";
    else if (type === "DOUBLE") colType = "double";
    else if (type === "TIMESTAMP") colType = "timestamp";
    captures.push({ name, type: colType });
  }

  if (captures.length === 0) return null;

  try {
    return { regex: new RegExp(regexSrc, "s"), captures };
  } catch {
    return null;
  }
}

function execParse(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const field = str(args.field, "content");
  const pattern = str(args.pattern);
  if (!pattern) return { data, columns };

  const newCols = [...columns];

  // Helper to register a column only once
  function ensureCol(name: string, type: string): void {
    if (!newCols.find((c) => c.name === name)) {
      newCols.push({ name, type });
    }
  }

  // ── 1a. JSON pattern: JSON:<alias> ──────────────────────────────────────
  const jsonMatch = pattern.match(/^JSON:([A-Za-z_][A-Za-z0-9_]*)$/);
  if (jsonMatch) {
    const out = data.map((row) => {
      const content = str(row[field]);
      try {
        const parsed: unknown = JSON.parse(content);
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
          const obj = parsed as Record<string, unknown>;
          for (const key of Object.keys(obj)) ensureCol(key, "string");
          return { ...row, ...obj };
        }
      } catch {
        // leave row unchanged
      }
      return { ...row };
    });
    return { data: out, columns: newCols };
  }

  // ── 1b. KVP pattern: KVP:<alias> or pattern contains "key=value" pairs ──
  const isKvpExplicit = /^KVP:/i.test(pattern);
  const isKvpImplicit = !isKvpExplicit && pattern.includes("=") && !/[A-Z]+:[A-Za-z_]/.test(pattern);
  if (isKvpExplicit || isKvpImplicit) {
    const out = data.map((row) => {
      const clone = { ...row };
      const content = str(row[field]);
      for (const token of content.split(/\s+/)) {
        const eqIdx = token.indexOf("=");
        if (eqIdx > 0) {
          const k = token.slice(0, eqIdx);
          const v = token.slice(eqIdx + 1);
          const num = Number(v);
          clone[k] = isNaN(num) ? v : num;
          ensureCol(k, isNaN(num) ? "string" : "long");
        }
      }
      return clone;
    });
    return { data: out, columns: newCols };
  }

  // ── 1c. Typed capture groups (IPADDR:, INT:, DATA:, etc.) ───────────────
  const compiled = compileTypedPattern(pattern);
  if (compiled) {
    const { regex, captures } = compiled;
    for (const cap of captures) ensureCol(cap.name, cap.type);

    const out = data.map((row) => {
      const clone = { ...row };
      const content = str(row[field]);
      const m = regex.exec(content);
      if (m) {
        captures.forEach((cap, i) => {
          const raw = m[i + 1];
          if (raw !== undefined) {
            if (cap.type === "long") {
              clone[cap.name] = parseInt(raw, 10);
            } else if (cap.type === "double") {
              clone[cap.name] = parseFloat(raw);
            } else {
              // Strip surrounding quotes from STRING captures
              clone[cap.name] = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
            }
          }
        });
      }
      return clone;
    });
    return { data: out, columns: newCols };
  }

  // ── 1d. Fallback: original key=value extraction via type:name tokens ─────
  const out = data.map((row) => {
    const clone = { ...row };
    const content = str(row[field]);
    const matches = pattern.match(/([A-Za-z_][A-Za-z0-9_]*):([A-Za-z_][A-Za-z0-9_]*)/g);
    if (matches) {
      for (const mtch of matches) {
        const [, name] = mtch.split(":");
        const regex = new RegExp(`${name}=([^\\s,;]+)`);
        const found = content.match(regex);
        if (found) {
          const val = found[1];
          clone[name] = isNaN(Number(val)) ? val : Number(val);
          ensureCol(name, isNaN(Number(val)) ? "string" : "long");
        }
      }
    }
    return clone;
  });

  return { data: out, columns: newCols };
}

// ---------------------------------------------------------------------------
// execLookup — left-outer join against a pre-seeded right-side table
// ---------------------------------------------------------------------------

function execLookup(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const sourceField = str(args.sourceField);
  const lookupField = str(args.lookupField);
  const prefix = str(args.prefix, "lookup.");
  const rightRecords = Array.isArray(args.records) ? (args.records as DQLRecord[]) : [];
  const fieldFilter = Array.isArray(args.fields) ? (args.fields as string[]) : null;

  if (!sourceField || !lookupField || rightRecords.length === 0) {
    return { data, columns };
  }

  // Build lookup index: lookupField value → first matching right row
  const index = new Map<unknown, DQLRecord>();
  for (const row of rightRecords) {
    const k = row[lookupField];
    if (!index.has(k)) index.set(k, row);
  }

  const newCols = [...columns];

  const out = data.map((row) => {
    const clone = { ...row };
    const k = row[sourceField];
    const right = index.get(k);
    if (right) {
      const keys = fieldFilter ?? Object.keys(right);
      for (const rk of keys) {
        if (rk === lookupField) continue; // avoid duplicating the join key
        const prefixed = `${prefix}${rk}`;
        clone[prefixed] = right[rk];
        if (!newCols.find((c) => c.name === prefixed)) {
          newCols.push({ name: prefixed, type: "string" });
        }
      }
    }
    return clone;
  });

  return { data: out, columns: newCols };
}

// ---------------------------------------------------------------------------
// execTimeseries — pass-through stub (metrics data not simulated offline)
// ---------------------------------------------------------------------------

function execTimeseries(
  data: DQLRecord[],
  columns: DQLColumn[]
): { data: DQLRecord[]; columns: DQLColumn[] } {
  return { data, columns };
}

function execExpand(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const field = str(args.field);
  if (!field) return { data, columns };
  const out: DQLRecord[] = [];
  for (const row of data) {
    const arr = row[field];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        out.push({ ...row, [field]: item as unknown });
      }
    } else {
      out.push(row);
    }
  }
  return { data: out, columns };
}

function execAppend(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const records = Array.isArray(args.records) ? (args.records as DQLRecord[]) : [];
  const allKeys = new Set<string>();
  for (const row of data) Object.keys(row).forEach((k) => allKeys.add(k));
  for (const row of records) Object.keys(row).forEach((k) => allKeys.add(k));
  const newCols = Array.from(allKeys).map((name) => {
    const existing = columns.find((c) => c.name === name);
    return existing || { name, type: "string" };
  });
  return { data: [...data, ...records], columns: newCols };
}

function execMakeTimeseries(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const intervalStr = str(args.interval, "1h");
  const byField = str(args.by).trim();
  const aggregation = str(args.aggregation, "count");
  const aggField = str(args.aggField);
  const alias = str(args.alias, aggregation);
  const timeField = str(args.time, "timestamp");

  const intervalMs = parseInterval(intervalStr);
  if (!intervalMs || data.length === 0) return { data: [], columns: [] };

  // Parse all timestamps and bucket them
  type BucketKey = string;
  const buckets = new Map<BucketKey, { time: number; rows: DQLRecord[]; group?: string | number }>();

  for (const row of data) {
    const tsVal = row[timeField];
    const ts = parseTimestamp(tsVal);
    if (!ts) continue;

    const bucketTime = Math.floor(ts.getTime() / intervalMs) * intervalMs;
    const groupKey = byField ? str(row[byField], "null") : "_all";
    const key = `${bucketTime}::${groupKey}`;

    if (!buckets.has(key)) {
      buckets.set(key, { time: bucketTime, rows: [], group: byField ? (row[byField] as string | number | undefined) : undefined });
    }
    buckets.get(key)!.rows.push(row);
  }

  const out: DQLRecord[] = [];
  for (const [, bucket] of buckets) {
    const obj: DQLRecord = { timestamp: new Date(bucket.time).toISOString() };
    if (byField && bucket.group !== undefined) obj[byField] = bucket.group;

    if (aggregation === "count") {
      obj[alias] = bucket.rows.length;
    } else if (aggregation === "sum") {
      obj[alias] = bucket.rows.reduce((s, r) => s + Number(r[aggField] || 0), 0);
    } else if (aggregation === "avg") {
      const nums = bucket.rows.map((r) => Number(r[aggField] || 0));
      obj[alias] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    } else if (aggregation === "max") {
      obj[alias] = Math.max(...bucket.rows.map((r) => Number(r[aggField] || 0)));
    } else if (aggregation === "min") {
      obj[alias] = Math.min(...bucket.rows.map((r) => Number(r[aggField] || 0)));
    } else {
      obj[alias] = bucket.rows.length;
    }
    out.push(obj);
  }

  // Sort by timestamp ascending
  out.sort((a, b) => {
    const ta = new Date(String(a.timestamp)).getTime();
    const tb = new Date(String(b.timestamp)).getTime();
    return ta - tb;
  });

  const newCols: DQLColumn[] = [{ name: "timestamp", type: "timestamp" }];
  if (byField) newCols.push({ name: byField, type: "string" });
  newCols.push({ name: alias, type: "long" });

  return { data: out, columns: newCols };
}

function parseInterval(str: string): number {
  const m = str.trim().match(/^(\d+)([smhdw])$/);
  if (!m) return 3600000; // default 1h
  const num = parseInt(m[1], 10);
  const unit = m[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return num * (multipliers[unit] || 3600000);
}

function parseTimestamp(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// Parse comma-separated args respecting nested parens and quotes
function splitArgs(s: string): string[] {
  const parts: string[] = [];
  let cur = "", depth = 0, inQ = false, qc = "";
  for (const ch of s) {
    if (!inQ && (ch === '"' || ch === "'")) { inQ = true; qc = ch; cur += ch; }
    else if (inQ && ch === qc) { inQ = false; cur += ch; }
    else if (!inQ && ch === "(") { depth++; cur += ch; }
    else if (!inQ && ch === ")") { depth--; cur += ch; }
    else if (!inQ && depth === 0 && ch === ",") { parts.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function evaluateExpression(expr: string, row: DQLRecord): unknown {
  const clean = expr.trim();

  // Function calls
  const fnMatch = clean.match(/^(\w+)\((.*)\)$/s);
  if (fnMatch) {
    const fn = fnMatch[1].toLowerCase();
    const rawArgs = fnMatch[2];

    if (fn === "if") {
      const parts = splitArgs(rawArgs);
      if (parts.length >= 3) {
        return evaluateCondition(parts[0], row)
          ? evaluateExpression(parts[1], row)
          : evaluateExpression(parts[2], row);
      }
    }

    const args = splitArgs(rawArgs).map((a) => evaluateExpression(a, row));
    const s0 = str(args[0]);
    const n0 = Number(args[0] ?? 0);

    switch (fn) {
      // String functions
      case "upper":          return s0.toUpperCase();
      case "lower":          return s0.toLowerCase();
      case "trim":           return s0.trim();
      case "stringlength":
      case "len":            return s0.length;
      case "concat":         return args.map((a) => str(a)).join("");
      case "substring": {
        const start = Number(args[1] ?? 0);
        const len   = args[2] !== undefined ? Number(args[2]) : undefined;
        return len !== undefined ? s0.substring(start, start + len) : s0.substring(start);
      }
      case "replacestring": return s0.split(str(args[1])).join(str(args[2]));
      case "indexof":       return s0.indexOf(str(args[1]));
      case "splitstring":   return s0.split(str(args[1], ","));
      // Type conversion
      case "tolong":
      case "toint":
      case "aslong":        return Math.trunc(n0);
      case "todouble":
      case "asdouble":
      case "tonumber":      return n0;
      case "tostring":
      case "asstring":      return s0;
      // Math
      case "round":         return Math.round(n0);
      case "floor":         return Math.floor(n0);
      case "ceil":          return Math.ceil(n0);
      case "abs":           return Math.abs(n0);
      case "sqrt":          return Math.sqrt(n0);
      // Null handling
      case "coalesce":      return args.find((a) => a != null && a !== "") ?? null;
      case "isnull":        return args[0] == null;
      case "isnotnull":     return args[0] != null;
      case "isempty":       return s0 === "";
      // Time functions
      case "gethour": {
        const d = new Date(s0);
        return isNaN(d.getTime()) ? null : d.getUTCHours();
      }
      case "getminute": {
        const d = new Date(s0);
        return isNaN(d.getTime()) ? null : d.getUTCMinutes();
      }
      case "getdayofweek": {
        const d = new Date(s0);
        return isNaN(d.getTime()) ? null : d.getUTCDay();
      }
      case "formattimestamp": {
        const d = new Date(s0);
        return isNaN(d.getTime()) ? s0 : d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
      }
      // Arrays
      case "arraycontains": {
        return Array.isArray(args[0]) && (args[0] as unknown[]).map((v) => str(v)).includes(str(args[1]));
      }
      case "arraysize": {
        return Array.isArray(args[0]) ? (args[0] as unknown[]).length : 0;
      }
    }
  }

  if (clean.startsWith('"') && clean.endsWith('"')) return clean.slice(1, -1);
  if (clean.startsWith("'") && clean.endsWith("'")) return clean.slice(1, -1);
  if (!isNaN(Number(clean)) && clean !== "") return Number(clean);

  // Arithmetic (simple, after function check)
  const arithMatch = clean.match(/^(.+?)\s*([+\-*/])\s*(.+)$/);
  if (arithMatch) {
    const l = Number(resolveValue(arithMatch[1].trim(), row));
    const r = Number(resolveValue(arithMatch[3].trim(), row));
    switch (arithMatch[2]) {
      case "+": return l + r;
      case "-": return l - r;
      case "*": return l * r;
      case "/": return r === 0 ? 0 : l / r;
    }
  }

  return resolveValue(clean, row);
}

function resolveValue(token: string, row: DQLRecord): unknown {
  const t = token.trim();
  if (t in row) return row[t];
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (!isNaN(Number(t))) return Number(t);
  // Try dot-path traversal for nested objects (e.g. aws: { account: { id: "..." } })
  if (t.includes(".")) {
    let cur: unknown = row;
    for (const part of t.split(".")) {
      if (cur == null || typeof cur !== "object") { cur = undefined; break; }
      cur = (cur as Record<string, unknown>)[part];
    }
    if (cur !== undefined) return cur;
  }
  return null;
}

function splitByOperator(condition: string, operator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";
  const opLen = operator.length;

  for (let i = 0; i < condition.length; i++) {
    const ch = condition[i];
    if (!inQuotes && (ch === '"' || ch === "'")) {
      inQuotes = true;
      quoteChar = ch;
      current += ch;
    } else if (inQuotes && ch === quoteChar && condition[i - 1] !== "\\") {
      inQuotes = false;
      current += ch;
    } else if (!inQuotes && condition.slice(i, i + opLen).toLowerCase() === operator) {
      parts.push(current.trim());
      current = "";
      i += opLen - 1;
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

export function evaluateCondition(condition: string, row: DQLRecord): boolean {
  const cond = condition.trim();

  // Handle NOT
  if (/^not\s+/i.test(cond)) return !evaluateCondition(cond.slice(4).trim(), row);

  // Handle OR (lowest precedence)
  const orParts = splitByOperator(cond, " or ");
  if (orParts.length > 1) return orParts.some((p) => evaluateCondition(p, row));

  // Handle AND
  const andParts = splitByOperator(cond, " and ");
  if (andParts.length > 1) return andParts.every((p) => evaluateCondition(p, row));

  // Function-call predicates: contains(f, "v"), startsWith(f, "v"), endsWith(f, "v"),
  // like(f, "v"), isNull(f), isNotNull(f), in(f, array(v1,v2,...))
  const fnMatch = cond.match(/^(\w+)\((.+)\)$/s);
  if (fnMatch) {
    const fn = fnMatch[1].toLowerCase();
    const rawArgs = fnMatch[2];
    const args = splitArgs(rawArgs).map((a) => {
      const t = a.trim();
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
      if (t in row) return row[t];
      return t;
    });
    const field = splitArgs(rawArgs)[0].trim();
    const fv = str(row[field]).toLowerCase();
    const v  = str(args[1]).toLowerCase();
    switch (fn) {
      case "contains":   return fv.includes(v);
      case "startswith": return fv.startsWith(v);
      case "endswith":   return fv.endsWith(v);
      case "like":       return new RegExp("^" + v.replace(/%/g, ".*").replace(/_/g, ".") + "$", "i").test(str(row[field]));
      case "isnull":     return row[field] == null;
      case "isnotnull":  return row[field] != null;
      case "in": {
        const rest = rawArgs.slice(rawArgs.indexOf(",") + 1).trim();
        return parseInList(rest).includes(str(row[field]));
      }
      case "arraycontains": {
        const arr = row[field];
        return Array.isArray(arr) && arr.map((v) => str(v)).includes(str(args[1]));
      }
    }
  }

  const m = cond.match(/^(.+?)\s*(==|!=|~>|~<|>=|<=|>|<|~|\bin\b)\s*(.+)$/);
  if (!m) {
    // Try evaluating as a boolean expression directly
    const val = evaluateExpression(condition, row);
    return val === true;
  }
  const [, leftRaw, op, rightRaw] = m;
  const leftVal = resolveValue(leftRaw.trim(), row);
  const rightVal = resolveValue(rightRaw.trim(), row);

  switch (op) {
    case "==":
      return leftVal == rightVal;
    case "!=":
      return leftVal != rightVal;
    case ">":
      return Number(leftVal) > Number(rightVal);
    case "<":
      return Number(leftVal) < Number(rightVal);
    case ">=":
      return Number(leftVal) >= Number(rightVal);
    case "<=":
      return Number(leftVal) <= Number(rightVal);
    case "~": {
      const l = String(leftVal).toLowerCase();
      const r = String(rightVal).toLowerCase().replace(/\*/g, "");
      return l.includes(r);
    }
    case "in": {
      // Operate on the raw right side: ("a", "b") or array("a", "b") or {a, b}
      return parseInList(rightRaw).includes(String(leftVal));
    }
    default:
      return false;
  }
}

/** Parse an in-list: ("a", "b"), array("a", "b"), or {a, b} → string items. */
function parseInList(raw: string): string[] {
  let inner = raw.trim();
  inner = inner.replace(/^array\s*\(/i, "(");
  if (inner.startsWith("(") && inner.endsWith(")")) inner = inner.slice(1, -1);
  else if (inner.startsWith("{") && inner.endsWith("}")) inner = inner.slice(1, -1);
  return splitArgs(inner).map((s) => {
    const t = s.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1);
    }
    return t;
  });
}

function execJoin(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const kind = str(args.kind, "inner").toLowerCase();
  const onField = str(args.on);
  const rightRecords = Array.isArray(args.records) ? (args.records as DQLRecord[]) : [];

  if (!onField) return { data, columns };

  const rightByKey = new Map<unknown, DQLRecord[]>();
  for (const row of rightRecords) {
    const k = row[onField];
    if (!rightByKey.has(k)) rightByKey.set(k, []);
    rightByKey.get(k)!.push(row);
  }

  const out: DQLRecord[] = [];
  const rightKeys = new Set<string>();
  for (const row of rightRecords) Object.keys(row).forEach((k) => rightKeys.add(k));

  for (const leftRow of data) {
    const k = leftRow[onField];
    if (k == null) continue; // null keys never match
    const matches = rightByKey.get(k);
    if (matches && matches.length > 0) {
      for (const rightRow of matches) {
        out.push({ ...leftRow, ...rightRow });
      }
    } else if (kind === "leftouter") {
      const nullFills: DQLRecord = {};
      for (const rk of rightKeys) {
        if (!(rk in leftRow)) nullFills[rk] = null;
      }
      out.push({ ...leftRow, ...nullFills });
    }
    // inner: rows with no match are dropped
  }

  const allKeys = new Set<string>();
  for (const row of out) Object.keys(row).forEach((k) => allKeys.add(k));
  const newCols = Array.from(allKeys).map((name) => {
    const existing = columns.find((c) => c.name === name);
    return existing || { name, type: "string" };
  });

  return { data: out, columns: newCols };
}

function parseAssignments(str: string): [string, string][] {
  // Split on top-level commas only (paren- and quote-aware), so function calls
  // like concat(host, "@", loglevel) are never split mid-expression.
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  let inQuotes = false;
  let quoteChar = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (!inQuotes && (ch === '"' || ch === "'")) {
      inQuotes = true; quoteChar = ch; cur += ch;
    } else if (inQuotes && ch === quoteChar && str[i - 1] !== "\\") {
      inQuotes = false; cur += ch;
    } else if (!inQuotes && (ch === "(" || ch === "[" || ch === "{")) {
      depth++; cur += ch;
    } else if (!inQuotes && (ch === ")" || ch === "]" || ch === "}")) {
      depth--; cur += ch;
    } else if (!inQuotes && depth === 0 && ch === ",") {
      if (cur.trim()) parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());

  const pairs: [string, string][] = [];
  for (const part of parts) {
    const m = part.match(/^([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*([\s\S]+)$/);
    if (m && !m[2].startsWith("=")) {
      pairs.push([m[1].trim(), m[2].trim()]);
    } else if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(part.trim())) {
      // bare field name with no =: self-reference — surface the existing field value
      pairs.push([part.trim(), part.trim()]);
    }
  }
  return pairs;
}
