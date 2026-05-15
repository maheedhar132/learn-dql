export type QueryDifficulty = "simple" | "intermediate" | "advanced";
export type QueryCategory = "logs" | "metrics" | "spans" | "bizevents" | "joins" | "aggregation" | "parsing";

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
];

export function getQueriesByCategory(category: QueryCategory): QueryEntry[] {
  return QUERY_LIBRARY.filter((q) => q.category === category);
}

export function getQueriesByDifficulty(difficulty: QueryDifficulty): QueryEntry[] {
  return QUERY_LIBRARY.filter((q) => q.difficulty === difficulty);
}

export function getAllCategories(): { id: QueryCategory; label: string; count: number }[] {
  const cats: QueryCategory[] = ["logs", "metrics", "spans", "bizevents", "joins", "aggregation", "parsing"];
  return cats.map((id) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    count: QUERY_LIBRARY.filter((q) => q.category === id).length,
  }));
}
