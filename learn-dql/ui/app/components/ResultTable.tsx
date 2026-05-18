import React, { useMemo } from "react";
import { DataTable } from "@dynatrace/strato-components-preview/tables";
import { Paragraph } from "@dynatrace/strato-components/typography";
import { Flex } from "@dynatrace/strato-components/layouts";
import type { DQLRecord, DQLColumn } from "../lib/types/dql";

interface ResultTableProps {
  records: DQLRecord[];
  columns: DQLColumn[];
  maxRows?: number;
}

function display(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Renders DQL engine output using the Strato DataTable. */
export const ResultTable = ({
  records,
  columns,
  maxRows = 200,
}: ResultTableProps) => {
  const colDefs = useMemo(
    () =>
      columns.map((c) => ({
        id: c.name,
        header: `${c.name} (${c.type})`,
        accessor: c.name,
      })),
    [columns],
  );

  const data = useMemo(
    () =>
      records.slice(0, maxRows).map((r) => {
        const row: Record<string, string | number | boolean> = {};
        for (const c of columns) row[c.name] = display(r[c.name]);
        return row;
      }),
    [records, columns, maxRows],
  );

  if (records.length === 0) {
    return (
      <Flex padding={16}>
        <Paragraph>No records.</Paragraph>
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap={4}>
      <DataTable data={data} columns={colDefs} />
      {records.length > maxRows && (
        <Paragraph>
          Showing first {maxRows} of {records.length} records.
        </Paragraph>
      )}
    </Flex>
  );
};
