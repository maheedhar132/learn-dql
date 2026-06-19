import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Flex, Grid, Surface, Divider, TitleBar } from "@dynatrace/strato-components/layouts";
import {
  Paragraph,
  Strong,
  Code,
  Link,
} from "@dynatrace/strato-components/typography";
import { Button, RunQueryButton } from "@dynatrace/strato-components/buttons";
import { Chip, MessageContainer } from "@dynatrace/strato-components/content";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import { runQuery, type RunOutcome } from "../lib/validate";
import { AddToNotebookModal } from "../components/AddToNotebookModal";
import {
  generateAppLogs,
  generateAuthLogs,
  generateDbLogs,
  generateNginxLogs,
  generateKubernetesStructuredLogs,
  generateAuditLogs,
  generateJsonLogs,
  generateSandboxSpans,
  generateEvents,
  generateBizEvents,
} from "../lib/dql/log-generator";
import { ResultTable } from "../components/ResultTable";
import { loadSettings } from "../lib/settings";
import { inferColumns } from "../lib/dql/engine";

// ─── Types ───────────────────────────────────────────────────────────────────

type DatasetTab = "logs" | "spans" | "events" | "bizevents" | "env";
type LogVariety = "app" | "auth" | "db" | "nginx" | "k8s" | "audit" | "json";

interface SchemaField {
  name: string;
  type: string;
  description: string;
  example?: string;
}

interface ExampleQuery {
  label: string;
  query: string;
}

interface DatasetInfo {
  sourceLabel: string;
  fields: SchemaField[];
  exampleQueries: ExampleQuery[];
}

// ─── Static dataset metadata ─────────────────────────────────────────────────

