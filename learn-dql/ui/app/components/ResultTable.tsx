import React, { useMemo, useState } from "react";
import { DataTable } from "@dynatrace/strato-components-preview/tables";
import { Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import type { DQLRecord, DQLColumn } from "../lib/types/dql";

interface ResultTableProps {
  records: DQLRecord[];
  columns: DQLColumn[];
  maxRows?: number;
  onQueryModify?: (action: "summarize" | "filter", fieldName: string, filterValue?: string) => void;
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

/** Enhanced ResultTable with interactive column/cell menus for query modification. */
export const ResultTable = ({
  records,
  columns,
  maxRows = 200,
  onQueryModify,
}: ResultTableProps) => {
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const colDefs = useMemo(
    () =>
      columns.map((c) => ({
        id: c.name,
        header: c.name,
        accessor: c.name,
      })),
    [columns],
  );

  const data = useMemo(
    () =>
      records.slice(0, maxRows).map((r, rowIdx) => {
        const row: Record<string, React.ReactNode> = {};
        for (const c of columns) {
          const cellValue = display(r[c.name]);
          row[c.name] = onQueryModify ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <Button
                variant="default"
                onClick={() => setActivePopover(activePopover === `cell-${rowIdx}-${c.name}` ? null : `cell-${rowIdx}-${c.name}`)}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.875rem",
                  textAlign: "left",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  maxWidth: "200px",
                  background: "transparent",
                  border: "1px solid #e0e0e0",
                  cursor: "pointer",
                }}
                title="Click for filter options"
              >
                {String(cellValue).substring(0, 40)}
              </Button>
              {activePopover === `cell-${rowIdx}-${c.name}` && (
                <Surface
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    zIndex: 1000,
                    minWidth: "220px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    marginTop: "4px",
                  }}
                >
                  <Flex flexDirection="column" gap={4} padding={8}>
                    <Text style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      Filter "{c.name}"
                    </Text>
                    <Button
                      variant="default"
                      onClick={() => {
                        onQueryModify("filter", c.name, `== "${cellValue}"`);
                        setActivePopover(null);
                      }}
                      style={{ fontSize: "0.875rem", justifyContent: "flex-start" }}
                    >
                      Equal to: {String(cellValue).substring(0, 30)}
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => {
                        onQueryModify("filter", c.name, `!= "${cellValue}"`);
                        setActivePopover(null);
                      }}
                      style={{ fontSize: "0.875rem", justifyContent: "flex-start" }}
                    >
                      Not equal to
                    </Button>
                  </Flex>
                </Surface>
              )}
            </div>
          ) : (
            cellValue
          );
        }
        return row;
      }),
    [records, columns, maxRows, activePopover, onQueryModify],
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
