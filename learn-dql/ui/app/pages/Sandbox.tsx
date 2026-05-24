import React, { useState, useEffect, useCallback } from "react";
import { Flex, Grid, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
  Code,
  Link,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip, MessageContainer } from "@dynatrace/strato-components/content";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import { runQuery, type RunOutcome } from "../lib/validate";
import { generateAppLogs } from "../lib/dql/log-generator";
import { ResultTable } from "../components/ResultTable";

// 2,200 records matches the lesson dataset so sandbox queries produce the same counts.
const SAMPLE = generateAppLogs(2200, 42);

const DEFAULT_QUERY = 'fetch logs\n| filter loglevel == "ERROR"\n| limit 20';

// Fields that exist as top-level columns in generateAppLogs output.
// endpoint/duration_ms/request_id live inside the content string — use parse to extract them.
const SCHEMA_FIELDS = [
  {
    name: "timestamp",
    type: "datetime",
    example: "2024-01-15T10:23:45Z",
    description: "When the log was written",
  },
  {
    name: "loglevel",
    type: "string",
    example: "INFO · WARN · ERROR · DEBUG",
    description: "Severity level",
  },
  {
    name: "content",
    type: "string",
    example: 'request_id=… endpoint=… duration_ms=…',
    description: "Free-text log body — use parse to extract embedded fields",
  },
  {
    name: "host",
    type: "string",
    example: "app-01 … app-06",
    description: "Source host identifier",
  },
];

const EXAMPLE_QUERIES = [
  { label: "First 10 records", query: "fetch logs\n| limit 10" },
  { label: "Only errors", query: 'fetch logs\n| filter loglevel == "ERROR"' },
  { label: "Count by level", query: "fetch logs\n| summarize count(), by:{loglevel}" },
  {
    label: "Errors per host",
    query: 'fetch logs\n| filter loglevel == "ERROR"\n| summarize n = count(), by:{host}\n| sort n desc',
  },
  { label: "Most recent first", query: "fetch logs\n| sort timestamp desc\n| limit 20" },
  {
    label: "Extract endpoint",
    query: 'fetch logs\n| parse content, "endpoint=endpoint_name "\n| summarize count(), by:{endpoint_name}',
  },
];

export const Sandbox = () => {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  const runWithQuery = useCallback((q: string) => {
    setOutcome(runQuery(q, SAMPLE));
  }, []);

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

  return (
    <Flex flexDirection="column" padding={32} gap={16}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={1}>Sandbox</Heading>
        <Paragraph>
          Free-form DQL against a deterministic offline dataset — 2,200 sample app-log records.
          Runs entirely in the browser. No Dynatrace environment required.
        </Paragraph>
      </Flex>

      <Grid gridTemplateColumns="1fr 300px" gap={20} alignItems="start">
        {/* ── Left: editor + results ── */}
        <Flex flexDirection="column" gap={12}>
          <DQLEditor value={query} onChange={(v) => setQuery(v)} />
          <Flex gap={8} alignItems="center">
            <Button variant="accent" onClick={() => runWithQuery(query)}>
              Run query
            </Button>
            <Button onClick={() => { setQuery(""); setOutcome(null); }}>
              Clear
            </Button>
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

        {/* ── Right: schema + examples panel ── */}
        <Surface>
          <Flex flexDirection="column" padding={16} gap={16}>
            <Flex flexDirection="column" gap={4}>
              <Strong>Available fields</Strong>
              <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>
                fetch logs · 2,200 sample records
              </Paragraph>
            </Flex>

            <Flex flexDirection="column" gap={12}>
              {SCHEMA_FIELDS.map((f) => (
                <Flex key={f.name} flexDirection="column" gap={2}>
                  <Flex alignItems="center" gap={8}>
                    <Code>{f.name}</Code>
                    <Chip>{f.type}</Chip>
                  </Flex>
                  <Paragraph style={{ fontSize: "0.8rem", opacity: 0.7, margin: 0 }}>
                    {f.description}
                  </Paragraph>
                  <Paragraph style={{ fontSize: "0.75rem", opacity: 0.5, margin: 0 }}>
                    e.g. {f.example}
                  </Paragraph>
                </Flex>
              ))}
            </Flex>

            <Divider />

            <Flex flexDirection="column" gap={8}>
              <Strong>Example queries</Strong>
              <Flex flexDirection="column" gap={6}>
                {EXAMPLE_QUERIES.map((ex) => (
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

            <Divider />

            <Paragraph style={{ fontSize: "0.75rem", opacity: 0.4, margin: 0 }}>
              Free in-app simulation — no Dynatrace charges.
            </Paragraph>
          </Flex>
        </Surface>
      </Grid>
    </Flex>
  );
};