const LOG_VARIETY_INFO: Record<LogVariety, DatasetInfo> = {
  app: {
    sourceLabel: "fetch logs · 2,200 records",
    fields: [
      { name: "timestamp", type: "datetime", description: "When the log was written", example: "2024-01-15T10:23:45Z" },
      { name: "loglevel", type: "string", description: "Severity level", example: "INFO · WARN · ERROR · DEBUG" },
      { name: "content", type: "string", description: "KV body — use parse to extract embedded fields", example: "request_id=… endpoint=… duration_ms=…" },
      { name: "host", type: "string", description: "Source host identifier", example: "app-01 … app-06" },
    ],
    exampleQueries: [
      { label: "First 10 records", query: "fetch logs\n| limit 10" },
      { label: "Only errors", query: 'fetch logs\n| filter loglevel == "ERROR"' },
      { label: "Count by level", query: "fetch logs\n| summarize count(), by:{loglevel}" },
      { label: "Errors per host", query: 'fetch logs\n| filter loglevel == "ERROR"\n| summarize n = count(), by:{host}\n| sort n desc' },
      { label: "Requests per endpoint", query: 'fetch logs\n| parse content, "KVP:kv"\n| fieldsAdd ep = kv[endpoint]\n| summarize count(), by:{ep}\n| sort count() desc' },
    ],
  },
  auth: {
    sourceLabel: "fetch logs · 1,500 records",
    fields: [
      { name: "timestamp", type: "datetime", description: "When the log was written" },
      { name: "loglevel", type: "string", description: "Severity level" },
      { name: "log.source", type: "string", description: "Log origin", example: "auth-service" },
      { name: "content", type: "string", description: "KV body with user= ip= or attacker_ip=", example: "user=alice ip=10.0.0.1 …" },
      { name: "host", type: "string", description: "Source host identifier" },
    ],
    exampleQueries: [
      { label: "First 10 records", query: "fetch logs\n| limit 10" },
      { label: "Only errors", query: 'fetch logs\n| filter loglevel == "ERROR"' },
      { label: "Top IPs", query: 'fetch logs\n| parse content, "LD IPADDR:ip"\n| summarize count(), by:{ip}\n| sort count() desc\n| limit 10' },
      { label: "Count by level", query: "fetch logs\n| summarize count(), by:{loglevel}" },
      { label: "Failures per user", query: 'fetch logs\n| filter loglevel == "ERROR"\n| parse content, "LD user=STRING:user LD"\n| summarize failures = count(), by:{user}\n| sort failures desc' },
    ],
  },
  db: {
    sourceLabel: "fetch logs · 1,500 records",
    fields: [
      { name: "timestamp", type: "datetime", description: "When the log was written" },
      { name: "loglevel", type: "string", description: "Severity level" },
      { name: "log.source", type: "string", description: "Log origin", example: "database" },
      { name: "content", type: "string", description: "KV body with tx_id= query_type= duration_ms=", example: "tx_id=… query_type=SELECT duration_ms=…" },
      { name: "host", type: "string", description: "Source host identifier" },
      { name: "duration_ms", type: "long", description: "Pre-extracted query duration in ms" },
    ],
    exampleQueries: [
      { label: "First 10 records", query: "fetch logs\n| limit 10" },
      { label: "Slow queries", query: "fetch logs\n| filter loglevel == \"WARN\"\n| sort duration_ms desc\n| limit 20" },
      { label: "Avg duration by level", query: "fetch logs\n| summarize avg_ms = avg(duration_ms), by:{loglevel}" },
      { label: "Very slow queries", query: "fetch logs\n| filter duration_ms > 1000\n| fields timestamp, host, duration_ms, content\n| sort duration_ms desc" },
    ],
  },
  nginx: {
    sourceLabel: "fetch logs · 2,000 records",
    fields: [
      { name: "timestamp", type: "datetime", description: "When the log was written" },
      { name: "loglevel", type: "string", description: "Severity level" },
      { name: "content", type: "string", description: "Apache combined format — IP method path status bytes ua", example: '10.0.0.1 - - [15/Jan/2024…] "GET /api/…" 200 1234 …' },
      { name: "host", type: "string", description: "Source host identifier" },
    ],
    exampleQueries: [
      { label: "First 10 records", query: "fetch logs\n| limit 10" },
      { label: "Only errors", query: 'fetch logs\n| filter loglevel == "ERROR"' },
      { label: "Count by status", query: 'fetch logs\n| parse content, "IPADDR:ip \' \' LD \' \' INT:status \' \' LONG:bytes"\n| summarize count(), by:{status}\n| sort count() desc' },
      { label: "Top IPs by requests", query: 'fetch logs\n| parse content, "IPADDR:ip LD"\n| summarize reqs = count(), by:{ip}\n| sort reqs desc\n| limit 10' },
    ],
  },
  k8s: {
    sourceLabel: "fetch logs · 1,800 records",
    fields: [
      { name: "timestamp", type: "datetime", description: "When the log was written" },
      { name: "loglevel", type: "string", description: "Severity level" },
      { name: "namespace", type: "string", description: "Kubernetes namespace" },
      { name: "deployment", type: "string", description: "Deployment name" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "container", type: "string", description: "Container name" },
      { name: "node", type: "string", description: "Node hostname" },
      { name: "phase", type: "string", description: "Pod phase", example: "Running · Pending · Failed · CrashLoopBackOff" },
      { name: "reason", type: "string", description: "Event reason", example: "OOMKilling · CrashLoopBackOff · etc" },
      { name: "restart_count", type: "long", description: "Number of container restarts" },
      { name: "cpu_pct", type: "long", description: "CPU usage percentage" },
      { name: "mem_pct", type: "long", description: "Memory usage percentage" },
      { name: "content", type: "string", description: "Log message body" },
    ],
    exampleQueries: [
      { label: "First 10 records", query: "fetch logs\n| limit 10" },
      { label: "Only errors", query: 'fetch logs\n| filter loglevel == "ERROR"' },
      { label: "High restart pods", query: "fetch logs\n| filter restart_count > 5\n| fields timestamp, deployment, pod, reason, restart_count\n| sort restart_count desc" },
      { label: "Count by namespace+level", query: "fetch logs\n| summarize count(), by:{namespace, loglevel}" },
      { label: "OOMKilled pods by namespace", query: 'fetch logs\n| filter reason == "OOMKilling"\n| summarize pods = count(), by:{namespace}\n| sort pods desc' },
    ],
  },
  audit: {
    sourceLabel: "fetch logs · 1,200 records",
    fields: [
      { name: "timestamp", type: "datetime", description: "When the event occurred" },
      { name: "loglevel", type: "string", description: "Severity level" },
      { name: "user", type: "string", description: "Acting user" },
      { name: "team", type: "string", description: "User's team" },
      { name: "action", type: "string", description: "Action performed" },
      { name: "resource", type: "string", description: "Target resource" },
      { name: "outcome", type: "string", description: "Result", example: "success · failure · denied" },
      { name: "ip", type: "string", description: "Source IP address" },
      { name: "session_id", type: "string", description: "Session identifier" },
      { name: "duration_ms", type: "long", description: "Action duration in ms" },
    ],
    exampleQueries: [
      { label: "First 10 records", query: "fetch logs\n| limit 10" },
      { label: "Denied actions", query: 'fetch logs\n| filter outcome == "denied"' },
      { label: "High-risk actions", query: 'fetch logs\n| filter in(action, array("sudo_escalate", "bulk_delete"))\n| fields timestamp, user, action, resource, outcome' },
      { label: "Count by action+outcome", query: "fetch logs\n| summarize count(), by:{action, outcome}\n| sort count() desc" },
      { label: "Most blocked users", query: 'fetch logs\n| filter outcome == "denied"\n| summarize blocked = count(), by:{user}\n| sort blocked desc' },
    ],
  },
  json: {
    sourceLabel: "fetch logs · 1,500 records",
    fields: [
      { name: "timestamp", type: "datetime", description: "When the log was written" },
      { name: "loglevel", type: "string", description: "Severity level" },
      { name: "content", type: "string", description: 'JSON object — parse with parse content,"JSON:j" then j[field]', example: '{"level":"info","service":"api","latency_ms":42}' },
      { name: "host", type: "string", description: "Source host identifier" },
    ],
    exampleQueries: [
      { label: "First 10 records", query: "fetch logs\n| limit 10" },
      { label: "Parse and filter errors", query: 'fetch logs\n| parse content, "JSON:j"\n| fieldsAdd level = j[level], svc = j[service]\n| filter level == "error"' },
      { label: "Count by service", query: 'fetch logs\n| parse content, "JSON:j"\n| summarize count(), by:{j[service]}' },
      { label: "High-latency requests", query: 'fetch logs\n| parse content, "JSON:j"\n| fieldsAdd lat = toLong(j[latency_ms])\n| filter lat > 200\n| sort lat desc\n| limit 20' },
    ],
  },
};

