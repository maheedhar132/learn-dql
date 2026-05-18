import type { Scenario } from "../types/dql";
import {
  generateNginxLogs,
  generateSyslogLines,
  generateFirewallLogs,
  generateJsonLogs,
  generateApacheLogs,
} from "./log-generator";

/**
 * DPL track — 12 scenarios teaching Dynatrace Pattern Language through the
 * parse command. Each case focuses on extracting structured fields from
 * unstructured log lines using DPL TYPE matchers.
 *
 * First ~4 free, rest premium.
 */
export const dplScenarios: Scenario[] = [
  {
    id: "dpl-001",
    track: "dpl",
    tier: "free",
    title: "The Status Code Sniffer",
    company: "CloudScale",
    briefing:
      "Nginx access logs contain HTTP status codes buried inside each line. Your job is to extract that three-digit code so we can filter for errors later.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Fetch the access logs",
        narration:
          "Start by loading the nginx access logs. These are raw web server lines — every request ever made.",
        lesson: "fetch logs",
        goal: "Load the nginx access logs.",
        hint: "Use fetch logs.",
        sampleData: generateNginxLogs(2000, 101),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Extract the status code",
        narration:
          "Each log line has a three-digit HTTP status code (like 200 or 404). The INTEGER matcher captures whole numbers. Use it to pull the status into its own field.",
        lesson: 'parse content, "INTEGER:status_code"',
        goal: "Extract the HTTP status code from each log line into a field called status_code.",
        hint: 'Use parse with INTEGER:status_code on the content field.',
        sampleData: generateNginxLogs(2000, 101),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "INTEGER:status_code" }, raw: 'parse content, "INTEGER:status_code"' },
        ],
      },
    ],
  },
  {
    id: "dpl-002",
    track: "dpl",
    tier: "free",
    title: "The IP Hunter",
    company: "SecureBank",
    briefing:
      "Every request starts from somewhere. Extract the client IP address from nginx access logs so we can geo-locate attackers.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Load logs",
        narration: "Pull the nginx access logs.",
        lesson: "fetch logs",
        goal: "Load the logs.",
        hint: "Use fetch logs.",
        sampleData: generateNginxLogs(2000, 102),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Capture the client IP",
        narration:
          "The IPADDR matcher recognizes IPv4 addresses like 192.168.1.45. Extract the first IP in each line into a field called client_ip.",
        lesson: 'parse content, "IPADDR:client_ip"',
        goal: "Extract the client IP address from each line.",
        hint: 'Use parse with IPADDR:client_ip on the content field.',
        sampleData: generateNginxLogs(2000, 102),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "IPADDR:client_ip" }, raw: 'parse content, "IPADDR:client_ip"' },
        ],
      },
    ],
  },
  {
    id: "dpl-003",
    track: "dpl",
    tier: "free",
    title: "The Timestamp Tracker",
    company: "OpsCorp",
    briefing:
      "Syslog lines embed timestamps in a human-readable format. Extract them so we can correlate events across systems.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Fetch syslog",
        narration: "Load the syslog entries from our server fleet.",
        lesson: "fetch logs",
        goal: "Load syslog entries.",
        hint: "Use fetch logs.",
        sampleData: generateSyslogLines(2000, 103),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Extract the timestamp",
        narration:
          "The TIMESTAMP matcher recognizes ISO-8601 and common syslog timestamps. Pull the timestamp out of each line.",
        lesson: 'parse content, "TIMESTAMP:log_ts"',
        goal: "Extract the timestamp from each syslog line into log_ts.",
        hint: 'Use parse with TIMESTAMP:log_ts on the content field.',
        sampleData: generateSyslogLines(2000, 103),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "TIMESTAMP:log_ts" }, raw: 'parse content, "TIMESTAMP:log_ts"' },
        ],
      },
    ],
  },
  {
    id: "dpl-004",
    track: "dpl",
    tier: "free",
    title: "The Method Matcher",
    company: "CloudServices",
    briefing:
      "HTTP methods (GET, POST, etc.) are words in the log line. Extract the method so we can spot unusual verbs like DELETE or PATCH.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Fetch logs",
        narration: "Load the nginx access logs.",
        lesson: "fetch logs",
        goal: "Load logs.",
        hint: "Use fetch logs.",
        sampleData: generateNginxLogs(2000, 104),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Extract the HTTP method",
        narration:
          "The ALPHA matcher captures sequences of letters. Use it to pull the HTTP method (GET, POST, etc.) into a field.",
        lesson: 'parse content, "ALPHA:http_method"',
        goal: "Extract the HTTP method from each line into http_method.",
        hint: 'Use parse with ALPHA:http_method on the content field.',
        sampleData: generateNginxLogs(2000, 104),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "ALPHA:http_method" }, raw: 'parse content, "ALPHA:http_method"' },
        ],
      },
    ],
  },
  {
    id: "dpl-005",
    track: "dpl",
    tier: "premium",
    title: "The Multi-Field Mine",
    company: "DataVault",
    briefing:
      "Real investigations need more than one field. Extract the IP, status code, and response size from nginx logs in a single pattern.",
    difficulty: "Intermediate",
    steps: [
      {
        id: "step-1",
        title: "Fetch logs",
        narration: "Load the nginx access logs.",
        lesson: "fetch logs",
        goal: "Load logs.",
        hint: "Use fetch logs.",
        sampleData: generateNginxLogs(2000, 105),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Extract three fields at once",
        narration:
          "A DPL pattern can have multiple matchers. Capture client_ip (IPADDR), status_code (INTEGER), and response_bytes (INTEGER) in one go.",
        lesson: 'parse content, "IPADDR:client_ip INTEGER:status_code INTEGER:response_bytes"',
        goal: "Extract client_ip, status_code, and response_bytes in one pattern.",
        hint: 'Chain matchers: IPADDR:client_ip INTEGER:status_code INTEGER:response_bytes',
        sampleData: generateNginxLogs(2000, 105),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "IPADDR:client_ip INTEGER:status_code INTEGER:response_bytes" }, raw: 'parse content, "IPADDR:client_ip INTEGER:status_code INTEGER:response_bytes"' },
        ],
      },
    ],
  },
  {
    id: "dpl-006",
    track: "dpl",
    tier: "premium",
    title: "The JSON Jewel",
    company: "EasyTrade",
    briefing:
      "Modern services log JSON objects. Extract the entire JSON payload so we can parse its internals later.",
    difficulty: "Intermediate",
    steps: [
      {
        id: "step-1",
        title: "Fetch JSON logs",
        narration: "Load the structured JSON log entries.",
        lesson: "fetch logs",
        goal: "Load JSON logs.",
        hint: "Use fetch logs.",
        sampleData: generateJsonLogs(2000, 106),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Capture the JSON object",
        narration:
          "The JSON matcher matches a JSON object (one level of nesting). Extract the JSON payload from the content field.",
        lesson: 'parse content, "JSON:payload"',
        goal: "Extract the JSON object into a field called payload.",
        hint: 'Use parse with JSON:payload on the content field.',
        sampleData: generateJsonLogs(2000, 106),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "JSON:payload" }, raw: 'parse content, "JSON:payload"' },
        ],
      },
    ],
  },
  {
    id: "dpl-007",
    track: "dpl",
    tier: "premium",
    title: "The KVP Vault",
    company: "SecureBank",
    briefing:
      "Firewall logs use key=value pairs. Extract the action, protocol, and source IP from these flat records.",
    difficulty: "Intermediate",
    steps: [
      {
        id: "step-1",
        title: "Fetch firewall logs",
        narration: "Load the firewall access logs.",
        lesson: "fetch logs",
        goal: "Load firewall logs.",
        hint: "Use fetch logs.",
        sampleData: generateFirewallLogs(2000, 107),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Extract action and proto",
        narration:
          "Use WORD matchers to capture the action and protocol tokens, and IPADDR for the source IP. The pattern must include the literal text 'action=' and 'proto='.",
        lesson: 'parse content, "action=WORD:action proto=WORD:proto src=IPADDR:src_ip"',
        goal: "Extract action, proto, and src_ip from the key=value pairs.",
        hint: 'Include literals like action= and proto=, then bind WORD:action WORD:proto IPADDR:src_ip',
        sampleData: generateFirewallLogs(2000, 107),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "action=WORD:action proto=WORD:proto src=IPADDR:src_ip" }, raw: 'parse content, "action=WORD:action proto=WORD:proto src=IPADDR:src_ip"' },
        ],
      },
    ],
  },
  {
    id: "dpl-008",
    track: "dpl",
    tier: "premium",
    title: "The Syslog Sleuth",
    company: "OpsCorp",
    briefing:
      "Syslog lines have a rigid structure: timestamp, host, app, pid, message. Parse every component in one pattern.",
    difficulty: "Advanced",
    steps: [
      {
        id: "step-1",
        title: "Fetch syslog",
        narration: "Load the syslog entries.",
        lesson: "fetch logs",
        goal: "Load syslog.",
        hint: "Use fetch logs.",
        sampleData: generateSyslogLines(2000, 108),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Deconstruct syslog",
        narration:
          "Capture the timestamp (TIMESTAMP), hostname (WORD), app name (ALPHA), pid (INTEGER inside brackets), and the rest of the message (LD).",
        lesson: 'parse content, "TIMESTAMP:ts WORD:host ALPHA:app [INTEGER:pid]: LD:msg"',
        goal: "Extract ts, host, app, pid, and msg from each syslog line.",
        hint: 'Use TIMESTAMP WORD ALPHA [INTEGER]: LD with literal brackets and colon.',
        sampleData: generateSyslogLines(2000, 108),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "TIMESTAMP:ts WORD:host ALPHA:app [INTEGER:pid]: LD:msg" }, raw: 'parse content, "TIMESTAMP:ts WORD:host ALPHA:app [INTEGER:pid]: LD:msg"' },
        ],
      },
    ],
  },
  {
    id: "dpl-009",
    track: "dpl",
    tier: "premium",
    title: "The Apache Archaeologist",
    company: "CloudScale",
    briefing:
      "Apache logs use a different format than nginx. Extract IP, timestamp, method, path, status, and bytes from these legacy lines.",
    difficulty: "Advanced",
    steps: [
      {
        id: "step-1",
        title: "Fetch Apache logs",
        narration: "Load the Apache access logs.",
        lesson: "fetch logs",
        goal: "Load Apache logs.",
        hint: "Use fetch logs.",
        sampleData: generateApacheLogs(2000, 109),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Parse Apache format",
        narration:
          "Extract IPADDR, timestamp inside brackets, ALPHA method, the path as WORD, INTEGER status, and INTEGER bytes. Use literals for brackets and quotes.",
        lesson: 'parse content, "IPADDR:ip [WORD:ts] \"ALPHA:method WORD:path INTEGER:status INTEGER:bytes\"',
        goal: "Extract ip, ts, method, path, status, and bytes from Apache logs.",
        hint: 'Match literals [ ] and " exactly, then bind the matchers.',
        sampleData: generateApacheLogs(2000, 109),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: 'IPADDR:ip [WORD:ts] "ALPHA:method WORD:path INTEGER:status INTEGER:bytes"' }, raw: 'parse content, "IPADDR:ip [WORD:ts] \"ALPHA:method WORD:path INTEGER:status INTEGER:bytes\""' },
        ],
      },
    ],
  },
  {
    id: "dpl-010",
    track: "dpl",
    tier: "premium",
    title: "The Double Matcher",
    company: "DataVault",
    briefing:
      "Some logs have the same type twice — like two IPs (source and destination). Capture both with distinct field names.",
    difficulty: "Advanced",
    steps: [
      {
        id: "step-1",
        title: "Fetch firewall logs",
        narration: "Load the firewall logs.",
        lesson: "fetch logs",
        goal: "Load firewall logs.",
        hint: "Use fetch logs.",
        sampleData: generateFirewallLogs(2000, 110),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Extract source and destination IPs",
        narration:
          "The pattern has two IPADDR matchers. The first must bind to src_ip, the second to dst_ip. Include the literal 'src=' and 'dst='.",
        lesson: 'parse content, "src=IPADDR:src_ip dst=IPADDR:dst_ip"',
        goal: "Extract both source and destination IPs.",
        hint: 'Use src=IPADDR:src_ip dst=IPADDR:dst_ip with the literals.',
        sampleData: generateFirewallLogs(2000, 110),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "src=IPADDR:src_ip dst=IPADDR:dst_ip" }, raw: 'parse content, "src=IPADDR:src_ip dst=IPADDR:dst_ip"' },
        ],
      },
    ],
  },
  {
    id: "dpl-011",
    track: "dpl",
    tier: "premium",
    title: "The UUID Unveiler",
    company: "EasyTrade",
    briefing:
      "Some request IDs are UUIDs hidden in log lines. Extract them to trace requests across services.",
    difficulty: "Advanced",
    steps: [
      {
        id: "step-1",
        title: "Fetch logs",
        narration: "Load the application logs.",
        lesson: "fetch logs",
        goal: "Load logs.",
        hint: "Use fetch logs.",
        sampleData: generateJsonLogs(2000, 111),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Extract the UUID",
        narration:
          "The UUID matcher captures standard UUID/GUID formats like f47ac10b-58cc-4372-a567-0e02b2c3d479. Pull the trace_id UUID from the content.",
        lesson: 'parse content, "UUID:trace_id"',
        goal: "Extract the UUID into trace_id.",
        hint: 'Use parse with UUID:trace_id on the content field.',
        sampleData: generateJsonLogs(2000, 111),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: "UUID:trace_id" }, raw: 'parse content, "UUID:trace_id"' },
        ],
      },
    ],
  },
  {
    id: "dpl-012",
    track: "dpl",
    tier: "premium",
    title: "The Nginx Ninja",
    company: "CloudServices",
    briefing:
      "Parse a full nginx access log line in one shot: IP, timestamp, method, path, status, bytes, and user agent. This is the ultimate DPL test.",
    difficulty: "Advanced",
    steps: [
      {
        id: "step-1",
        title: "Fetch nginx logs",
        narration: "Load the nginx access logs.",
        lesson: "fetch logs",
        goal: "Load nginx logs.",
        hint: "Use fetch logs.",
        sampleData: generateNginxLogs(2000, 112),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Parse the full line",
        narration:
          "Build a pattern that extracts IPADDR, TIMESTAMP, ALPHA method, WORD path, INTEGER status, INTEGER bytes, and the rest as LD for the user agent. Include literals for brackets and quotes.",
        lesson: 'parse content, "IPADDR:ip [TIMESTAMP:ts] \"ALPHA:method WORD:path HTTP/1.1\" INTEGER:status INTEGER:bytes LD:ua"',
        goal: "Extract ip, ts, method, path, status, bytes, and ua from nginx lines.",
        hint: 'Match literals [ ] and "HTTP/1.1" exactly. Use LD for the trailing user agent.',
        sampleData: generateNginxLogs(2000, 112),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "parse", args: { field: "content", pattern: 'IPADDR:ip [TIMESTAMP:ts] "ALPHA:method WORD:path HTTP/1.1" INTEGER:status INTEGER:bytes LD:ua' }, raw: 'parse content, "IPADDR:ip [TIMESTAMP:ts] \"ALPHA:method WORD:path HTTP/1.1\" INTEGER:status INTEGER:bytes LD:ua"' },
        ],
      },
    ],
  },
];
