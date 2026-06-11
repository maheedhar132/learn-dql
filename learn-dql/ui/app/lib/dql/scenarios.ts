import type { Scenario } from "../types/dql";
import {
  generateAuthLogs,
  generateAppLogs,
  generateDbLogs,
  generateBizEvents,
  generateSpans,
  generatePaymentLogs,
  generateEventsWithTags,
  generateKubernetesStructuredLogs,
  generateAuditLogs,
  generateSecurityEvents,
  generateInfrastructureLogs,
  generateApmSpans,
  generateJsonLogs,
  generateNginxLogs,
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
          "In DQL, every query starts with a `fetch` command that tells the engine which data store to read from. Logs are the most common source — they capture everything your application writes to stdout, stderr, or a logging framework. At Acme Corp, logs record service activity, errors, and diagnostic messages across every host. Without specifying a source, DQL has nothing to work with, so `fetch logs` is always your first move when investigating application behavior.",
        lesson: "Fetch Application Logs",
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
          "Distributed tracing breaks a request into individual spans — one per service hop. Each span records its start time, duration, status code, and the service that produced it. When Acme's checkout flow is slow, logs might tell you something went wrong, but spans tell you *where* in the call chain the time was lost. Switch your source to `spans` whenever latency or request flow is the question.",
        lesson: "Fetch Distributed Trace Spans",
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
          "Business events capture domain-level activity — things like order placements, payment completions, and account changes. Unlike logs (which are free-form text) or spans (which focus on latency), business events carry structured fields like `order_id`, `amount`, `currency`, and `customer_tier`. At Acme Corp they flow from every service that touches a transaction, making them the right source for revenue and funnel analysis.",
        lesson: "Fetch Business Event Records",
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
          "The `filter` command narrows the pipeline to records that satisfy a condition, discarding everything else. The `==` operator tests for an exact match on a field value. In SecureBank's authentication logs, every failed login attempt is recorded with `loglevel` set to `\"ERROR\"`. Isolating those records is the first step in any security investigation — you want signal, not noise.",
        lesson: "Filter by Log Level",
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
          "The `!=` operator is the inverse of `==` — it keeps every record that does *not* match the value. SecureBank's auth logs emit a high volume of DEBUG messages during normal operation, which obscure the meaningful events. Excluding them with `!=` is faster than listing every level you *do* want, and it future-proofs the query if new levels are added later.",
        lesson: "Exclude Records by Value",
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
          "DQL filter conditions compose with `and` and `or`, letting you express precise multi-dimensional criteria in a single step. Here you need both a severity check (`loglevel == \"ERROR\"`) and a content check (`contains(content, \"user=admin\")`) to zero in on failed admin logins specifically. Combining them avoids two separate filter stages and keeps the pipeline readable. At SecureBank, this pattern separates a targeted brute-force attempt from ordinary user errors.",
        lesson: "Combine Filter Conditions",
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
          "`filterOut` is the logical opposite of `filter` — it *removes* every record that matches the condition and passes everything else through. This is useful when you know exactly what you want to drop but would need a long list of `==` clauses to describe what you want to keep. CloudScale's INFO logs are high-volume heartbeat traffic; stripping them in one line reveals the warnings, errors, and debug diagnostics that actually need attention.",
        lesson: "Subtract Matching Records",
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
          "`search` scans every field in every record for a term — you do not need to know which column holds the value. It is the DQL equivalent of Ctrl+F across your entire dataset. When CloudScale engineers suspect a timeout problem but do not know yet which service or field is involved, `search \"timeout\"` casts the widest net possible. Use it early in an investigation to discover the shape of the data before writing precise filters.",
        lesson: "Full-Text Search Records",
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
          "DQL pipelines execute left to right, so each command receives only what the previous one passed through. You can search broadly for a term and then use `filterOut` to remove the false positives — a two-step triage that is more flexible than a single compound condition. At CloudScale, searching for `\"connection\"` matches both real errors and the verbose DEBUG diagnostics that also reference connections; the `filterOut` in the second step keeps only the actionable hits.",
        lesson: "Search Then Refine Results",
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
          "`sort` reorders the records in the pipeline by a field's value. The `asc` direction puts the smallest value first and works on numbers, strings, and timestamps alike. For DataForge's database logs, sorting `duration_ms` ascending gives you a baseline — it shows that the fast queries are working fine and helps you understand the normal range before you go looking for outliers.",
        lesson: "Sort Records Ascending",
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
          "Flipping the direction to `desc` reverses the order so the largest values appear first. This is the standard way to surface outliers in a dataset — the slowest queries, the most frequent errors, or the highest transaction amounts all float to the top. DataForge's DBA uses descending `duration_ms` to immediately see which database calls are stealing the most time without scanning the entire result set.",
        lesson: "Sort Records Descending",
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
          "`limit` caps the number of records that flow out of the pipeline. Combining a descending sort with a `limit` is the classic Top-N pattern — you rank all records by some measure, then keep only the worst (or best) handful. At DataForge, `sort duration_ms desc | limit 10` produces an actionable short-list of the ten slowest queries that is ready to drop into a dashboard tile or an incident ticket.",
        lesson: "Return Top N Records",
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
          "`fields` (also written `fieldsKeep`) projects each record down to only the columns you name, discarding the rest. This is important both for readability and for performance — fewer columns means less data moving through the pipeline. CloudScale's app logs have several fields, but when you are investigating an incident you typically only care about when it happened (`timestamp`), how severe it was (`loglevel`), and which machine was involved (`host`).",
        lesson: "Select Specific Columns",
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
          "When a record has many useful fields but one verbose outlier, `fieldsRemove` is more concise than listing everything you want to keep. It drops the named columns and passes the rest through unchanged. CloudScale's `content` field stores the full log message text, which can be hundreds of characters long; removing it lets you see the structured fields clearly without scrolling past walls of text.",
        lesson: "Drop Unwanted Columns",
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
          "`fieldsRename` gives an existing column a new name without changing its values. This matters when raw field names are implementation details (like `duration_ms`) that you want to replace with something a stakeholder will understand at a glance (like `latency_ms`). The syntax is `newName = oldName` — the same assignment style you will see throughout DQL. At DataForge, renaming before sharing a query result prevents confusion about units and meaning.",
        lesson: "Rename a Column",
        goal: "Rename duration_ms to latency_ms.",
        hint: "fieldsRename latency_ms = duration_ms",
        sampleData: generateDbLogs(250, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsRename", args: { assignments: "latency_ms = duration_ms" }, raw: "fieldsRename latency_ms = duration_ms" },
        ],
      },
      {
        id: "step-2",
        title: "Derive a new metric",
        narration:
          "`fieldsAdd` computes a new column from an arithmetic or function expression and appends it to every record. The original fields remain intact alongside the new one. Converting `duration_ms` to seconds by dividing by 1000 is a simple example, but the same pattern handles anything from unit conversions to ratio calculations. DataForge reports prefer seconds over milliseconds for readability, so this single line transforms the whole dataset.",
        lesson: "Derive a Calculated Column",
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
        title: "Count All Records",
        narration:
          "`summarize` is DQL's aggregation command — it collapses a set of records into a smaller set of summary rows. The simplest form, `count()`, counts every record that reached that stage of the pipeline and returns a single number. At CloudScale this is the first question in any capacity review: how many log lines are being produced? A single `summarize total = count()` gives you that answer in one pass.",
        lesson: "Count All Records",
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
          "Adding a `by` clause to `summarize` groups the records before aggregating, producing one output row per distinct group value. `by: {loglevel}` splits CloudScale's logs into separate rows for DEBUG, INFO, WARN, and ERROR — the breakdown that powers a severity distribution chart. This is one of the most frequently used patterns in DQL: count something, broken down by a dimension.",
        lesson: "Group by Single Field",
        goal: "Count records grouped by loglevel.",
        hint: "summarize total = count(), by: {loglevel}",
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "total", aggregation: "count", aggField: "", by: "loglevel" }, raw: "summarize total = count(), by: {loglevel}" },
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
        title: "Sum Values by Group",
        narration:
          "`sum()` adds up all the values of a numeric field within each group. It is the go-to aggregation whenever you need a total — revenue, bytes transferred, error counts, or anything else that accumulates. At PayStream, payment amounts are embedded in the `content` field as `key=value` text (e.g. `txn_id=TXN-0042 amount=474.2 currency=USD …`), so a `parse` step with the KVP pattern first extracts every pair — including a numeric `amount` column. Once the number exists as a field, `summarize total = sum(amount), by: {host}` computes the per-gateway totals finance needs. This parse-then-aggregate shape is the standard way to do math on values that live inside log text.",
        lesson: "Sum Values by Group",
        goal: "Parse the amount out of content and total it per host.",
        hint: 'parse content, "KVP:f" then summarize total = sum(amount), by: {host}',
        sampleData: generatePaymentLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "KVP:f" }, raw: 'parse content, "KVP:f"' },
          { id: "e3", command: "summarize", args: { alias: "total", aggregation: "sum", aggField: "amount", by: "host" }, raw: "summarize total = sum(amount), by: {host}" },
        ],
      },
      {
        id: "step-2",
        title: "Average Values by Group",
        narration:
          "`avg()` divides the sum of a field by the count of records in each group, giving you the mean. Where `sum()` answers 'how much in total?', `avg()` answers 'how much on average?' — a useful complement for spotting whether one gateway is processing unusually large or small transactions. At PayStream, keeping the same KVP parse step and swapping `sum()` for `avg()` reveals the mean transaction size each payment node is handling.",
        lesson: "Average Values by Group",
        goal: "Compute the average amount per host.",
        hint: 'parse content, "KVP:f" then summarize avg_amt = avg(amount), by: {host}',
        sampleData: generatePaymentLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "KVP:f" }, raw: 'parse content, "KVP:f"' },
          { id: "e3", command: "summarize", args: { alias: "avg_amt", aggregation: "avg", aggField: "amount", by: "host" }, raw: "summarize avg_amt = avg(amount), by: {host}" },
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
        title: "Find Minimum Value",
        narration:
          "`min()` returns the smallest value of a field within each group. In performance analysis it represents the best-case result — the floor below which things never go. For DataForge's database logs, `min(duration_ms)` per host tells you how fast that host can execute a query under ideal conditions. This baseline is useful when comparing against current performance: if the minimum is now worse than it used to be, something has changed.",
        lesson: "Find Minimum Value",
        goal: "Find the minimum duration_ms per host.",
        hint: "summarize fastest = min(duration_ms), by: {host}",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "fastest", aggregation: "min", aggField: "duration_ms", by: "host" }, raw: "summarize fastest = min(duration_ms), by: {host}" },
        ],
      },
      {
        id: "step-2",
        title: "Find Maximum Value",
        narration:
          "`max()` returns the largest value in each group — the worst case, the ceiling, the outlier that defines your tail latency. While the average and minimum paint a rosier picture, `max(duration_ms)` exposes the spikes that real users actually experience during a bad moment. At DataForge, reliability teams use it to understand which hosts are capable of producing catastrophically slow queries, and whether those spikes are getting worse over time.",
        lesson: "Find Maximum Value",
        goal: "Find the maximum duration_ms per host.",
        hint: "summarize slowest = max(duration_ms), by: {host}",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "slowest", aggregation: "max", aggField: "duration_ms", by: "host" }, raw: "summarize slowest = max(duration_ms), by: {host}" },
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
        title: "One Row per Unique Value",
        narration:
          "`dedup` keeps only the first record for each distinct value of the specified field, discarding subsequent duplicates. It is the simplest way to produce a unique list from a dataset that contains many repetitions. SecureBank's auth logs record every login attempt — hundreds of lines per host. When you need to know *which hosts exist* rather than how many events each had, `dedup host` reduces the full log stream to a clean roster in a single command.",
        lesson: "One Row per Unique Value",
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
          "Pipeline order determines what `dedup` operates on. By filtering to ERROR records first and *then* deduplicating on `host`, you produce exactly the list of hosts that experienced at least one failure — not just any host that appeared in the logs. At SecureBank this distinction matters: the security team wants to know which hosts were actually affected by failed logins, not merely which hosts exist in the system.",
        lesson: "Deduplicate After Filtering",
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
        title: "Group by Multiple Fields",
        narration:
          "The `by` clause of `summarize` accepts a comma-separated list of fields, creating one output row for every unique combination of those values. Two grouping fields produce a cross-tabulation — the same data that powers a heatmap. For CloudScale's application logs, grouping by both `loglevel` and `host` answers the question: 'how many errors did each specific host produce, broken down by severity?' A single-field group can't answer that.",
        lesson: "Group by Multiple Fields",
        goal: "Count records grouped by both loglevel and host.",
        hint: "summarize n = count(), by: {loglevel, host}",
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "loglevel, host" }, raw: "summarize n = count(), by: {loglevel, host}" },
        ],
      },
      {
        id: "step-2",
        title: "Focus on errors per host",
        narration:
          "Filtering before aggregating reduces the group space to only the dimension you care about. By keeping only ERROR records first, the subsequent `summarize ... by: {host}` produces a tight, focused view: one row per host, showing exactly how many failures that host contributed. At CloudScale this is often the starting point for incident triage — rank the resulting table by `errors desc` to immediately see which host is the biggest problem.",
        lesson: "Filter Then Aggregate",
        goal: "Count ERROR records per host.",
        hint: 'filter loglevel == "ERROR" then summarize errors = count(), by: {host}',
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "host" }, raw: "summarize errors = count(), by: {host}" },
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
        title: "Multiple Aggregations Together",
        narration:
          "A single `summarize` command can compute multiple aggregations at once, separated by commas. Each gets its own alias and its own aggregation function. This is more efficient than running the same pipeline twice with different aggregations, and it keeps the result in one table so you can sort and compare the columns together. For DataForge's database logs, combining `count()` and `avg(duration_ms)` per host tells you both the volume of queries *and* their typical speed in one pass.",
        lesson: "Multiple Aggregations Together",
        goal: "Per host, compute both the record count and the average duration_ms.",
        hint: "summarize n = count(), avg_ms = avg(duration_ms), by: {host}",
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
            raw: "summarize n = count(), avg_ms = avg(duration_ms), by: {host}",
          },
        ],
      },
      {
        id: "step-2",
        title: "Add the worst case",
        narration:
          "You can keep extending a `summarize` with additional aggregations as the report demands. Adding `max(duration_ms)` alongside count and average gives a three-column profile: how often, how fast on average, and how bad at worst. Together these three numbers tell a much more complete story than any one of them alone — DataForge's reliability team uses this exact pattern to decide whether a host's worst-case latency is an acceptable outlier or a sign of a deeper problem.",
        lesson: "Add More Aggregation Columns",
        goal: "Per host, compute count, average, and max of duration_ms.",
        hint: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: {host}",
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
            raw: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: {host}",
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
        title: "Compute Median Latency",
        narration:
          "The median is the middle value when all records are sorted — 50% of queries are faster, 50% are slower. Unlike the mean, the median is not pulled upward by a handful of very slow queries, making it a much more honest representation of the typical experience. For DataForge's database hosts, `median(duration_ms)` per host gives you the true midpoint of the latency distribution, which is often significantly lower than the average in skewed workloads.",
        lesson: "Compute Median Latency",
        goal: "Compute the median duration_ms per host.",
        hint: "summarize p50 = median(duration_ms), by: {host}",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "p50", aggregation: "median", aggField: "duration_ms", by: "host" }, raw: "summarize p50 = median(duration_ms), by: {host}" },
        ],
      },
      {
        id: "step-2",
        title: "Measure Tail Latency",
        narration:
          "`percentile(field, N)` returns the value below which N percent of records fall. The 95th percentile (p95) is the standard SLO metric for tail latency: 95% of requests complete faster than this number, and the remaining 5% are the slow tail. At DataForge, tracking `p95` per host is far more useful for SLO compliance than tracking the mean, because SLOs are about the worst experiences real users have — not the average one.",
        lesson: "Measure Tail Latency",
        goal: "Compute the 95th-percentile duration_ms per host.",
        hint: "summarize p95 = percentile(duration_ms, 95), by: {host}",
        sampleData: generateDbLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "p95", aggregation: "percentile", aggField: "duration_ms", by: "host" }, raw: "summarize p95 = percentile(duration_ms, 95), by: {host}" },
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
        title: "Build a Time Series",
        narration:
          "`makeTimeseries` is DQL's dedicated time-bucketing command. It divides the queried time range into equal intervals and computes an aggregation within each bucket, producing one output row per time slot. The `interval` parameter controls bucket width — `15m` gives 15-minute granularity. At CloudScale, converting a flat stream of log records into a time series is what makes trends, spikes, and dips visible. Without it, you are just looking at a pile of records.",
        lesson: "Build a Time Series",
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
          "Filtering before `makeTimeseries` restricts the time series to only the events you care about. The resulting chart shows the shape of an incident: when error rates spiked, how high they went, and whether they recovered. At CloudScale, the combination of `filter loglevel == \"ERROR\"` followed by `makeTimeseries count(), interval: 15m` is the canonical first chart in any incident post-mortem — it establishes the timeline of the event.",
        lesson: "Time Series of Filtered Records",
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
        title: "Add a Conditional Column",
        narration:
          "The `if(condition, valueIfTrue, valueIfFalse)` function evaluates a condition per record and returns one of two values. Combined with `fieldsAdd`, it lets you categorize records at the row level rather than filtering them out. At CloudScale, tagging each log record as `\"critical\"` or `\"normal\"` based on its `loglevel` makes downstream grouping and charting simpler — instead of reasoning about four log levels, consumers of the data work with a binary signal.",
        lesson: "Add a Conditional Column",
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
          "A column created by `fieldsAdd` behaves exactly like any native field in subsequent pipeline stages. You can filter on it, sort by it, rename it, or — as here — group by it in a `summarize`. Adding `severity_flag` with `if()` and then counting by that flag gives you a crisp critical-vs-normal breakdown of CloudScale's log volume. This two-step pattern (derive a category, then aggregate by it) is one of the most powerful shapes in DQL.",
        lesson: "Aggregate by Derived Column",
        goal: "Count records grouped by the derived severity_flag.",
        hint: "fieldsAdd severity_flag = ... then summarize n = count(), by: {severity_flag}",
        sampleData: generateAppLogs(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "fieldsAdd",
            args: { assignments: 'severity_flag = if(loglevel == "ERROR", "critical", "normal")' },
            raw: 'fieldsAdd severity_flag = if(loglevel == "ERROR", "critical", "normal")',
          },
          { id: "e3", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "severity_flag" }, raw: "summarize n = count(), by: {severity_flag}" },
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
        title: "Detect Missing Fields",
        narration:
          "In Grail, optional fields simply don't exist on records that didn't emit them — they are null. `isNull(field)` tests for that absence and returns true when the field is missing or empty. This is how you find the records that were never enriched with a particular attribute. In CloudScale's business events, not every event carries a `status` field — only certain event types do. Filtering with `isNull(status)` isolates exactly the sparse records so you can investigate or backfill them.",
        lesson: "Detect Missing Fields",
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
        title: "Supply a Default Value",
        narration:
          "`coalesce(a, b)` returns the first non-null value from its argument list. When `a` is present it is returned as-is; when `a` is null, the fallback `b` is used instead. This is the standard way to guarantee that every record has a value for a field before you group or chart by it — null values can cause unexpected gaps in charts or summarize results. Here, backfilling `status` with `\"unknown\"` on CloudScale's business events ensures downstream aggregations are gap-free.",
        lesson: "Supply a Default Value",
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
        title: "Round to Whole Numbers",
        narration:
          "`round(expression)` rounds a numeric value to the nearest integer. It is useful whenever a derived metric produces fractional values that are too precise for a human-facing report. At DataForge, converting `duration_ms` to seconds by dividing by 1000 gives decimal results like `1.347`; wrapping the expression in `round()` produces clean whole numbers like `1` that are easier to read in a dashboard or export.",
        lesson: "Round to Whole Numbers",
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
        title: "Compute Absolute Deviation",
        narration:
          "`abs()` returns the absolute value of a number, stripping the sign so negative and positive deviations are treated as equal magnitudes. This is useful for measuring how far a value is from a reference point without caring about direction. At DataForge, `abs(duration_ms - 500)` computes each query's deviation from the 500ms service-level baseline — a query that took 200ms has a deviation of 300, and one that somehow recorded 800ms also has a deviation of 300, making them equally anomalous.",
        lesson: "Compute Absolute Deviation",
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
        title: "Match a Substring in a Field",
        narration:
          "`contains(field, term)` tests whether a specific field's value includes the given substring, returning true or false per record. Unlike `search`, which scans every field, `contains()` targets a single column — making it both more precise and more efficient. At CloudScale, `contains(content, \"memory\")` finds every application log entry whose message body mentions a memory issue, without accidentally matching hosts or log levels that happen to contain the same characters.",
        lesson: "Match a Substring in a Field",
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
        title: "Match the Start of a String",
        narration:
          "`startsWith(field, prefix)` returns true only when the field's value begins with the given string. It is an anchored match — unlike `contains()`, it won't match the prefix in the middle of a value. This is useful for matching codes, namespaces, or severity levels by prefix when the exact full value might vary. At CloudScale, `startsWith(loglevel, \"ERR\")` would catch both `\"ERROR\"` and `\"ERRCRIT\"` if such levels existed, making it slightly more flexible than an equality check.",
        lesson: "Match the Start of a String",
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
        title: "Match the End of a String",
        narration:
          "`endsWith(field, suffix)` anchors the match to the tail of a string — it returns true only when the field value ends with the given text. This is the complement to `startsWith()` and is useful for matching file extensions, status codes, or structured log suffixes. SecureBank's failed-login messages follow a consistent format that ends with `\"attempts=5\"` when the maximum retry count is reached. Using `endsWith()` pins the match to that exact termination pattern, preventing false positives from messages that merely mention the word 'attempts' elsewhere.",
        lesson: "Match the End of a String",
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
        title: "Match with Wildcards",
        narration:
          "`like(field, pattern)` matches strings using SQL-style wildcards: `%` matches any sequence of characters, and `_` matches exactly one. It is more expressive than `contains()` or `startsWith()` when the target text can appear at a variable position within a longer value. At SecureBank, `like(content, \"%user=admin%\")` matches any authentication log entry that mentions the admin user anywhere in the message, regardless of what precedes or follows it.",
        lesson: "Match with Wildcards",
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
        title: "Normalize String Case",
        narration:
          "`lower()` converts every character in a string to lowercase; `upper()` does the reverse. Case normalization is important before grouping or comparing text values that may have been emitted with inconsistent casing — `\"ERROR\"` and `\"error\"` would otherwise form separate groups. At SecureBank, normalizing `loglevel` to lowercase and `host` to uppercase before a join or summarize ensures consistent output regardless of how different services formatted their fields.",
        lesson: "Normalize String Case",
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
        title: "Concatenate Strings Together",
        narration:
          "`concat()` joins two or more strings into a single value. You can mix field references and string literals in any order. This is useful for building composite keys, display labels, or identifiers that combine multiple dimensions. At SecureBank, building a `host@loglevel` label with `concat(host, \"@\", loglevel)` creates a compact string that uniquely identifies a (host, severity) pair — ready to use as a chart axis label or a grouping key in a follow-up query.",
        lesson: "Concatenate Strings Together",
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
        title: "Extract a String Slice",
        narration:
          "`substring(field, start, length)` extracts a portion of a string starting at the given zero-based offset and running for the given number of characters. It is the right tool when you know the structure of a field and need to pull a fixed-position code or prefix out of it. At SecureBank, log content often begins with a 5-character event code that categorizes the action — extracting it with `substring(content, 0, 5)` makes it available for grouping without parsing the full message.",
        lesson: "Extract a String Slice",
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
        title: "Replace Text in a String",
        narration:
          "`replaceString(field, find, replace)` substitutes every occurrence of `find` with `replace` in the field's value. This is useful for redacting sensitive tokens, normalizing legacy field formats, or making labels consistent before a report. At SecureBank, replacing `\"attacker_ip=\"` with the shorter `\"ip=\"` in log content normalizes an inconsistent naming convention left over from an older logging library, without having to modify the source systems.",
        lesson: "Replace Text in a String",
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
        title: "Filter for Present Fields",
        narration:
          "`isNotNull(field)` returns true when the field exists and has a value, and false when it is absent or null. Use it inside a `filter` to keep only the records that have been enriched with a particular optional attribute. At Acme Corp, deployment events are emitted by multiple services but only some of them include a `status` field indicating whether the deployment succeeded. `isNotNull(status)` restricts the pipeline to exactly those enriched records, which are the ones useful for outcome analysis.",
        lesson: "Filter for Present Fields",
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
        title: "Filter for Absent Fields",
        narration:
          "`isNull(field)` is the inverse — it keeps records where the field is missing. These are often the events that fell through the cracks: services that emitted partial data, events that were cut short, or records from older schema versions that predate the field's introduction. At Acme Corp, finding the events that lack a `status` is the first step in understanding which services haven't been updated to emit full deployment metadata.",
        lesson: "Filter for Absent Fields",
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
        title: "Backfill a Default Value",
        narration:
          "When a field is sometimes absent, grouping by it can produce a null bucket in your results — which many charting tools treat as an error or simply drop. `coalesce(field, default)` eliminates null values before they reach an aggregation step by substituting a readable placeholder. At Acme Corp, replacing a missing `status` with `\"none\"` before summarizing ensures the grouping produces a complete, gap-free breakdown that includes the unenriched events rather than silently discarding them.",
        lesson: "Backfill a Default Value",
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
        title: "Group on a Cleaned Field",
        narration:
          "Once every record has a non-null value for `status_clean`, a `summarize ... by: {status_clean}` will produce a row for every category — including the `\"none\"` placeholder for unenriched events. Without the `coalesce()` step first, the null records would either form an unlabeled null bucket or be dropped entirely depending on the engine's behavior. At Acme Corp, this complete breakdown is what the platform team uses to track which event types still need status enrichment.",
        lesson: "Group on a Cleaned Field",
        goal: "Count events grouped by the backfilled status_clean.",
        hint: 'fieldsAdd status_clean = coalesce(status, "none") then summarize n = count(), by: {status_clean}',
        sampleData: generateEventsWithTags(300, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "events" }, raw: "fetch events" },
          { id: "e2", command: "fieldsAdd", args: { assignments: 'status_clean = coalesce(status, "none")' }, raw: 'fieldsAdd status_clean = coalesce(status, "none")' },
          { id: "e3", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "status_clean" }, raw: "summarize n = count(), by: {status_clean}" },
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
        title: "Chart Errors Over Time",
        narration:
          "The combination of `filter loglevel == \"ERROR\"` and `makeTimeseries count(), interval: 15m` is the canonical DQL pattern for incident detection. The filter restricts the data to failures only; `makeTimeseries` then shows you how those failures distribute across time in 15-minute buckets. At CloudScale, this chart is the first thing an on-call engineer opens after receiving a page — the shape of the curve tells you whether the incident is a spike, a gradual ramp, or a sustained flat elevation.",
        lesson: "Chart Errors Over Time",
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
        title: "Widen the Time Interval",
        narration:
          "Changing `interval: 15m` to `interval: 1h` reduces the number of data points by four times, smoothing out minute-to-minute noise to reveal the broader shape of a trend. Finer intervals are better for live incident response; coarser intervals are better for capacity planning and executive reporting. At CloudScale, a 1-hour bucketed error trend in a weekly review is much more readable than a 15-minute one — the signal is clearer when you are asking a strategic question rather than a tactical one.",
        lesson: "Adjust Time Bucket Size",
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
        title: "Split Time Series by Dimension",
        narration:
          "Adding a `by` clause to `makeTimeseries` produces one time series per distinct value of the grouping field — a multi-line chart rather than a single aggregated line. This is the key technique for attributing a trend to a specific dimension. At Acme Corp, splitting span counts by `service.name` immediately shows which microservice is generating the most traffic over time, and whether a load spike is system-wide or isolated to one service.",
        lesson: "Split Time Series by Dimension",
        goal: "Produce a 15-minute count timeseries split by service.name.",
        hint: "makeTimeseries n = count(), by: {service.name}, interval: 15m",
        sampleData: generateSpans(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "spans" }, raw: "fetch spans" },
          { id: "e2", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "15m", alias: "n", by: "service.name" }, raw: "makeTimeseries n = count(), by: {service.name}, interval: 15m" },
        ],
      },
      {
        id: "step-2",
        title: "Filter Before Splitting by Service",
        narration:
          "Combining a `filter` with a split-by `makeTimeseries` gives you a per-service failure trend — the multi-line chart that reveals which specific service is responsible for the errors in a microservice architecture. At Acme Corp, filtering spans to `status.code == \"ERROR\"` and then splitting by `service.name` transforms a confusing blended error count into separate lines per service, making it immediately obvious whether one service is failing in isolation or whether the errors are correlated across the fleet.",
        lesson: "Per-Service Error Trend",
        goal: "Timeseries of ERROR spans, split by service.name, 15m buckets.",
        hint: 'filter status.code == "ERROR" then makeTimeseries n = count(), by: {service.name}, interval: 15m',
        sampleData: generateSpans(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "spans" }, raw: "fetch spans" },
          { id: "e2", command: "filter", args: { condition: 'status.code == "ERROR"' }, raw: 'filter status.code == "ERROR"' },
          { id: "e3", command: "makeTimeseries", args: { aggregation: "count", aggField: "", interval: "15m", alias: "n", by: "service.name" }, raw: "makeTimeseries n = count(), by: {service.name}, interval: 15m" },
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
        title: "Aggregate After Filtering",
        narration:
          "The filter-then-summarize pattern is the workhorse of DQL analysis: narrow the dataset to the events you care about, then count or measure them by a dimension. Filtering to ERROR first means the summarize only processes failures — the count per host reflects actual incident frequency rather than total activity. At SecureBank, this gives the SOC a per-host failure count from the authentication logs that can feed directly into a risk-scoring system.",
        lesson: "Aggregate After Filtering",
        goal: "Count ERROR records per host.",
        hint: 'filter loglevel == "ERROR" then summarize errors = count(), by: {host}',
        sampleData: generateAuthLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "host" }, raw: "summarize errors = count(), by: {host}" },
        ],
      },
      {
        id: "step-2",
        title: "Sort Aggregated Results",
        narration:
          "After `summarize` produces a per-group table, `sort` ranks that table by any of its columns. Sorting the per-host error count descending puts the worst offender at position one — exactly where the on-call engineer's eyes land first. This three-stage shape (filter → summarize → sort) is the foundation of every 'top N problems' query in DQL, and at SecureBank it turns raw auth logs into an actionable priority list in seconds.",
        lesson: "Sort Aggregated Results",
        goal: "Produce the per-host error counts ordered worst-first.",
        hint: "summarize errors = count(), by: {host} | sort errors desc",
        sampleData: generateAuthLogs(400, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "host" }, raw: "summarize errors = count(), by: {host}" },
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
        title: "Remove Noise Before Analysis",
        narration:
          "In a real incident, DEBUG logs are almost always irrelevant — they represent instrumentation traffic, not failures. Removing them at the top of the pipeline with `filterOut` means every subsequent command operates on a cleaner, smaller dataset. At CloudScale, this matters both for performance and for accuracy: downstream counts and summaries won't be inflated by the constant stream of DEBUG chatter that services emit during normal operation.",
        lesson: "Remove Noise Before Analysis",
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
        title: "Enrich Then Summarize",
        narration:
          "After removing the noise, the pipeline enriches each remaining record with a derived `is_error` flag using `if()`, then groups by that flag. This shape — denoise, label, summarize — produces a crisp binary breakdown of meaningful traffic at CloudScale: how much is errors versus non-errors, after the diagnostic noise has been stripped. The three-stage pipeline is more powerful than a single filter because the intermediate label can be reused in multiple downstream steps.",
        lesson: "Enrich Then Summarize",
        goal: "After dropping DEBUG, count records grouped by an is_error flag.",
        hint: 'filterOut DEBUG, fieldsAdd is_error = if(loglevel == "ERROR", "yes", "no"), summarize n = count(), by: {is_error}',
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
          { id: "e4", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "is_error" }, raw: "summarize n = count(), by: {is_error}" },
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
        title: "Search Then Project Columns",
        narration:
          "Combining `search` with `fields` is the standard DQL triage opener: cast a wide net, then immediately narrow the result to the columns an engineer needs to act on. `search \"duration_ms\"` finds every CloudScale log record that mentions latency data anywhere in its fields. The subsequent `fields timestamp, loglevel, host, content` removes the clutter so the responder sees only the four columns that matter for the investigation, without scrolling past irrelevant metadata.",
        lesson: "Search Then Project Columns",
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
        title: "Rank and Trim Results",
        narration:
          "Sorting by `timestamp desc` and then `limit 10` closes the retrieval pipeline: after finding and shaping the records, you surface the ten most recent ones — the events most likely to be relevant to an ongoing incident. This four-command shape (search → fields → sort → limit) is the complete fetch-and-present pattern in DQL. At CloudScale it takes a potentially large set of latency-related log lines and reduces them to a concise, time-ordered list ready for copy-paste into an incident ticket.",
        lesson: "Rank and Trim Results",
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
        title: "Filter on Multiple Conditions",
        narration:
          "Compound `and` conditions let you express precise multi-dimensional criteria in a single filter step. At DataForge, a slow database query is only worth investigating if it isn't a DEBUG diagnostic — DEBUG records often reflect intentional slow operations under test. Requiring `duration_ms > 1000 and loglevel != \"DEBUG\"` ensures the pipeline only surfaces genuinely slow production queries. Combining numeric and string conditions in one filter keeps the query readable and avoids a second pipeline stage.",
        lesson: "Filter on Multiple Conditions",
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
        title: "Multi-Aggregation with Ranking",
        narration:
          "A full performance profile combines count (how often), average (typical cost), and max (worst case) in a single `summarize`, then ranks the result by the metric that matters most for the investigation. At DataForge, sorting by `max_ms desc` surfaces the host whose single worst query was the most damaging — the host most likely to have caused a user-visible timeout. This four-stage pipeline (fetch → filter → summarize → sort) is the complete shape of an advanced DQL performance query.",
        lesson: "Multi-Aggregation with Ranking",
        goal: "Per host, compute count/avg/max of duration_ms for slow non-debug queries, ranked by max_ms.",
        hint: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: {host} | sort max_ms desc",
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
            raw: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: {host}",
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
          "Every failed authentication attempt at SecureBank is recorded with `loglevel` set to `\"ERROR\"`. Starting an investigation by filtering to just those records focuses the entire subsequent pipeline on failures only — there is no point examining successful logins when hunting an intrusion. This single filter step reduces the dataset from all authentication activity to just the anomalous events, establishing the investigative scope before any deeper analysis begins.",
        lesson: "Filter by Log Level",
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
          "Not all failed logins are an attack — users forget passwords constantly. To confirm this was a targeted intrusion, you need to show that the failures concentrated on the privileged `admin` account. Adding a second `filter contains(content, \"user=admin\")` narrows the ERROR records further to only those whose message body names that specific account. Two chained filters are cleaner than a single compound condition when each filter represents a distinct investigative step.",
        lesson: "Chain Filters for Precision",
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
          "With the attack population confirmed, the final step is to quantify the blast radius: how many admin-targeted failures occurred per host, and which host bore the brunt of the attack? `summarize hits = count(), by: {host}` produces the per-host count, and `sort hits desc` ranks them with the most-attacked host at the top. This is the actionable output SecureBank's incident responders need — a prioritized list of which systems to lock down first.",
        lesson: "Rank Hosts by Failure Count",
        goal: "Per host, count admin-targeted ERROR logins, ranked worst-first.",
        hint: 'filter contains(content, "user=admin") | summarize hits = count(), by: {host} | sort hits desc',
        sampleData: generateAuthLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "filter", args: { condition: 'contains(content, "user=admin")' }, raw: 'filter contains(content, "user=admin")' },
          { id: "e4", command: "summarize", args: { alias: "hits", aggregation: "count", aggField: "", by: "host" }, raw: "summarize hits = count(), by: {host}" },
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
        title: "Isolate the Error Population",
        narration:
          "When a pager fires, the first move is always to establish the population of affected events. Filtering CloudScale's application logs to `loglevel == \"ERROR\"` extracts exactly the records that constitute the storm — everything else is background noise for this investigation. This single filtered dataset is the source of truth for both the host-ranking analysis and the timeline chart in the next steps. Getting this filter right at the start ensures consistency across all subsequent queries.",
        lesson: "Isolate the Error Population",
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
          "Counting errors per host and sorting descending answers 'where should we look first?' in an incident. The host with the highest error count is the epicenter — the machine most likely causing or experiencing the storm. At CloudScale, this query runs in the first minutes of an incident to give the on-call engineer a starting point. It transforms a fleet-wide alarm into a specific host name and a specific number to communicate in the incident channel.",
        lesson: "Rank Hosts by Error Count",
        goal: "Per host, count ERROR records, ranked worst-first.",
        hint: 'filter loglevel == "ERROR" | summarize errors = count(), by: {host} | sort errors desc',
        sampleData: generateAppLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          { id: "e3", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "host" }, raw: "summarize errors = count(), by: {host}" },
          { id: "e4", command: "sort", args: { field: "errors", direction: "desc" }, raw: "sort errors desc" },
        ],
      },
      {
        id: "step-3",
        title: "Chart the storm",
        narration:
          "Knowing which host has the most errors tells you *where*; a time series tells you *when* and *how fast*. Bucketing the ERROR records into 15-minute intervals reveals the storm's timeline: when the spike began, whether it is still growing or already subsiding, and whether it correlates with a deployment or a traffic event. At CloudScale this chart is essential for the post-mortem — it establishes the incident's start time and the window of impact with precision.",
        lesson: "Visualize the Error Timeline",
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
          "When checkout latency spikes, the database is usually the first place to look. DataForge's database logs record `duration_ms` for every query, making it straightforward to isolate the offenders with a numeric threshold filter. `filter duration_ms > 1000` picks out every query that took more than a second — a reasonable threshold for a production OLTP database where normal queries should complete in tens or hundreds of milliseconds. This population is the evidence base for the investigation.",
        lesson: "Filter on Numeric Threshold",
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
          "A single slow query is an anomaly; a pattern of slow queries on one host is a problem. Computing count, average, and max `duration_ms` per host in one `summarize` gives DataForge's DBA a complete profile: which hosts are generating slow queries, how many they produced, how bad the typical slow query was, and what the worst-case latency looked like. These three numbers together are far more diagnostic than any one alone — a host with high count and high max is the priority.",
        lesson: "Multi-Metric Host Profile",
        goal: "Per host (slow calls only) compute count, avg, and max duration_ms.",
        hint: "filter duration_ms > 1000 then summarize n=count(), avg_ms=avg(duration_ms), max_ms=max(duration_ms), by: {host}",
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
            raw: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: {host}",
          },
        ],
      },
      {
        id: "step-3",
        title: "Name the culprit",
        narration:
          "Sorting the profiled host table by `max_ms desc` surfaces the host whose single worst query was the most damaging — the most likely cause of the checkout timeout. The average might be acceptable on every host, but the max reveals which host is capable of producing the catastrophic outliers that users actually feel. At DataForge, this final `sort` step turns the performance profile into an actionable verdict: here is the host, here is the evidence.",
        lesson: "Sort by Worst-Case Metric",
        goal: "Rank the per-host slow-query profile by max_ms, worst-first.",
        hint: "summarize max_ms = max(duration_ms), by: {host} | sort max_ms desc",
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
            raw: "summarize n = count(), avg_ms = avg(duration_ms), max_ms = max(duration_ms), by: {host}",
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
        title: "Extract a Numeric Amount",
        narration:
          "PayStream's payment logs embed transaction data as `key=value` text inside the `content` field — `txn_id=TXN-0042 amount=474.2 currency=USD status=completed …` — rather than as dedicated columns. Before you can aggregate money, you have to extract it. `parse content, \"KVP:f\"` scans each record's content for key=value tokens and adds every key as a real field, automatically converting numeric values like `amount` into numbers. This extraction step is the standard pattern for legacy log formats — the data is there, it just needs to be parsed before aggregation functions can operate on it.",
        lesson: "Extract a Numeric Amount",
        goal: "Parse content so amount becomes a numeric field.",
        hint: 'parse content, "KVP:f"',
        sampleData: generatePaymentLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "KVP:f" }, raw: 'parse content, "KVP:f"' },
        ],
      },
      {
        id: "step-2",
        title: "Total Revenue by Gateway",
        narration:
          "With the parsed `amount` field available, `summarize revenue = sum(amount), by: {host}` computes the total transaction value processed by each payment gateway. The `host` field in PayStream's payment logs identifies which gateway handled the transaction. This is the per-gateway revenue breakdown that finance uses to reconcile end-of-day takings — if the sum doesn't match the expected total, the discrepancy points to a specific gateway as the source of missing transactions.",
        lesson: "Total Revenue by Gateway",
        goal: "Sum the parsed amount grouped by host.",
        hint: 'parse content, "KVP:f" then summarize revenue = sum(amount), by: {host}',
        sampleData: generatePaymentLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "KVP:f" }, raw: 'parse content, "KVP:f"' },
          { id: "e3", command: "summarize", args: { alias: "revenue", aggregation: "sum", aggField: "amount", by: "host" }, raw: "summarize revenue = sum(amount), by: {host}" },
        ],
      },
      {
        id: "step-3",
        title: "Rank Gateways by Revenue",
        narration:
          "Sorting the per-gateway revenue table descending puts the highest-earning gateway at the top of the reconciliation report. This ranking matters for two reasons: it establishes the expected contribution of each gateway, and it makes anomalies obvious — a gateway that processed far less revenue than usual in a given period stands out immediately in a sorted list. At PayStream, this final `sort revenue desc` turns a raw aggregation into an executive-ready report.",
        lesson: "Rank Gateways by Revenue",
        goal: "Per-host revenue, ranked highest-first.",
        hint: 'parse content, "KVP:f" | summarize revenue = sum(amount), by: {host} | sort revenue desc',
        sampleData: generatePaymentLogs(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "KVP:f" }, raw: 'parse content, "KVP:f"' },
          { id: "e3", command: "summarize", args: { alias: "revenue", aggregation: "sum", aggField: "amount", by: "host" }, raw: "summarize revenue = sum(amount), by: {host}" },
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
          "Acme Corp's order lifecycle emits business events at each stage, and the `event.type` field identifies which stage each event represents. The `com.easytrade.close_order` event marks the terminal state of an order — whether it fulfilled successfully or was returned. Filtering to just these events gives you a population that represents every order that reached a final outcome, which is the right starting point for investigating fulfilment gaps.",
        lesson: "Filter by Event Type",
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
          "Among closed orders, the `status` field records whether the order was fulfilled or returned. A `summarize count(), by: {status}` produces the breakdown: two rows, one for each outcome. This is the diagnostic split — if the ratio of `returned` to `fulfilled` is higher than expected, that quantifies the scale of the phantom-order problem at Acme Corp. Counting by status rather than just counting all closures is what makes this a useful business metric rather than just an event volume.",
        lesson: "Count Outcomes by Status",
        goal: "Among closed orders, count records grouped by status.",
        hint: 'filter event.type == "com.easytrade.close_order" then summarize n = count(), by: {status}',
        sampleData: generateBizEvents(500, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "bizevents" }, raw: "fetch bizevents" },
          { id: "e2", command: "filter", args: { condition: 'event.type == "com.easytrade.close_order"' }, raw: 'filter event.type == "com.easytrade.close_order"' },
          { id: "e3", command: "summarize", args: { alias: "n", aggregation: "count", aggField: "", by: "status" }, raw: "summarize n = count(), by: {status}" },
        ],
      },
      {
        id: "step-3",
        title: "Quantify the returns",
        narration:
          "Drilling down to just the `returned` orders and producing a single count gives the business a hard number: this is how many phantom orders occurred in the query window. A plain `summarize count()` without a `by` clause collapses all matching records into one row — the answer to 'exactly how many?' rather than 'how do they break down?'. At Acme Corp, this single number is what goes into the customer-impact report and the engineering escalation ticket.",
        lesson: "Count a Specific Outcome",
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

  // ── Module 11: Combining Data Sources ─────────────────────────────────────
  {
    id: "case-append-001",
    title: "Merging Two Streams with append",
    company: "Streamline Analytics",
    briefing:
      "Streamline Analytics ingests application logs and infrastructure events into separate Grail tables. You need to create a unified view of all activity across both sources without losing any records.",
    difficulty: "Intermediate",
    track: "dql",
    steps: [
      {
        id: "step-1",
        title: "What append does — UNION ALL semantics",
        narration:
          "The `append` command stacks rows from a second query vertically onto the current result set — it is a UNION ALL operation. Unlike `join`, which matches rows horizontally on a shared key, `append` simply concatenates: every row from the left pipeline is kept, then every row from the right sub-pipeline is added below. Duplicate rows are preserved intentionally; if both sources contain the same event, both copies appear. This makes `append` the right tool when you want to combine two data streams that have no reliable shared key, or when you explicitly want all events from both sources, including duplicates.",
        lesson: "UNION ALL with append",
        goal: "Understand that append stacks rows from two sources without deduplication.",
        hint: "No query to run for this concept step — read the narration carefully.",
        sampleData: [],
        expectedPipeline: [],
        referenceQuery: "fetch logs\n| append [fetch events]",
      },
      {
        id: "step-2",
        title: "append is lightweight — allowed early in a pipeline",
        narration:
          "Unlike some commands that must come late in a pipeline, `append` can appear before `search` and other commands that normally precede filters. The recommended best practice is to filter inside the sub-query block `[...]` before the two streams are merged. This reduces the data volume that needs to travel through the rest of the pipeline. For example, if you only need ERROR-level events from both sources, apply `filter loglevel == \"ERROR\"` inside both the main pipeline and inside the `[...]` block rather than filtering after the merge. Filtering early is always cheaper — with `append` it is especially important because you are combining two potentially large datasets.",
        lesson: "Filter Inside append Sub-queries",
        goal: "Understand best practice: filter inside [...] to reduce data before merging.",
        hint: 'Wrap the filter before the merge: fetch logs | filter loglevel == "ERROR" | append [fetch events | filter loglevel == "ERROR"]',
        sampleData: [],
        expectedPipeline: [],
        referenceQuery:
          'fetch logs\n| filter loglevel == "ERROR"\n| append [fetch events\n  | filter loglevel == "ERROR"]',
      },
      {
        id: "step-3",
        title: "Count records from two sources combined",
        narration:
          "Now that you understand how `append` merges rows, apply it with real data. The offline engine pre-seeds the right-side records so validation works without a live Grail connection. After the append, the result set contains rows from both sources. A `summarize count()` tells you the total combined record count — a quick sanity check that both sources contributed rows. In production this pattern is used to produce a single alert timeline from logs and audit events, or to merge synthetic test runs with live traffic before computing SLOs.",
        lesson: "Summarize a Combined Dataset",
        goal: "Fetch app logs, append pre-seeded event records, count all combined rows.",
        hint: "fetch logs | append [...] | summarize total = count()",
        sampleData: generateAppLogs(30, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "append",
            args: {
              records: [
                { timestamp: "2024-01-15T10:00:00Z", loglevel: "INFO", content: "Event A", host: "host-01" },
                { timestamp: "2024-01-15T10:01:00Z", loglevel: "WARN", content: "Event B", host: "host-02" },
                { timestamp: "2024-01-15T10:02:00Z", loglevel: "ERROR", content: "Event C", host: "host-03" },
                { timestamp: "2024-01-15T10:03:00Z", loglevel: "INFO", content: "Event D", host: "host-01" },
                { timestamp: "2024-01-15T10:04:00Z", loglevel: "INFO", content: "Event E", host: "host-02" },
              ],
            },
            raw: "append [fetch events]",
          },
          {
            id: "e3",
            command: "summarize",
            args: { alias: "total", aggregation: "count", aggField: "", by: "" },
            raw: "summarize total = count()",
          },
        ],
      },
    ],
  },

  // ── Module 12: Enriching Records with join ─────────────────────────────────
  {
    id: "case-join-001",
    title: "Enriching Records with join",
    company: "CloudOps Inc",
    briefing:
      "CloudOps Inc stores raw log records with a `host` field but no tier metadata. A separate service registry maps each host to a service tier. You need to enrich the log records by joining them against the registry.",
    difficulty: "Advanced",
    track: "dql",
    steps: [
      {
        id: "step-1",
        title: "How join works — left meets right",
        narration:
          "The `join` command is a relational operation: it matches rows from the left-side pipeline to rows from a sub-query on the right using a shared key field (specified with `on: {field}`). The left side is the main pipeline — potentially millions of records. The right side lives inside the `[...]` block and is capped at 128 MB in Dynatrace Grail; always put the smaller dataset on the right. Unlike `append`, which stacks rows vertically, `join` combines columns horizontally: each matched pair produces a single output row containing fields from both sides. The default join kind is `inner`, which means only rows that have a matching key on both sides appear in the result — unmatched rows are silently dropped.",
        lesson: "join vs append — Horizontal vs Vertical Merge",
        goal: "Understand that join matches rows by key and combines columns, unlike append.",
        hint: "No query to run — read the narration to understand the concept.",
        sampleData: [],
        expectedPipeline: [],
        referenceQuery:
          "fetch logs\n| join kind:inner, on:{host}, [\n    fetch service_registry\n  ]",
      },
      {
        id: "step-2",
        title: "Inner join on a shared key",
        narration:
          "An inner join keeps only rows where the `on` field matches on both sides. Any log record whose `host` has no entry in the right-side registry is silently excluded from the result. There is one important caveat: **null key values never match** — even `null == null` is false in a join. A log record where `host` is null will always be dropped, regardless of join kind. This means inner joins are most reliable when the join key is guaranteed non-null on both sides. For CloudOps Inc, this gives a clean view of logs that can be attributed to a known service tier.",
        lesson: "Inner Join — Only Matched Rows",
        goal: "Join logs against service registry records on host; see only matched rows.",
        hint: "fetch logs | join kind:inner, on:{host}, [fetch service_registry]",
        sampleData: generateAppLogs(20, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "join",
            args: {
              kind: "inner",
              on: "host",
              // Must match generateAppLogs hostnames (app-01…app-06); app-06 is
              // deliberately missing so the inner join visibly drops its rows.
              records: (() => {
                const hosts = ["app-01", "app-02", "app-03", "app-04", "app-05"];
                const tiers = ["gold", "silver", "bronze", "gold", "silver"];
                return hosts.map((h, i) => ({ host: h, service_tier: tiers[i] }));
              })(),
            },
            raw: "join kind:inner, on:{host}, [fetch service_registry]",
          },
        ],
      },
      {
        id: "step-3",
        title: "Left outer join — keep all left records",
        narration:
          "A `leftOuter` join keeps every row from the left side, whether or not it has a match on the right. Rows with no match still appear in the result; their right-side fields are set to `null`. This is the safer choice when you cannot afford to lose records. For CloudOps Inc, using `leftOuter` means log records from hosts not yet in the registry still appear — you just see `null` for `service_tier`. This is also a useful diagnostic: filtering the result to `isNull(service_tier)` immediately shows you which hosts are missing from your registry. The 128 MB right-side limit still applies; filter aggressively inside `[...]` to project only the columns you need before the join runs.",
        lesson: "Left Outer Join — Preserve All Left Records",
        goal: "Understand leftOuter: all left records appear, unmatched right fields become null.",
        hint: "fetch logs | join kind:leftOuter, on:{host}, [fetch service_registry]",
        sampleData: [],
        expectedPipeline: [],
        referenceQuery:
          "fetch logs\n| join kind:leftOuter, on:{host}, [\n    fetch service_registry\n    | fields host, service_tier\n  ]\n| filter isNull(service_tier)",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 11 — Kubernetes Operations (Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-k8s-001",
    title: "Cluster Crash Investigation",
    company: "NovaPlatform",
    briefing:
      "Multiple pods in the production cluster have started crash-looping. Your job: pinpoint which deployments are failing, understand the cause, and find the worst offenders by restart count.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Find pods not in Running phase",
        narration:
          "A healthy Kubernetes pod has `phase == \"Running\"`. Any other value — `CrashLoopBackOff`, `Failed`, `Pending` — signals trouble. Filtering to non-Running pods immediately separates the broken from the healthy without needing to know the exact failure mode yet. NovaPlatform's cluster has hundreds of pods; this single filter narrows the investigation to only the anomalous subset.",
        lesson: "Filter for Non-Healthy Pod States",
        goal: "Keep only records where phase is not Running.",
        hint: 'filter phase != "Running"',
        sampleData: generateKubernetesStructuredLogs(300, 42),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'phase != "Running"' }, raw: 'filter phase != "Running"' },
        ],
      },
      {
        id: "step-2",
        title: "Group failures by deployment and reason",
        narration:
          "Now that you have only the failing pods, the next question is: which deployment has the most failures, and why? `summarize count(), by: {deployment, reason}` produces one row per unique deployment+reason combination, giving a quick matrix of what is breaking where. `OOMKilling` means the container exceeded its memory limit. `CrashLoopBackOff` means it keeps crashing on startup. `FailedMount` means a volume or secret is missing. Each reason points to a different fix.",
        lesson: "Summarize by Multiple Fields",
        goal: "Count failures grouped by deployment and reason.",
        hint: "summarize count(), by: {deployment, reason}",
        sampleData: generateKubernetesStructuredLogs(300, 42),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'phase != "Running"' }, raw: 'filter phase != "Running"' },
          { id: "e3", command: "summarize", args: { alias: "count", aggregation: "count", aggField: "", by: "deployment,reason" }, raw: "summarize count(), by: {deployment, reason}" },
          { id: "e4", command: "sort", args: { field: "count", direction: "desc" }, raw: "sort count desc" },
        ],
      },
      {
        id: "step-3",
        title: "Find the highest-restart pods",
        narration:
          "Restart count is the clearest quantitative signal of a crash-looping pod — the higher the number, the longer it has been failing. `summarize max_restarts = max(restart_count), by: {pod}` extracts the worst restart count for each pod. Sorting descending reveals the pods that have been struggling the longest. These are the priority targets: they have been failing repeatedly, meaning the issue is persistent, not a transient blip. NovaPlatform's SRE team uses this ranking to decide which pods to cordon and redeploy first.",
        lesson: "Find Maximum Value per Group",
        goal: "Per pod, find max restart count, ranked worst-first.",
        hint: "summarize max_restarts = max(restart_count), by: {pod} | sort max_restarts desc",
        sampleData: generateKubernetesStructuredLogs(300, 42),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "max_restarts", aggregation: "max", aggField: "restart_count", by: "pod" }, raw: "summarize max_restarts = max(restart_count), by: {pod}" },
          { id: "e3", command: "sort", args: { field: "max_restarts", direction: "desc" }, raw: "sort max_restarts desc" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 12 — Audit Trail Analysis (Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-audit-001",
    title: "The Insider Threat",
    company: "Meridian Finance",
    briefing:
      "Compliance flagged unusual activity on a privileged account. Investigate the audit trail: find denied actions, isolate high-risk operations, and rank users by suspicious activity.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Isolate denied and failed actions",
        narration:
          "Every access attempt in Meridian Finance's audit log records an `outcome`: `success`, `failure`, or `denied`. A `denied` outcome means the system actively blocked the action — the user tried to do something they were not permitted to do. Filtering to `outcome != \"success\"` captures both failures (unexpected errors) and denials (policy blocks), giving the full picture of rejected activity without needing to list every bad outcome explicitly.",
        lesson: "Filter by Non-Success Outcomes",
        goal: "Keep only records where outcome is not success.",
        hint: 'filter outcome != "success"',
        sampleData: generateAuditLogs(400, 7),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'outcome != "success"' }, raw: 'filter outcome != "success"' },
        ],
      },
      {
        id: "step-2",
        title: "Flag high-risk actions",
        narration:
          "Not all audit events carry the same risk. `sudo_escalate`, `read_secrets`, and `bulk_delete` are the three highest-risk actions in Meridian's policy framework: they can bypass controls, expose credentials, or cause irreversible data loss. The `in` operator lets you match a field against a list of values cleanly — much more readable than three separate `or` conditions. Filtering to just these actions focuses the investigation on the events that matter most for a potential insider threat case.",
        lesson: "Filter with the in Operator",
        goal: "Keep only sudo_escalate, read_secrets, or bulk_delete actions.",
        hint: 'filter action in ("sudo_escalate", "read_secrets", "bulk_delete")',
        sampleData: generateAuditLogs(400, 7),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'action in ("sudo_escalate", "read_secrets", "bulk_delete")' }, raw: 'filter action in ("sudo_escalate", "read_secrets", "bulk_delete")' },
        ],
      },
      {
        id: "step-3",
        title: "Rank users by high-risk action count",
        narration:
          "With the high-risk action population isolated, the final step is to rank users by how many such actions they performed. `summarize risky_actions = count(), by: {user}` produces one row per user with their total count. Sorting descending surfaces the most active users at the top — the compliance team at Meridian Finance will focus their review on the top 3 names in this list. If one user has significantly more entries than others, that is the account to investigate first.",
        lesson: "Rank Users by Activity Count",
        goal: "Count high-risk actions per user, ranked highest first.",
        hint: "summarize risky_actions = count(), by: {user} | sort risky_actions desc",
        sampleData: generateAuditLogs(400, 7),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'action in ("sudo_escalate", "read_secrets", "bulk_delete")' }, raw: 'filter action in ("sudo_escalate", "read_secrets", "bulk_delete")' },
          { id: "e3", command: "summarize", args: { alias: "risky_actions", aggregation: "count", aggField: "", by: "user" }, raw: "summarize risky_actions = count(), by: {user}" },
          { id: "e4", command: "sort", args: { field: "risky_actions", direction: "desc" }, raw: "sort risky_actions desc" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 13 — Security Event Triage (Advanced)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-sec-001",
    title: "MITRE ATT&CK Triage",
    company: "ShieldOps",
    briefing:
      "The SIEM just generated 500+ security events. Your task: separate the noise from genuine threats, map events to MITRE tactics, and identify what made it through the defenses.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Isolate CRITICAL and HIGH severity events",
        narration:
          "ShieldOps classifies security events into four severity levels: LOW, MEDIUM, HIGH, and CRITICAL. For initial triage, you want to focus on the events most likely to represent active intrusions. Filtering to `severity in (\"CRITICAL\", \"HIGH\")` cuts the noise by excluding reconnaissance and low-confidence detections, leaving only the events that warrant immediate investigation. CRITICAL events — container escapes, reverse shells, lateral movement — demand a response within minutes.",
        lesson: "Filter Security Events by Severity",
        goal: "Keep only CRITICAL and HIGH severity events.",
        hint: 'filter severity in ("CRITICAL", "HIGH")',
        sampleData: generateSecurityEvents(400, 99),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'severity in ("CRITICAL", "HIGH")' }, raw: 'filter severity in ("CRITICAL", "HIGH")' },
        ],
      },
      {
        id: "step-2",
        title: "Map events to MITRE tactics",
        narration:
          "MITRE ATT&CK is a framework that categorizes adversary behaviors into tactics — the *why* — and techniques — the *how*. Grouping your security events by `mitre_tactic` tells you what phase of the attack chain you are seeing most: Discovery, Credential Access, Lateral Movement, Exfiltration. A spike in `Lateral Movement` events is more concerning than a spike in `Discovery`, because it means the attacker has already gained a foothold and is moving deeper. `summarize count(), by: {mitre_tactic}` gives you this tactical map instantly.",
        lesson: "Summarize by MITRE Tactic",
        goal: "Count events by MITRE tactic, ranked by frequency.",
        hint: "summarize count(), by: {mitre_tactic} | sort count desc",
        sampleData: generateSecurityEvents(400, 99),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'severity in ("CRITICAL", "HIGH")' }, raw: 'filter severity in ("CRITICAL", "HIGH")' },
          { id: "e3", command: "summarize", args: { alias: "count", aggregation: "count", aggField: "", by: "mitre_tactic" }, raw: "summarize count(), by: {mitre_tactic}" },
          { id: "e4", command: "sort", args: { field: "count", direction: "desc" }, raw: "sort count desc" },
        ],
      },
      {
        id: "step-3",
        title: "Find events that bypassed the firewall",
        narration:
          "Most security rules block or alert on matches. But some events slip through with `action == \"allowed\"` — the detection fired but the traffic was permitted anyway. These are the most dangerous events: the attacker succeeded. Filtering for `action == \"allowed\"` on CRITICAL/HIGH events gives ShieldOps a precise list of intrusion attempts that were not stopped. This is the 'things that actually happened' list — everything else was blocked, but these events represent confirmed compromise activity that reached its target.",
        lesson: "Find Allowed High-Severity Events",
        goal: "Find CRITICAL or HIGH severity events that were allowed through.",
        hint: 'filter severity in ("CRITICAL", "HIGH") | filter action == "allowed"',
        sampleData: generateSecurityEvents(400, 99),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'severity in ("CRITICAL", "HIGH")' }, raw: 'filter severity in ("CRITICAL", "HIGH")' },
          { id: "e3", command: "filter", args: { condition: 'action == "allowed"' }, raw: 'filter action == "allowed"' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 14 — Infrastructure Health (Intermediate)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-infra-001",
    title: "The Overloaded Fleet",
    company: "ScaleForge",
    briefing:
      "Latency alarms are firing across ScaleForge's production fleet. Diagnose which hosts are under resource pressure, understand which roles are most affected, and build a health score.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Find hosts under CPU pressure",
        narration:
          "A CPU utilization above 80% is the standard threshold for 'elevated load' — at this point, the OS starts queuing processes and latency increases. ScaleForge tracks CPU usage in `cpu_pct` on every host snapshot. Filtering `cpu_pct > 80` immediately shows which hosts are running hot. These are the first candidates for scaling out or moving workloads. Combined with the `role` field, you can tell whether the pressure is in the web tier (user-facing impact) or in workers (background job delays).",
        lesson: "Filter by Numeric Threshold",
        goal: "Find host snapshots where CPU usage exceeds 80%.",
        hint: "filter cpu_pct > 80",
        sampleData: generateInfrastructureLogs(500, 33),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: "cpu_pct > 80" }, raw: "filter cpu_pct > 80" },
        ],
      },
      {
        id: "step-2",
        title: "Average CPU and memory by role",
        narration:
          "Individual host snapshots show point-in-time readings, but the bigger picture is how each role is faring on average. Web servers handle user traffic; databases handle persistence; cache nodes handle hot-path reads. `summarize avg_cpu = avg(cpu_pct), avg_mem = avg(mem_pct), by: {role}` distills the full dataset to one row per role. ScaleForge engineers use this to decide where to add capacity — if `database` has the highest average CPU, that tier needs scaling first, regardless of which individual host looks worst.",
        lesson: "Average Multiple Metrics by Group",
        goal: "Per role, compute average CPU and memory percentage.",
        hint: "summarize avg_cpu = avg(cpu_pct), avg_mem = avg(mem_pct), by: {role}",
        sampleData: generateInfrastructureLogs(500, 33),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "summarize",
            args: {
              aggs: [
                { alias: "avg_cpu", aggregation: "avg", aggField: "cpu_pct" },
                { alias: "avg_mem", aggregation: "avg", aggField: "mem_pct" },
              ],
              by: "role",
            },
            raw: "summarize avg_cpu = avg(cpu_pct), avg_mem = avg(mem_pct), by: {role}",
          },
          { id: "e3", command: "sort", args: { field: "avg_cpu", direction: "desc" }, raw: "sort avg_cpu desc" },
        ],
      },
      {
        id: "step-3",
        title: "Identify multi-resource stressed hosts",
        narration:
          "A host under CPU pressure alone can often cope. A host simultaneously under CPU *and* memory pressure is in genuine trouble — it is likely thrashing and cannot free resources. `filter cpu_pct > 80 and mem_pct > 80` finds these double-stressed hosts. At ScaleForge, a host matching both conditions is an automatic candidate for emergency scale-out: waiting for it to self-recover is not an option. The `and` operator here is doing real analytical work — it is not just two filters in sequence but a logical AND that both conditions must satisfy on the same record.",
        lesson: "Compound Filter with AND",
        goal: "Find snapshots where both CPU and memory exceed 80%.",
        hint: "filter cpu_pct > 80 and mem_pct > 80",
        sampleData: generateInfrastructureLogs(500, 33),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: "cpu_pct > 80 and mem_pct > 80" }, raw: "filter cpu_pct > 80 and mem_pct > 80" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 15 — APM Trace Analysis (Advanced)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-apm-001",
    title: "Tracing the Latency Spike",
    company: "StreamCart",
    briefing:
      "P95 checkout latency has risen from 200ms to 1.4s. Dig into the APM spans to find the slow service, the worst operation, and the error rate driving user impact.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Find slow spans above 1 second",
        narration:
          "A span represents one unit of work in a distributed trace — a service call, a database query, a cache lookup. Duration above 1000ms is unusual for most operations in StreamCart's architecture; these are the spans contributing to the P95 latency spike. Filtering `duration_ms > 1000` isolates them from the thousands of fast spans in the dataset. The `service` and `operation` fields on these records will tell you exactly which part of the system is slow — the data you need before you can form any hypothesis.",
        lesson: "Filter Spans by Duration Threshold",
        goal: "Keep only spans with duration_ms over 1000 ms.",
        hint: "filter duration_ms > 1000",
        sampleData: generateApmSpans(500, 55),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: "duration_ms > 1000" }, raw: "filter duration_ms > 1000" },
        ],
      },
      {
        id: "step-2",
        title: "Compute error rate per service",
        narration:
          "Latency and errors often go together: a downstream service timing out causes the caller to wait. To understand which services are contributing to both problems, compute the error rate per service. `summarize total = count(), errors = countIf(is_error == true), by: {service}` gives you both the volume and the error count in one pipeline. Dividing errors by total would give you the rate, but for triage purposes, raw counts are often enough — a service with 50 errors out of 60 calls is in crisis, regardless of the percentage.",
        lesson: "Count Errors with countIf",
        goal: "Per service, compute total spans and error count.",
        hint: "summarize total = count(), errors = countIf(is_error == true), by: {service}",
        sampleData: generateApmSpans(500, 55),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "summarize",
            args: {
              aggs: [
                { alias: "total", aggregation: "count", aggField: "" },
                { alias: "errors", aggregation: "countif", aggField: "is_error == true" },
              ],
              by: "service",
            },
            raw: "summarize total = count(), errors = countIf(is_error == true), by: {service}",
          },
          { id: "e3", command: "sort", args: { field: "errors", direction: "desc" }, raw: "sort errors desc" },
        ],
      },
      {
        id: "step-3",
        title: "Find the slowest operations by median duration",
        narration:
          "Max duration is noisy — a single outlier can dominate the ranking. Median (P50) duration is a better measure of the typical experience for each operation. `summarize p50 = median(duration_ms), by: {service, operation}` produces one row per service+operation pair with its median latency. Sorting by `p50 desc` puts the slowest operations at the top. For StreamCart, this is the definitive answer to 'what is slow': not which call had the worst spike, but which call is *consistently* slow across all its invocations.",
        lesson: "Median Duration per Operation",
        goal: "Per service and operation, compute median duration_ms.",
        hint: "summarize p50 = median(duration_ms), by: {service, operation} | sort p50 desc",
        sampleData: generateApmSpans(500, 55),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "p50", aggregation: "median", aggField: "duration_ms", by: "service,operation" }, raw: "summarize p50 = median(duration_ms), by: {service, operation}" },
          { id: "e3", command: "sort", args: { field: "p50", direction: "desc" }, raw: "sort p50 desc" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 16 — Parsing Unstructured Data (Intermediate–Advanced)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-parse-001",
    title: "Mining JSON Logs",
    company: "StackAPI",
    briefing:
      "StackAPI's application services emit structured JSON in the log content field. Most analysts query raw content — this lesson shows how parse transforms unstructured content into queryable fields.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Extract fields from JSON content",
        narration:
          "Real-world application logs often write the entire log event as a JSON object inside the `content` field: `{\"level\":\"ERROR\",\"service\":\"order-service\",\"latency_ms\":412}`. Without `parse`, you can only `filter contains(content, \"ERROR\")` — a slow, imprecise text search. With `parse content, JSON:parsed`, DQL deserializes the JSON and spreads every key directly onto the record row. After the parse step, `level`, `service`, and `latency_ms` are first-class filterable fields. This is the single most transformative DQL command for structured application logs.",
        lesson: "Parse JSON Content into Fields",
        goal: "Extract all JSON fields from log content using parse JSON.",
        hint: 'parse content, "JSON:event"',
        sampleData: generateJsonLogs(200, 11),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "JSON:event" }, raw: 'parse content, "JSON:event"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter and aggregate on parsed fields",
        narration:
          "Once the JSON is parsed into fields, the pipeline continues exactly like any other DQL query — all the standard commands work on the newly extracted fields. `filter level == \"ERROR\"` now does an exact match rather than a fuzzy text search; `summarize count(), by: {service}` groups by the actual service name rather than hoping the string appears in content. This is the key payoff of parse: structured queries on unstructured data. StackAPI's on-call engineers use this to instantly see which microservice is throwing the most errors without reading raw JSON.",
        lesson: "Query Parsed Fields Like Native Fields",
        goal: "After parsing, filter for ERROR level and count by service.",
        hint: 'parse content, "JSON:event" | filter level == "ERROR" | summarize count(), by: {service}',
        sampleData: generateJsonLogs(200, 11),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "JSON:event" }, raw: 'parse content, "JSON:event"' },
          { id: "e3", command: "filter", args: { condition: 'level == "ERROR"' }, raw: 'filter level == "ERROR"' },
          { id: "e4", command: "summarize", args: { alias: "count", aggregation: "count", aggField: "", by: "service" }, raw: "summarize count(), by: {service}" },
        ],
      },
    ],
  },
  {
    id: "case-parse-002",
    title: "Typed Pattern Extraction",
    company: "WebGrid",
    briefing:
      "WebGrid's NGINX access logs are plain text — not JSON. Use DQL typed capture groups to extract structured fields like IP addresses, status codes, and byte counts from the raw log line.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Extract IP and status with typed capture groups",
        narration:
          "DQL's `parse` command supports typed tokens that match and coerce specific value shapes. `IPADDR:client_ip` matches a dotted-quad IPv4 address and assigns it to `client_ip`. `INT:status` matches an integer and stores it as a number (not a string), enabling numeric comparisons like `filter status >= 400`. The token `LD` (literal delimiter) is a wildcard that skips any characters between the parts you care about — it is the 'go to the next thing' instruction. In WebGrid's Nginx access logs, the status code and byte count sit next to each other near the end of the line, so the pattern is `IPADDR:client_ip LD INT:status LONG:bytes` — LD skips everything between the IP and the status, and the adjacent INT/LONG tokens pick up the two space-separated numbers. One parse line extracts three structured fields from free text.",
        lesson: "Typed Tokens: IPADDR, INT, LD",
        goal: "Extract client_ip (IPADDR), status (INT), and bytes (LONG) from content.",
        hint: 'parse content, "IPADDR:client_ip LD INT:status LONG:bytes"',
        sampleData: generateNginxLogs(300, 22),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "IPADDR:client_ip LD INT:status LONG:bytes" }, raw: 'parse content, "IPADDR:client_ip LD INT:status LONG:bytes"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter errors and rank by IP",
        narration:
          "After extraction, `status` is a real integer — `filter status >= 400` does a numeric comparison, not a string search. Aggregating by `client_ip` shows which IP addresses generated the most client and server errors. For WebGrid, this query is the first step in detecting scraper abuse or DDoS: IPs generating hundreds of 4xx responses per minute are candidates for rate-limiting. The combination of typed parse + numeric filter + summarize by IP is one of the most powerful patterns in web log analysis.",
        lesson: "Numeric Filter on Parsed INT Field",
        goal: "After parsing, filter status >= 400 and count errors per client IP.",
        hint: 'parse content, "IPADDR:client_ip LD INT:status LONG:bytes" | filter status >= 400 | summarize errors = count(), by: {client_ip} | sort errors desc',
        sampleData: generateNginxLogs(300, 22),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "IPADDR:client_ip LD INT:status LONG:bytes" }, raw: 'parse content, "IPADDR:client_ip LD INT:status LONG:bytes"' },
          { id: "e3", command: "filter", args: { condition: "status >= 400" }, raw: "filter status >= 400" },
          { id: "e4", command: "summarize", args: { alias: "errors", aggregation: "count", aggField: "", by: "client_ip" }, raw: "summarize errors = count(), by: {client_ip}" },
          { id: "e5", command: "sort", args: { field: "errors", direction: "desc" }, raw: "sort errors desc" },
        ],
      },
    ],
  },
  {
    id: "case-parse-003",
    title: "Key-Value Log Extraction",
    company: "DataBridge",
    briefing:
      "DataBridge's internal services emit structured-but-not-JSON logs: `user=alice action=export_data outcome=success duration_ms=312`. The KVP parser turns these into queryable fields in one step.",
    difficulty: "Intermediate",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Parse key=value pairs",
        narration:
          "The KVP (Key-Value Pair) pattern is designed for logs that are already partially structured — the application wrote each value as `key=value` but didn't serialize as JSON. `parse content, KVP:fields` scans the content string for all whitespace-delimited tokens that contain `=`, splits each on the first `=`, and adds both sides as fields on the record. After this single parse step, `user`, `action`, `outcome`, and `duration_ms` are all first-class DQL fields. DataBridge's audit pipeline uses this to query operator actions without any log format changes on the application side.",
        lesson: "KVP Pattern: Parse key=value Logs",
        goal: "Extract key=value fields from content using KVP parse.",
        hint: 'parse content, "KVP:fields"',
        sampleData: generateAuditLogs(250, 15),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "KVP:fields" }, raw: 'parse content, "KVP:fields"' },
        ],
      },
      {
        id: "step-2",
        title: "Summarize outcomes per action",
        narration:
          "With `user`, `action`, and `outcome` extracted as fields, DQL can now answer 'how many times did each action succeed versus fail?' The `summarize` command counts records grouped by the two fields. This gives DataBridge's compliance team a per-action breakdown without needing any ETL pipeline or schema migration — just a parse step at query time. This is the core value of server-side parse: structured analytics on logs that were written as plain text.",
        lesson: "Aggregate Over KVP-Parsed Fields",
        goal: "Count events grouped by action and outcome.",
        hint: 'parse content, "KVP:fields" | summarize count(), by: {action, outcome}',
        sampleData: generateAuditLogs(250, 15),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "KVP:fields" }, raw: 'parse content, "KVP:fields"' },
          { id: "e3", command: "summarize", args: { alias: "count", aggregation: "count", aggField: "", by: "action,outcome" }, raw: "summarize count(), by: {action, outcome}" },
          { id: "e4", command: "sort", args: { field: "count", direction: "desc" }, raw: "sort count desc" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 17 — Lookup and Entity Enrichment (Advanced)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-lookup-001",
    title: "Enriching Logs with Context",
    company: "OptiCloud",
    briefing:
      "OptiCloud's infrastructure logs contain a `host` field but no environment, tier, or owner metadata. Use lookup to enrich every log record with host-level context from a registry table — without a full join.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Understand lookup vs join",
        narration:
          "DQL has two enrichment commands: `join` and `lookup`. The difference is subtle but important. `join` is a relational operation: it can produce multiple rows for one left record if multiple right records match the join key. `lookup` is a point-in-time enrichment: it finds the **first** matching right row and merges its fields into the left row, then moves on. This makes lookup safer for enrichment — you always get at most one result per left record. A join would create duplicate rows if the registry had two entries for the same host. For metadata enrichment (adding environment, owner, tier to a log record), lookup is almost always the right choice over join.",
        lesson: "Lookup vs Join — Choose Lookup for Enrichment",
        goal: "Read and understand when to use lookup vs join.",
        hint: "No query — this is a concept step.",
        sampleData: [],
        expectedPipeline: [],
        referenceQuery: "fetch logs\n| lookup sourceField:host, lookupField:host,\n    [fetch host_registry],\n    prefix:meta.",
      },
      {
        id: "step-2",
        title: "Enrich logs with host metadata",
        narration:
          "The `lookup` command syntax: `lookup sourceField:<leftField>, lookupField:<rightField>, [subquery], prefix:<prefix>`. The `sourceField` is the field in your left (log) data; `lookupField` is the matching field in the right (registry) data; `prefix` is prepended to all imported right-side fields to avoid name collisions. For OptiCloud: `lookup sourceField:host, lookupField:host` matches each log record to its registry entry by hostname and brings in `service_tier` and `environment` as `meta.service_tier` and `meta.environment`. Records with no match in the registry are preserved with null for the prefix fields — lookup is always left-outer semantics.",
        lesson: "Lookup Syntax and Left-Outer Semantics",
        goal: "Enrich logs with host tier and environment from the registry.",
        hint: "fetch logs | lookup sourceField:host, lookupField:host, [fetch host_registry], prefix:meta.",
        sampleData: generateInfrastructureLogs(200, 44),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "lookup",
            args: {
              sourceField: "host",
              lookupField: "host",
              prefix: "meta.",
              records: (() => {
                const hosts = [
                  { host: "prod-app-01", environment: "production", service_tier: "web", owner: "platform-team" },
                  { host: "prod-app-02", environment: "production", service_tier: "web", owner: "platform-team" },
                  { host: "prod-app-03", environment: "production", service_tier: "web", owner: "platform-team" },
                  { host: "prod-db-01", environment: "production", service_tier: "database", owner: "dba-team" },
                  { host: "prod-db-02", environment: "production", service_tier: "database", owner: "dba-team" },
                  { host: "prod-cache-01", environment: "production", service_tier: "cache", owner: "platform-team" },
                  { host: "prod-worker-01", environment: "production", service_tier: "worker", owner: "backend-team" },
                  { host: "prod-worker-02", environment: "production", service_tier: "worker", owner: "backend-team" },
                  { host: "prod-k8s-01", environment: "production", service_tier: "k8s-node", owner: "sre-team" },
                  { host: "prod-k8s-02", environment: "production", service_tier: "k8s-node", owner: "sre-team" },
                ];
                return hosts;
              })(),
            },
            raw: "lookup sourceField:host, lookupField:host, [fetch host_registry], prefix:meta.",
          },
        ],
      },
      {
        id: "step-3",
        title: "Filter and group by enriched field",
        narration:
          "After the lookup, `meta.service_tier` and `meta.owner` are first-class fields on every log record. This unlocks queries that were impossible before: `filter meta.service_tier == \"database\"` selects only database-tier logs; `summarize count(), by: {meta.owner}` tells you which team's systems are generating the most log volume. OptiCloud uses this pattern to produce per-team infrastructure health summaries without requiring every service to emit an `owner` field in its logs — the metadata lives in the registry and is joined at query time.",
        lesson: "Filter and Aggregate on Lookup-Enriched Fields",
        goal: "Filter for database-tier hosts and count logs per owner.",
        hint: 'lookup ... | filter meta.service_tier == "database" | summarize count(), by: {meta.owner}',
        sampleData: generateInfrastructureLogs(200, 44),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "lookup",
            args: {
              sourceField: "host",
              lookupField: "host",
              prefix: "meta.",
              records: [
                { host: "prod-app-01", environment: "production", service_tier: "web", owner: "platform-team" },
                { host: "prod-app-02", environment: "production", service_tier: "web", owner: "platform-team" },
                { host: "prod-app-03", environment: "production", service_tier: "web", owner: "platform-team" },
                { host: "prod-db-01", environment: "production", service_tier: "database", owner: "dba-team" },
                { host: "prod-db-02", environment: "production", service_tier: "database", owner: "dba-team" },
                { host: "prod-cache-01", environment: "production", service_tier: "cache", owner: "platform-team" },
                { host: "prod-worker-01", environment: "production", service_tier: "worker", owner: "backend-team" },
                { host: "prod-worker-02", environment: "production", service_tier: "worker", owner: "backend-team" },
                { host: "prod-k8s-01", environment: "production", service_tier: "k8s-node", owner: "sre-team" },
                { host: "prod-k8s-02", environment: "production", service_tier: "k8s-node", owner: "sre-team" },
              ],
            },
            raw: "lookup sourceField:host, lookupField:host, [fetch host_registry], prefix:meta.",
          },
          { id: "e3", command: "filter", args: { condition: 'meta.service_tier == "database"' }, raw: 'filter meta.service_tier == "database"' },
          { id: "e4", command: "summarize", args: { alias: "count", aggregation: "count", aggField: "", by: "meta.owner" }, raw: "summarize count(), by: {meta.owner}" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULE 18 — Expand, countDistinct, and Time Functions (Advanced)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "case-adv-expand-001",
    title: "Array Expansion and Deduplication",
    company: "TagForge",
    briefing:
      "TagForge events carry a `tags` array field. Use expand to flatten arrays into rows, countDistinct to measure cardinality, and time functions to find hourly activity patterns.",
    difficulty: "Advanced",
    track: "dql",
    tier: "free",
    steps: [
      {
        id: "step-1",
        title: "Expand an array into rows",
        narration:
          "Some fields hold arrays rather than single values — a `tags` field like [\"critical\", \"deployment\"] is one record carrying two tags. You cannot group by an array directly: the whole array would form a single group key. The `expand` command flattens arrays into rows — one output row per array element, with all other fields duplicated. After `expand tags`, a record tagged [\"critical\", \"deployment\"] becomes two records, one with `tags = \"critical\"` and one with `tags = \"deployment\"`. Now a `summarize count(), by: {tags}` counts each individual tag. At TagForge, this is how the platform team measures which tags are actually in use across all events. Records without a tags array pass through unchanged.",
        lesson: "expand — Flatten Arrays into Rows",
        goal: "Expand the tags array, then count events per individual tag.",
        hint: "expand tags | summarize count(), by: {tags} | sort count desc",
        sampleData: generateEventsWithTags(300, 19),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "events" }, raw: "fetch events" },
          { id: "e2", command: "expand", args: { field: "tags" }, raw: "expand tags" },
          { id: "e3", command: "summarize", args: { alias: "count", aggregation: "count", aggField: "", by: "tags" }, raw: "summarize count(), by: {tags}" },
          { id: "e4", command: "sort", args: { field: "count", direction: "desc" }, raw: "sort count desc" },
        ],
      },
      {
        id: "step-2",
        title: "Count distinct values with countDistinct",
        narration:
          "Sometimes you need to know 'how many unique values exist?' rather than 'how many records are there?' For example: 'how many distinct hosts logged an error today?' is a cardinality question. `summarize countDistinct(host)` gives you the count of unique values in a field across all records. This is different from `count()` — if `host-01` logged 50 errors, `count()` gives 50 but `countDistinct(host)` counts it as 1. TagForge uses this to measure how many unique users performed an action in a given period — the cardinality of the `user` field is the metric that matters for license compliance.",
        lesson: "countDistinct — Unique Value Counting",
        goal: "Count the number of distinct users in the audit log.",
        hint: "summarize distinct_users = countDistinct(user)",
        sampleData: generateAuditLogs(300, 19),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { alias: "distinct_users", aggregation: "countdistinct", aggField: "user" }, raw: "summarize distinct_users = countDistinct(user)" },
        ],
      },
      {
        id: "step-3",
        title: "Bucket events by hour of day",
        narration:
          "DQL's `getHour(timestamp)` extracts the hour component (0–23) from a timestamp. Using it in a `fieldsAdd` step creates a derived column that can then be used in `summarize ... by: {hour}` to produce an hourly breakdown. This pattern is essential for finding time-of-day patterns: peak error hours, off-hours access by privileged accounts, or request volume by timezone. TagForge's security team runs this query daily to detect anomalous activity outside business hours (typically anything before hour 8 or after hour 18 in their local timezone is flagged for review).",
        lesson: "Time Functions: getHour for Hourly Patterns",
        goal: "Count events by hour of day to find activity patterns.",
        hint: "fieldsAdd hour = getHour(timestamp) | summarize count(), by: {hour} | sort hour",
        sampleData: generateAuditLogs(300, 19),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "fieldsAdd", args: { assignments: "hour = getHour(timestamp)" }, raw: "fieldsAdd hour = getHour(timestamp)" },
          { id: "e3", command: "summarize", args: { alias: "count", aggregation: "count", aggField: "", by: "hour" }, raw: "summarize count(), by: {hour}" },
          { id: "e4", command: "sort", args: { field: "hour", direction: "asc" }, raw: "sort hour asc" },
        ],
      },
    ],
  },
];