const SPANS_INFO: DatasetInfo = {
  sourceLabel: "fetch spans · 2,000 records",
  fields: [
    { name: "timestamp", type: "datetime", description: "Span start time" },
    { name: "trace_id", type: "string", description: "Distributed trace identifier" },
    { name: "span_id", type: "string", description: "Individual span identifier" },
    { name: "service", type: "string", description: "Originating service name" },
    { name: "operation", type: "string", description: "Operation or endpoint name" },
    { name: "span_type", type: "string", description: "Span category", example: "http · db · cache · messaging · internal" },
    { name: "duration_ms", type: "long", description: "Span duration in milliseconds" },
    { name: "status_code", type: "long", description: "HTTP status code", example: "200 · 400 · 500 etc" },
    { name: "is_error", type: "boolean", description: "Whether the span represents an error" },
    { name: "db_statement", type: "string", description: "SQL statement — present for db spans" },
    { name: "caller_service", type: "string", description: "Upstream calling service" },
    { name: "host", type: "string", description: "Host where the span ran" },
  ],
  exampleQueries: [
    { label: "First 10 records", query: "fetch spans\n| limit 10" },
    { label: "Only errors", query: "fetch spans\n| filter is_error == true" },
    { label: "Slowest spans", query: "fetch spans\n| filter duration_ms > 500\n| sort duration_ms desc\n| limit 20" },
    { label: "Error rate by service", query: "fetch spans\n| summarize errors = countIf(is_error), total = count(), by:{service}\n| fieldsAdd error_pct = toDouble(errors) / toDouble(total) * 100\n| sort error_pct desc" },
    { label: "Top DB queries", query: "fetch spans\n| filter span_type == \"db\"\n| filter isNotNull(db_statement)\n| summarize count(), by:{db_statement}\n| sort count() desc\n| limit 10" },
  ],
};

