import React, { useState, useEffect, useMemo, useRef } from "react";
import { Flex, Surface, Divider, TitleBar } from "@dynatrace/strato-components/layouts";
import {
  Paragraph,
  Strong,
  Code,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip, MessageContainer, Markdown } from "@dynatrace/strato-components/content";
import { Select, TextInput } from "@dynatrace/strato-components/forms";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import {
  PlayIcon,
  PlusIcon,
  DeleteIcon,
  ArrowSmallUpIcon,
  ArrowSmallDownIcon,
  WrapTextIcon,
  SaveIcon,
} from "@dynatrace/strato-icons";
import { runQuery, type RunOutcome } from "../lib/validate";
import { ResultTable } from "../components/ResultTable";
import { loadSettings } from "../lib/settings";
import {
  generateAppLogs,
  generateKubernetesStructuredLogs,
  generateAuditLogs,
  generateSecurityEvents,
  generateInfrastructureLogs,
  generateApmSpans,
  generateAuthLogs,
  generateBizEvents,
} from "../lib/dql/log-generator";
import type { DQLRecord } from "../lib/types/dql";

// ─── Data Sources ─────────────────────────────────────────────────────────────

interface DataSourceDef {
  id: string;
  label: string;
  description: string;
  fields: { name: string; type: string; example: string }[];
  generate: () => DQLRecord[];
}

