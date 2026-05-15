import type { DQLRecord, DQLColumn } from "@/lib/types/dql";

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
    case "expand":
      return execExpand(data, columns, args);
    case "append":
      return execAppend(data, columns, args);
    case "makeTimeseries":
      return execMakeTimeseries(data, columns, args);
    default:
      return { data, columns };
  }
}

function execData(args: Record<string, unknown>): { data: DQLRecord[]; columns: DQLColumn[] } {
  const raw = String(args.raw || "[]");
  try {
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : [parsed];
    const keys = new Set<string>();
    for (const r of records) {
      if (r && typeof r === "object") {
        Object.keys(r).forEach((k) => keys.add(k));
      }
    }
    const cols = Array.from(keys).map((name) => ({ name, type: "string" }));
    return { data: records as DQLRecord[], columns: cols };
  } catch {
    return { data: [], columns: [] };
  }
}

function execFilter(data: DQLRecord[], args: Record<string, unknown>): DQLRecord[] {
  const condition = String(args.condition || "");
  return data.filter((row) => evaluateCondition(condition, row));
}

function execFilterOut(data: DQLRecord[], args: Record<string, unknown>): DQLRecord[] {
  const condition = String(args.condition || "");
  return data.filter((row) => !evaluateCondition(condition, row));
}

function execFieldsKeep(
  data: DQLRecord[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const fieldList = String(args.fields || "").split(",").map((f) => f.trim()).filter(Boolean);
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
  const assignments = String(args.assignments || "");
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
  const fieldList = String(args.fields || "").split(",").map((f) => f.trim()).filter(Boolean);
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
  const pairs = parseAssignments(String(args.assignments || ""));
  const out = data.map((row) => {
    const clone = { ...row };
    for (const [oldName, newNameExpr] of pairs) {
      const newName = newNameExpr.trim();
      if (oldName in clone) {
        clone[newName] = clone[oldName];
        delete clone[oldName];
      }
    }
    return clone;
  });
  const colMap = new Map(pairs);
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
  const field = String(args.field || "timestamp");
  const direction = String(args.direction || "asc");
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
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });
  return { data: sorted, columns };
}

function execSummarize(
  data: DQLRecord[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const byField = String(args.by || "").trim();
  const aggregation = String(args.aggregation || "count");
  const aggField = String(args.aggField || "");
  const alias = String(args.alias || "count");

  if (!byField) {
    let val = 0;
    if (aggregation === "count") val = data.length;
    else if (aggregation === "sum") val = data.reduce((s, r) => s + Number(r[aggField] || 0), 0);
    else if (aggregation === "avg") {
      const nums = data.map((r) => Number(r[aggField] || 0));
      val = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    }
    return {
      data: [{ [alias]: val }],
      columns: [{ name: alias, type: "long" }],
    };
  }

  const groups = new Map<string | number, DQLRecord[]>();
  for (const row of data) {
    const key = row[byField] ?? "null";
    if (!groups.has(key as string | number)) groups.set(key as string | number, []);
    groups.get(key as string | number)!.push(row);
  }

  const out: DQLRecord[] = [];
  for (const [key, rows] of groups) {
    const obj: DQLRecord = { [byField]: key };
    if (aggregation === "count") obj[alias] = rows.length;
    else if (aggregation === "sum") obj[alias] = rows.reduce((s, r) => s + Number(r[aggField] || 0), 0);
    else if (aggregation === "avg") {
      const nums = rows.map((r) => Number(r[aggField] || 0));
      obj[alias] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    }
    out.push(obj);
  }

  return {
    data: out,
    columns: [
      { name: byField, type: "string" },
      { name: alias, type: "long" },
    ],
  };
}

function execDedup(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const field = String(args.field || "");
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
  const term = String(args.term || "").toLowerCase();
  if (!term) return { data, columns };
  return {
    data: data.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(term))
    ),
    columns,
  };
}