const EVENTS_INFO: DatasetInfo = {
  sourceLabel: "fetch events · 1,000 records",
  fields: [
    { name: "timestamp", type: "datetime", description: "When the event occurred" },
    { name: "event.type", type: "string", description: "Type of infrastructure event", example: "deployment · alert · scale-up · restart · config-change" },
    { name: "service", type: "string", description: "Affected service" },
    { name: "host", type: "string", description: "Affected host" },
    { name: "region", type: "string", description: "Cloud/infra region" },
    { name: "version", type: "string", description: "Deployed version (for deployments)" },
    { name: "status", type: "string", description: "Outcome status (for deployments)" },
    { name: "severity", type: "string", description: "Alert severity (for alerts)" },
    { name: "message", type: "string", description: "Alert message (for alerts)" },
  ],
  exampleQueries: [
    { label: "First 10 records", query: "fetch events\n| limit 10" },
    { label: "Deployment events", query: 'fetch events\n| filter event.type == "deployment"' },
    { label: "Critical alerts", query: 'fetch events\n| filter event.type == "alert"\n| filter severity == "critical"' },
    { label: "Count by type", query: "fetch events\n| summarize count(), by:{event.type}" },
    { label: "Deploy success/failure by service", query: 'fetch events\n| filter event.type == "deployment"\n| summarize success = countIf(status == "success"), failed = countIf(status == "failure"), by:{service}\n| sort failed desc' },
  ],
};

