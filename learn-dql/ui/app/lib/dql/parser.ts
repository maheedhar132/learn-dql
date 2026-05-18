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
    case "limit":
      args.count = Number(rest) || 100;
      break;
    case "summarize": {
      const aggMatch = rest.match(/(\w+)\s*=\s*(\w+)\(([^)]*)\)/);
      if (aggMatch) {
        args.alias = aggMatch[1];
        args.aggregation = aggMatch[2];
        args.aggField = aggMatch[3];
      }
      const byMatch = rest.match(/by:\s*\{?([^}]+)\}?/);
      if (byMatch) {
        args.by = byMatch[1].trim();
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
      const parseMatch = rest.match(/^([A-Za-z_][A-Za-z0-9_]*),\s*"(.+?)"/);
      if (parseMatch) {
        args.field = parseMatch[1];
        args.pattern = parseMatch[2];
      }
      break;
    }
    case "expand":
      args.field = rest.trim();
      break;
    case "append":
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
