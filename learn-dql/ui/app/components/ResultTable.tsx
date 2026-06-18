import React, { useMemo } from "react";
import { DataTable, TableActionsMenu, DataTablePagination } from "@dynatrace/strato-components/tables";
import { EmptyState } from "@dynatrace/strato-components/content";
import { Chip } from "@dynatrace/strato-components/content";
import { Flex } from "@dynatrace/strato-components/layouts";
import {
  CopyIcon,
  ArrowSmallUpIcon,
  ArrowSmallDownIcon,
  GroupIcon,
  FilterForIcon,
  FilterOutIcon,
  ViewOffIcon,
} from "@dynatrace/strato-icons";
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

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function display(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    if (ISO_RE.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toLocaleString("en-GB");
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

function colTypeLabel(col: DQLColumn, records: DQLRecord[]): string {
  const sample = records.find((r) => r[col.name] != null)?.[col.name];
  if (sample == null) return "string";
  if (typeof sample === "boolean") return "boolean";
  if (typeof sample === "number") return Number.isInteger(sample) ? "long" : "double";
  if (typeof sample === "string" && ISO_RE.test(sample)) return "timestamp";
  return "string";
}

function filterExpr(value: unknown): string {
  if (value === null || value === undefined) return "== null";
  if (typeof value === "string") return `== "${value}"`;
  return `== ${String(value)}`;
}

function filterNeqExpr(value: unknown): string {
  if (value === null || value === undefined) return "!= null";
  if (typeof value === "string") return `!= "${value}"`;
  return `!= ${String(value)}`;
}

export const ResultTable = ({
  records,
  columns,
  maxRows = 200,
  onQueryModify,
}: ResultTableProps) => {
  // Slice data to maxRows before feeding DataTable (DataTable.Pagination handles client paging).
  const sliced = useMemo(() => records.slice(0, maxRows), [records, maxRows]);

  // Add row-number synthetic field for the # column.
  const numberedData = useMemo(
    () => sliced.map((r, i) => ({ ...r, _row: i + 1 } as DQLRecord)),
    [sliced],
  );

  const typeLabels = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.name, colTypeLabel(c, records)])),
    [columns, records],
  );

  const colDefs = useMemo(
    () => [
      // Row-number display column
      {
        id: "_row",
        accessor: "_row" as keyof DQLRecord,
        header: (): string => "#",
        label: "#",
        disableSorting: true,
        width: "content" as const,
      },
      // Data columns — header rendered as "name\ntype" via custom header
      ...columns.map((c) => ({
        id: c.name,
        accessor: c.name as keyof DQLRecord,
        header: () => (
          <Flex flexDirection="column" gap={2}>
            <span style={{ fontFamily: "var(--dt-font-mono, monospace)", fontWeight: 600, fontSize: "0.8125rem" }}>
              {c.name}
            </span>
            <span style={{ fontSize: "0.68rem", opacity: 0.45, lineHeight: 1 }}>
              {typeLabels[c.name] ?? ""}
            </span>
          </Flex>
        ),
        label: c.name,
        cell: ({ value }: { value: unknown }) => (
          <span
            style={{
              fontFamily: "var(--dt-font-mono, monospace)",
              fontSize: "0.8125rem",
              color: value == null ? "var(--dt-colors-neutral-fg-subdued, rgba(127,127,127,0.6))" : undefined,
              fontStyle: value == null ? "italic" : undefined,
            }}
          >
            {value == null ? "null" : display(value)}
          </span>
        ),
        width: "auto" as const,
        sortType: "text" as const,
      })),
    ],
    [columns, typeLabels],
  );

  if (records.length === 0) {
    return (
      <EmptyState size="small">
        <EmptyState.VisualPreset context="table" type="no-result" />
        <EmptyState.Title>No records returned</EmptyState.Title>
        <EmptyState.Details>
          The query ran successfully but matched zero rows.
        </EmptyState.Details>
      </EmptyState>
    );
  }

  return (
    <DataTable
      data={numberedData}
      columns={colDefs}
      fullWidth
      resizable
    >
      {/* ── Toolbar ── */}
      <DataTable.Toolbar>
        <Flex alignItems="center" gap={8}>
          <Chip>
            {records.length.toLocaleString()} record{records.length !== 1 ? "s" : ""}
          </Chip>
          {records.length > maxRows && (
            <Chip color="warning">first {maxRows.toLocaleString()} shown</Chip>
          )}
        </Flex>
        <DataTable.LineWrap />
        <DataTable.ColumnSettingsTrigger />
        <DataTable.DownloadData />
      </DataTable.Toolbar>

      {/* ── Column settings slots ── */}
      <DataTable.VisibilitySettings />
      <DataTable.ColumnOrderSettings />

      {/* ── Column actions (sort, copy, summarize, hide) ── */}
      <DataTable.ColumnActions>
        {(col) => {
          if (col.id === "_row") return <TableActionsMenu />;
          return (
            <TableActionsMenu>
              <TableActionsMenu.CopyItem value={col.id} />
              <TableActionsMenu.Label>Sort</TableActionsMenu.Label>
              <TableActionsMenu.Item onSelect={() => {}}>
                <TableActionsMenu.Prefix><ArrowSmallUpIcon /></TableActionsMenu.Prefix>
                Sort ascending
              </TableActionsMenu.Item>
              <TableActionsMenu.Item onSelect={() => {}}>
                <TableActionsMenu.Prefix><ArrowSmallDownIcon /></TableActionsMenu.Prefix>
                Sort descending
              </TableActionsMenu.Item>
              {onQueryModify && (
                <>
                  <TableActionsMenu.Label>Query</TableActionsMenu.Label>
                  <TableActionsMenu.Item onSelect={() => onQueryModify("summarize", col.id)}>
                    <TableActionsMenu.Prefix><GroupIcon /></TableActionsMenu.Prefix>
                    Summarize by field
                  </TableActionsMenu.Item>
                </>
              )}
              <TableActionsMenu.Label>Column</TableActionsMenu.Label>
              <TableActionsMenu.HideColumn />
              <TableActionsMenu.ColumnOrder />
            </TableActionsMenu>
          );
        }}
      </DataTable.ColumnActions>

      {/* ── Cell actions (copy, filter for/out) ── */}
      <DataTable.CellActions column={(id) => id !== "_row"}>
        {({ cellValue, columnDef }) => (
          <TableActionsMenu>
            <TableActionsMenu.CopyItem value={display(cellValue)} />
            {onQueryModify && cellValue != null && (
              <>
                <TableActionsMenu.Label>Filter</TableActionsMenu.Label>
                <TableActionsMenu.Item
                  onSelect={() => onQueryModify("filter", columnDef.id, filterExpr(cellValue))}
                >
                  <TableActionsMenu.Prefix><FilterForIcon /></TableActionsMenu.Prefix>
                  Filter for: {String(cellValue).slice(0, 30)}
                </TableActionsMenu.Item>
                <TableActionsMenu.Item
                  onSelect={() => onQueryModify("filter", columnDef.id, filterNeqExpr(cellValue))}
                >
                  <TableActionsMenu.Prefix><FilterOutIcon /></TableActionsMenu.Prefix>
                  Exclude: {String(cellValue).slice(0, 30)}
                </TableActionsMenu.Item>
              </>
            )}
          </TableActionsMenu>
        )}
      </DataTable.CellActions>

      {/* ── Pagination ── */}
      <DataTable.Pagination defaultPageSize={50} pageSizeOptions={[20, 50, 100, 200]} />

      {/* ── Empty state ── */}
      <DataTable.EmptyState>
        <EmptyState size="small">
          <EmptyState.VisualPreset context="table" type="no-result" />
          <EmptyState.Title>No records</EmptyState.Title>
        </EmptyState>
      </DataTable.EmptyState>
    </DataTable>
  );
};
