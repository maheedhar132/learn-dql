import React, { useState, useCallback } from "react";
import { Flex, Surface, Divider, TitleBar } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
  Code,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip, MessageContainer } from "@dynatrace/strato-components/content";
import { Checkbox } from "@dynatrace/strato-components/forms";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import { queryExecutionClient } from "@dynatrace-sdk/client-query";
import {
  loadSettings,
  updateSettings,
  type AppSettings,
  type LiveSeedSchema,
  type LiveSeedField,
} from "../lib/settings";
import type { DQLRecord } from "../lib/types/dql";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferType(val: unknown): LiveSeedField["type"] {
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "number") return Number.isInteger(val) ? "long" : "double";
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return "timestamp";
    if (/^\d+(\.\d+)?$/.test(val)) return "double";
  }
  return "string";
}

function schemaFromRecords(records: DQLRecord[]): LiveSeedField[] {
  const fieldMap = new Map<string, { type: LiveSeedField["type"]; samples: Set<string | number | boolean> }>();
  for (const rec of records) {
    for (const [key, val] of Object.entries(rec)) {
      if (val == null) continue;
      const t = inferType(val);
      if (!fieldMap.has(key)) fieldMap.set(key, { type: t, samples: new Set() });
      const entry = fieldMap.get(key)!;
      if (entry.samples.size < 5) {
        const sample = typeof val === "object" ? JSON.stringify(val) : (val as string | number | boolean);
        entry.samples.add(sample);
      }
    }
  }
  return Array.from(fieldMap.entries()).map(([name, { type, samples }]) => ({
    name,
    type,
    sampleValues: Array.from(samples),
  }));
}

function withLimit(q: string, n: number): string {
  return /\blimit\b/i.test(q) ? q : `${q.trim()}\n| limit ${n}`;
}

function generateRecordsFromLive(liveRecords: DQLRecord[], count: number): DQLRecord[] {
  const fieldPools = new Map<string, unknown[]>();
  for (const record of liveRecords) {
    for (const [key, val] of Object.entries(record)) {
      if (val == null) continue;
      if (!fieldPools.has(key)) fieldPools.set(key, []);
      const pool = fieldPools.get(key)!;
      if (!pool.includes(val)) pool.push(val);
    }
  }
  const fields = Array.from(fieldPools.entries());
  // Prime multiplier ensures diverse cross-field combinations across generated rows
  return Array.from({ length: count }, (_, i) =>
    Object.fromEntries(
      fields.map(([name, pool], fi) => [name, pool[(i + fi * 7) % pool.length]])
    )
  );
}

