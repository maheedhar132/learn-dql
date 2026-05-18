import type { Scenario } from "../types/dql";
import {
  generateNginxLogs,
  generateSyslogLines,
  generateFirewallLogs,
  generateJsonLogs,
  generateApacheLogs,
} from "./log-generator";

/**
 * Combined DPL+DQL track — 8 scenarios where each case teaches both pattern
 * extraction and pipeline analysis. The player first parses fields from raw
 * logs, then queries those fields.
 *
 * Exactly 2 free tasters, 6 premium.
 */
export const combinedScenarios: Scenario[] = [
  {
    id: "combo-001",
    track: "combined",
    tier: "free",
    title: "The Slow Endpoint Heist",
    company: "CloudScale",
    briefing:
      "Users report slow pages. Parse nginx access logs to extract status codes and response sizes, then find endpoints with the highest average response size.",
    difficulty: "Intermediate",
    steps: [
      {
        id: "step-1",
        title: "Parse the logs",
        narration:
          "First, extract the endpoint path and response bytes from each nginx line. We need both fields to compute averages.",
        lesson: 'parse content, "WORD:path INTEGER:status INTEGER:bytes"',
        goal: "Extract path, status, and bytes from the nginx log lines.",
        hint: 'Use parse with WORD:path INTEGER:status INTEGER:bytes on the content field.',
        sampleData: generateNginxLogs(2000, 201),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:path INTEGER:status INTEGER:bytes" }, raw: 'parse content, "WORD:path INTEGER:status INTEGER:bytes"' },
        ],
      },
      {
        id: "step-2",
        title: "Average response size per endpoint",
        narration:
          "Now that we have structured fields, compute the average response size per endpoint path.",
        lesson: "summarize avg_bytes = avg(bytes), by:{path}",
        goal: "Calculate average bytes per endpoint path.",
        hint: "Use summarize with avg(bytes) grouped by path.",
        sampleData: generateNginxLogs(2000, 201),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:path INTEGER:status INTEGER:bytes" }, raw: 'parse content, "WORD:path INTEGER:status INTEGER:bytes"' },
          { id: "e3", command: "summarize", args: { aggregation: "avg", alias: "avg_bytes", aggField: "bytes", by: "path" }, raw: "summarize avg_bytes = avg(bytes), by:{path}" },
        ],
      },
      {
        id: "step-3",
        title: "Rank the slowest",
        narration: "Sort by average bytes descending to find the heaviest endpoints.",
        lesson: "sort avg_bytes desc",
        goal: "Rank endpoints by average response size, largest first.",
        hint: "Use sort with avg_bytes desc.",
        sampleData: generateNginxLogs(2000, 201),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:path INTEGER:status INTEGER:bytes" }, raw: 'parse content, "WORD:path INTEGER:status INTEGER:bytes"' },
          { id: "e3", command: "summarize", args: { aggregation: "avg", alias: "avg_bytes", aggField: "bytes", by: "path" }, raw: "summarize avg_bytes = avg(bytes), by:{path}" },
          { id: "e4", command: "sort", args: { field: "avg_bytes", direction: "desc" }, raw: "sort avg_bytes desc" },
        ],
      },
    ],
  },
  {
    id: "combo-002",
    track: "combined",
    tier: "free",
    title: "The JSON Error Epidemic",
    company: "EasyTrade",
    briefing:
      "Microservices log JSON objects. Extract the status_code field, then count error responses per service to find the sick service.",
    difficulty: "Intermediate",
    steps: [
      {
        id: "step-1",
        title: "Extract the JSON payload",
        narration:
          "The content field contains a JSON object. Use the JSON matcher to capture it into a payload field.",
        lesson: 'parse content, "JSON:payload"',
        goal: "Extract the JSON object from each log line.",
        hint: 'Use parse with JSON:payload on the content field.',
        sampleData: generateJsonLogs(2000, 202),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "JSON:payload" }, raw: 'parse content, "JSON:payload"' },
        ],
      },
      {
        id: "step-2",
        title: "Count errors per service",
        narration:
          "Count how many log entries each service produced. This tells us which service is the noisiest.",
        lesson: "summarize count = count(), by:{host}",
        goal: "Count log entries per service (host).",
        hint: "Use summarize with count() grouped by host.",
        sampleData: generateJsonLogs(2000, 202),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "JSON:payload" }, raw: 'parse content, "JSON:payload"' },
          { id: "e3", command: "summarize", args: { aggregation: "count", alias: "count", by: "host" }, raw: "summarize count = count(), by:{host}" },
        ],
      },
    ],
  },
  {
    id: "combo-003",
    track: "combined",
    tier: "premium",
    title: "The Firewall Firewall",
    company: "SecureBank",
    briefing:
      "The firewall is dropping connections. Parse the action and protocol from firewall logs, then count drops per protocol.",
    difficulty: "Intermediate",
    steps: [
      {
        id: "step-1",
        title: "Parse firewall entries",
        narration:
          "Extract action, protocol, and source IP from the key=value format using WORD and IPADDR matchers.",
        lesson: 'parse content, "action=WORD:action proto=WORD:proto src=IPADDR:src_ip"',
        goal: "Extract action, proto, and src_ip from firewall logs.",
        hint: 'Include literals action= and proto=, then bind WORD:action WORD:proto IPADDR:src_ip',
        sampleData: generateFirewallLogs(2000, 203),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "action=WORD:action proto=WORD:proto src=IPADDR:src_ip" }, raw: 'parse content, "action=WORD:action proto=WORD:proto src=IPADDR:src_ip"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter dropped connections",
        narration: "Keep only DENY and DROP actions.",
        lesson: 'filter action == "DENY" or action == "DROP"',
        goal: "Show only blocked connections.",
        hint: 'Use filter with or to match both DENY and DROP.',
        sampleData: generateFirewallLogs(2000, 203),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "action=WORD:action proto=WORD:proto src=IPADDR:src_ip" }, raw: 'parse content, "action=WORD:action proto=WORD:proto src=IPADDR:src_ip"' },
          { id: "e3", command: "filter", args: { condition: 'action == "DENY" or action == "DROP"' }, raw: 'filter action == "DENY" or action == "DROP"' },
        ],
      },
      {
        id: "step-3",
        title: "Count by protocol",
        narration: "Count how many drops occurred per protocol to see if UDP or TCP is being targeted.",
        lesson: "summarize count = count(), by:{proto}",
        goal: "Count blocked connections per protocol.",
        hint: "Use summarize with count() grouped by proto.",
        sampleData: generateFirewallLogs(2000, 203),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "action=WORD:action proto=WORD:proto src=IPADDR:src_ip" }, raw: 'parse content, "action=WORD:action proto=WORD:proto src=IPADDR:src_ip"' },
          { id: "e3", command: "filter", args: { condition: 'action == "DENY" or action == "DROP"' }, raw: 'filter action == "DENY" or action == "DROP"' },
          { id: "e4", command: "summarize", args: { aggregation: "count", alias: "count", by: "proto" }, raw: "summarize count = count(), by:{proto}" },
        ],
      },
    ],
  },
  {
    id: "combo-004",
    track: "combined",
    tier: "premium",
    title: "The Syslog Intruder",
    company: "OpsCorp",
    briefing:
      "Someone is brute-forcing SSH. Parse syslog lines to extract the app name and message, then filter for failed password attempts and count per host.",
    difficulty: "Advanced",
    steps: [
      {
        id: "step-1",
        title: "Deconstruct syslog",
        narration:
          "Extract the host, app, and message from each syslog line. We need the app to isolate sshd and the message to find failed passwords.",
        lesson: 'parse content, "WORD:host ALPHA:app LD:msg"',
        goal: "Extract host, app, and msg from syslog lines.",
        hint: 'Use WORD:host ALPHA:app LD:msg on the content field.',
        sampleData: generateSyslogLines(2000, 204),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:host ALPHA:app LD:msg" }, raw: 'parse content, "WORD:host ALPHA:app LD:msg"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter sshd failures",
        narration:
          "Keep only sshd app entries where the message contains 'Failed password'.",
        lesson: 'filter app == "sshd" and msg contains "Failed"',
        goal: "Show only failed SSH login attempts.",
        hint: 'Filter where app equals sshhd and msg contains Failed.',
        sampleData: generateSyslogLines(2000, 204),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:host ALPHA:app LD:msg" }, raw: 'parse content, "WORD:host ALPHA:app LD:msg"' },
          { id: "e3", command: "filter", args: { condition: 'app == "sshd" and msg contains "Failed"' }, raw: 'filter app == "sshd" and msg contains "Failed"' },
        ],
      },
      {
        id: "step-3",
        title: "Count per host",
        narration: "Count failed SSH attempts per host to identify the most attacked server.",
        lesson: "summarize count = count(), by:{host}",
        goal: "Count failed logins per host.",
        hint: "Use summarize with count() grouped by host.",
        sampleData: generateSyslogLines(2000, 204),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:host ALPHA:app LD:msg" }, raw: 'parse content, "WORD:host ALPHA:app LD:msg"' },
          { id: "e3", command: "filter", args: { condition: 'app == "sshd" and msg contains "Failed"' }, raw: 'filter app == "sshd" and msg contains "Failed"' },
          { id: "e4", command: "summarize", args: { aggregation: "count", alias: "count", by: "host" }, raw: "summarize count = count(), by:{host}" },
        ],
      },
    ],
  },
  {
    id: "combo-005",
    track: "combined",
    tier: "premium",
    title: "The Apache 404 Hunt",
    company: "CloudScale",
    briefing:
      "Broken links are generating 404 errors in Apache logs. Parse the status code and path, filter for 404s, and count per path.",
    difficulty: "Intermediate",
    steps: [
      {
        id: "step-1",
        title: "Parse Apache logs",
        narration:
          "Extract the path and HTTP status code from Apache access logs. We need both to find broken links.",
        lesson: 'parse content, "WORD:path INTEGER:status"',
        goal: "Extract path and status from Apache logs.",
        hint: 'Use parse with WORD:path INTEGER:status on content.',
        sampleData: generateApacheLogs(2000, 205),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:path INTEGER:status" }, raw: 'parse content, "WORD:path INTEGER:status"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter 404s",
        narration: "Keep only entries where status equals 404.",
        lesson: "filter status == 404",
        goal: "Show only 404 responses.",
        hint: "Filter where status equals 404.",
        sampleData: generateApacheLogs(2000, 205),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:path INTEGER:status" }, raw: 'parse content, "WORD:path INTEGER:status"' },
          { id: "e3", command: "filter", args: { condition: "status == 404" }, raw: "filter status == 404" },
        ],
      },
      {
        id: "step-3",
        title: "Count per path",
        narration: "Count how many 404s each path generated to prioritize fixes.",
        lesson: "summarize count = count(), by:{path}",
        goal: "Count 404s per path.",
        hint: "Use summarize with count() grouped by path.",
        sampleData: generateApacheLogs(2000, 205),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "WORD:path INTEGER:status" }, raw: 'parse content, "WORD:path INTEGER:status"' },
          { id: "e3", command: "filter", args: { condition: "status == 404" }, raw: "filter status == 404" },
          { id: "e4", command: "summarize", args: { aggregation: "count", alias: "count", by: "path" }, raw: "summarize count = count(), by:{path}" },
        ],
      },
    ],
  },
  {
    id: "combo-006",
    track: "combined",
    tier: "premium",
    title: "The Nginx Error Storm",
    company: "CloudServices",
    briefing:
      "5xx errors are spiking. Parse nginx logs for status codes, filter for server errors, and group by status to see which code dominates.",
    difficulty: "Intermediate",
    steps: [
      {
        id: "step-1",
        title: "Extract status codes",
        narration: "Parse the HTTP status code from each nginx log line.",
        lesson: 'parse content, "INTEGER:status_code"',
        goal: "Extract the status code into status_code.",
        hint: 'Use parse with INTEGER:status_code on content.',
        sampleData: generateNginxLogs(2000, 206),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "INTEGER:status_code" }, raw: 'parse content, "INTEGER:status_code"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter 5xx errors",
        narration: "Keep only status codes 500 and above.",
        lesson: "filter status_code >= 500",
        goal: "Show only server errors (5xx).",
        hint: "Filter where status_code is greater than or equal to 500.",
        sampleData: generateNginxLogs(2000, 206),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "INTEGER:status_code" }, raw: 'parse content, "INTEGER:status_code"' },
          { id: "e3", command: "filter", args: { condition: "status_code >= 500" }, raw: "filter status_code >= 500" },
        ],
      },
      {
        id: "step-3",
        title: "Count by error code",
        narration: "Count how many of each 5xx code occurred.",
        lesson: "summarize count = count(), by:{status_code}",
        goal: "Count occurrences per 5xx status code.",
        hint: "Use summarize with count() grouped by status_code.",
        sampleData: generateNginxLogs(2000, 206),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "INTEGER:status_code" }, raw: 'parse content, "INTEGER:status_code"' },
          { id: "e3", command: "filter", args: { condition: "status_code >= 500" }, raw: "filter status_code >= 500" },
          { id: "e4", command: "summarize", args: { aggregation: "count", alias: "count", by: "status_code" }, raw: "summarize count = count(), by:{status_code}" },
        ],
      },
    ],
  },
  {
    id: "combo-007",
    track: "combined",
    tier: "premium",
    title: "The Latency Logger",
    company: "EasyTrade",
    briefing:
      "Some JSON logs embed latency_ms. Extract it as an integer, filter for high-latency requests, and count per service.",
    difficulty: "Advanced",
    steps: [
      {
        id: "step-1",
        title: "Extract the JSON payload",
        narration: "Capture the JSON object from the content field.",
        lesson: 'parse content, "JSON:payload"',
        goal: "Extract the JSON object into payload.",
        hint: 'Use parse with JSON:payload on content.',
        sampleData: generateJsonLogs(2000, 207),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "JSON:payload" }, raw: 'parse content, "JSON:payload"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter high latency",
        narration:
          "The latency_ms field was extracted inside the JSON. Filter for requests where latency_ms exceeds 250.",
        lesson: "filter latency_ms > 250",
        goal: "Show only high-latency requests (> 250ms).",
        hint: "Filter where latency_ms is greater than 250.",
        sampleData: generateJsonLogs(2000, 207),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "JSON:payload" }, raw: 'parse content, "JSON:payload"' },
          { id: "e3", command: "filter", args: { condition: "latency_ms > 250" }, raw: "filter latency_ms > 250" },
        ],
      },
      {
        id: "step-3",
        title: "Count by service",
        narration: "Count high-latency requests per service to find the slowest microservice.",
        lesson: "summarize count = count(), by:{host}",
        goal: "Count high-latency requests per service (host).",
        hint: "Use summarize with count() grouped by host.",
        sampleData: generateJsonLogs(2000, 207),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "JSON:payload" }, raw: 'parse content, "JSON:payload"' },
          { id: "e3", command: "filter", args: { condition: "latency_ms > 250" }, raw: "filter latency_ms > 250" },
          { id: "e4", command: "summarize", args: { aggregation: "count", alias: "count", by: "host" }, raw: "summarize count = count(), by:{host}" },
        ],
      },
    ],
  },
  {
    id: "combo-008",
    track: "combined",
    tier: "premium",
    title: "The Protocol Profiler",
    company: "SecureBank",
    briefing:
      "Firewall logs reveal traffic patterns. Parse the protocol and action, then count ALLOW actions per protocol to understand permitted traffic.",
    difficulty: "Advanced",
    steps: [
      {
        id: "step-1",
        title: "Parse firewall entries",
        narration: "Extract action and protocol from the key=value firewall log lines.",
        lesson: 'parse content, "action=WORD:action proto=WORD:proto"',
        goal: "Extract action and proto from firewall logs.",
        hint: 'Use parse with action=WORD:action proto=WORD:proto on content.',
        sampleData: generateFirewallLogs(2000, 208),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "action=WORD:action proto=WORD:proto" }, raw: 'parse content, "action=WORD:action proto=WORD:proto"' },
        ],
      },
      {
        id: "step-2",
        title: "Filter allowed traffic",
        narration: "Keep only ALLOW actions.",
        lesson: 'filter action == "ALLOW"',
        goal: "Show only allowed traffic.",
        hint: 'Filter where action equals ALLOW.',
        sampleData: generateFirewallLogs(2000, 208),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "action=WORD:action proto=WORD:proto" }, raw: 'parse content, "action=WORD:action proto=WORD:proto"' },
          { id: "e3", command: "filter", args: { condition: 'action == "ALLOW"' }, raw: 'filter action == "ALLOW"' },
        ],
      },
      {
        id: "step-3",
        title: "Count by protocol",
        narration: "Count allowed connections per protocol to see traffic distribution.",
        lesson: "summarize count = count(), by:{proto}",
        goal: "Count allowed connections per protocol.",
        hint: "Use summarize with count() grouped by proto.",
        sampleData: generateFirewallLogs(2000, 208),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "action=WORD:action proto=WORD:proto" }, raw: 'parse content, "action=WORD:action proto=WORD:proto"' },
          { id: "e3", command: "filter", args: { condition: 'action == "ALLOW"' }, raw: 'filter action == "ALLOW"' },
          { id: "e4", command: "summarize", args: { aggregation: "count", alias: "count", by: "proto" }, raw: "summarize count = count(), by:{proto}" },
        ],
      },
    ],
  },
];
