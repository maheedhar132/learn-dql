import React, { useState } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import { runQuery, type RunOutcome } from "../lib/validate";
import { generateAppLogs } from "../lib/dql/log-generator";
import { ResultTable } from "../components/ResultTable";

// Deterministic offline sample data (no Grail / no deploy — PROJECT_DECK §6).
const SAMPLE = generateAppLogs(200, 42);

const DEFAULT_QUERY =
  'fetch logs\n| filter loglevel == "ERROR"\n| limit 20';

export const Sandbox = () => {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  function runWithQuery(q: string) {
    setOutcome(runQuery(q, SAMPLE));
  }

  function onQueryModify(action: "summarize" | "filter", fieldName: string, filterValue?: string) {
    let newQuery: string;
    if (action === "filter" && filterValue) {
      newQuery = query ? `${query} | filter ${fieldName} ${filterValue}` : `fetch logs | filter ${fieldName} ${filterValue}`;
    } else if (action === "summarize") {
      newQuery = query ? `${query} | summarize count(), by:{${fieldName}}` : `fetch logs | summarize count(), by:{${fieldName}}`;
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
          Free-form DQL against a deterministic offline dataset (200 sample
          app-log records). Runs entirely in the browser engine.
        </Paragraph>
      </Flex>

      <DQLEditor value={query} onChange={(v) => setQuery(v)} />
      <Flex>
        <Button variant="accent" onClick={() => runWithQuery(query)}>
          Run query
        </Button>
      </Flex>

      {outcome && (
        <Flex flexDirection="column" gap={8}>
          {outcome.error ? (
            <Surface>
              <Flex padding={12}>
                <Strong>Error: {outcome.error}</Strong>
              </Flex>
            </Surface>
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
  );
};
