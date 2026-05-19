import type { Scenario } from "../types/dql";
import {
  generateAuthLogs,
  generateAppLogs,
  generateDbLogs,
  generateBizEvents,
  generateSpans,
  generatePaymentLogs,
  generateEventsWithTags,
} from "./log-generator";

// ─────────────────────────────────────────────────────────────────────────────
// DQL Learning Curriculum — 30 scenarios across 10 modules.
//
// Every step's `expectedPipeline` is written against the *actual* fields each
// generator produces (see log-generator.ts), so the offline engine can execute
// the reference pipeline and validate user queries by comparing result sets.
//
// Real top-level fields by generator:
//   generateAuthLogs   -> timestamp, loglevel, log.source, content, host
//   generateAppLogs    -> timestamp, loglevel, content, host
//   generateDbLogs     -> timestamp, loglevel, log.source, content, host, duration_ms
//   generateBizEvents  -> timestamp, event.type, order_id, amount, currency,
//                          product, accountId, region, customer_tier (+ status,
//                          method, reason, etc. on a subset of records)
//   generateSpans      -> timestamp, span.name, duration, status.code,
//                          service.name, endpoint
//   generatePaymentLogs-> timestamp, loglevel, content, host
//   generateEventsWithTags -> timestamp, event.type, service, host (+ status,
//                          severity, version, instances, tags on a subset)
//
// All scenarios use track: "dql". No parse steps.
// ─────────────────────────────────────────────────────────────────────────────