function execParse(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const field = String(args.field || "content");
  const pattern = String(args.pattern || "");
  if (!pattern) return { data, columns };

  const newCols = [...columns];
  const out = data.map((row) => {
    const clone = { ...row };
    const content = String(row[field] || "");
    const matches = pattern.match(/([A-Za-z_][A-Za-z0-9_]*):([A-Za-z_][A-Za-z0-9_]*)/g);
    if (matches) {
      for (const m of matches) {
        const [, name] = m.split(":");
        const regex = new RegExp(`${name}=([^\\s,;]+)`);
        const found = content.match(regex);
        if (found) {
          clone[name] = isNaN(Number(found[1])) ? found[1] : Number(found[1]);
          if (!newCols.find((c) => c.name === name)) {
            newCols.push({ name, type: isNaN(Number(found[1])) ? "string" : "long" });
          }
        }
      }
    }
    return clone;
  });

  return { data: out, columns: newCols };
}

function execExpand(
  data: DQLRecord[],
  columns: DQLColumn[],
  args: Record<string, unknown>
): { data: DQLRecord[]; columns: DQLColumn[] } {
  const field = String(args.field || "");
  if (!field) return { data, columns };
  const out: DQLRecord[] = [];
  for (const row of data) {
    const arr = row[field];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        out.push({ ...row, [field]: item });
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
  const records = (args.records as DQLRecord[]) || [];
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
  const intervalStr = String(args.interval || "1h");
  const byField = String(args.by || "").trim();
  const aggregation = String(args.aggregation || "count");
  const aggField = String(args.aggField || "");
  const alias = String(args.alias || aggregation);
  const timeField = String(args.time || "timestamp");

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
    const groupKey = byField ? String(row[byField] ?? "null") : "_all";
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

function evaluateExpression(expr: string, row: DQLRecord): unknown {
  const clean = expr.trim();

  // Handle if(condition, then, else)
  const ifMatch = clean.match(/^if\s*\((.+?)\s*,\s*(.+?)\s*,\s*(.+)\)$/);
  if (ifMatch) {
    const cond = evaluateCondition(ifMatch[1].trim(), row);
    return cond ? evaluateExpression(ifMatch[2].trim(), row) : evaluateExpression(ifMatch[3].trim(), row);
  }

  if (clean.startsWith('"') && clean.endsWith('"')) return clean.slice(1, -1);
  if (clean.startsWith("'") && clean.endsWith("'")) return clean.slice(1, -1);
  if (!isNaN(Number(clean))) return Number(clean);

  // Arithmetic
  if (clean.includes("+")) {
    const parts = clean.split("+").map((p) => Number(resolveValue(p.trim(), row)) || 0);
    return parts.reduce((a, b) => a + b, 0);
  }
  if (clean.includes("-")) {
    const parts = clean.split("-").map((p) => Number(resolveValue(p.trim(), row)) || 0);
    return parts[0] - parts.slice(1).reduce((a, b) => a + b, 0);
  }
  if (clean.includes("*")) {
    const parts = clean.split("*").map((p) => Number(resolveValue(p.trim(), row)) || 0);
    return parts.reduce((a, b) => a * b, 1);
  }
  if (clean.includes("/")) {
    const parts = clean.split("/").map((p) => Number(resolveValue(p.trim(), row)) || 0);
    return parts.slice(1).reduce((a, b) => (b === 0 ? 0 : a / b), parts[0]);
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
  return t;
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
  // Handle OR (lowest precedence)
  const orParts = splitByOperator(condition, " or ");
  if (orParts.length > 1) {
    return orParts.some((part) => evaluateCondition(part, row));
  }

  // Handle AND (higher precedence)
  const andParts = splitByOperator(condition, " and ");
  if (andParts.length > 1) {
    return andParts.every((part) => evaluateCondition(part, row));
  }

  const m = condition.match(/^(.+?)\s*(==|!=|~>|~<|>=|<=|>|<|~|in)\s*(.+)$/);
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
      const vals = String(rightVal)
        .replace(/array\((.*)\)/, "$1")
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""));
      return vals.includes(String(leftVal));
    }
    default:
      return false;
  }
}

function parseAssignments(str: string): [string, string][] {
  const pairs: [string, string][] = [];
  const regex = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)(?=,\s*[A-Za-z_]|$)/g;
  let m;
  while ((m = regex.exec(str)) !== null) {
    pairs.push([m[1].trim(), m[2].trim()]);
  }
  return pairs;
}
