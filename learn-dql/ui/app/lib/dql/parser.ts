import type { PipelineStage, DQLCommandName } from "../types/dql";

export function parsePipeline(query: string): PipelineStage[] {
  const stages: PipelineStage[] = [];
  const parts = query.split("|").map((p) => p.trim()).filter(Boolean);
  let idCounter = 0;

  for (const part of parts) {
    const cmd = parseCommand(part);
    if (cmd) {
      stages.push({
        id: `stage-${idCounter++}`,
        command: cmd.name,
        args: cmd.args,
        raw: part,
      });
    }
  }

  return stages;
}

function parseCommand(raw: string): { name: DQLCommandName; args: Record<string, unknown> } | null {
  const tokens = tokenize(raw);
  if (tokens.length === 0) return null;

  const name = tokens[0] as DQLCommandName;
  const rest = tokens.slice(1).join(" ");

  const args: Record<string, unknown> = {};

  switch (name) {
    case "fetch": {
      const m = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(.*)/);
      if (m) {
        args.source = m[1];
        const opts = m[2];
        const fromMatch = opts.match(/from:\s*([^,\s]+)/);
        if (fromMatch) args.from = fromMatch[1];
        const toMatch = opts.match(/to:\s*([^,\s]+)/);
        if (toMatch) args.to = toMatch[1];
      }
      break;
    }
    case "filter":
      args.condition = rest;
      break;
    case "filterOut":
      args.condition = rest;
      break;
    case "search":
      args.term = rest.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      break;
    case "fields":
    case "fieldsKeep":
      args.fields = rest;
      break;
    case "fieldsAdd":
      args.assignments = rest;
      break;
    case "fieldsRemove":
      args.fields = rest;
      break;
    case "fieldsRename":
      args.assignments = rest;
      break;
    case "sort":
      {
        const sortMatch = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(asc|desc)?/i);
        if (sortMatch) {
          args.field = sortMatch[1];
          args.direction = (sortMatch[2] || "asc").toLowerCase();
        }
      }
      break;
    case "limit": {
      const limitArg = rest.trim();
      const limitN = Number(limitArg);
      if (limitArg && isNaN(limitN)) {
        throw new Error(`'limit' expects a number, got "${limitArg}" — try: limit 10`);
      }
      args.count = isNaN(limitN) ? 100 : Math.max(0, Math.floor(limitN));
      break;
    }
    case "summarize": {
      // Split by the "by:" keyword
      const byIdx = rest.search(/\bby\s*:/i);
      const aggPart = byIdx >= 0 ? rest.slice(0, byIdx).trim() : rest;
      const byPart  = byIdx >= 0 ? rest.slice(byIdx).replace(/^by\s*:\s*\{?/i, "").replace(/\}$/, "").trim() : "";

      if (byPart) args.by = byPart;

      // Parse all agg expressions: alias = func(field) or func(field)
      const aggPattern = /(\w+)\s*=\s*(\w+)\(([^)]*)\)/g;
      const aggs: Array<{ alias: string; aggregation: string; aggField: string; condition?: string }> = [];
      let m;
      while ((m = aggPattern.exec(aggPart)) !== null) {
        const [, mAlias, mAggregation, mAggField] = m as [string, string, string, string];
        aggs.push({ alias: mAlias, aggregation: mAggregation.toLowerCase(), aggField: mAggField.trim() });
      }
      // Bare count() with no alias
      if (aggs.length === 0) {
        const bareCount = aggPart.match(/count\(\)/i);
        if (bareCount) aggs.push({ alias: "count", aggregation: "count", aggField: "" });
      }
      if (aggs.length === 1) {
        args.alias = aggs[0].alias;
        args.aggregation = aggs[0].aggregation;
        args.aggField = aggs[0].aggField;
      } else if (aggs.length > 1) {
        args.aggs = aggs;
        args.alias = aggs[0].alias;
        args.aggregation = aggs[0].aggregation;
        args.aggField = aggs[0].aggField;
      }
      break;
    }
    case "makeTimeseries": {
      const aggMatch = rest.match(/(\w+)\s*=\s*(\w+)\(([^)]*)\)/);
      if (aggMatch) {
        args.alias = aggMatch[1];
        args.aggregation = aggMatch[2];
        args.aggField = aggMatch[3];
      }
      const intervalMatch = rest.match(/interval:\s*(\S+)/);
      if (intervalMatch) {
        args.interval = intervalMatch[1];
      }
      const byMatch = rest.match(/by:\s*\{?([^}]+)\}?/);
      if (byMatch) {
        args.by = byMatch[1].trim();
      }
      break;
    }
    case "dedup":
      args.field = rest.split(",")[0].trim();
      break;
    case "parse": {
      // Try quoted pattern first: parse field, "pattern"
      const parseQuoted = rest.match(/^([A-Za-z_][A-Za-z0-9_]*),\s*"(.+?)"/);
      if (parseQuoted) {
        args.field = parseQuoted[1];
        args.pattern = parseQuoted[2];
        break;
      }
      // Unquoted pattern: parse field, JSON:alias  |  parse field, KVP:alias  |  parse field, TYPE:name ...
      const parseUnquoted = rest.match(/^([A-Za-z_][A-Za-z0-9_]*),\s*(.+)/);
      if (parseUnquoted) {
        args.field = parseUnquoted[1];
        args.pattern = parseUnquoted[2].trim();
      }
      break;
    }
    case "expand":
      args.field = rest.trim();
      break;
    case "append":
      args.raw = rest;
      break;
    case "join": {
      // join [subquery], kind: inner|leftOuter, on: {field}
      // For offline use, args.records is pre-seeded by the scenario; we just extract kind + on.
      const kindMatch = rest.match(/\bkind\s*:\s*(\w+)/i);
      if (kindMatch) args.kind = kindMatch[1].toLowerCase();
      const onMatch = rest.match(/\bon\s*:\s*\{?(\w+)\}?/i);
      if (onMatch) args.on = onMatch[1];
      args.raw = rest;
      break;
    }
    case "lookup": {
      // lookup sourceField:fieldName, lookupField:fieldName [, prefix:value]
      const sfMatch = rest.match(/\bsourceField\s*:\s*([A-Za-z_][A-Za-z0-9_.]*)/i);
      if (sfMatch) args.sourceField = sfMatch[1];
      const lfMatch = rest.match(/\blookupField\s*:\s*([A-Za-z_][A-Za-z0-9_.]*)/i);
      if (lfMatch) args.lookupField = lfMatch[1];
      const prefixMatch = rest.match(/\bprefix\s*:\s*([A-Za-z_][A-Za-z0-9_.]*)/i);
      if (prefixMatch) args.prefix = prefixMatch[1];
      // args.records is left unpopulated — scenarios pre-seed it
      args.raw = rest;
      break;
    }
    case "timeseries":
      args.raw = rest;
      break;
    case "data":
      args.raw = rest;
      break;
    default:
      args.raw = rest;
  }

  return { name, args };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (!inQuotes && (ch === '"' || ch === "'")) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      inQuotes = true;
      quoteChar = ch;
      current += ch;
    } else if (inQuotes && ch === quoteChar && input[i - 1] !== "\\") {
      current += ch;
      tokens.push(current);
      current = "";
      inQuotes = false;
      quoteChar = "";
    } else if (!inQuotes && /\s/.test(ch)) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}