const DATA_SOURCES: DataSourceDef[] = [
  {
    id: "app_logs",
    label: "Application Logs",
    description: "App server logs — request lifecycle, errors, warnings",
    fields: [
      { name: "timestamp",  type: "datetime", example: "2024-01-15T10:23:45Z" },
      { name: "loglevel",   type: "string",   example: "INFO · WARN · ERROR · DEBUG" },
      { name: "host",       type: "string",   example: "app-01 … app-06" },
      { name: "content",    type: "string",   example: "request_id=… endpoint=… duration_ms=…" },
    ],
    generate: () => generateAppLogs(2200, 42),
  },
  {
    id: "k8s_logs",
    label: "Kubernetes Logs",
    description: "Pod events — phase, restart counts, resource usage",
    fields: [
      { name: "timestamp",     type: "datetime", example: "2024-03-10T06:01:00Z" },
      { name: "loglevel",      type: "string",   example: "INFO · WARN · ERROR" },
      { name: "namespace",     type: "string",   example: "production · staging · monitoring" },
      { name: "deployment",    type: "string",   example: "api-gateway · user-service" },
      { name: "pod",           type: "string",   example: "api-gateway-12345-abcde" },
      { name: "node",          type: "string",   example: "node-01 … node-05" },
      { name: "phase",         type: "string",   example: "Running · CrashLoopBackOff · Pending" },
      { name: "reason",        type: "string",   example: "OOMKilling · Scheduled · BackOff" },
      { name: "restart_count", type: "long",     example: "0 · 3 · 17" },
      { name: "cpu_usage_pct", type: "long",     example: "12 · 65 · 94" },
      { name: "mem_usage_pct", type: "long",     example: "34 · 71 · 98" },
    ],
    generate: () => generateKubernetesStructuredLogs(1500, 99),
  },
  {
    id: "audit_logs",
    label: "Audit Trail",
    description: "User actions — logins, permission changes, data access, escalations",
    fields: [
      { name: "timestamp",   type: "datetime", example: "2024-03-01T09:15:00Z" },
      { name: "loglevel",    type: "string",   example: "INFO · WARN" },
      { name: "user",        type: "string",   example: "alice.chen · bob.smith" },
      { name: "team",        type: "string",   example: "platform-eng · sre · security" },
      { name: "action",      type: "string",   example: "login · run_query · sudo_escalate" },
      { name: "resource",    type: "string",   example: "dashboard:prod-overview · secret:db-password" },
      { name: "outcome",     type: "string",   example: "success · failure · denied" },
      { name: "ip",          type: "string",   example: "10.0.1.42 · 192.168.1.5" },
      { name: "duration_ms", type: "long",     example: "12 · 250" },
    ],
    generate: () => generateAuditLogs(1800, 77),
  },
  {
    id: "security_events",
    label: "Security Events",
    description: "Threat detection — MITRE ATT&CK mapped rules, blocked and alerted events",
    fields: [
      { name: "timestamp",       type: "datetime", example: "2024-03-15T00:04:00Z" },
      { name: "loglevel",        type: "string",   example: "INFO · WARN · ERROR" },
      { name: "severity",        type: "string",   example: "LOW · MEDIUM · HIGH · CRITICAL" },
      { name: "rule_name",       type: "string",   example: "Brute Force Login · Container Escape" },
      { name: "mitre_tactic",    type: "string",   example: "Credential Access · Lateral Movement" },
      { name: "mitre_technique", type: "string",   example: "T1110 · T1021 · T1548" },
      { name: "src_ip",          type: "string",   example: "10.0.1.5 · 45.23.11.8" },
      { name: "dest_ip",         type: "string",   example: "10.0.2.10" },
      { name: "dest_port",       type: "long",     example: "22 · 443 · 3306" },
      { name: "action",          type: "string",   example: "blocked · alert · allowed" },
      { name: "event_count",     type: "long",     example: "1 · 47 · 130" },
    ],
    generate: () => generateSecurityEvents(1200, 55),
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    description: "Host health snapshots — CPU, memory, disk, network by role and region",
    fields: [
      { name: "timestamp",        type: "datetime", example: "2024-03-20T08:01:00Z" },
      { name: "host",             type: "string",   example: "prod-app-01 · prod-db-01" },
      { name: "role",             type: "string",   example: "web · database · cache · worker" },
      { name: "region",           type: "string",   example: "us-east-1 · us-west-2" },
      { name: "availability_zone",type: "string",   example: "us-east-1a · us-east-1b" },
      { name: "cpu_pct",          type: "long",     example: "14 · 55 · 92" },
      { name: "mem_pct",          type: "long",     example: "41 · 73 · 95" },
      { name: "disk_pct",         type: "long",     example: "28 · 60 · 88" },
      { name: "net_rx_mbps",      type: "double",   example: "12.4 · 350.7" },
      { name: "net_tx_mbps",      type: "double",   example: "5.1 · 120.3" },
      { name: "load_avg",         type: "double",   example: "0.82 · 3.45 · 14.2" },
    ],
    generate: () => generateInfrastructureLogs(2000, 33),
  },
  {
    id: "apm_spans",
    label: "APM Spans",
    description: "Distributed traces — service calls, latency, DB queries, error rates",
    fields: [
      { name: "timestamp",      type: "datetime", example: "2024-03-18T10:00:05Z" },
      { name: "loglevel",       type: "string",   example: "INFO · WARN · ERROR" },
      { name: "service",        type: "string",   example: "api-gateway · payment-service" },
      { name: "operation",      type: "string",   example: "handle_request · charge_card" },
      { name: "span_type",      type: "string",   example: "http · db · cache · messaging" },
      { name: "duration_ms",    type: "long",     example: "12 · 145 · 2300" },
      { name: "status_code",    type: "long",     example: "200 · 404 · 500 · 503" },
      { name: "is_error",       type: "boolean",  example: "true · false" },
      { name: "db_statement",   type: "string",   example: "SELECT * FROM users WHERE id = ?" },
      { name: "caller_service", type: "string",   example: "api-gateway · order-service" },
      { name: "trace_id",       type: "string",   example: "a1b2c3d4e5f6…" },
    ],
    generate: () => generateApmSpans(2000, 11),
  },
  {
    id: "auth_logs",
    label: "Auth Logs",
    description: "Authentication events — logins, failures, IP addresses, attacker patterns",
    fields: [
      { name: "timestamp",   type: "datetime", example: "2024-01-15T10:23:45Z" },
      { name: "loglevel",    type: "string",   example: "INFO · WARN · ERROR · DEBUG" },
      { name: "host",        type: "string",   example: "prod-01 … prod-05" },
      { name: "content",     type: "string",   example: "user=admin attacker_ip=… attempts=…" },
    ],
    generate: () => generateAuthLogs(1500, 22),
  },
  {
    id: "biz_events",
    label: "Business Events",
    description: "Revenue events — orders, payments, and shipments by product and region",
    fields: [
      { name: "timestamp",     type: "datetime", example: "2024-01-15T10:23:45Z" },
      { name: "event.type",    type: "string",   example: "com.easytrade.order_confirmed · …payment_confirmed" },
      { name: "order_id",      type: "string",   example: "ORD-10042" },
      { name: "amount",        type: "double",   example: "474.2 · 1280.5" },
      { name: "currency",      type: "string",   example: "USD · EUR · GBP · JPY" },
      { name: "product",       type: "string",   example: "widget · gadget · sprocket" },
      { name: "accountId",     type: "string",   example: "ACC-1042" },
      { name: "region",        type: "string",   example: "na · eu · apac · latam" },
      { name: "customer_tier", type: "string",   example: "free · pro · enterprise" },
    ],
    generate: () => generateBizEvents(1500, 66),
  },
];

