export type QueryDifficulty = "simple" | "intermediate" | "advanced";
export type QueryCategory = "logs" | "metrics" | "spans" | "bizevents" | "joins" | "aggregation" | "parsing" | "system" | "entities";

export interface QueryEntry {
  id: string;
  category: QueryCategory;
  title: string;
  description: string;
  difficulty: QueryDifficulty;
  query: string;
  explanation: string;
  xpReward: number;
}

export const QUERY_LIBRARY: QueryEntry[] = [
  // Logs
  {
    id: "q-log-001",
    category: "logs",
    title: "Filter Errors by Source",
    description: "Basic error filtering from a specific log source.",
    difficulty: "simple",
    query: `fetch logs, from: -1h
| filter loglevel == "ERROR"
| filter log.source == "auth-service"
| fields timestamp, content, host`,
    explanation: "This pipeline fetches logs from the last hour, filters for ERROR level entries from the auth-service, and keeps only the timestamp, content, and host columns.",
    xpReward: 5,
  },
  {
    id: "q-log-002",
    category: "logs",
    title: "Parse HTTP Status Codes",
    description: "Extract status codes from log content using parse.",
    difficulty: "intermediate",
    query: `fetch logs, from: -24h
| parse content, "INT:http_status"
| filter http_status >= 400
| summarize error_count = count(), by:{http_status}
| sort error_count desc`,
    explanation: "Uses the parse command with a typed capture group (INT:) to extract numeric HTTP status codes from unstructured log content. Then filters for 4xx/5xx errors and aggregates counts per status code.",
    xpReward: 10,
  },
  {
    id: "q-log-003",
    category: "logs",
    title: "Slow Query Detection",
    description: "Find database queries exceeding a latency threshold.",
    difficulty: "intermediate",
    query: `fetch logs, from: -6h
| filter log.source == "database"
| parse content, "DURATION:query_time"
| filter query_time > 500ms
| fields timestamp, query_time, content
| sort query_time desc
| limit 20`,
    explanation: "Filters database logs and parses out query duration. The DURATION type automatically handles millisecond values. Results are sorted by slowest query first.",
    xpReward: 10,
  },
  {
    id: "q-log-004",
    category: "logs",
    title: "Login Failure Pattern Analysis",
    description: "Detect brute-force login attempts by aggregating failures per IP.",
    difficulty: "advanced",
    query: `fetch logs, from: -1h
| filter log.source == "auth-service"
| filter content ~ "Login failed"
| parse content, "IPADDR:source_ip"
| summarize failures = count(), by:{source_ip}
| filter failures >= 10
| fieldsAdd risk_level = if(failures >= 50, "critical", "warning")`,
    explanation: "Combines filtering, parsing (IPADDR type), aggregation, and conditional field addition to identify potential brute-force attacks. Uses the contains operator (~) for flexible text matching.",
    xpReward: 15,
  },
  {
    id: "q-log-005",
    category: "logs",
    title: "Log Volume Timeseries",
    description: "Track log ingestion volume over time.",
    difficulty: "intermediate",
    query: `fetch logs, from: -24h
| makeTimeseries volume = count(), interval: 1h
| fieldsAdd hour = formatTimestamp(timestamp, "HH:mm")`,
    explanation: "Creates a time-series of log counts bucketed into hourly intervals. Useful for spotting ingestion spikes or drops.",
    xpReward: 10,
  },

  // Metrics
  {
    id: "q-metric-001",
    category: "metrics",
    title: "CPU Usage Aggregation",
    description: "Aggregate CPU metrics by host and time.",
    difficulty: "simple",
    query: `fetch metrics, from: -1h
| filter metric.name == "cpu.usage"
| summarize avg_cpu = avg(value), by:{host}
| sort avg_cpu desc`,
    explanation: "Fetches CPU usage metrics and computes the average per host. The sort puts the most loaded hosts at the top.",
    xpReward: 5,
  },
  {
    id: "q-metric-002",
    category: "metrics",
    title: "Memory Pressure Bucketing",
    description: "Bucket memory usage into severity bands.",
    difficulty: "intermediate",
    query: `fetch metrics, from: -6h
| filter metric.name == "mem.usage.percent"
| fieldsAdd severity = if(value >= 90, "critical",
    if(value >= 75, "warning", "normal"))
| summarize count = count(), by:{severity, host}
| sort severity`,
    explanation: "Uses nested if() to categorize memory usage into severity bands, then aggregates counts per host and severity level.",
    xpReward: 10,
  },

  // Spans
  {
    id: "q-span-001",
    category: "spans",
    title: "Slow Span Detection",
    description: "Find spans with duration above a threshold.",
    difficulty: "simple",
    query: `fetch spans, from: -1h
| filter duration > 1s
| fields timestamp, span.name, duration, service.name
| sort duration desc
| limit 50`,
    explanation: "Filters spans exceeding 1 second latency. Spans represent individual operations in distributed traces.",
    xpReward: 5,
  },
  {
    id: "q-span-002",
    category: "spans",
    title: "Error Rate by Service",
    description: "Calculate the percentage of error spans per service.",
    difficulty: "advanced",
    query: `fetch spans, from: -6h
| fieldsAdd is_error = status.code == "ERROR"
| summarize
    total = count(),
    errors = countIf(is_error),
    error_rate = countIf(is_error) * 100.0 / count(),
    by:{service.name}
| sort error_rate desc`,
    explanation: "Creates a boolean flag for error spans, then aggregates total count, error count, and computes error rate percentage per service. The countIf function is key here.",
    xpReward: 15,
  },
  {
    id: "q-span-003",
    category: "spans",
    title: "Latency Percentile Analysis",
    description: "Compute p50, p95, and p99 latencies per endpoint.",
    difficulty: "advanced",
    query: `fetch spans, from: -24h
| filter status.code == "OK"
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99),
    by:{endpoint}
| sort p99 desc
| limit 20`,
    explanation: "Uses the percentile() function to compute latency percentiles per endpoint. Filtering for OK status ensures only successful requests are analyzed.",
    xpReward: 15,
  },

  // Business Events
  {
    id: "q-biz-001",
    category: "bizevents",
    title: "Order Funnel Analysis",
    description: "Track conversion from order to payment to fulfillment.",
    difficulty: "intermediate",
    query: `fetch bizevents, from: -24h
| filter event.type in array("com.acme.order_confirmed", "com.acme.payment_confirmed", "com.acme.close_order")
| summarize count = count(), by:{event.type}
| fieldsAdd step = if(event.type == "com.acme.order_confirmed", "Order",
    if(event.type == "com.acme.payment_confirmed", "Payment", "Fulfilled"))
| sort count desc`,
    explanation: "Aggregates business events by type to build a simple funnel view. Shows how many orders made it through each stage.",
    xpReward: 10,
  },
  {
    id: "q-biz-002",
    category: "bizevents",
    title: "Revenue by Product",
    description: "Calculate total revenue per product from order confirmations.",
    difficulty: "simple",
    query: `fetch bizevents, from: -7d
| filter event.type == "com.acme.order_confirmed"
| summarize revenue = sum(amount), orders = count(), by:{product}
| sort revenue desc`,
    explanation: "Filters order events and aggregates revenue and order count per product. A foundational business analytics query.",
    xpReward: 5,
  },
  {
    id: "q-biz-003",
    category: "bizevents",
    title: "Customer LTV Estimate",
    description: "Estimate lifetime value by aggregating spend per account.",
    difficulty: "advanced",
    query: `fetch bizevents, from: -90d
| filter event.type == "com.acme.payment_confirmed"
| summarize
    total_spend = sum(amount),
    transactions = count(),
    avg_order = avg(amount),
    by:{accountId}
| fieldsAdd ltv_tier = if(total_spend >= 1000, "high",
    if(total_spend >= 500, "medium", "low"))
| sort total_spend desc
| limit 100`,
    explanation: "Aggregates payment events over 90 days per account. Calculates total spend, transaction count, and average order value. Adds an LTV tier for segmentation.",
    xpReward: 15,
  },

  // Joins & Correlation
  {
    id: "q-join-001",
    category: "joins",
    title: "Correlate Logs with Spans",
    description: "Join log errors with their trace spans.",
    difficulty: "advanced",
    query: `fetch logs, from: -1h
| filter loglevel == "ERROR"
| join (fetch spans, from: -1h), on:{trace_id}
| fields timestamp, span.name, content, service.name`,
    explanation: "Uses the join command to correlate error logs with their corresponding spans using the shared trace_id field. Essential for root cause analysis.",
    xpReward: 15,
  },
  {
    id: "q-join-002",
    category: "joins",
    title: "Append Events to Logs",
    description: "Union log errors with deployment events.",
    difficulty: "intermediate",
    query: `fetch logs, from: -6h
| filter loglevel == "ERROR"
| append (fetch events, from: -6h | filter event.type == "deployment")
| sort timestamp desc
| limit 100`,
    explanation: "The append command unions two datasets. This is useful for creating timelines that mix logs and events (e.g., 'did a deployment coincide with errors?').",
    xpReward: 10,
  },

  // Aggregation patterns
  {
    id: "q-agg-001",
    category: "aggregation",
    title: "Top-N Hosts by Error Count",
    description: "Find the noisiest hosts using summarize and limit.",
    difficulty: "simple",
    query: `fetch logs, from: -24h
| filter loglevel == "ERROR"
| summarize errors = count(), by:{host}
| sort errors desc
| limit 10`,
    explanation: "Classic top-N pattern: group by host, count errors, sort descending, and cap at 10 results.",
    xpReward: 5,
  },
  {
    id: "q-agg-002",
    category: "aggregation",
    title: "Hourly Error Distribution",
    description: "Bucket errors by hour of day.",
    difficulty: "intermediate",
    query: `fetch logs, from: -7d
| filter loglevel == "ERROR"
| fieldsAdd hour = getHour(timestamp)
| summarize errors = count(), by:{hour}
| sort hour`,
    explanation: "Uses getHour() to extract the hour from timestamps, then aggregates error count per hour. Helps identify time-of-day patterns.",
    xpReward: 10,
  },

  // Parsing patterns
  {
    id: "q-parse-001",
    category: "parsing",
    title: "Extract JSON Fields",
    description: "Parse JSON content using jsonPath.",
    difficulty: "intermediate",
    query: `fetch logs, from: -1h
| filter log.source == "api-gateway"
| fieldsAdd user_id = jsonPath(content, "$.user.id")
| fieldsAdd action = jsonPath(content, "$.action")
| filter isNotNull(user_id)
| fields timestamp, user_id, action`,
    explanation: "Uses jsonPath() to extract nested values from JSON log content. The isNotNull filter removes rows where parsing failed.",
    xpReward: 10,
  },
  {
    id: "q-parse-002",
    category: "parsing",
    title: "Multi-field Parse Pattern",
    description: "Extract multiple values in a single parse command.",
    difficulty: "advanced",
    query: `fetch logs, from: -6h
| filter log.source == "web-server"
| parse content, "IPADDR:client_ip \"TIMESTAMP:req_time \"STRING:method \"STRING:path \"INT:status_code \"LONG:response_size"
| filter status_code >= 400
| summarize count = count(), by:{status_code, path}
| sort count desc`,
    explanation: "Demonstrates a complex parse pattern extracting IP, timestamp, HTTP method, path, status code, and response size in one command. The parse command supports multiple typed capture groups separated by literals.",
    xpReward: 15,
  },

  // ── System Queries (free — no DDU cost) ────────────────────────────────────
  {
    id: "q-sys-001",
    category: "system",
    title: "Audit Expensive Queries",
    description: "Find the most costly DQL queries by bytes scanned. Free to run — dt.system tables have no DDU cost.",
    difficulty: "simple",
    query: `fetch dt.system.query_executions, from: now() - 24h
| filter status == "SUCCEEDED"
| summarize
    runs = count(),
    scanned_gb = sum(scanned_bytes.on_demand) / 1000000000,
    by: {query_string}
| sort scanned_gb desc
| limit 20`,
    explanation: "dt.system.query_executions records every DQL query execution in your tenant. This query finds the most expensive queries by total bytes scanned — the key DDU cost driver. Free to run because dt.system.* tables don't consume DDU.",
    xpReward: 10,
  },
  {
    id: "q-sys-002",
    category: "system",
    title: "Failed Query Analysis",
    description: "Find queries that failed in the last hour and why.",
    difficulty: "simple",
    query: `fetch dt.system.query_executions, from: now() - 1h
| filter status == "FAILED"
| fields timestamp, query_string, error.message, user.email
| sort timestamp desc`,
    explanation: "Quickly identify which queries are failing and who ran them. Useful for debugging query syntax errors or permission issues before investing time in optimization.",
    xpReward: 5,
  },
  {
    id: "q-sys-003",
    category: "system",
    title: "Query Cost Trend by User",
    description: "Understand which users or apps are driving the most DQL cost.",
    difficulty: "intermediate",
    query: `fetch dt.system.query_executions, from: now() - 7d
| filter status == "SUCCEEDED"
| summarize
    queries = count(),
    scanned_gb = sum(scanned_bytes.on_demand) / 1000000000,
    avg_ms = avg(execution_time_ms),
    by: {user.email, client.application_context}
| sort scanned_gb desc
| limit 20`,
    explanation: "Breaks down DQL cost by user and application context. Identifies which teams or automation jobs are the biggest consumers — useful for cost allocation and capacity planning.",
    xpReward: 10,
  },
  {
    id: "q-sys-004",
    category: "system",
    title: "Sampling Ratio Estimation",
    description: "Account for log sampling in your count estimates.",
    difficulty: "advanced",
    query: `fetch logs, from: now() - 1h
| filter loglevel == "ERROR"
| summarize
    sampled_errors = count(),
    sampling_ratio = takeAny(dt.system.sampling_ratio),
    estimated_total = toLong(count() / takeAny(dt.system.sampling_ratio))`,
    explanation: "Dynatrace samples logs when ingestion volume is high. The dt.system.sampling_ratio field holds the actual ratio (0.0–1.0). Dividing sampled counts by this ratio gives the estimated true count. Always check sampling before drawing conclusions from error counts.",
    xpReward: 15,
  },

  // ── Entity Queries (free — entity model) ───────────────────────────────────
  {
    id: "q-ent-001",
    category: "entities",
    title: "List Production Hosts",
    description: "Query the entity model to find all hosts tagged with env:production.",
    difficulty: "simple",
    query: `fetch dt.entity.host
| fields entity.name, ipAddresses, tags, managementZones, osType
| filter arrayContains(tags, "env:production")
| sort entity.name`,
    explanation: "The dt.entity.host table is the entity model — no DDU cost. It contains the current state of all monitored hosts. arrayContains() checks if a tag is in the tags array.",
    xpReward: 5,
  },
  {
    id: "q-ent-002",
    category: "entities",
    title: "Services by Technology",
    description: "Find all services grouped by the technology they run on.",
    difficulty: "simple",
    query: `fetch dt.entity.service
| fields entity.name, serviceType, tags, fromRelationships.runsOn
| summarize count = count(), by: {serviceType}
| sort count desc`,
    explanation: "Groups services by technology type (Java, .NET, Node.js, etc.). The entity model is free to query and gives you a real-time inventory of your service landscape.",
    xpReward: 5,
  },
  {
    id: "q-ent-003",
    category: "entities",
    title: "Enrich Logs with Host Entity",
    description: "Join log data with host entity metadata to add environment and zone context.",
    difficulty: "advanced",
    query: `fetch logs, from: now() - 1h
| filter loglevel == "ERROR"
| lookup sourceField:dt.entity.host, lookupField:entityId,
    [fetch dt.entity.host | fields entityId, entity.name, tags, managementZones],
    prefix: host.
| fields timestamp, content, host.entity.name, host.managementZones
| sort timestamp desc`,
    explanation: "Uses lookup (not join) to enrich log records with entity metadata. lookup is more efficient than join for enrichment: it only retrieves the top match per key and has left-outer semantics by default. The 128 MB limit still applies to the lookup table.",
    xpReward: 15,
  },
  {
    id: "q-ent-004",
    category: "entities",
    title: "Process Group Instance Inventory",
    description: "List all process group instances with their parent service.",
    difficulty: "intermediate",
    query: `fetch dt.entity.process_group_instance
| fields entity.name, technology.type, fromRelationships.isPartOf
| filter isNotNull(fromRelationships.isPartOf)
| limit 100`,
    explanation: "Process group instances represent individual running processes. The entity model relationships (fromRelationships, toRelationships) let you navigate the topology graph without a join.",
    xpReward: 10,
  },

  // ── Additional Parsing Patterns ─────────────────────────────────────────────
  {
    id: "q-parse-003",
    category: "parsing",
    title: "KVP Log Parsing",
    description: "Extract key=value pairs from unstructured log content.",
    difficulty: "simple",
    query: `fetch logs, from: now() - 1h
| parse content, KVP:fields
| filter isNotNull(user)
| fields timestamp, user, action, outcome
| sort timestamp desc`,
    explanation: "The KVP (key-value pair) pattern in parse extracts key=value tokens from a log line. It's the simplest parse form — ideal for structured-but-not-JSON application logs that emit key=value formatted content.",
    xpReward: 10,
  },
  {
    id: "q-parse-004",
    category: "parsing",
    title: "Typed Capture Groups",
    description: "Extract typed fields from log content using DQL typed tokens.",
    difficulty: "advanced",
    query: `fetch logs, from: now() - 6h
| filter log.source == "nginx-access"
| parse content, "IPADDR:client_ip LD INT:status_code LD LONG:bytes_sent"
| filter status_code >= 400
| summarize errors = count(), by: {client_ip, status_code}
| sort errors desc`,
    explanation: "Typed tokens (IPADDR:, INT:, LONG:, DOUBLE:, DATA:, STRING:) extract values and cast them automatically. LD (literal delimiter) matches any characters up to the next token. This is the most powerful parse form for Nginx/Apache access log analysis.",
    xpReward: 15,
  },
  {
    id: "q-parse-005",
    category: "parsing",
    title: "JSON Content Extraction",
    description: "Parse JSON-formatted log content and aggregate over extracted fields.",
    difficulty: "intermediate",
    query: `fetch logs, from: now() - 1h
| parse content, JSON:parsed
| filter isNotNull(parsed.level)
| fields timestamp, parsed.level, parsed.message, parsed.service, parsed.trace_id
| filter parsed.level == "error"
| sort timestamp desc
| limit 100`,
    explanation: "JSON:fieldName parses the entire content field as JSON and spreads all keys into the record. Works for structured JSON logs where the whole message body is a JSON object. Use jsonPath() instead when you need selective extraction from nested JSON.",
    xpReward: 10,
  },
];

export function getQueriesByCategory(category: QueryCategory): QueryEntry[] {
  return QUERY_LIBRARY.filter((q) => q.category === category);
}

export function getQueriesByDifficulty(difficulty: QueryDifficulty): QueryEntry[] {
  return QUERY_LIBRARY.filter((q) => q.difficulty === difficulty);
}

export function getAllCategories(): { id: QueryCategory; label: string; count: number }[] {
  const cats: QueryCategory[] = ["logs", "metrics", "spans", "bizevents", "joins", "aggregation", "parsing", "system", "entities"];
  return cats.map((id) => ({
    id,
    label: id === "system" ? "System (Free)" : id === "entities" ? "Entities (Free)" : id.charAt(0).toUpperCase() + id.slice(1),
    count: QUERY_LIBRARY.filter((q) => q.category === id).length,
  }));
}
