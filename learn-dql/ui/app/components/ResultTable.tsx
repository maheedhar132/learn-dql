import React, { useState, useMemo, useCallback } from "react";
import { DataTable } from "@dynatrace/strato-components-preview/tables";
import { Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import type { DQLRecord, DQLColumn } from "../lib/types/dql";

export interface ResultTableProps {
  records: DQLRecord[];
  columns: DQLColumn[];
  maxRows?: number;
  onQueryModify?: (
    action: "summarize" | "filter",
    fieldName: string,
    filterValue?: string,
  ) => void;
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

interface SortState {
  id: string;
  desc: boolean;
}

interface ColumnHeaderMenuProps {
  name: string;
  sortState: SortState | null;
  onSort: (colId: string | null, desc: boolean) => void;
  onQueryModify?: ResultTableProps["onQueryModify"];
}

function ColumnHeaderMenu({ name, sortState, onSort, onQueryModify }: ColumnHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const isAsc = sortState?.id === name && !sortState.desc;
  const isDesc = sortState?.id === name && sortState.desc;

  return (
    <Flex alignItems="center" gap={4} style={{ position: "relative", minWidth: 0 }}>
      <Text
        style={{
          fontWeight: 600,
          fontSize: "0.8125rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
        {isAsc ? " ↑" : isDesc ? " ↓" : ""}
      </Text>
      <Button
        variant="default"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          padding: "0 4px",
          minWidth: 0,
          fontSize: "0.95rem",
          lineHeight: 1,
          background: "transparent",
          border: "none",
          flexShrink: 0,
        }}
      >
        ⋮
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
              minWidth: "200px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              marginTop: "4px",
            }}
          >
            <Flex flexDirection="column" gap={0} padding={4}>
              <Button
                variant="default"
                onClick={() => { onSort(name, false); setOpen(false); }}
                style={{ fontSize: "0.875rem", justifyContent: "flex-start", fontWeight: isAsc ? 600 : 400 }}
              >
                Sort ascending
              </Button>
              <Button
                variant="default"
                onClick={() => { onSort(name, true); setOpen(false); }}
                style={{ fontSize: "0.875rem", justifyContent: "flex-start", fontWeight: isDesc ? 600 : 400 }}
              >
                Sort descending
              </Button>
              <Button
                variant="default"
                onClick={() => { onSort(null, false); setOpen(false); }}
                style={{ fontSize: "0.875rem", justifyContent: "flex-start", opacity: sortState?.id === name ? 1 : 0.4 }}
                disabled={sortState?.id !== name}
              >
                Clear sort
              </Button>
              {/* visual separator */}
              <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "4px 0" }} />
              <Button
                variant="default"
                onClick={() => { void navigator.clipboard.writeText(name); setOpen(false); }}
                style={{ fontSize: "0.875rem", justifyContent: "flex-start" }}
              >
                Copy field name
              </Button>
              <Button
                variant="default"
                onClick={() => { onQueryModify?.("summarize", name); setOpen(false); }}
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
  const [sortState, setSortState] = useState<SortState | null>(null);

  const handleSort = useCallback((colId: string | null, desc: boolean) => {
    setSortState(colId ? { id: colId, desc } : null);
  }, []);

  // Client-side sort applied before slicing — no `sortable` prop needed.
  const data = useMemo(() => {
    let rows = records;
    if (sortState) {
      const { id, desc } = sortState;
      rows = [...records].sort((a, b) => {
        const av = display(a[id]);
        const bv = display(b[id]);
        const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
        return desc ? -cmp : cmp;
      });
    }
    return rows.slice(0, maxRows);
  }, [records, sortState, maxRows]);

  const colDefs = useMemo(
    () =>
      columns.map((c) => ({
        id: c.name,
        accessor: c.name as keyof DQLRecord,
        label: c.name,
        header: () => (
          <ColumnHeaderMenu
            name={c.name}
            sortState={sortState}
            onSort={handleSort}
            onQueryModify={onQueryModify}
          />
        ),
        // cell receives { value } — the raw field value. Must return JSX.Element.
        cell: ({ value }: { value: unknown }) => <>{display(value)}</>,
        width: "auto" as const,
      })),
    [columns, sortState, handleSort, onQueryModify],
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
      <DataTable
        data={data}
        columns={colDefs}
        fullWidth
        resizable
        lineWrap
      />
      {records.length > maxRows && (
        <Paragraph style={{ fontSize: "0.875rem", opacity: 0.7 }}>
          Showing first {maxRows} of {records.length} records.
        </Paragraph>
      )}
    </Flex>
  );
};