const getDataSource = (id: string) => DATA_SOURCES.find((d) => d.id === id) ?? DATA_SOURCES[0];

// ─── Sample queries per data source ──────────────────────────────────────────

const SAMPLE_QUERIES: Record<string, { label: string; query: string }[]> = {
  app_logs: [
    { label: "All records", query: "fetch logs\n| limit 20" },
    { label: "Errors only", query: 'fetch logs\n| filter loglevel == "ERROR"\n| limit 20' },
    { label: "Error rate by host", query: 'fetch logs\n| filter loglevel == "ERROR"\n| summarize errors = count(), by:{host}\n| sort errors desc' },
    { label: "Requests per endpoint", query: 'fetch logs\n| parse content, "ep:endpoint"\n| summarize requests = count(), by:{endpoint}\n| sort requests desc' },
    { label: "Level breakdown", query: "fetch logs\n| summarize count(), by:{loglevel}" },
  ],
  k8s_logs: [
    { label: "All pods", query: "fetch logs\n| limit 20" },
    { label: "Crashing pods", query: 'fetch logs\n| filter reason == "CrashLoopBackOff" or reason == "OOMKilling"\n| fields namespace, deployment, pod, restart_count, reason\n| sort restart_count desc' },
    { label: "High restart count", query: "fetch logs\n| filter restart_count > 5\n| summarize max_restarts = max(restart_count), by:{deployment, namespace}\n| sort max_restarts desc" },
    { label: "CPU pressure by node", query: "fetch logs\n| filter cpu_usage_pct > 80\n| summarize high_cpu_events = count(), by:{node}\n| sort high_cpu_events desc" },
    { label: "Events by namespace", query: "fetch logs\n| summarize count(), by:{namespace, loglevel}\n| sort count desc" },
    { label: "OOMKilled pods", query: 'fetch logs\n| filter reason == "OOMKilling"\n| fields namespace, deployment, pod, mem_usage_pct, mem_limit\n| sort mem_usage_pct desc' },
  ],
  audit_logs: [
    { label: "All events", query: "fetch logs\n| limit 20" },
    { label: "Denied actions", query: 'fetch logs\n| filter outcome == "denied"\n| fields timestamp, user, action, resource, ip\n| sort timestamp desc' },
    { label: "Sudo escalations", query: 'fetch logs\n| filter action == "sudo_escalate"\n| summarize count = count(), by:{user, outcome}\n| sort count desc' },
    { label: "Action breakdown by user", query: "fetch logs\n| summarize actions = count(), by:{user, action}\n| sort actions desc" },
    { label: "Failures by team", query: 'fetch logs\n| filter outcome != "success"\n| summarize failures = count(), by:{team}\n| sort failures desc' },
    { label: "Sensitive resource access", query: 'fetch logs\n| filter contains(resource, "secret") or action == "read_secrets"\n| fields timestamp, user, action, resource, outcome, ip' },
  ],
  security_events: [
    { label: "All events", query: "fetch logs\n| limit 20" },
    { label: "Critical threats", query: 'fetch logs\n| filter severity == "CRITICAL"\n| fields timestamp, rule_name, src_ip, dest_ip, action, event_count\n| sort event_count desc' },
    { label: "By MITRE tactic", query: "fetch logs\n| summarize events = count(), by:{mitre_tactic}\n| sort events desc" },
    { label: "Blocked vs allowed", query: "fetch logs\n| summarize count(), by:{severity, action}\n| sort count desc" },
    { label: "Top source IPs", query: "fetch logs\n| summarize hits = count(), by:{src_ip}\n| sort hits desc\n| limit 10" },
    { label: "Lateral movement", query: 'fetch logs\n| filter mitre_tactic == "Lateral Movement"\n| fields timestamp, rule_name, src_ip, dest_ip, dest_port, action' },
  ],
  infrastructure: [
    { label: "All snapshots", query: "fetch logs\n| limit 20" },
    { label: "High CPU hosts", query: "fetch logs\n| filter cpu_pct > 85\n| summarize avg_cpu = avg(cpu_pct), max_cpu = max(cpu_pct), events = count(), by:{host, role}\n| sort max_cpu desc" },
    { label: "Memory pressure", query: "fetch logs\n| filter mem_pct > 80\n| fields timestamp, host, role, mem_pct, mem_used_gb, mem_total_gb\n| sort mem_pct desc" },
    { label: "Disk usage by host", query: "fetch logs\n| summarize avg_disk = avg(disk_pct), max_disk = max(disk_pct), by:{host}\n| sort max_disk desc" },
    { label: "Avg CPU by role", query: "fetch logs\n| summarize avg_cpu = avg(cpu_pct), avg_mem = avg(mem_pct), by:{role}\n| sort avg_cpu desc" },
    { label: "Stressed hosts (any metric)", query: "fetch logs\n| filter cpu_pct > 85 or mem_pct > 90 or disk_pct > 85\n| fields timestamp, host, role, cpu_pct, mem_pct, disk_pct\n| sort timestamp desc" },
  ],
  apm_spans: [
    { label: "All spans", query: "fetch logs\n| limit 20" },
    { label: "Error spans", query: "fetch logs\n| filter is_error == true\n| fields timestamp, service, operation, duration_ms, status_code\n| sort duration_ms desc" },
    { label: "P95 latency by service", query: "fetch logs\n| summarize p95 = percentile(duration_ms, 95), avg = avg(duration_ms), by:{service}\n| sort p95 desc" },
    { label: "Error rate by service", query: "fetch logs\n| summarize total = count(), errors = countIf(is_error == true), by:{service}\n| sort errors desc" },
    { label: "Slow DB queries", query: 'fetch logs\n| filter span_type == "db" and duration_ms > 200\n| fields timestamp, service, operation, duration_ms, db_statement\n| sort duration_ms desc' },
    { label: "Top operations by volume", query: "fetch logs\n| summarize calls = count(), avg_ms = avg(duration_ms), by:{service, operation}\n| sort calls desc\n| limit 15" },
  ],
  auth_logs: [
    { label: "All events", query: "fetch logs\n| limit 20" },
    { label: "Error events", query: 'fetch logs\n| filter loglevel == "ERROR"\n| limit 20' },
    { label: "Errors by host", query: 'fetch logs\n| filter loglevel == "ERROR"\n| summarize count(), by:{host}\n| sort count desc' },
  ],
  biz_events: [
    { label: "All events", query: "fetch bizevents\n| limit 20" },
    { label: "Revenue by region", query: "fetch bizevents\n| summarize revenue = sum(amount), by:{region}\n| sort revenue desc" },
    { label: "Orders by event type", query: "fetch bizevents\n| summarize orders = count(), by:{event.type}\n| sort orders desc" },
    { label: "Top products", query: "fetch bizevents\n| summarize revenue = sum(amount), orders = count(), by:{product}\n| sort revenue desc" },
  ],
};

