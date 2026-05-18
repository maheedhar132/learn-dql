import React, { useMemo, useState } from "react";
import { DataTable } from "@dynatrace/strato-components-preview/tables";
import { Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import { Surface } from "@dynatrace/strato-components/containers";
import { EllipsisIcon } from "@dynatrace/strato-icons";
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
        header: (
          <Flex alignItems="center" gap={8} style={{ position: "relative" }}>
            <span>{c.name} ({c.type})</span>
            {onQueryModify && (
              <div style={{ position: "relative" }}>
                <Button
                  variant="tertiary"
                  size="compact"
                  onClick={() => setActivePopover(activePopover === `col-${c.name}` ? null : `col-${c.name}`)}
                  style={{ padding: "2px 4px" }}
                  title="Column options"
                >
                  <EllipsisIcon />
                </Button>
                {activePopover === `col-${c.name}` && (
                  <Surface
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      zIndex: 1000,
                      minWidth: "200px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    <Flex flexDirection="column" gap={4} padding={8}>
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => {
                          onQueryModify("summarize", c.name);
                          setActivePopover(null);
                        }}
                      >
                        Summarize by {c.name}
                      </Button>
                    </Flex>
                  </Surface>
                )}
              </div>
            )}
          </Flex>
        ),
        accessor: c.name,
      })),
    [columns, activePopover, onQueryModify],
  );

  const data = useMemo(
    () =>
      records.slice(0, maxRows).map((r, rowIdx) => {
        const row: Record<string, React.ReactNode> = {};
        for (const c of columns) {
          const cellValue = display(r[c.name]);
          row[c.name] = onQueryModify ? (
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "4px" }}>
              <Button
                variant="tertiary"
                size="compact"
                onClick={() => setActivePopover(activePopover === `cell-${rowIdx}-${c.name}` ? null : `cell-${rowIdx}-${c.name}`)}
                style={{
                  padding: "2px 6px",
                  fontSize: "0.875rem",
                  textAlign: "left",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  maxWidth: "150px",
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
                    minWidth: "200px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  <Flex flexDirection="column" gap={4} padding={8}>
                    <Text size="small" style={{ fontWeight: 600 }}>
                      Filter "{c.name}"
                    </Text>
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => {
                        onQueryModify("filter", c.name, `== "${cellValue}"`);
                        setActivePopover(null);
                      }}
                    >
                      Equal to
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => {
                        onQueryModify("filter", c.name, `!= "${cellValue}"`);
                        setActivePopover(null);
                      }}
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
