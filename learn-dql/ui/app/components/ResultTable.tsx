import React, { useState } from "react";
import { DataTable } from "@dynatrace/strato-components-preview/tables";
import { Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import type { DQLRecord, DQLColumn } from "../lib/types/dql";

export interface ResultTableProps {
  records: DQLRecord[];
  columns: DQLColumn[];
  maxRows?: number;
  onQueryModify?: (action: "summarize" | "filter", fieldName: string, filterValue?: string) => void;
}

function display(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function ColumnHeaderMenu({
  name,
  onQueryModify,
}: {
  name: string;
  onQueryModify?: ResultTableProps["onQueryModify"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Flex alignItems="center" gap={4} style={{ position: "relative" }}>
      <Text style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{name}</Text>
      <Button
        variant="default"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          padding: "0 3px",
          minWidth: 0,
          fontSize: "1rem",
          lineHeight: 1,
          background: "transparent",
          border: "none",
          letterSpacing: "0.05em",
        }}
      >
        ···
      </Button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 998 }}
            onClick={() => setOpen(false)}
          />
          <Surface
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 999,
              minWidth: "210px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              marginTop: "6px",
            }}
          >
            <Flex flexDirection="column" gap={2} padding={8}>
              <Button
                variant="default"
                onClick={() => {
                  void navigator.clipboard.writeText(name);
                  setOpen(false);
                }}
                style={{ fontSize: "0.875rem", justifyContent: "flex-start" }}
              >
                Copy field name
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  onQueryModify?.("summarize", name);
                  setOpen(false);
                }}
                style={{ fontSize: "0.875rem", justifyContent: "flex-start" }}
              >
                Summarize by {name}
              </Button>
            </Flex>
          </Surface>
        </>
      )}
    </Flex>
  );
}

export const ResultTable = ({
  records,
  columns,
  maxRows = 200,
  onQueryModify,
}: ResultTableProps) => {
  // Pre-process each record into a flat Record<string, string> so DataTable
  // can read values via accessorKey without encountering raw objects.
  const data = records.slice(0, maxRows).map((r) => {
    const row: Record<string, string> = {};
    for (const c of columns) {
      row[c.name] = display(r[c.name]);
    }
    return row;
  });

  const colDefs = columns.map((c) => ({
    id: c.name,
    // accessorKey is the correct TanStack Table v8 property (not "accessor")
    accessorKey: c.name,
    header: () => <ColumnHeaderMenu name={c.name} onQueryModify={onQueryModify} />,
  }));

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
        <Paragraph style={{ fontSize: "0.875rem", opacity: 0.7 }}>
          Showing first {maxRows} of {records.length} records.
        </Paragraph>
      )}
    </Flex>
  );
};