async function executeDQL(query: string): Promise<DQLRecord[]> {
  const resp = await queryExecutionClient.queryExecute({
    body: { query, requestTimeoutMilliseconds: 15000, maxResultRecords: 50 },
  });

  type PollResult = { state: string; result?: { records?: DQLRecord[] }; requestToken?: string };

  if ((resp as PollResult).state === "SUCCEEDED") {
    return (resp as PollResult).result?.records ?? [];
  }

  // Needs polling
  const token = (resp as PollResult).requestToken;
  if (!token) return [];
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await queryExecutionClient.queryPoll({ requestToken: token });
    if ((poll as PollResult).state === "SUCCEEDED") {
      return (poll as PollResult).result?.records ?? [];
    }
    if ((poll as PollResult).state === "FAILED") break;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

function isSameDay(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export const Settings = () => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [fetchState, setFetchState] = useState<"idle" | "fetching" | "success" | "error">("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmScan, setConfirmScan] = useState(false);

  // Custom-query seed state
  const [customQuery, setCustomQuery] = useState(settings.customSeedQuery ?? "");
  const [customFetchState, setCustomFetchState] = useState<"idle" | "fetching" | "success" | "error">("idle");
  const [customFetchError, setCustomFetchError] = useState<string | null>(null);

  const toggleLiveSeed = useCallback((enabled: boolean) => {
    const updated = updateSettings({ liveSeedEnabled: enabled });
    setSettings(updated);
  }, []);

  const runLiveSeed = useCallback(async () => {
    setFetchState("fetching");
    setFetchError(null);
    setConfirmScan(false);
    try {
      const logRecords = await executeDQL("fetch logs, samplingRatio:100 | limit 50");
      const generated = generateRecordsFromLive(logRecords, 1000);

      const schema: LiveSeedSchema = {
        logFields: schemaFromRecords(logRecords),
        spanFields: [],
        recordsSampled: logRecords.length,
      };

      const updated = updateSettings({
        liveSeedSchema: schema,
        liveSeedFetchedAt: new Date().toISOString(),
        liveSeedRecords: generated,
      });
      setSettings(updated);
      setFetchState("success");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
      setFetchState("error");
    }
  }, []);

  const handleFetchClick = useCallback(() => {
    if (settings.liveSeedFetchedAt && isSameDay(settings.liveSeedFetchedAt) && !confirmScan) {
      setConfirmScan(true);
      return;
    }
    void runLiveSeed();
  }, [settings.liveSeedFetchedAt, confirmScan, runLiveSeed]);

  const clearSchema = useCallback(() => {
    const updated = updateSettings({
      liveSeedSchema: null,
      liveSeedFetchedAt: null,
      liveSeedRecords: null,
    });
    setSettings(updated);
    setFetchState("idle");
    setConfirmScan(false);
  }, []);

  const runCustomSeed = useCallback(async () => {
    if (!customQuery.trim()) return;
    setCustomFetchState("fetching");
    setCustomFetchError(null);
    try {
      const q = withLimit(customQuery.trim(), 10);
      const records = await executeDQL(q);
      const updated = updateSettings({
        customSeedQuery: customQuery.trim(),
        customSeedRecords: records,
        customSeedFetchedAt: new Date().toISOString(),
      });
      setSettings(updated);
      setCustomFetchState("success");
    } catch (err) {
      setCustomFetchError(err instanceof Error ? err.message : String(err));
      setCustomFetchState("error");
    }
  }, [customQuery]);

  const clearCustomSeed = useCallback(() => {
    const updated = updateSettings({
      customSeedQuery: null,
      customSeedRecords: null,
      customSeedFetchedAt: null,
    });
    setSettings(updated);
    setCustomFetchState("idle");
  }, []);

  const schema = settings.liveSeedSchema;
  const fetchedAt = settings.liveSeedFetchedAt
    ? new Date(settings.liveSeedFetchedAt).toLocaleString()
    : null;
  const customFetchedAt = settings.customSeedFetchedAt
    ? new Date(settings.customSeedFetchedAt).toLocaleString()
    : null;

  return (
    <Flex flexDirection="column" gap={0}>
      <TitleBar>
        <TitleBar.Title>Settings</TitleBar.Title>
        <TitleBar.Subtitle>
          Configure how the app generates sample data and integrates with your Dynatrace environment.
        </TitleBar.Subtitle>
      </TitleBar>

      <Flex flexDirection="column" padding={32} gap={24}>
      <Divider />

      {/* ── Live Seed ── */}
      <Surface>
        <Flex flexDirection="column" padding={20} gap={16}>
          <Flex justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={12}>
            <Flex flexDirection="column" gap={4} style={{ maxWidth: 560 }}>
              <Heading level={3} style={{ margin: 0 }}>Live Seed from Environment</Heading>
              <Paragraph style={{ opacity: 0.8, margin: 0, lineHeight: 1.5 }}>
                When enabled, the app queries your connected Dynatrace environment once to discover
                the actual field names and types used in your logs and spans. The Notebook and
                Sandbox will then show a <Strong>"From your environment"</Strong> panel
                listing your real field names as suggestions — so you practice with the same
                field names you use in production.
              </Paragraph>
              <Paragraph style={{ fontSize: "0.8rem", opacity: 0.55, margin: 0 }}>
                Default: <Strong>disabled.</Strong> Only reads 50 records to detect field shapes —
                no data is stored on any server. Schema is cached in browser localStorage only.
              </Paragraph>
            </Flex>
            <Flex alignItems="center" gap={8}>
              <Checkbox
                value={settings.liveSeedEnabled}
                onChange={(checked) => toggleLiveSeed(!!checked)}
              >
                Enable
              </Checkbox>
            </Flex>
          </Flex>

          {settings.liveSeedEnabled && (
            <>
              <Divider />

              {/* Rate-limit confirmation banner */}
              {confirmScan && (
                <MessageContainer variant="warning">
                  <MessageContainer.Title>You already fetched today</MessageContainer.Title>
                  <MessageContainer.Description>
                    Running this again will execute a live DQL query against your Dynatrace
                    environment (<Code>fetch logs, samplingRatio:100 | limit 50</Code>). Continue?
                  </MessageContainer.Description>
                  <Flex gap={8} style={{ marginTop: 8 }}>
                    <Button variant="accent" onClick={() => void runLiveSeed()}>
                      Yes, I understand — fetch again
                    </Button>
                    <Button variant="default" onClick={() => setConfirmScan(false)}>
                      Cancel
                    </Button>
                  </Flex>
                </MessageContainer>
              )}

              <Flex gap={12} alignItems="center" flexWrap="wrap">
                <Button
                  variant="accent"
                  onClick={handleFetchClick}
                  disabled={fetchState === "fetching"}
                >
                  {fetchState === "fetching" ? "Fetching…" : "Fetch schema now"}
                </Button>
                {schema && (
                  <Button variant="default" onClick={clearSchema}>
                    Clear cached schema
                  </Button>
                )}
                {fetchedAt && (
                  <Paragraph style={{ fontSize: "0.8rem", opacity: 0.55, margin: 0 }}>
                    Last fetched: {fetchedAt} · {schema?.recordsSampled ?? 0} records sampled
                  </Paragraph>
                )}
              </Flex>

              {fetchState === "error" && (
                <MessageContainer variant="critical">
                  <MessageContainer.Title>Schema fetch failed</MessageContainer.Title>
                  <MessageContainer.Description>
                    {fetchError ?? "Unknown error. Check that the app has storage:logs:read scope."}
                  </MessageContainer.Description>
                </MessageContainer>
              )}

              {fetchState === "success" && (
                <MessageContainer variant="success">
                  <MessageContainer.Title>Schema cached</MessageContainer.Title>
                  <MessageContainer.Description>
                    Discovered {schema?.logFields.length ?? 0} log fields from your environment.
                    Generated 1000 synthetic records — open the Sandbox and pick{" "}
                    <Strong>"My environment"</Strong> to practice with your real field shapes.
                  </MessageContainer.Description>
                </MessageContainer>
              )}

              {schema && (
                <Flex flexDirection="column" gap={12}>
                  <FieldSchemaPanel title="Log fields" fields={schema.logFields} />
                </Flex>
              )}
            </>
          )}
        </Flex>
      </Surface>

      {/* ── Custom query seed ── */}
      {settings.liveSeedEnabled && (
        <Surface>
          <Flex flexDirection="column" padding={20} gap={16}>
            <Flex flexDirection="column" gap={4} style={{ maxWidth: 560 }}>
              <Heading level={3} style={{ margin: 0 }}>Seed Sandbox from your own query</Heading>
              <Paragraph style={{ opacity: 0.8, margin: 0, lineHeight: 1.5 }}>
                Run any DQL query against your environment and use the results as the dataset
                in the Sandbox <Strong>"My environment"</Strong> tab.{" "}
                <Code>| limit 10</Code> is appended automatically if you don't include one.
                This overrides the environment seed.
              </Paragraph>
            </Flex>

            <DQLEditor
              value={customQuery}
              onChange={(v) => setCustomQuery(v)}
            />

            <Flex gap={8} alignItems="center" flexWrap="wrap">
              <Button
                variant="accent"
                onClick={() => void runCustomSeed()}
                disabled={customFetchState === "fetching" || !customQuery.trim()}
              >
                {customFetchState === "fetching" ? "Seeding…" : "Seed from my query"}
              </Button>
              {settings.customSeedRecords && (
                <Button variant="default" onClick={clearCustomSeed}>
                  Clear custom seed
                </Button>
              )}
              {customFetchedAt && (
                <Paragraph style={{ fontSize: "0.8rem", opacity: 0.55, margin: 0 }}>
                  Last seeded: {customFetchedAt} · {settings.customSeedRecords?.length ?? 0} records
                </Paragraph>
              )}
            </Flex>

            {customFetchState === "error" && (
              <MessageContainer variant="critical">
                <MessageContainer.Title>Seed failed</MessageContainer.Title>
                <MessageContainer.Description>
                  {customFetchError ?? "Unknown error. Check query syntax and that the app has the required scopes."}
                </MessageContainer.Description>
              </MessageContainer>
            )}

            {customFetchState === "success" && (
              <MessageContainer variant="success">
                <MessageContainer.Title>Custom seed saved</MessageContainer.Title>
                <MessageContainer.Description>
                  Seeded {settings.customSeedRecords?.length ?? 0} record(s) — open the Sandbox and pick{" "}
                  <Strong>"My environment"</Strong> to practice with this data.
                </MessageContainer.Description>
              </MessageContainer>
            )}
          </Flex>
        </Surface>
      )}

      {/* ── System queries info ── */}
      <Surface>
        <Flex flexDirection="column" padding={20} gap={12}>
          <Heading level={3} style={{ margin: 0 }}>Free System Queries</Heading>
          <Paragraph style={{ opacity: 0.8, lineHeight: 1.5, margin: 0 }}>
            Dynatrace provides a set of <Strong>dt.system.*</Strong> tables that are free to query
            (no DDU cost). These are available in every tenant and contain metadata about your
            DQL usage, deployments, and environment. You can run these directly in the{" "}
            <Strong>Sandbox</Strong> or <Strong>Notebook</Strong> against your live environment
            without worrying about cost.
          </Paragraph>
          <Flex flexDirection="column" gap={8}>
            {SYSTEM_QUERIES.map((q) => (
              <Surface key={q.table}>
                <Flex flexDirection="column" padding={12} gap={6}>
                  <Flex gap={8} alignItems="center">
                    <Code>{q.table}</Code>
                    <Chip color="success">Free</Chip>
                  </Flex>
                  <Paragraph style={{ fontSize: "0.85rem", opacity: 0.8, margin: 0 }}>{q.description}</Paragraph>
                  <Code style={{ fontSize: "0.78rem", display: "block", whiteSpace: "pre", overflowX: "auto" }}>
                    {q.example}
                  </Code>
                </Flex>
              </Surface>
            ))}
          </Flex>
        </Flex>
      </Surface>

      </Flex>
    </Flex>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FieldSchemaPanel({ title, fields }: { title: string; fields: LiveSeedField[] }) {
  if (fields.length === 0) return null;
  return (
    <Flex flexDirection="column" gap={6}>
      <Strong style={{ fontSize: "0.85rem" }}>{title} ({fields.length})</Strong>
      <Flex gap={6} flexWrap="wrap">
        {fields.map((f) => (
          <Surface key={f.name} style={{ padding: "4px 8px" }}>
            <Flex gap={6} alignItems="center">
              <Code style={{ fontSize: "0.78rem" }}>{f.name}</Code>
              <Chip style={{ fontSize: "0.7rem" }}>{f.type}</Chip>
            </Flex>
          </Surface>
        ))}
      </Flex>
    </Flex>
  );
}

const SYSTEM_QUERIES = [
  {
    table: "fetch dt.system.query_executions",
    description: "Audit your DQL query history — execution time, bytes scanned, user who ran the query. Use this to find expensive queries and optimize cost.",
    example: `fetch dt.system.query_executions, from: now() - 24h
| filter status == "SUCCEEDED"
| summarize runs = count(), scanned = sum(scanned_bytes.on_demand), by: {query_string}
| sort scanned desc
| limit 20`,
  },
  {
    table: "fetch dt.entity.host",
    description: "Query the entity model for host metadata — name, tags, management zones, technologies detected. No DDU cost, always up to date.",
    example: `fetch dt.entity.host
| fields entity.name, tags, managementZones
| filter arrayContains(tags, "env:production")
| limit 50`,
  },
  {
    table: "fetch dt.entity.service",
    description: "List all services with their technology type, environment, and relationships. Free to query — use for lookup enrichment.",
    example: `fetch dt.entity.service
| fields entity.name, serviceType, fromRelationships.runsOn
| limit 100`,
  },
];