// ─── Notebook cell types ──────────────────────────────────────────────────────

interface QueryCell {
  id: string;
  type: "query";
  title: string;
  dataSourceId: string;
  query: string;
  outcome: RunOutcome | null;
  running: boolean;
}

interface TextCell {
  id: string;
  type: "text";
  title: string;
  note: string;
  editing: boolean;
}

type NotebookCell = QueryCell | TextCell;

const STORAGE_KEY = "learn-dql.notebook.v1";

function makeId() {
  return `cell-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultCells(): NotebookCell[] {
  return [
    {
      id: makeId(),
      type: "text",
      title: "",
      note: "# Welcome to the DQL Notebook\n\nThis notebook works like Dynatrace Notebooks — add query cells, pick a data source, run DQL, and see results inline. Add text cells for notes and observations.",
      editing: false,
    },
    {
      id: makeId(),
      type: "query",
      title: "First query",
      dataSourceId: "app_logs",
      query: "fetch logs\n| filter loglevel == \"ERROR\"\n| summarize errors = count(), by:{host}\n| sort errors desc",
      outcome: null,
      running: false,
    },
  ];
}

function loadNotebook(): { title: string | null; cells: NotebookCell[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as NotebookCell[] | { title?: string; cells: NotebookCell[] };
      if (Array.isArray(parsed)) return { title: null, cells: parsed };
      if (Array.isArray(parsed.cells)) return { title: parsed.title ?? null, cells: parsed.cells };
    }
  } catch { /* ignore */ }
  return { title: null, cells: defaultCells() };
}

/** Strip transient state (query results, running/editing flags) before
 *  persisting — outcomes can be thousands of rows and blow the quota. */
function persistableCells(cells: NotebookCell[]): NotebookCell[] {
  return cells.map((c) =>
    c.type === "query" ? { ...c, outcome: null, running: false } : { ...c, editing: false },
  );
}

function saveCells(cells: NotebookCell[], title?: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, cells: persistableCells(cells) }));
    return true;
  } catch {
    return false;
  }
}

// ─── Lazy data cache (generate once per session) ──────────────────────────────

const dataCache = new Map<string, ReturnType<DataSourceDef["generate"]>>();
function getData(sourceId: string): DQLRecord[] {
  if (!dataCache.has(sourceId)) {
    const ds = getDataSource(sourceId);
    dataCache.set(sourceId, ds.generate());
  }
  return dataCache.get(sourceId)!;
}

// ─── Text Cell ────────────────────────────────────────────────────────────────

function TextCellComponent({ cell, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  cell: TextCell;
  onUpdate: (id: string, patch: Partial<TextCell>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (cell.editing && textareaRef.current) textareaRef.current.focus();
  }, [cell.editing]);

  return (
    <Surface>
      <Flex flexDirection="column" gap={0}>
        {/* Cell toolbar */}
        <Flex
          alignItems="center"
          justifyContent="space-between"
          padding={8}
          style={{ borderBottom: "1px solid rgba(127,127,127,0.12)", minHeight: 40 }}
        >
          <Flex alignItems="center" gap={8}>
            <WrapTextIcon size={14} style={{ opacity: 0.5 }} />
            <Chip>Text</Chip>
          </Flex>
          <Flex gap={4}>
            <Button variant="default" onClick={() => onMoveUp(cell.id)} disabled={isFirst} style={{ padding: "2px 6px", minWidth: 0 }}><ArrowSmallUpIcon size={14} /></Button>
            <Button variant="default" onClick={() => onMoveDown(cell.id)} disabled={isLast} style={{ padding: "2px 6px", minWidth: 0 }}><ArrowSmallDownIcon size={14} /></Button>
            <Button variant="default" onClick={() => onUpdate(cell.id, { editing: !cell.editing })} style={{ padding: "2px 8px", fontSize: "0.8rem" }}>
              {cell.editing ? "Done" : "Edit"}
            </Button>
            <Button variant="default" onClick={() => onDelete(cell.id)} style={{ padding: "2px 6px", minWidth: 0 }}><DeleteIcon size={14} /></Button>
          </Flex>
        </Flex>

        {/* Content */}
        <div style={{ padding: "12px 16px" }}>
          {cell.editing ? (
            <textarea
              ref={textareaRef}
              value={cell.note}
              onChange={(e) => onUpdate(cell.id, { note: e.target.value })}
              style={{
                width: "100%",
                minHeight: 120,
                padding: 8,
                fontFamily: "monospace",
                fontSize: "0.875rem",
                background: "transparent",
                border: "1px solid rgba(127,127,127,0.3)",
                borderRadius: 4,
                color: "inherit",
                resize: "vertical",
                outline: "none",
              }}
              placeholder="Write notes in Markdown. Use # for headings, - for bullets, **bold**, `code`."
            />
          ) : (
            <Markdown>{cell.note}</Markdown>
          )}
        </div>
      </Flex>
    </Surface>
  );
}

// ─── Query Cell ───────────────────────────────────────────────────────────────

function QueryCellComponent({ cell, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  cell: QueryCell;
  onUpdate: (id: string, patch: Partial<QueryCell>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const ds = getDataSource(cell.dataSourceId);
  const samples = SAMPLE_QUERIES[cell.dataSourceId] ?? [];

  function run() {
    if (!cell.query.trim()) return;
    onUpdate(cell.id, { running: true });
    const data = getData(cell.dataSourceId);
    const outcome = runQuery(cell.query, data);
    onUpdate(cell.id, { outcome, running: false });
  }

  function applySample(query: string) {
    onUpdate(cell.id, { query, outcome: null });
  }

  function onQueryModify(action: "summarize" | "filter", fieldName: string, filterValue?: string) {
    const base = cell.query || "fetch logs";
    const newQuery = action === "summarize"
      ? `${base}\n| summarize count(), by:{${fieldName}}`
      : action === "filter" && filterValue
      ? `${base}\n| filter ${fieldName} ${filterValue}`
      : base;
    onUpdate(cell.id, { query: newQuery, outcome: null });
  }

  return (
    <Surface>
      <Flex flexDirection="column" gap={0}>
        {/* Cell toolbar */}
        <Flex
          alignItems="center"
          justifyContent="space-between"
          padding={8}
          style={{ borderBottom: "1px solid rgba(127,127,127,0.12)", minHeight: 40 }}
          flexWrap="wrap"
          gap={8}
        >
          <Flex alignItems="center" gap={8} flexWrap="wrap">
            <PlayIcon size={14} style={{ opacity: 0.5 }} />
            <Chip>DQL</Chip>
            {/* Editable title */}
            <input
              value={cell.title}
              onChange={(e) => onUpdate(cell.id, { title: e.target.value })}
              placeholder="Cell title…"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.85rem",
                color: "inherit",
                fontWeight: 500,
                minWidth: 80,
                maxWidth: 220,
              }}
            />
          </Flex>
          <Flex alignItems="center" gap={8} flexWrap="wrap">
            {/* Data source picker */}
            <Select
              value={cell.dataSourceId}
              onChange={(v) => { if (v) onUpdate(cell.id, { dataSourceId: String(v), outcome: null }); }}
            >
              <Select.Content>
                {DATA_SOURCES.map((d) => (
                  <Select.Option key={d.id} value={d.id}>{d.label}</Select.Option>
                ))}
              </Select.Content>
            </Select>
            <Flex gap={4}>
              <Button variant="default" onClick={() => onMoveUp(cell.id)} disabled={isFirst} style={{ padding: "2px 6px", minWidth: 0 }}><ArrowSmallUpIcon size={14} /></Button>
              <Button variant="default" onClick={() => onMoveDown(cell.id)} disabled={isLast} style={{ padding: "2px 6px", minWidth: 0 }}><ArrowSmallDownIcon size={14} /></Button>
              <Button variant="default" onClick={() => onDelete(cell.id)} style={{ padding: "2px 6px", minWidth: 0 }}><DeleteIcon size={14} /></Button>
            </Flex>
          </Flex>
        </Flex>

        {/* Field reference strip */}
        <Flex
          gap={6}
          padding={8}
          flexWrap="wrap"
          alignItems="center"
          style={{ borderBottom: "1px solid rgba(127,127,127,0.08)", background: "rgba(127,127,127,0.04)" }}
        >
          <span style={{ fontSize: "0.72rem", opacity: 0.5, flexShrink: 0 }}>Fields:</span>
          {ds.fields.map((f) => (
            <Chip key={f.name} style={{ fontSize: "0.72rem", cursor: "default" }}>
              <Code>{f.name}</Code>
              <span style={{ opacity: 0.5, marginLeft: 4 }}>{f.type}</span>
            </Chip>
          ))}
        </Flex>

        {/* Sample queries */}
        {samples.length > 0 && (
          <Flex
            gap={6}
            padding={8}
            flexWrap="wrap"
            alignItems="center"
            style={{ borderBottom: "1px solid rgba(127,127,127,0.08)" }}
          >
            <span style={{ fontSize: "0.72rem", opacity: 0.5, flexShrink: 0 }}>Try:</span>
            {samples.map((s) => (
              <Button
                key={s.label}
                variant="default"
                onClick={() => applySample(s.query)}
                style={{ fontSize: "0.72rem", padding: "2px 8px" }}
              >
                {s.label}
              </Button>
            ))}
          </Flex>
        )}

        {/* Editor */}
        <div style={{ padding: "8px 8px 4px" }}>
          <DQLEditor
            value={cell.query}
            onChange={(v) => onUpdate(cell.id, { query: v ?? "", outcome: null })}
            style={{ minHeight: 80 }}
          />
        </div>

        {/* Run bar */}
        <Flex gap={8} alignItems="center" padding={8} paddingTop={4}>
          <Button
            variant="accent"
            disabled={!cell.query.trim() || cell.running}
            onClick={run}
          >
            <PlayIcon size={14} />
            {cell.running ? "Running…" : "Run"}
          </Button>
          <Button
            variant="default"
            onClick={() => onUpdate(cell.id, { query: "", outcome: null })}
          >
            Clear
          </Button>
          <Paragraph style={{ fontSize: "0.72rem", opacity: 0.4, margin: 0 }}>Ctrl+Enter</Paragraph>
          {cell.outcome && !cell.outcome.error && (
            <Paragraph style={{ fontSize: "0.78rem", opacity: 0.6, margin: 0 }}>
              {cell.outcome.records.length} record{cell.outcome.records.length !== 1 ? "s" : ""}
            </Paragraph>
          )}
        </Flex>

        {/* Results */}
        {cell.outcome && (
          <div style={{ padding: "4px 8px 12px" }}>
            {cell.outcome.error ? (
              <MessageContainer variant="critical">
                <MessageContainer.Title>Query error</MessageContainer.Title>
                <MessageContainer.Description>{cell.outcome.error}</MessageContainer.Description>
              </MessageContainer>
            ) : cell.outcome.records.length === 0 ? (
              <MessageContainer variant="neutral">
                <MessageContainer.Title>No results</MessageContainer.Title>
                <MessageContainer.Description>
                  The query ran successfully but returned zero records. Try adjusting your filters.
                </MessageContainer.Description>
              </MessageContainer>
            ) : (
              <ResultTable
                records={cell.outcome.records}
                columns={cell.outcome.columns}
                maxRows={200}
                onQueryModify={onQueryModify}
              />
            )}
          </div>
        )}
      </Flex>
    </Surface>
  );
}

// ─── Notebook page ────────────────────────────────────────────────────────────

export const Notebook = () => {
  const [initial] = useState(loadNotebook);
  const [cells, setCells] = useState<NotebookCell[]>(initial.cells);
  const [notebookTitle, setNotebookTitle] = useState(initial.title ?? "My DQL Notebook");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Auto-save (debounced) so navigating away never loses work.
  useEffect(() => {
    const t = setTimeout(() => {
      setSaveError(!saveCells(cells, notebookTitle));
    }, 800);
    return () => clearTimeout(t);
  }, [cells, notebookTitle]);

  // Live-seed schema (Settings → Live Seed from Environment)
  const liveSchema = useMemo(() => {
    const s = loadSettings();
    return s.liveSeedEnabled && s.liveSeedSchema ? s.liveSeedSchema : null;
  }, []);

  // Ctrl+Enter: run the query cell containing the focused editor
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        // Find which query cell's editor is focused and run it
        const active = document.activeElement;
        if (!active) return;
        const cellEl = active.closest("[data-cell-id]");
        if (!cellEl) return;
        const cellId = cellEl.getAttribute("data-cell-id");
        if (!cellId) return;
        const cell = cells.find((c) => c.id === cellId);
        if (!cell || cell.type !== "query") return;
        const data = getData(cell.dataSourceId);
        const outcome = runQuery(cell.query, data);
        updateCell(cellId, { outcome, running: false });
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [cells]);

  function updateCell(id: string, patch: Partial<NotebookCell>) {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } as NotebookCell : c)));
  }

  function deleteCell(id: string) {
    setCells((prev) => prev.filter((c) => c.id !== id));
  }

  function moveCell(id: string, dir: "up" | "down") {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function addQueryCell() {
    const newCell: QueryCell = {
      id: makeId(),
      type: "query",
      title: "",
      dataSourceId: "app_logs",
      query: "fetch logs\n| limit 10",
      outcome: null,
      running: false,
    };
    setCells((prev) => [...prev, newCell]);
  }

  function addTextCell() {
    const newCell: TextCell = {
      id: makeId(),
      type: "text",
      title: "",
      note: "",
      editing: true,
    };
    setCells((prev) => [...prev, newCell]);
  }

  function runAll() {
    setCells((prev) => prev.map((cell) => {
      if (cell.type !== "query" || !cell.query.trim()) return cell;
      const data = getData(cell.dataSourceId);
      const outcome = runQuery(cell.query, data);
      return { ...cell, outcome, running: false };
    }));
  }

  function save() {
    const ok = saveCells(cells, notebookTitle);
    setSaveError(!ok);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function resetNotebook() {
    const fresh = defaultCells();
    setCells(fresh);
    saveCells(fresh, notebookTitle);
  }

  return (
    <Flex flexDirection="column" gap={0}>
      <TitleBar>
        <TitleBar.Title>
          <TextInput
            value={notebookTitle}
            onChange={(v) => setNotebookTitle(v ?? "")}
            aria-label="Notebook title"
          />
        </TitleBar.Title>
        <TitleBar.Subtitle>
          Multi-cell DQL notebook · 8 data sources · {saveError ? "⚠ save failed (storage full?)" : "auto-saves to this browser"}
        </TitleBar.Subtitle>
        <TitleBar.Suffix>
          <Button variant="default" onClick={runAll}>
            <PlayIcon size={14} /> Run all
          </Button>
          <Button variant="default" onClick={save}>
            <SaveIcon size={14} /> {saved ? "Saved ✓" : "Save"}
          </Button>
          <Button variant="default" onClick={addTextCell}>
            <WrapTextIcon size={14} /> Text cell
          </Button>
          <Button variant="accent" onClick={addQueryCell}>
            <PlusIcon size={14} /> Query cell
          </Button>
        </TitleBar.Suffix>
      </TitleBar>

      <Flex flexDirection="column" padding={32} gap={20}>
      <Divider />

      {/* Live-seed schema banner */}
      {liveSchema && liveSchema.logFields.length > 0 && (
        <Surface>
          <Flex flexDirection="column" padding={16} gap={8}>
            <Flex alignItems="center" gap={8}>
              <Strong>From your environment</Strong>
              <Chip color="success">Live schema</Chip>
              <Paragraph style={{ fontSize: "0.78rem", opacity: 0.55, margin: 0 }}>
                {liveSchema.logFields.length} log fields · {liveSchema.spanFields.length} span fields
                discovered from your tenant (Settings → Live Seed)
              </Paragraph>
            </Flex>
            <Flex gap={4} flexWrap="wrap">
              {liveSchema.logFields.slice(0, 25).map((f) => (
                <Chip key={f.name} style={{ fontSize: "0.72rem" }}>
                  <Code style={{ fontSize: "0.72rem" }}>{f.name}</Code>
                  <span style={{ opacity: 0.5, marginLeft: 4 }}>{f.type}</span>
                </Chip>
              ))}
            </Flex>
          </Flex>
        </Surface>
      )}

      {/* Data source reference */}
      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          <Strong>Available data sources</Strong>
          <Flex gap={8} flexWrap="wrap">
            {DATA_SOURCES.map((ds) => (
              <Flex key={ds.id} flexDirection="column" gap={2} style={{ minWidth: 160, maxWidth: 200 }}>
                <Strong style={{ fontSize: "0.82rem" }}>{ds.label}</Strong>
                <Paragraph style={{ fontSize: "0.75rem", opacity: 0.6, margin: 0, lineHeight: 1.4 }}>
                  {ds.description}
                </Paragraph>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Surface>

      <Divider />

      {/* Cells */}
      <Flex flexDirection="column" gap={16}>
        {cells.length === 0 && (
          <MessageContainer variant="neutral">
            <MessageContainer.Title>Empty notebook</MessageContainer.Title>
            <MessageContainer.Description>
              Add a query cell or a text cell to get started.
            </MessageContainer.Description>
            <MessageContainer.Actions>
              <Button onClick={addQueryCell}>Add query cell</Button>
            </MessageContainer.Actions>
          </MessageContainer>
        )}
        {cells.map((cell, idx) => (
          <div key={cell.id} data-cell-id={cell.id}>
            {cell.type === "text" ? (
              <TextCellComponent
                cell={cell}
                onUpdate={updateCell}
                onDelete={deleteCell}
                onMoveUp={(id) => moveCell(id, "up")}
                onMoveDown={(id) => moveCell(id, "down")}
                isFirst={idx === 0}
                isLast={idx === cells.length - 1}
              />
            ) : (
              <QueryCellComponent
                cell={cell}
                onUpdate={updateCell}
                onDelete={deleteCell}
                onMoveUp={(id) => moveCell(id, "up")}
                onMoveDown={(id) => moveCell(id, "down")}
                isFirst={idx === 0}
                isLast={idx === cells.length - 1}
              />
            )}
          </div>
        ))}
      </Flex>

      {/* Add cell bar */}
      <Flex gap={8} justifyContent="center" paddingTop={8}>
        <Button variant="default" onClick={addTextCell}>
          <WrapTextIcon size={14} /> Add text cell
        </Button>
        <Button variant="accent" onClick={addQueryCell}>
          <PlusIcon size={14} /> Add query cell
        </Button>
      </Flex>

      {/* Footer */}
      <Flex justifyContent="flex-end" paddingTop={8}>
        <Button variant="default" onClick={resetNotebook}>
          Reset notebook
        </Button>
      </Flex>

      </Flex>
    </Flex>
  );
};