const BIZEVENTS_INFO: DatasetInfo = {
  sourceLabel: "fetch bizevents · 1,500 records",
  fields: [
    { name: "timestamp", type: "datetime", description: "When the business event occurred" },
    { name: "event.type", type: "string", description: "Business event type", example: "com.easytrade.order_confirmed etc" },
    { name: "order_id", type: "string", description: "Order identifier" },
    { name: "amount", type: "double", description: "Transaction amount" },
    { name: "currency", type: "string", description: "Currency code" },
    { name: "product", type: "string", description: "Product name" },
    { name: "accountId", type: "string", description: "Customer account identifier" },
    { name: "region", type: "string", description: "Geographic region" },
    { name: "customer_tier", type: "string", description: "Customer tier", example: "bronze · silver · gold · platinum" },
    { name: "method", type: "string", description: "Payment method (present on payment events)" },
  ],
  exampleQueries: [
    { label: "First 10 records", query: "fetch bizevents\n| limit 10" },
    { label: "Order confirmed events", query: 'fetch bizevents\n| filter event.type == "com.easytrade.order_confirmed"' },
    { label: "Revenue by product", query: "fetch bizevents\n| summarize revenue = sum(amount), orders = count(), by:{product}\n| sort revenue desc" },
    { label: "Count by event type", query: "fetch bizevents\n| summarize count(), by:{event.type}" },
    { label: "Top platinum spenders", query: 'fetch bizevents\n| filter customer_tier == "platinum"\n| summarize spend = sum(amount), by:{accountId}\n| sort spend desc\n| limit 10' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectSource(q: string): DatasetTab {
  const first = q.trim().split(/[\n|]/)[0].toLowerCase();
  if (first.includes("fetch spans")) return "spans";
  if (first.includes("fetch bizevents")) return "bizevents";
  if (first.includes("fetch events")) return "events";
  return "logs";
}

const LOG_VARIETY_LABELS: Record<LogVariety, string> = {
  app: "Application",
  auth: "Auth",
  db: "Database",
  nginx: "Nginx",
  k8s: "Kubernetes",
  audit: "Audit",
  json: "JSON",
};

const DEFAULT_QUERY = 'fetch logs\n| filter loglevel == "ERROR"\n| limit 20';

// ─── Component ────────────────────────────────────────────────────────────────

export const Sandbox = () => {
  const location = useLocation();
  const incomingQuery = (location.state as { query?: string } | null)?.query;
  const [query, setQuery] = useState(incomingQuery || DEFAULT_QUERY);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [activeTab, setActiveTab] = useState<DatasetTab>("logs");
  const [logVariety, setLogVariety] = useState<LogVariety>("app");

  // Pre-generate all datasets once (memoized — never regenerated on render)
  const allSamples = useMemo(() => ({
    app: generateAppLogs(2200, 42),
    auth: generateAuthLogs(1500, 42),
    db: generateDbLogs(1500, 42),
    nginx: generateNginxLogs(2000, 42),
    k8s: generateKubernetesStructuredLogs(1800, 42),
    audit: generateAuditLogs(1200, 42),
    json: generateJsonLogs(1500, 42),
    spans: generateSandboxSpans(2000, 42),
    events: generateEvents(1000, 42),
    bizevents: generateBizEvents(1500, 42),
  }), []);

  // Live seed schema from Settings (for the field-hint sidebar)
  const liveSchema = useMemo(() => {
    const s = loadSettings();
    return s.liveSeedEnabled && s.liveSeedSchema ? s.liveSeedSchema : null;
  }, []);

  // Environment seed: custom records override env records; nil when nothing fetched
  const envSeed = useMemo(() => {
    const s = loadSettings();
    if (!s.liveSeedEnabled) return null;
    const records = s.customSeedRecords ?? s.liveSeedRecords;
    if (!records || records.length === 0) return null;
    return {
      records,
      isCustom: !!s.customSeedRecords,
      query: s.customSeedQuery,
    };
  }, []);

  // Resolve the active sample data based on tab + log variety
  const activeSample = useMemo(() => {
    if (activeTab === "env") return envSeed?.records ?? [];
    if (activeTab === "spans") return allSamples.spans;
    if (activeTab === "events") return allSamples.events;
    if (activeTab === "bizevents") return allSamples.bizevents;
    return allSamples[logVariety];
  }, [activeTab, logVariety, allSamples, envSeed]);

  // Resolve the metadata to display in the sidebar
  const activeInfo: DatasetInfo = useMemo(() => {
    if (activeTab === "env" && envSeed) {
      const cols = inferColumns(envSeed.records);
      const sourceTag = envSeed.isCustom ? "custom query" : "sampled logs";
      return {
        sourceLabel: `your environment · ${envSeed.records.length} records · ${sourceTag}`,
        fields: cols.map((c) => ({
          name: c.name,
          type: c.type,
          description: "From your environment",
        })),
        exampleQueries: [
          ...(envSeed.query
            ? [{ label: "Your seed query", query: envSeed.query }]
            : []),
          { label: "First 10 records", query: "fetch logs\n| limit 10" },
          { label: "Count by log level", query: "fetch logs\n| summarize count(), by:{loglevel}" },
        ],
      };
    }
    if (activeTab === "spans") return SPANS_INFO;
    if (activeTab === "events") return EVENTS_INFO;
    if (activeTab === "bizevents") return BIZEVENTS_INFO;
    return LOG_VARIETY_INFO[logVariety];
  }, [activeTab, logVariety, envSeed]);

  // Auto-detect dataset tab from query, but never auto-change log variety or env tab
  useEffect(() => {
    if (activeTab === "env") return;
    const detected = detectSource(query);
    setActiveTab(detected);
  }, [query, activeTab]);

  const runWithQuery = useCallback(
    (q: string) => {
      setOutcome(runQuery(q, activeSample));
    },
    [activeSample],
  );

  // Run incoming query immediately on mount
  useEffect(() => {
    if (incomingQuery) setOutcome(runQuery(incomingQuery, allSamples[logVariety]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingQuery]);

  // Ctrl+Enter shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && query.trim()) {
        runWithQuery(query);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [query, runWithQuery]);

  function onQueryModify(
    action: "summarize" | "filter",
    fieldName: string,
    filterValue?: string,
  ) {
    let newQuery: string;
    if (action === "filter" && filterValue) {
      newQuery = query
        ? `${query}\n| filter ${fieldName} ${filterValue}`
        : `fetch logs\n| filter ${fieldName} ${filterValue}`;
    } else if (action === "summarize") {
      newQuery = query
        ? `${query}\n| summarize count(), by:{${fieldName}}`
        : `fetch logs\n| summarize count(), by:{${fieldName}}`;
    } else {
      return;
    }
    setQuery(newQuery);
    runWithQuery(newQuery);
  }

  const queryState = outcome === null ? "idle" : outcome.error ? "error" : "success";

  const tabButtonVariant = (tab: DatasetTab) =>
    activeTab === tab ? "accent" : "default";

  const logChipVariant = (v: LogVariety) =>
    logVariety === v ? "accent" : "default";

  return (
    <Flex flexDirection="column" gap={0}>
      <TitleBar>
        <TitleBar.Title>Sandbox</TitleBar.Title>
        <TitleBar.Subtitle>
          Free-form DQL against offline sample datasets — runs entirely in your browser, no Dynatrace environment needed.
        </TitleBar.Subtitle>
      </TitleBar>

      <Flex flexDirection="column" padding={32} gap={16}>
        <Grid gridTemplateColumns="1fr 320px" gap={20} alignItems="start">
          {/* ── Left: editor + results ── */}
          <Flex flexDirection="column" gap={12}>
            <DQLEditor value={query} onChange={(v) => setQuery(v)} />
            <Flex gap={8} alignItems="center" flexWrap="wrap">
              <RunQueryButton
                queryState={queryState}
                disabled={!query.trim()}
                onClick={() => runWithQuery(query)}
              />
              <Button
                onClick={() => {
                  setQuery("");
                  setOutcome(null);
                }}
              >
                Clear
              </Button>
              <AddToNotebookModal
                title="Sandbox Query"
                description="Query written in the Learn DQL sandbox."
                explanation={query.trim() ? `\`\`\`dql\n${query.trim()}\n\`\`\`` : "No query written yet."}
                query={query}
                onTrigger={(open) => (
                  <Button variant="default" onClick={open} disabled={!query.trim()}>
                    Add to Notebook
                  </Button>
                )}
              />
              <Paragraph style={{ fontSize: "0.75rem", opacity: 0.4, margin: 0 }}>
                Ctrl+Enter to run
              </Paragraph>
            </Flex>

            {outcome && (
              <Flex flexDirection="column" gap={12}>
                {outcome.error ? (
                  <MessageContainer variant="critical">
                    <MessageContainer.Title>Query error</MessageContainer.Title>
                    <MessageContainer.Description>{outcome.error}</MessageContainer.Description>
                  </MessageContainer>
                ) : (
                  <>
                    <Paragraph>{outcome.records.length} record(s)</Paragraph>
                    <ResultTable
                      records={outcome.records}
                      columns={outcome.columns}
                      onQueryModify={onQueryModify}
                    />
                  </>
                )}
              </Flex>
            )}
          </Flex>

          {/* ── Right: sidebar panel ── */}
          <Surface>
            <Flex
              flexDirection="column"
              padding={16}
              gap={16}
              style={{ overflowY: "auto", maxHeight: "calc(100vh - 160px)" }}
            >
              {/* Dataset tab selector */}
              <Flex flexDirection="column" gap={8}>
                <Strong>Dataset</Strong>
                <Flex gap={6} flexWrap="wrap">
                  <Button
                    variant={tabButtonVariant("logs")}
                    onClick={() => {
                      setActiveTab("logs");
                      setQuery(`fetch logs\n| limit 10`);
                      setOutcome(null);
                    }}
                  >
                    Logs
                  </Button>
                  <Button
                    variant={tabButtonVariant("spans")}
                    onClick={() => {
                      setActiveTab("spans");
                      setQuery(`fetch spans\n| limit 10`);
                      setOutcome(null);
                    }}
                  >
                    Spans
                  </Button>
                  <Button
                    variant={tabButtonVariant("events")}
                    onClick={() => {
                      setActiveTab("events");
                      setQuery(`fetch events\n| limit 10`);
                      setOutcome(null);
                    }}
                  >
                    Events
                  </Button>
                  <Button
                    variant={tabButtonVariant("bizevents")}
                    onClick={() => {
                      setActiveTab("bizevents");
                      setQuery(`fetch bizevents\n| limit 10`);
                      setOutcome(null);
                    }}
                  >
                    Biz Events
                  </Button>
                  {envSeed && (
                    <Button
                      variant={tabButtonVariant("env")}
                      onClick={() => {
                        setActiveTab("env");
                        setQuery(envSeed.query ?? "fetch logs\n| limit 10");
                        setOutcome(null);
                      }}
                    >
                      My environment <Chip color="success" style={{ fontSize: "0.7rem", marginLeft: 4 }}>Live</Chip>
                    </Button>
                  )}
                </Flex>
              </Flex>

              {/* Log variety sub-selector */}
              {activeTab === "logs" && (
                <Flex flexDirection="column" gap={6}>
                  <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>
                    Log variety
                  </Paragraph>
                  <Flex gap={4} flexWrap="wrap">
                    {(Object.keys(LOG_VARIETY_LABELS) as LogVariety[]).map((v) => (
                      <Button
                        key={v}
                        variant={logChipVariant(v)}
                        onClick={() => {
                          setLogVariety(v);
                          setOutcome(null);
                        }}
                        style={{ fontSize: "0.78rem" }}
                      >
                        {LOG_VARIETY_LABELS[v]}
                      </Button>
                    ))}
                  </Flex>
                </Flex>
              )}

              <Divider />

              {/* Schema panel */}
              <Flex flexDirection="column" gap={4}>
                <Strong>Available fields</Strong>
                <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>
                  {activeInfo.sourceLabel}
                </Paragraph>
              </Flex>

              <Flex flexDirection="column" gap={12}>
                {activeInfo.fields.map((f) => (
                  <Flex key={f.name} flexDirection="column" gap={2}>
                    <Flex alignItems="center" gap={8}>
                      <Code>{f.name}</Code>
                      <Chip>{f.type}</Chip>
                    </Flex>
                    <Paragraph style={{ fontSize: "0.8rem", opacity: 0.7, margin: 0 }}>
                      {f.description}
                    </Paragraph>
                    {f.example && (
                      <Paragraph style={{ fontSize: "0.75rem", opacity: 0.5, margin: 0 }}>
                        e.g. {f.example}
                      </Paragraph>
                    )}
                  </Flex>
                ))}
              </Flex>

              <Divider />

              {/* Example queries */}
              <Flex flexDirection="column" gap={8}>
                <Strong>Example queries</Strong>
                <Flex flexDirection="column" gap={6}>
                  {activeInfo.exampleQueries.map((ex) => (
                    <Link
                      key={ex.label}
                      onClick={() => {
                        setQuery(ex.query);
                        setOutcome(null);
                      }}
                      style={{ fontSize: "0.85rem", cursor: "pointer" }}
                    >
                      {ex.label}
                    </Link>
                  ))}
                </Flex>
              </Flex>

              {/* Live schema from Settings */}
              {liveSchema && liveSchema.logFields.length > 0 && (
                <>
                  <Divider />
                  <Flex flexDirection="column" gap={8}>
                    <Flex alignItems="center" gap={6}>
                      <Strong>From your environment</Strong>
                      <Chip color="success">Live</Chip>
                    </Flex>
                    <Paragraph style={{ fontSize: "0.78rem", opacity: 0.6, margin: 0 }}>
                      Real log fields discovered from your tenant. Click to insert into the query.
                    </Paragraph>
                    <Flex gap={4} flexWrap="wrap">
                      {liveSchema.logFields.slice(0, 30).map((f) => (
                        <Link
                          key={f.name}
                          onClick={() =>
                            setQuery((q) =>
                              q ? `${q}\n| fields ${f.name}` : `fetch logs\n| fields ${f.name}`,
                            )
                          }
                          style={{ fontSize: "0.78rem", cursor: "pointer" }}
                        >
                          <Code style={{ fontSize: "0.75rem" }}>{f.name}</Code>
                        </Link>
                      ))}
                    </Flex>
                  </Flex>
                </>
              )}

              <Divider />

              <Paragraph style={{ fontSize: "0.75rem", opacity: 0.4, margin: 0 }}>
                Free in-app simulation — no Dynatrace charges.
              </Paragraph>
            </Flex>
          </Surface>
        </Grid>
      </Flex>
    </Flex>
  );
};