export const scenarios: Scenario[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 1 — Data Sources (Beginner)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-ds-001",
    title: "Choosing a Data Source",
    company: "Acme Corp",
    briefing:
      "Acme's observability platform stores logs, spans, and business events in Grail. Before you can analyze anything, you must learn how to point a query at the right data source with `fetch`.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Fetch logs",
        narration:
          "Every DQL query starts by selecting a data source. `fetch logs` loads the raw log records that the rest of the pipeline will refine.",
        lesson: "fetch logs",
        goal: "Load the application log records into the pipeline.",
        hint: "fetch logs",
        sampleData: generateAppLogs(200, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
        ],
      },
      {
        id: "step-2",
        title: "Fetch spans",
        narration:
          "Distributed traces are made of spans. Switching the source to `spans` lets you analyze request latency instead of log lines.",
        lesson: "fetch spans",
        goal: "Load span (trace) records instead of logs.",
        hint: "fetch spans",
        sampleData: generateSpans(200, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "spans" }, raw: "fetch spans" },
        ],
      },
      {
        id: "step-3",
        title: "Fetch business events",
        narration:
          "Business events capture domain activity like orders and payments. `fetch bizevents` is the source for revenue and funnel analysis.",
        lesson: "fetch bizevents",
        goal: "Load business event records.",
        hint: "fetch bizevents",
        sampleData: generateBizEvents(200, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "bizevents" }, raw: "fetch bizevents" },
        ],
      },
    ],
  },
  {
    id: "case-ds-002",
    title: "Comparison Filters",
    company: "SecureBank",
    briefing:
      "SecureBank's SOC needs to slice authentication logs by exact values and thresholds. Master the core comparison operators: ==, !=, >, and <.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Filter by equality",
        narration:
          "The `==` operator keeps only records whose field matches a value exactly. Start by isolating failed logins (ERROR level).",
        lesson: 'fetch logs\n| filter loglevel == "ERROR"',
        goal: "Keep only ERROR-level authentication records.",
        hint: 'filter loglevel == "ERROR"',
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter by inequality",
        narration:
          "`!=` is the inverse — it removes the matching records. Use it to drop the noisy DEBUG entries so only meaningful events remain.",
        lesson: 'fetch logs\n| filter loglevel != "DEBUG"',
        goal: "Exclude DEBUG records, keeping everything else.",
        hint: 'filter loglevel != "DEBUG"',
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel != "DEBUG"' }, raw: 'filter loglevel != "DEBUG"' },
        ],
      },
      {
        id: "step-3",
        title: "Combine equality with a substring match",
        narration:
          "Filters compose. Combine an exact level match with a `contains()` check on the message to find failed logins specifically targeting the admin account.",
        lesson: 'fetch logs\n| filter loglevel == "ERROR" and contains(content, "user=admin")',
        goal: "Keep ERROR records whose content mentions the admin user.",
        hint: 'filter loglevel == "ERROR" and contains(content, "user=admin")',
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "filter",
            args: { condition: 'loglevel == "ERROR" and contains(content, "user=admin")' },
            raw: 'filter loglevel == "ERROR" and contains(content, "user=admin")',
          },
        ],
      },
    ],
  },
  {
    id: "case-ds-003",
    title: "Excluding Noise with filterOut and search",
    company: "CloudScale",
    briefing:
      "CloudScale's application logs are dominated by routine chatter. Learn to subtract noise with `filterOut` and to find anything quickly with full-text `search`.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Remove healthy traffic",
        narration:
          "`filterOut` keeps every record that does NOT match the condition — perfect for stripping out successful INFO traffic before an investigation.",
        lesson: 'fetch logs\n| filterOut loglevel == "INFO"',
        goal: "Drop INFO records, keeping warnings, errors, and debug.",
        hint: 'filterOut loglevel == "INFO"',
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filterOut", args: { condition: 'loglevel == "INFO"' }, raw: 'filterOut loglevel == "INFO"' },
        ],
      },
      {
        id: "step-2",
        title: "Free-text search",
        narration:
          "`search` scans every field for a term without naming a column — ideal when you do not yet know where the signal lives. Hunt for timeout problems.",
        lesson: 'fetch logs\n| search "timeout"',
        goal: "Find every record that mentions a timeout anywhere.",
        hint: 'search "timeout"',
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "search", args: { term: "timeout" }, raw: 'search "timeout"' },
        ],
      },
      {
        id: "step-3",
        title: "Search then subtract",
        narration:
          "Pipelines flow left to right. Search broadly, then `filterOut` the DEBUG diagnostics that also mention the term to keep only actionable hits.",
        lesson: 'fetch logs\n| search "connection"\n| filterOut loglevel == "DEBUG"',
        goal: "Find connection-related records but exclude DEBUG diagnostics.",
        hint: 'search "connection" then filterOut loglevel == "DEBUG"',
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "search", args: { term: "connection" }, raw: 'search "connection"' },
          { id: "e3", command: "filterOut", args: { condition: 'loglevel == "DEBUG"' }, raw: 'filterOut loglevel == "DEBUG"' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 2 — Sorting & Shaping (Beginner)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-sh-001",
    title: "Sorting and Limiting Results",
    company: "DataForge",
    briefing:
      "DataForge's DBA wants the slowest queries on the screen first. Learn to order results with `sort` and trim them with `limit`.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Sort ascending",
        narration:
          "`sort` orders records by a field. Ascending puts the smallest values first — start by sorting database calls from fastest to slowest.",
        lesson: "fetch logs\n| sort duration_ms asc",
        goal: "Order database records by duration, fastest first.",
        hint: "sort duration_ms asc",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "sort", args: { field: "duration_ms", direction: "asc" }, raw: "sort duration_ms asc" },
        ],
      },
      {
        id: "step-2",
        title: "Sort descending",
        narration:
          "Flip the direction to `desc` to surface the worst offenders first — the slow queries the DBA actually cares about.",
        lesson: "fetch logs\n| sort duration_ms desc",
        goal: "Order database records by duration, slowest first.",
        hint: "sort duration_ms desc",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "sort", args: { field: "duration_ms", direction: "desc" }, raw: "sort duration_ms desc" },
        ],
      },
      {
        id: "step-3",
        title: "Top N",
        narration:
          "Pairing a descending sort with `limit` produces a Top-N list — the ten slowest queries, ready for a dashboard tile.",
        lesson: "fetch logs\n| sort duration_ms desc\n| limit 10",
        goal: "Return only the 10 slowest database records.",
        hint: "sort duration_ms desc then limit 10",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "sort", args: { field: "duration_ms", direction: "desc" }, raw: "sort duration_ms desc" },
          { id: "e3", command: "limit", args: { count: 10 }, raw: "limit 10" },
        ],
      },
    ],
  },
  {
    id: "case-sh-002",
    title: "Projecting and Trimming Fields",
    company: "CloudScale",
    briefing:
      "Wide records are hard to read. Learn `fields` to keep only the columns you need and `fieldsRemove` to drop the ones you do not.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Keep only what matters",
        narration:
          "`fields` (a.k.a. `fieldsKeep`) projects a record down to a named set of columns, discarding everything else.",
        lesson: "fetch logs\n| fields timestamp, loglevel, host",
        goal: "Reduce each record to just timestamp, loglevel, and host.",
        hint: "fields timestamp, loglevel, host",
        sampleData: generateAppLogs(250, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fields", args: { fields: "timestamp, loglevel, host" }, raw: "fields timestamp, loglevel, host" },
        ],
      },
      {
        id: "step-2",
        title: "Drop a noisy column",
        narration:
          "When you want everything *except* one column, `fieldsRemove` is faster than listing what to keep. Drop the verbose `content` blob.",
        lesson: "fetch logs\n| fieldsRemove content",
        goal: "Remove the content field, keeping all other columns.",
        hint: "fieldsRemove content",
        sampleData: generateAppLogs(250, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsRemove", args: { fields: "content" }, raw: "fieldsRemove content" },
        ],
      },
    ],
  },
  {
    id: "case-sh-003",
    title: "Renaming and Deriving Fields",
    company: "DataForge",
    briefing:
      "Reports need friendly column names and derived metrics. Learn `fieldsRename` and `fieldsAdd` with arithmetic.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Rename a column",
        narration:
          "`fieldsRename` gives a column a report-friendly name. Rename the raw `duration_ms` to `latency_ms`.",
        lesson: "fetch logs\n| fieldsRename latency_ms = duration_ms",
        goal: "Rename duration_ms to latency_ms.",
        hint: "fieldsRename latency_ms = duration_ms",
        sampleData: generateDbLogs(250, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsRename", args: { assignments: "duration_ms = latency_ms" }, raw: "fieldsRename latency_ms = duration_ms" },
        ],
      },
      {
        id: "step-2",
        title: "Derive a new metric",
        narration:
          "`fieldsAdd` computes a new column from an expression. Convert milliseconds to seconds by dividing by 1000.",
        lesson: "fetch logs\n| fieldsAdd duration_s = duration_ms / 1000",
        goal: "Add a duration_s column equal to duration_ms / 1000.",
        hint: "fieldsAdd duration_s = duration_ms / 1000",
        sampleData: generateDbLogs(250, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "duration_s = duration_ms / 1000" }, raw: "fieldsAdd duration_s = duration_ms / 1000" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 3 — Aggregation Basics (Beginner → Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-ag-001",
    title: "Counting Records",
    company: "CloudScale",
    briefing:
      "How many log lines are there, and how do they break down by severity? Learn `summarize count()` with and without grouping.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Total count",
        narration:
          "`summarize count()` collapses every record into a single number — the total volume of logs.",
        lesson: "fetch logs\n| summarize total = count()",
        goal: "Compute the total number of log records.",
        hint: "summarize total = count()",
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "total", aggregation: "count", aggField: "", by: "" }, raw: "summarize total = count()" },
        ],
      },
      {
        id: "step-2",
        title: "Count per severity",
        narration:
          "Adding `by loglevel` produces one row per severity — the breakdown that drives a log-level pie chart.",
        lesson: "fetch logs\n| summarize total = count(), by: loglevel",
        goal: "Count records grouped by loglevel.",
        hint: "summarize total = count(), by: loglevel",
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "total", aggregation: "count", aggField: "", by: "loglevel" }, raw: "summarize total = count(), by: loglevel" },
        ],
      },
    ],
  },
  {
    id: "case-ag-002",
    title: "Summing and Averaging Money",
    company: "PayStream",
    briefing:
      "Finance wants total and average transaction value per payment host. Learn `sum()` and `avg()`.",
    difficulty: "Beginner",
    track: "dql",
    tier: "premium",
    steps: [
      {
        id: "step-1",
        title: "Derive the amount, then sum it",
        narration:
          "Payment amounts live inside the `content` blob, so first surface a numeric column, then `summarize sum()` it per host.",
        lesson:
          'fetch logs\n| fieldsAdd amt = toDouble(content)\n| summarize total = sum(amt), by: host',
        goal: "Add a numeric amt column and total it per host.",
        hint: "fieldsAdd amt = toDouble(content) then summarize total = sum(amt), by: host",
        sampleData: generatePaymentLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "amt = toDouble(content)" }, raw: "fieldsAdd amt = toDouble(content)" },
          { id: "e3", command: "summarize", args: { alias: "total", aggregation: "sum", aggField: "amt", by: "host" }, raw: "summarize total = sum(amt), by: host" },
        ],
      },
      {
        id: "step-2",
        title: "Average per host",
        narration:
          "Swap `sum()` for `avg()` to get the mean transaction value each payment node processed.",
        lesson:
          'fetch logs\n| fieldsAdd amt = toDouble(content)\n| summarize avg_amt = avg(amt), by: host',
        goal: "Compute the average amt per host.",
        hint: "summarize avg_amt = avg(amt), by: host",
        sampleData: generatePaymentLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "amt = toDouble(content)" }, raw: "fieldsAdd amt = toDouble(content)" },
          { id: "e3", command: "summarize", args: { alias: "avg_amt", aggregation: "avg", aggField: "amt", by: "host" }, raw: "summarize avg_amt = avg(amt), by: host" },
        ],
      },
    ],
  },
  {
    id: "case-ag-003",
    title: "Fastest and Slowest Queries",
    company: "DataForge",
    briefing:
      "What is the best- and worst-case database latency per host? Learn `min()` and `max()`.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Minimum latency",
        narration:
          "`min()` returns the smallest value in each group — the best-case query time per database host.",
        lesson: "fetch logs\n| summarize fastest = min(duration_ms), by: host",
        goal: "Find the minimum duration_ms per host.",
        hint: "summarize fastest = min(duration_ms), by: host",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "fastest", aggregation: "min", aggField: "duration_ms", by: "host" }, raw: "summarize fastest = min(duration_ms), by: host" },
        ],
      },
      {
        id: "step-2",
        title: "Maximum latency",
        narration:
          "`max()` exposes the worst-case latency per host — the spikes a reliability team must explain.",
        lesson: "fetch logs\n| summarize slowest = max(duration_ms), by: host",
        goal: "Find the maximum duration_ms per host.",
        hint: "summarize slowest = max(duration_ms), by: host",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "slowest", aggregation: "max", aggField: "duration_ms", by: "host" }, raw: "summarize slowest = max(duration_ms), by: host" },
        ],
      },
    ],
  },
  {
    id: "case-ag-004",
    title: "Deduplicating Records",
    company: "SecureBank",
    briefing:
      "The audit list should show each host once. Learn `dedup` to collapse repeats by a key field.",
    difficulty: "Beginner",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "One row per host",
        narration:
          "`dedup` keeps the first record for each distinct value of a field — here, one representative line per auth host.",
        lesson: "fetch logs\n| dedup host",
        goal: "Keep only the first record per distinct host.",
        hint: "dedup host",
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "dedup", args: { field: "host" }, raw: "dedup host" },
        ],
      },
      {
        id: "step-2",
        title: "Dedup after filtering",
        narration:
          "Order matters: filter to errors first, then `dedup host` to list exactly which hosts experienced a failed login.",
        lesson: 'fetch logs\n| filter loglevel == "ERROR"\n| dedup host',
        goal: "List each host that had at least one ERROR, once.",
        hint: 'filter loglevel == "ERROR" then dedup host',
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "dedup", args: { field: "host" }, raw: "dedup host" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 4 — Advanced Aggregation (Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-ag-005",
    title: "Grouping by Multiple Dimensions",
    company: "CloudScale",
    briefing:
      "A single grouping key is rarely enough. Learn to `summarize ... by` two fields at once for a cross-tab view.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Count by level and host",
        narration:
          "Listing two `by` fields produces one row per (loglevel, host) combination — the matrix behind a heatmap.",
        lesson: "fetch logs\n| summarize n = count(), by: loglevel, host",
        goal: "Count records grouped by both loglevel and host.",
        hint: "summarize n = count(), by: loglevel, host",
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "loglevel, host" }, raw: "summarize n = count(), by: loglevel, host" },
        ],
      },
      {
        id: "step-2",
        title: "Focus on errors per host",
        narration:
          "Filter to ERROR first, then group by host — a tighter view of which hosts are failing and how often.",
        lesson: 'fetch logs\n| filter loglevel == "ERROR"\n| summarize errors = count(), by: host',
        goal: "Count ERROR records per host.",
        hint: 'filter loglevel == "ERROR" then summarize errors = count(), by: host',
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "host" }, raw: "summarize errors = count(), by: host" },
        ],
      },
    ],
  },
  {
    id: "case-ag-006",
    title: "Multiple Aggregations at Once",
    company: "DataForge",
    briefing:
      "Reports often need a count and an average side by side. Learn the multi-aggregation `summarize` form.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Count and average together",
        narration:
          "A single `summarize` can carry several aggregations. Get both the query volume and the mean latency per host in one pass.",
        lesson:
          "fetch logs\n| summarize n = count(), avg_ms = avg(duration_ms), by: host",
        goal: "Per host, compute both the record count and the average duration_ms.",
        hint: "summarize n = count(), avg_ms = avg(duration_ms), by: host",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "summarize",
            args: {
              aggs: [
                { alias: "n", aggregation: "count", aggField: "" },
                { alias: "avg_ms", aggregation: "avg", aggField: "duration_ms" },
              ],
              by: "host",
            },
            raw: "summarize n = count(), avg_ms = avg(duration_ms), by: host",
          },
        ],
      },
      {
        id: "step-2",
        title: "Add the worst case",
        narration:
          "Extend the same summarize with a `max()` to capture the slowest query alongside the count and average.",
        lesson:
          "fetch logs\n| summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host",
        goal: "Per host, compute count, average, and max of duration_ms.",
        hint: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "summarize",
            args: {
              aggs: [
                { alias: "n", aggregation: "count", aggField: "" },
                { alias: "avg_ms", aggregation: "avg", aggField: "duration_ms" },
                { alias: "max_ms", aggregation: "max", aggField: "duration_ms" },
              ],
              by: "host",
            },
            raw: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host",
          },
        ],
      },
    ],
  },
  {
    id: "case-ag-007",
    title: "Percentiles and Medians",
    company: "DataForge",
    briefing:
      "Averages hide outliers. Learn `median()` and `percentile()` to describe latency the way SREs do.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "premium",
    steps: [
      {
        id: "step-1",
        title: "Median latency",
        narration:
          "The median is the middle value — far more robust to spikes than the mean. Compute it per database host.",
        lesson: "fetch logs\n| summarize p50 = median(duration_ms), by: host",
        goal: "Compute the median duration_ms per host.",
        hint: "summarize p50 = median(duration_ms), by: host",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "p50", aggregation: "median", aggField: "duration_ms", by: "host" }, raw: "summarize p50 = median(duration_ms), by: host" },
        ],
      },
      {
        id: "step-2",
        title: "95th percentile",
        narration:
          "`percentile()` describes the tail. The p95 latency is the value 95% of queries stay under — a classic SLO metric.",
        lesson: "fetch logs\n| summarize p95 = percentile(duration_ms, 95), by: host",
        goal: "Compute the 95th-percentile duration_ms per host.",
        hint: "summarize p95 = percentile(duration_ms, 95), by: host",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "p95", aggregation: "percentile", aggField: "duration_ms", by: "host" }, raw: "summarize p95 = percentile(duration_ms, 95), by: host" },
        ],
      },
    ],
  },
  {
    id: "case-ag-008",
    title: "Bucketing Counts Over Time",
    company: "CloudScale",
    briefing:
      "Trends only appear when you bucket by time. Meet `makeTimeseries`, the foundation of every time chart.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Records per 15 minutes",
        narration:
          "`makeTimeseries count()` groups records into fixed time buckets, yielding one point per interval for a line chart.",
        lesson: "fetch logs\n| makeTimeseries count(), interval: 15m",
        goal: "Produce a 15-minute count timeseries of all log records.",
        hint: "makeTimeseries count(), interval: 15m",
        sampleData: generateAppLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "15m", alias: "count", by: "" }, raw: "makeTimeseries count(), interval: 15m" },
        ],
      },
      {
        id: "step-2",
        title: "Errors over time",
        narration:
          "Filter to ERROR first, then bucket — the shape of an incident as it unfolds.",
        lesson: 'fetch logs\n| filter loglevel == "ERROR"\n| makeTimeseries count(), interval: 15m',
        goal: "Produce a 15-minute count timeseries of ERROR records only.",
        hint: 'filter loglevel == "ERROR" then makeTimeseries count(), interval: 15m',
        sampleData: generateAppLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "15m", alias: "count", by: "" }, raw: "makeTimeseries count(), interval: 15m" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 5 — Field Computation (Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-fc-001",
    title: "Conditional Columns with if()",
    company: "CloudScale",
    briefing:
      "Triage is easier when every record carries a severity label. Learn `fieldsAdd` with the `if()` function.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Flag the errors",
        narration:
          "`if(cond, a, b)` returns `a` when the condition holds, otherwise `b`. Tag each record as critical or normal.",
        lesson:
          'fetch logs\n| fieldsAdd severity_flag = if(loglevel == "ERROR", "critical", "normal")',
        goal: 'Add severity_flag = "critical" for ERROR records, else "normal".',
        hint: 'fieldsAdd severity_flag = if(loglevel == "ERROR", "critical", "normal")',
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "fieldsAdd",
            args: { assignments: 'severity_flag = if(loglevel == "ERROR", "critical", "normal")' },
            raw: 'fieldsAdd severity_flag = if(loglevel == "ERROR", "critical", "normal")',
          },
        ],
      },
      {
        id: "step-2",
        title: "Summarize by the derived flag",
        narration:
          "Derived columns behave like any other — group by `severity_flag` to count critical vs. normal traffic.",
        lesson:
          'fetch logs\n| fieldsAdd severity_flag = if(loglevel == "ERROR", "critical", "normal")\n| summarize n = count(), by: severity_flag',
        goal: "Count records grouped by the derived severity_flag.",
        hint: "fieldsAdd severity_flag = ... then summarize n = count(), by: severity_flag",
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "fieldsAdd",
            args: { assignments: 'severity_flag = if(loglevel == "ERROR", "critical", "normal")' },
            raw: 'fieldsAdd severity_flag = if(loglevel == "ERROR", "critical", "normal")',
          },
          { id: "e3", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "severity_flag" }, raw: "summarize n = count(), by: severity_flag" },
        ],
      },
    ],
  },
  {
    id: "case-fc-002",
    title: "Filling Gaps with coalesce()",
    company: "CloudScale",
    briefing:
      "Optional fields are often missing. Learn to detect nulls with `isNull()` and supply defaults with `coalesce()`. (App logs have no optional columns, so we use enriched business events.)",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Find records missing a status",
        narration:
          "Not every event carries a `status`. `isNull(status)` keeps exactly the records where it is absent.",
        lesson: "fetch bizevents\n| filter isNull(status)",
        goal: "Keep only events that have no status field.",
        hint: "filter isNull(status)",
        sampleData: generateBizEvents(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "bizevents" }, raw: "fetch bizevents" },
          { id: "e2", command: "filter", args: { condition: "isNull(status)" }, raw: "filter isNull(status)" },
        ],
      },
      {
        id: "step-2",
        title: "Default the missing status",
        narration:
          "`coalesce(a, b)` returns the first non-empty value. Backfill a readable default so every row has a status.",
        lesson:
          'fetch bizevents\n| fieldsAdd status_clean = coalesce(status, "unknown")',
        goal: 'Add status_clean = status, or "unknown" when status is missing.',
        hint: 'fieldsAdd status_clean = coalesce(status, "unknown")',
        sampleData: generateBizEvents(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "bizevents" }, raw: "fetch bizevents" },
          {
            id: "e2",
            command: "fieldsAdd",
            args: { assignments: 'status_clean = coalesce(status, "unknown")' },
            raw: 'fieldsAdd status_clean = coalesce(status, "unknown")',
          },
        ],
      },
    ],
  },
  {
    id: "case-fc-003",
    title: "Numeric Cleanup with round() and abs()",
    company: "DataForge",
    briefing:
      "Raw metrics need rounding and sign normalization before they reach a report. Learn the math helpers.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Round seconds",
        narration:
          "Convert milliseconds to seconds and `round()` the result so the report shows whole numbers.",
        lesson:
          "fetch logs\n| fieldsAdd duration_s = round(duration_ms / 1000)",
        goal: "Add duration_s = round(duration_ms / 1000).",
        hint: "fieldsAdd duration_s = round(duration_ms / 1000)",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "duration_s = round(duration_ms / 1000)" }, raw: "fieldsAdd duration_s = round(duration_ms / 1000)" },
        ],
      },
      {
        id: "step-2",
        title: "Absolute deviation from a baseline",
        narration:
          "`abs()` strips the sign, turning a signed deviation into a magnitude. Measure how far each query is from a 500ms baseline.",
        lesson:
          "fetch logs\n| fieldsAdd deviation = abs(duration_ms - 500)",
        goal: "Add deviation = abs(duration_ms - 500).",
        hint: "fieldsAdd deviation = abs(duration_ms - 500)",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "deviation = abs(duration_ms - 500)" }, raw: "fieldsAdd deviation = abs(duration_ms - 500)" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 6 — String Functions (Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-str-001",
    title: "Substring Matching",
    company: "CloudScale",
    briefing:
      "Targeted text matching beats blind search. Learn `contains()` and `startsWith()` inside filters.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "contains()",
        narration:
          "`contains(field, term)` is a precise substring test on one column. Find every record that mentions a memory problem.",
        lesson: 'fetch logs\n| filter contains(content, "memory")',
        goal: "Keep records whose content contains the word 'memory'.",
        hint: 'filter contains(content, "memory")',
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'contains(content, "memory")' }, raw: 'filter contains(content, "memory")' },
        ],
      },
      {
        id: "step-2",
        title: "startsWith()",
        narration:
          "`startsWith()` anchors the match to the beginning of the value. Use it on loglevel to keep only the records whose severity begins with 'ERR'.",
        lesson: 'fetch logs\n| filter startsWith(loglevel, "ERR")',
        goal: "Keep records whose loglevel begins with 'ERR'.",
        hint: 'filter startsWith(loglevel, "ERR")',
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'startsWith(loglevel, "ERR")' }, raw: 'filter startsWith(loglevel, "ERR")' },
        ],
      },
    ],
  },
  {
    id: "case-str-002",
    title: "Suffix and Pattern Matching",
    company: "SecureBank",
    briefing:
      "Sometimes you need the end of a string, or a wildcard. Learn `endsWith()` and `like()`.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "endsWith()",
        narration:
          "Failed-login messages end with `attempts=5`. `endsWith()` anchors the match to the tail of the value.",
        lesson: 'fetch logs\n| filter endsWith(content, "attempts=5")',
        goal: "Keep records whose content ends with 'attempts=5'.",
        hint: 'filter endsWith(content, "attempts=5")',
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'endsWith(content, "attempts=5")' }, raw: 'filter endsWith(content, "attempts=5")' },
        ],
      },
      {
        id: "step-2",
        title: "like() wildcards",
        narration:
          "`like()` uses `%` as a wildcard, like SQL. Match any message that contains an admin login attempt regardless of surrounding text.",
        lesson: 'fetch logs\n| filter like(content, "%user=admin%")',
        goal: "Keep records whose content matches the pattern %user=admin%.",
        hint: 'filter like(content, "%user=admin%")',
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'like(content, "%user=admin%")' }, raw: 'filter like(content, "%user=admin%")' },
        ],
      },
    ],
  },
  {
    id: "case-str-003",
    title: "Case and Concatenation",
    company: "SecureBank",
    briefing:
      "Normalize and combine string columns for readable reports. Learn `upper()`, `lower()`, and `concat()`.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Normalize case",
        narration:
          "`lower()` and `upper()` normalize text so comparisons and grouping are consistent regardless of original casing.",
        lesson:
          "fetch logs\n| fieldsAdd level_lc = lower(loglevel), host_uc = upper(host)",
        goal: "Add a lowercased loglevel and an uppercased host.",
        hint: "fieldsAdd level_lc = lower(loglevel), host_uc = upper(host)",
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "fieldsAdd",
            args: { assignments: "level_lc = lower(loglevel), host_uc = upper(host)" },
            raw: "fieldsAdd level_lc = lower(loglevel), host_uc = upper(host)",
          },
        ],
      },
      {
        id: "step-2",
        title: "Build a label",
        narration:
          "`concat()` joins values into one string. Build a compact `host@level` label for chart axes.",
        lesson:
          'fetch logs\n| fieldsAdd label = concat(host, "@", loglevel)',
        goal: 'Add label = host + "@" + loglevel.',
        hint: 'fieldsAdd label = concat(host, "@", loglevel)',
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: 'label = concat(host, "@", loglevel)' }, raw: 'fieldsAdd label = concat(host, "@", loglevel)' },
        ],
      },
    ],
  },
  {
    id: "case-str-004",
    title: "Slicing and Replacing Strings",
    company: "SecureBank",
    briefing:
      "Extract fixed-width prefixes and scrub tokens. Learn `substring()` and `replaceString()`.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "substring()",
        narration:
          "`substring(field, start, len)` extracts a fixed slice — useful for pulling a code or prefix out of a longer value.",
        lesson:
          "fetch logs\n| fieldsAdd prefix = substring(content, 0, 5)",
        goal: "Add prefix = the first 5 characters of content.",
        hint: "fieldsAdd prefix = substring(content, 0, 5)",
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "prefix = substring(content, 0, 5)" }, raw: "fieldsAdd prefix = substring(content, 0, 5)" },
        ],
      },
      {
        id: "step-2",
        title: "replaceString()",
        narration:
          "`replaceString(field, find, replace)` rewrites every occurrence of a token — handy for redaction or normalization.",
        lesson:
          'fetch logs\n| fieldsAdd scrubbed = replaceString(content, "attacker_ip=", "ip=")',
        goal: 'Add scrubbed = content with "attacker_ip=" replaced by "ip=".',
        hint: 'fieldsAdd scrubbed = replaceString(content, "attacker_ip=", "ip=")',
        sampleData: generateAuthLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "fieldsAdd",
            args: { assignments: 'scrubbed = replaceString(content, "attacker_ip=", "ip=")' },
            raw: 'fieldsAdd scrubbed = replaceString(content, "attacker_ip=", "ip=")',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 7 — Null Handling & Types (Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-null-001",
    title: "Present vs. Absent Fields",
    company: "Acme Corp",
    briefing:
      "Optional event attributes are either there or not. Learn to split records with `isNull()` and `isNotNull()`. (App logs have no optional columns, so we use enriched events.)",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Only enriched events",
        narration:
          "`isNotNull(field)` keeps records where the optional field is populated — here, events that carry a deployment `status`.",
        lesson: "fetch events\n| filter isNotNull(status)",
        goal: "Keep only events that have a status field.",
        hint: "filter isNotNull(status)",
        sampleData: generateEventsWithTags(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "events" }, raw: "fetch events" },
          { id: "e2", command: "filter", args: { condition: "isNotNull(status)" }, raw: "filter isNotNull(status)" },
        ],
      },
      {
        id: "step-2",
        title: "Only sparse events",
        narration:
          "Flip to `isNull()` to inspect the records that are *missing* the attribute — often the ones that need attention.",
        lesson: "fetch events\n| filter isNull(status)",
        goal: "Keep only events that have no status field.",
        hint: "filter isNull(status)",
        sampleData: generateEventsWithTags(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "events" }, raw: "fetch events" },
          { id: "e2", command: "filter", args: { condition: "isNull(status)" }, raw: "filter isNull(status)" },
        ],
      },
    ],
  },
  {
    id: "case-null-002",
    title: "Backfilling Nulls",
    company: "Acme Corp",
    briefing:
      "Charts break on nulls. Use `coalesce()` to guarantee every row has a value before you group.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Default missing status",
        narration:
          '`coalesce(status, "none")` substitutes a placeholder wherever `status` is absent, so downstream grouping is clean.',
        lesson:
          'fetch events\n| fieldsAdd status_clean = coalesce(status, "none")',
        goal: 'Add status_clean = status, or "none" when missing.',
        hint: 'fieldsAdd status_clean = coalesce(status, "none")',
        sampleData: generateEventsWithTags(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "events" }, raw: "fetch events" },
          { id: "e2", command: "fieldsAdd", args: { assignments: 'status_clean = coalesce(status, "none")' }, raw: 'fieldsAdd status_clean = coalesce(status, "none")' },
        ],
      },
      {
        id: "step-2",
        title: "Group on the cleaned field",
        narration:
          "Now every record has a `status_clean`, so a `summarize ... by status_clean` produces a complete, gap-free breakdown.",
        lesson:
          'fetch events\n| fieldsAdd status_clean = coalesce(status, "none")\n| summarize n = count(), by: status_clean',
        goal: "Count events grouped by the backfilled status_clean.",
        hint: 'fieldsAdd status_clean = coalesce(status, "none") then summarize n = count(), by: status_clean',
        sampleData: generateEventsWithTags(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "events" }, raw: "fetch events" },
          { id: "e2", command: "fieldsAdd", args: { assignments: 'status_clean = coalesce(status, "none")' }, raw: 'fieldsAdd status_clean = coalesce(status, "none")' },
          { id: "e3", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "status_clean" }, raw: "summarize n = count(), by: status_clean" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 8 — Time Series (Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-ts-001",
    title: "Error Trend Lines",
    company: "CloudScale",
    briefing:
      "Spot an incident the moment it spikes. Build an error timeseries at 15-minute resolution.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Errors per 15 minutes",
        narration:
          "Filter to ERROR, then `makeTimeseries count()` at a 15m interval — the canonical 'is something on fire?' chart.",
        lesson:
          'fetch logs\n| filter loglevel == "ERROR"\n| makeTimeseries errors = count(), interval: 15m',
        goal: "Produce a 15-minute count timeseries of ERROR records.",
        hint: 'filter loglevel == "ERROR" then makeTimeseries errors = count(), interval: 15m',
        sampleData: generateAppLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "15m", alias: "errors", by: "" }, raw: "makeTimeseries errors = count(), interval: 15m" },
        ],
      },
      {
        id: "step-2",
        title: "Coarser hourly view",
        narration:
          "Widen the interval to 1h for an executive-level trend — fewer points, smoother shape.",
        lesson:
          'fetch logs\n| filter loglevel == "ERROR"\n| makeTimeseries errors = count(), interval: 1h',
        goal: "Produce a 1-hour count timeseries of ERROR records.",
        hint: 'filter loglevel == "ERROR" then makeTimeseries errors = count(), interval: 1h',
        sampleData: generateAppLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "1h", alias: "errors", by: "" }, raw: "makeTimeseries errors = count(), interval: 1h" },
        ],
      },
    ],
  },
  {
    id: "case-ts-002",
    title: "Per-Service Time Series",
    company: "Acme Corp",
    briefing:
      "Split a trend by service to see which one is driving it. Learn the `by` clause of `makeTimeseries`.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Spans per service over time",
        narration:
          "Adding `by: service.name` yields one series per service — a multi-line chart instead of a single line.",
        lesson: "fetch spans\n| makeTimeseries n = count(), by: service.name, interval: 15m",
        goal: "Produce a 15-minute count timeseries split by service.name.",
        hint: "makeTimeseries n = count(), by: service.name, interval: 15m",
        sampleData: generateSpans(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "spans" }, raw: "fetch spans" },
          { id: "e2", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "15m", alias: "n", by: "service.name" }, raw: "makeTimeseries n = count(), by: service.name, interval: 15m" },
        ],
      },
      {
        id: "step-2",
        title: "Errored spans per service",
        narration:
          "Filter to failing spans first, then split by service to see which service owns the failures.",
        lesson:
          'fetch spans\n| filter status.code == "ERROR"\n| makeTimeseries n = count(), by: service.name, interval: 15m',
        goal: "Timeseries of ERROR spans, split by service.name, 15m buckets.",
        hint: 'filter status.code == "ERROR" then makeTimeseries n = count(), by: service.name, interval: 15m',
        sampleData: generateSpans(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "spans" }, raw: "fetch spans" },
          { id: "e2", command: "filter", args: { condition: 'status.code == "ERROR"' }, raw: 'filter status.code == "ERROR"' },
          { id: "e3", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "15m", alias: "n", by: "service.name" }, raw: "makeTimeseries n = count(), by: service.name, interval: 15m" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 9 — Multi-step Analysis (Advanced)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-adv-001",
    title: "Filter → Summarize → Sort",
    company: "SecureBank",
    briefing:
      "Real analysis chains commands. Build the classic 'top offenders' pipeline end to end.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Errors per host",
        narration:
          "Start by isolating failures and counting them per host — the raw material for a ranking.",
        lesson:
          'fetch logs\n| filter loglevel == "ERROR"\n| summarize errors = count(), by: host',
        goal: "Count ERROR records per host.",
        hint: 'filter loglevel == "ERROR" then summarize errors = count(), by: host',
        sampleData: generateAuthLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "host" }, raw: "summarize errors = count(), by: host" },
        ],
      },
      {
        id: "step-2",
        title: "Rank the worst hosts",
        narration:
          "Sort the aggregated result descending so the host with the most failed logins lands on top.",
        lesson:
          'fetch logs\n| filter loglevel == "ERROR"\n| summarize errors = count(), by: host\n| sort errors desc',
        goal: "Produce the per-host error counts ordered worst-first.",
        hint: "...summarize errors = count(), by: host then sort errors desc",
        sampleData: generateAuthLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "host" }, raw: "summarize errors = count(), by: host" },
          { id: "e4", command: "sort", args: { field: "errors", direction: "desc" }, raw: "sort errors desc" },
        ],
      },
    ],
  },
  {
    id: "case-adv-002",
    title: "Denoise → Enrich → Summarize",
    company: "CloudScale",
    briefing:
      "Strip the noise, label what remains, then aggregate. A common incident-analysis shape.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Remove debug noise",
        narration:
          "`filterOut` the DEBUG diagnostics so the rest of the pipeline only sees meaningful traffic.",
        lesson: 'fetch logs\n| filterOut loglevel == "DEBUG"',
        goal: "Drop DEBUG records.",
        hint: 'filterOut loglevel == "DEBUG"',
        sampleData: generateAppLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filterOut", args: { condition: 'loglevel == "DEBUG"' }, raw: 'filterOut loglevel == "DEBUG"' },
        ],
      },
      {
        id: "step-2",
        title: "Label, then count by label",
        narration:
          "Add an `is_error` flag with `if()`, then summarize by it — error vs. non-error volume after noise removal.",
        lesson:
          'fetch logs\n| filterOut loglevel == "DEBUG"\n| fieldsAdd is_error = if(loglevel == "ERROR", "yes", "no")\n| summarize n = count(), by: is_error',
        goal: "After dropping DEBUG, count records grouped by an is_error flag.",
        hint: 'filterOut DEBUG, fieldsAdd is_error = if(loglevel == "ERROR", "yes", "no"), summarize n = count(), by: is_error',
        sampleData: generateAppLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filterOut", args: { condition: 'loglevel == "DEBUG"' }, raw: 'filterOut loglevel == "DEBUG"' },
          {
            id: "e3",
            command: "fieldsAdd",
            args: { assignments: 'is_error = if(loglevel == "ERROR", "yes", "no")' },
            raw: 'fieldsAdd is_error = if(loglevel == "ERROR", "yes", "no")',
          },
          { id: "e4", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "is_error" }, raw: "summarize n = count(), by: is_error" },
        ],
      },
    ],
  },
  {
    id: "case-adv-003",
    title: "Search → Project → Sort → Limit",
    company: "CloudScale",
    briefing:
      "Find it, shape it, rank it, trim it. The full retrieval pipeline in four moves.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Find the candidates",
        narration:
          "Search broadly for anything mentioning latency, then project to the columns a responder needs.",
        lesson:
          'fetch logs\n| search "duration_ms"\n| fields timestamp, loglevel, host, content',
        goal: "Search for 'duration_ms' and keep only four columns.",
        hint: 'search "duration_ms" then fields timestamp, loglevel, host, content',
        sampleData: generateAppLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "search", args: { term: "duration_ms" }, raw: 'search "duration_ms"' },
          { id: "e3", command: "fields", args: { fields: "timestamp, loglevel, host, content" }, raw: "fields timestamp, loglevel, host, content" },
        ],
      },
      {
        id: "step-2",
        title: "Newest ten",
        narration:
          "Sort by timestamp descending and `limit 10` to surface the ten most recent matching events.",
        lesson:
          'fetch logs\n| search "duration_ms"\n| fields timestamp, loglevel, host, content\n| sort timestamp desc\n| limit 10',
        goal: "From the projected matches, return the 10 newest by timestamp.",
        hint: "...fields ... then sort timestamp desc then limit 10",
        sampleData: generateAppLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "search", args: { term: "duration_ms" }, raw: 'search "duration_ms"' },
          { id: "e3", command: "fields", args: { fields: "timestamp, loglevel, host, content" }, raw: "fields timestamp, loglevel, host, content" },
          { id: "e4", command: "sort", args: { field: "timestamp", direction: "desc" }, raw: "sort timestamp desc" },
          { id: "e5", command: "limit", args: { count: 10 }, raw: "limit 10" },
        ],
      },
    ],
  },
  {
    id: "case-adv-004",
    title: "Complex Multi-Condition Aggregation",
    company: "DataForge",
    briefing:
      "Combine a compound filter with multiple aggregations and a ranking — a real performance-review query.",
    difficulty: "Advanced",
    track: "dql",
    tier: "premium",
    steps: [
      {
        id: "step-1",
        title: "Slow non-debug queries",
        narration:
          "Compound `and` conditions narrow the dataset to slow (>1000ms) queries that are not DEBUG noise.",
        lesson:
          'fetch logs\n| filter duration_ms > 1000 and loglevel != "DEBUG"',
        goal: "Keep records where duration_ms > 1000 and loglevel != DEBUG.",
        hint: 'filter duration_ms > 1000 and loglevel != "DEBUG"',
        sampleData: generateDbLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "filter",
            args: { condition: 'duration_ms > 1000 and loglevel != "DEBUG"' },
            raw: 'filter duration_ms > 1000 and loglevel != "DEBUG"',
          },
        ],
      },
      {
        id: "step-2",
        title: "Profile and rank hosts",
        narration:
          "Aggregate count, average, and max per host, then sort by the worst-case latency to rank the problem hosts.",
        lesson:
          'fetch logs\n| filter duration_ms > 1000 and loglevel != "DEBUG"\n| summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host\n| sort max_ms desc',
        goal: "Per host, compute count/avg/max of duration_ms for slow non-debug queries, ranked by max_ms.",
        hint: "...summarize n=count(), avg_ms=avg(duration_ms), max_ms=max(duration_ms), by: host then sort max_ms desc",
        sampleData: generateDbLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "filter",
            args: { condition: 'duration_ms > 1000 and loglevel != "DEBUG"' },
            raw: 'filter duration_ms > 1000 and loglevel != "DEBUG"',
          },
          {
            id: "e3",
            command: "summarize",
            args: {
              aggs: [
                { alias: "n", aggregation: "count", aggField: "" },
                { alias: "avg_ms", aggregation: "avg", aggField: "duration_ms" },
                { alias: "max_ms", aggregation: "max", aggField: "duration_ms" },
              ],
              by: "host",
            },
            raw: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host",
          },
          { id: "e4", command: "sort", args: { field: "max_ms", direction: "desc" }, raw: "sort max_ms desc" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 10 — Real Investigations (Advanced)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-inv-001",
    title: "The Midnight Breach",
    company: "SecureBank",
    briefing:
      "At 08:30 the SOC saw a wave of failed admin logins. Reconstruct the attack: isolate the failures, confirm the admin account was targeted, and rank the hosts under fire.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Isolate the failed logins",
        narration:
          "Every failed authentication is logged at ERROR level. Strip everything else to focus the investigation.",
        lesson: 'fetch logs\n| filter loglevel == "ERROR"',
        goal: "Keep only ERROR-level authentication records.",
        hint: 'filter loglevel == "ERROR"',
        sampleData: generateAuthLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
        ],
      },
      {
        id: "step-2",
        title: "Confirm the admin was the target",
        narration:
          "The attacker hammered the privileged `admin` account. Narrow to failures whose message names that user.",
        lesson:
          'fetch logs\n| filter loglevel == "ERROR"\n| filter contains(content, "user=admin")',
        goal: "Keep ERROR records whose content mentions user=admin.",
        hint: 'filter loglevel == "ERROR" then filter contains(content, "user=admin")',
        sampleData: generateAuthLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "filter", args: { condition: 'contains(content, "user=admin")' }, raw: 'filter contains(content, "user=admin")' },
        ],
      },
      {
        id: "step-3",
        title: "Rank the hosts under attack",
        narration:
          "Count the admin-targeted failures per host and sort descending — the top row is where the attacker concentrated.",
        lesson:
          'fetch logs\n| filter loglevel == "ERROR"\n| filter contains(content, "user=admin")\n| summarize hits = count(), by: host\n| sort hits desc',
        goal: "Per host, count admin-targeted ERROR logins, ranked worst-first.",
        hint: '...filter contains(content, "user=admin") then summarize hits = count(), by: host then sort hits desc',
        sampleData: generateAuthLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "filter", args: { condition: 'contains(content, "user=admin")' }, raw: 'filter contains(content, "user=admin")' },
          { id: "e4", command: "summarize", args: { alias: "hits", aggregation: "count", aggField: "", by: "host" }, raw: "summarize hits = count(), by: host" },
          { id: "e5", command: "sort", args: { field: "hits", direction: "desc" }, raw: "sort hits desc" },
        ],
      },
    ],
  },
  {
    id: "case-inv-002",
    title: "The Error Storm",
    company: "CloudScale",
    briefing:
      "Pager just lit up: error rate spiking across the fleet. Find which host is the epicenter and chart how the storm built over time.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Collect the errors",
        narration:
          "Filter the application logs down to ERROR — the population the storm is made of.",
        lesson: 'fetch logs\n| filter loglevel == "ERROR"',
        goal: "Keep only ERROR-level application records.",
        hint: 'filter loglevel == "ERROR"',
        sampleData: generateAppLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
        ],
      },
      {
        id: "step-2",
        title: "Find the epicenter host",
        narration:
          "Count errors per host and rank — the host at the top is where the on-call should look first.",
        lesson:
          'fetch logs\n| filter loglevel == "ERROR"\n| summarize errors = count(), by: host\n| sort errors desc',
        goal: "Per host, count ERROR records, ranked worst-first.",
        hint: 'filter loglevel == "ERROR" then summarize errors = count(), by: host then sort errors desc',
        sampleData: generateAppLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "host" }, raw: "summarize errors = count(), by: host" },
          { id: "e4", command: "sort", args: { field: "errors", direction: "desc" }, raw: "sort errors desc" },
        ],
      },
      {
        id: "step-3",
        title: "Chart the storm",
        narration:
          "Bucket the errors into 15-minute intervals to see when the storm started and whether it is still growing.",
        lesson:
          'fetch logs\n| filter loglevel == "ERROR"\n| makeTimeseries errors = count(), interval: 15m',
        goal: "Produce a 15-minute count timeseries of ERROR records.",
        hint: 'filter loglevel == "ERROR" then makeTimeseries errors = count(), interval: 15m',
        sampleData: generateAppLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "15m", alias: "errors", by: "" }, raw: "makeTimeseries errors = count(), interval: 15m" },
        ],
      },
    ],
  },
  {
    id: "case-inv-003",
    title: "The Slow Query Heist",
    company: "DataForge",
    briefing:
      "Checkout latency tripled. Someone's queries are stealing database time. Isolate the slow calls, find the worst host, and profile the damage.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Catch the slow queries",
        narration:
          "Anything over 1000ms is suspect. Filter the database logs to just those calls.",
        lesson: "fetch logs\n| filter duration_ms > 1000",
        goal: "Keep records where duration_ms > 1000.",
        hint: "filter duration_ms > 1000",
        sampleData: generateDbLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: "duration_ms > 1000" }, raw: "filter duration_ms > 1000" },
        ],
      },
      {
        id: "step-2",
        title: "Profile the offending hosts",
        narration:
          "For the slow calls, compute count, average, and worst-case latency per host in a single summarize.",
        lesson:
          "fetch logs\n| filter duration_ms > 1000\n| summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host",
        goal: "Per host (slow calls only) compute count, avg, and max duration_ms.",
        hint: "filter duration_ms > 1000 then summarize n=count(), avg_ms=avg(duration_ms), max_ms=max(duration_ms), by: host",
        sampleData: generateDbLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: "duration_ms > 1000" }, raw: "filter duration_ms > 1000" },
          {
            id: "e3",
            command: "summarize",
            args: {
              aggs: [
                { alias: "n", aggregation: "count", aggField: "" },
                { alias: "avg_ms", aggregation: "avg", aggField: "duration_ms" },
                { alias: "max_ms", aggregation: "max", aggField: "duration_ms" },
              ],
              by: "host",
            },
            raw: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host",
          },
        ],
      },
      {
        id: "step-3",
        title: "Name the culprit",
        narration:
          "Sort the profile by worst-case latency — the host at the top is the one stealing the database.",
        lesson:
          "fetch logs\n| filter duration_ms > 1000\n| summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host\n| sort max_ms desc",
        goal: "Rank the per-host slow-query profile by max_ms, worst-first.",
        hint: "...summarize ... by: host then sort max_ms desc",
        sampleData: generateDbLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: "duration_ms > 1000" }, raw: "filter duration_ms > 1000" },
          {
            id: "e3",
            command: "summarize",
            args: {
              aggs: [
                { alias: "n", aggregation: "count", aggField: "" },
                { alias: "avg_ms", aggregation: "avg", aggField: "duration_ms" },
                { alias: "max_ms", aggregation: "max", aggField: "duration_ms" },
              ],
              by: "host",
            },
            raw: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: host",
          },
          { id: "e4", command: "sort", args: { field: "max_ms", direction: "desc" }, raw: "sort max_ms desc" },
        ],
      },
    ],
  },
  {
    id: "case-inv-004",
    title: "The Revenue Trail",
    company: "PayStream",
    briefing:
      "Finance can't reconcile yesterday's takings. Trace the money: extract amounts, total them per gateway, and rank the gateways by revenue.",
    difficulty: "Advanced",
    track: "dql",
    tier: "premium",
    steps: [
      {
        id: "step-1",
        title: "Surface the amounts",
        narration:
          "Payment amounts are embedded in the log content. Extract a numeric `amt` column so it can be aggregated.",
        lesson: "fetch logs\n| fieldsAdd amt = toDouble(content)",
        goal: "Add a numeric amt column derived from content.",
        hint: "fieldsAdd amt = toDouble(content)",
        sampleData: generatePaymentLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "amt = toDouble(content)" }, raw: "fieldsAdd amt = toDouble(content)" },
        ],
      },
      {
        id: "step-2",
        title: "Total revenue per gateway",
        narration:
          "Sum the amounts grouped by payment host — the per-gateway takings finance needs to reconcile.",
        lesson:
          "fetch logs\n| fieldsAdd amt = toDouble(content)\n| summarize revenue = sum(amt), by: host",
        goal: "Sum amt grouped by host.",
        hint: "fieldsAdd amt = toDouble(content) then summarize revenue = sum(amt), by: host",
        sampleData: generatePaymentLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "amt = toDouble(content)" }, raw: "fieldsAdd amt = toDouble(content)" },
          { id: "e3", command: "summarize", args: { alias: "revenue", aggregation: "sum", aggField: "amt", by: "host" }, raw: "summarize revenue = sum(amt), by: host" },
        ],
      },
      {
        id: "step-3",
        title: "Rank the gateways",
        narration:
          "Sort by revenue descending so the highest-earning gateway tops the reconciliation report.",
        lesson:
          "fetch logs\n| fieldsAdd amt = toDouble(content)\n| summarize revenue = sum(amt), by: host\n| sort revenue desc",
        goal: "Per-host revenue, ranked highest-first.",
        hint: "...summarize revenue = sum(amt), by: host then sort revenue desc",
        sampleData: generatePaymentLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "amt = toDouble(content)" }, raw: "fieldsAdd amt = toDouble(content)" },
          { id: "e3", command: "summarize", args: { alias: "revenue", aggregation: "sum", aggField: "amt", by: "host" }, raw: "summarize revenue = sum(amt), by: host" },
          { id: "e4", command: "sort", args: { field: "revenue", direction: "desc" }, raw: "sort revenue desc" },
        ],
      },
    ],
  },
  {
    id: "case-inv-005",
    title: "The Phantom Orders",
    company: "Acme Corp",
    briefing:
      "Customers report orders that never shipped. Confirmed orders should eventually close. Find the order lifecycle events and quantify how many never reached fulfilment.",
    difficulty: "Advanced",
    track: "dql",
    tier: "premium",
    steps: [
      {
        id: "step-1",
        title: "Isolate the closed orders",
        narration:
          "The `close_order` event marks the end of an order's lifecycle. Filter to just those events.",
        lesson:
          'fetch bizevents\n| filter event.type == "com.easytrade.close_order"',
        goal: "Keep only close_order business events.",
        hint: 'filter event.type == "com.easytrade.close_order"',
        sampleData: generateBizEvents(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "bizevents" }, raw: "fetch bizevents" },
          { id: "e2", command: "filter", args: { condition: 'event.type == "com.easytrade.close_order"' }, raw: 'filter event.type == "com.easytrade.close_order"' },
        ],
      },
      {
        id: "step-2",
        title: "Split fulfilled vs. returned",
        narration:
          "Closed orders carry a `status` of fulfilled or returned. Count each outcome to size the phantom-order problem.",
        lesson:
          'fetch bizevents\n| filter event.type == "com.easytrade.close_order"\n| summarize n = count(), by: status',
        goal: "Among closed orders, count records grouped by status.",
        hint: 'filter event.type == "com.easytrade.close_order" then summarize n = count(), by: status',
        sampleData: generateBizEvents(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "bizevents" }, raw: "fetch bizevents" },
          { id: "e2", command: "filter", args: { condition: 'event.type == "com.easytrade.close_order"' }, raw: 'filter event.type == "com.easytrade.close_order"' },
          { id: "e3", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "status" }, raw: "summarize n = count(), by: status" },
        ],
      },
      {
        id: "step-3",
        title: "Quantify the returns",
        narration:
          "Zero in on the `returned` orders and count them — the hard number of phantom orders to report to the business.",
        lesson:
          'fetch bizevents\n| filter event.type == "com.easytrade.close_order"\n| filter status == "returned"\n| summarize phantom_orders = count()',
        goal: "Count closed orders whose status is 'returned'.",
        hint: 'filter event.type == "com.easytrade.close_order" then filter status == "returned" then summarize phantom_orders = count()',
        sampleData: generateBizEvents(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "bizevents" }, raw: "fetch bizevents" },
          { id: "e2", command: "filter", args: { condition: 'event.type == "com.easytrade.close_order"' }, raw: 'filter event.type == "com.easytrade.close_order"' },
          { id: "e3", command: "filter", args: { condition: 'status == "returned"' }, raw: 'filter status == "returned"' },
          { id: "e4", command: "summarize", args: { alias: "phantom_orders", aggregation: "count", aggField: "", by: "" }, raw: "summarize phantom_orders = count()" },
        ],
      },
    ],
  },
];
