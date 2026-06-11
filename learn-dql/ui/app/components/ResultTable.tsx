import React, { useState, useMemo, useCallback, useEffect } from "react";
import { DataTable } from "@dynatrace/strato-components-preview/tables";
import { Paragraph, Text, Code } from "@dynatrace/strato-components/typography";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import {
  CopyIcon,
  ArrowSmallUpIcon,
  ArrowSmallDownIcon,
  GroupIcon,
  ArrowSmallLeftIcon,
  ArrowSmallRightIcon,
  PinIcon,
  WrapTextIcon,
  WrapTextOffIcon,
  ViewOffIcon,
  FilterIcon,
  DownloadIcon,
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

interface SortState { id: string; desc: boolean }

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function display(fieldName: string, value: unknown): string {
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

// Infer a short type label for a column based on sample values
function colTypeLabel(col: DQLColumn, records: DQLRecord[]): string {
  const sample = records.find((r) => r[col.name] != null)?.[col.name];
  if (sample == null) return "string";
  if (typeof sample === "boolean") return "boolean";
  if (typeof sample === "number") return Number.isInteger(sample) ? "long" : "double";
  if (typeof sample === "string" && ISO_RE.test(sample)) return "timestamp";
  return "string";
}

// ─── Download CSV ─────────────────────────────────────────────────────────────

function exportCSV(records: DQLRecord[], columns: DQLColumn[]) {
  const header = columns.map((c) => JSON.stringify(c.name)).join(",");
  const rows = records.map((r) =>
    columns.map((c) => {
      const v = r[c.name];
      return v == null ? "" : JSON.stringify(String(v));
    }).join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "query-result.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Menu primitives ────────────────────────────────────────────────────────

function MenuDivider() {
  return <div style={{ height: 1, background: "rgba(127,127,127,0.2)", margin: "4px 0" }} />;
}

function MenuSection({ label }: { label: string }) {
  return (
    <Text
      style={{
        display: "block",
        fontSize: "0.72rem",
        opacity: 0.55,
        padding: "6px 10px 2px",
        userSelect: "none",
      }}
    >
      {label}
    </Text>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled = false,
  bold = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  bold?: boolean;
}) {
  return (
    <Button
      variant="default"
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "0.875rem",
        fontWeight: bold ? 600 : 400,
        justifyContent: "flex-start",
        padding: "3px 8px",
        width: "100%",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "default" : "pointer",
        background: "transparent",
        border: "none",
      }}
    >
      {icon}
      {label}
    </Button>
  );
}

// ─── Cell value menu ─────────────────────────────────────────────────────────

function CellValueMenu({
  fieldName,
  rawValue,
  displayValue,
  onQueryModify,
  isNull: isNullVal,
}: {
  fieldName: string;
  rawValue: unknown;
  displayValue: string;
  onQueryModify?: ResultTableProps["onQueryModify"];
  isNull: boolean;
}) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const close = () => setAnchor(null);

  const filterVal = typeof rawValue === "string"
    ? `== "${rawValue}"`
    : rawValue === null || rawValue === undefined
    ? "== null"
    : `== ${String(rawValue)}`;
  const filterNeq = typeof rawValue === "string"
    ? `!= "${rawValue}"`
    : rawValue === null || rawValue === undefined
    ? "!= null"
    : `!= ${String(rawValue)}`;

  return (
    <span
      style={{
        cursor: "pointer",
        display: "inline-block",
        width: "100%",
        color: isNullVal ? "rgba(127,127,127,0.45)" : undefined,
        fontStyle: isNullVal ? "italic" : undefined,
        fontFamily: "var(--dt-font-mono, monospace)",
        fontSize: "0.8125rem",
      }}
      onClick={(e) => {
        e.stopPropagation();
        setAnchor(anchor ? null : { x: e.clientX, y: e.clientY });
      }}
    >
      {isNullVal ? "null" : displayValue}
      {anchor && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={(e) => { e.stopPropagation(); close(); }} />
          <Surface
            style={{
              position: "fixed",
              top: anchor.y + 4,
              left: anchor.x,
              zIndex: 999,
              minWidth: "200px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              padding: "2px 0",
              borderRadius: 0,
            }}
          >
            <MenuItem
              icon={<CopyIcon size={16} />}
              label="Copy value"
              onClick={() => { void navigator.clipboard.writeText(displayValue); close(); }}
            />
            {onQueryModify && (
              <>
                <MenuDivider />
                <MenuSection label="Add to query" />
                <MenuItem
                  icon={<FilterIcon size={16} />}
                  label={`Filter: ${fieldName} ${filterVal}`}
                  onClick={() => { onQueryModify("filter", fieldName, filterVal); close(); }}
                />
                <MenuItem
                  icon={<FilterIcon size={16} />}
                  label={`Exclude: ${fieldName} ${filterNeq}`}
                  onClick={() => { onQueryModify("filter", fieldName, filterNeq); close(); }}
                />
              </>
            )}
          </Surface>
        </>
      )}
    </span>
  );
}

// ─── Column header menu ──────────────────────────────────────────────────────

interface ColumnHeaderMenuProps {
  name: string;
  typeLabel: string;
  colIndex: number;
  totalCols: number;
  sortState: SortState | null;
  lineWrap: boolean;
  onSort: (colId: string, desc: boolean) => void;
  onMoveLeft: (colId: string) => void;
  onMoveRight: (colId: string) => void;
  onToggleLineWrap: () => void;
  onHide: (colId: string) => void;
  onQueryModify?: ResultTableProps["onQueryModify"];
}

function ColumnHeaderMenu({
  name,
  typeLabel,
  colIndex,
  totalCols,
  sortState,
  lineWrap,
  onSort,
  onMoveLeft,
  onMoveRight,
  onToggleLineWrap,
  onHide,
  onQueryModify,
}: ColumnHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const isAsc  = sortState?.id === name && !sortState.desc;
  const isDesc = sortState?.id === name &&  sortState.desc;

  return (
    <Flex alignItems="center" gap={4} style={{ position: "relative", minWidth: 0, width: "100%" }}>
      <Flex flexDirection="column" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <Text
          style={{
            fontWeight: 600,
            fontSize: "0.8125rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "var(--dt-font-mono, monospace)",
          }}
        >
          {name}
          {isAsc ? " ↑" : isDesc ? " ↓" : ""}
        </Text>
        <Text style={{ fontSize: "0.68rem", opacity: 0.45, lineHeight: 1 }}>{typeLabel}</Text>
      </Flex>

      <Button
        variant="default"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
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
          <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={close} />
          <Surface
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 999,
              minWidth: "220px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              marginTop: "4px",
              padding: "2px 0",
              borderRadius: 0,
            }}
          >
            <MenuItem
              icon={<CopyIcon size={16} />}
              label="Copy field name"
              onClick={() => { void navigator.clipboard.writeText(name); close(); }}
            />

            <MenuDivider />

            <MenuSection label="Sort" />
            <MenuItem
              icon={<ArrowSmallUpIcon size={16} />}
              label="Sort ascending"
              bold={isAsc}
              onClick={() => { onSort(name, false); close(); }}
            />
            <MenuItem
              icon={<ArrowSmallDownIcon size={16} />}
              label="Sort descending"
              bold={isDesc}
              onClick={() => { onSort(name, true); close(); }}
            />

            {onQueryModify && (
              <>
                <MenuDivider />
                <MenuSection label="Add to query" />
                <MenuItem
                  icon={<GroupIcon size={16} />}
                  label="Summarize by this field"
                  onClick={() => { onQueryModify("summarize", name); close(); }}
                />
              </>
            )}

            <MenuDivider />

            <MenuSection label="Column" />
            <MenuItem
              icon={<ArrowSmallLeftIcon size={16} />}
              label="Move left"
              disabled={colIndex === 0}
              onClick={() => { onMoveLeft(name); close(); }}
            />
            <MenuItem
              icon={<ArrowSmallRightIcon size={16} />}
              label="Move right"
              disabled={colIndex === totalCols - 1}
              onClick={() => { onMoveRight(name); close(); }}
            />
            <MenuItem icon={<PinIcon size={16} />} label="Pin left"  disabled />
            <MenuItem icon={<PinIcon size={16} />} label="Pin right" disabled />
            <MenuDivider />
            <MenuItem
              icon={lineWrap ? <WrapTextOffIcon size={16} /> : <WrapTextIcon size={16} />}
              label={lineWrap ? "Disable line wrap" : "Enable line wrap"}
              onClick={() => { onToggleLineWrap(); close(); }}
            />
            <MenuItem
              icon={<ViewOffIcon size={16} />}
              label="Hide column"
              onClick={() => { onHide(name); close(); }}
            />
          </Surface>
        </>
      )}
    </Flex>
  );
}

// ─── ResultTable ─────────────────────────────────────────────────────────────

export const ResultTable = ({
  records,
  columns,
  maxRows = 200,
  onQueryModify,
}: ResultTableProps) => {
  const [sortState,  setSortState]  = useState<SortState | null>(null);
  const [colOrder,   setColOrder]   = useState<string[]>(() => columns.map((c) => c.name));
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => new Set());
  const [lineWrap,   setLineWrap]   = useState(false);

  // Reset layout whenever the column set changes (new query result).
  useEffect(() => {
    setColOrder(columns.map((c) => c.name));
    setHiddenCols(new Set());
    setSortState(null);
  }, [columns]);

  const handleSort       = useCallback((id: string, desc: boolean) => setSortState({ id, desc }), []);
  const handleMoveLeft   = useCallback((id: string) => setColOrder((o) => {
    const i = o.indexOf(id); if (i <= 0) return o;
    const n = [...o]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n;
  }), []);
  const handleMoveRight  = useCallback((id: string) => setColOrder((o) => {
    const i = o.indexOf(id); if (i >= o.length - 1) return o;
    const n = [...o]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n;
  }), []);
  const handleHide       = useCallback((id: string) => setHiddenCols((s) => new Set([...s, id])), []);
  const handleToggleWrap = useCallback(() => setLineWrap((w) => !w), []);

  // Effective column list: ordered + visibility filtered.
  const effectiveCols = useMemo(
    () =>
      colOrder
        .filter((name) => !hiddenCols.has(name))
        .map((name) => columns.find((c) => c.name === name))
        .filter((c): c is DQLColumn => !!c),
    [colOrder, hiddenCols, columns],
  );

  // Per-column type labels derived from sample data
  const typeLabels = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.name, colTypeLabel(c, records)])),
    [columns, records],
  );

  // Client-side sort then slice.
  const data = useMemo(() => {
    let rows = records;
    if (sortState) {
      const { id, desc } = sortState;
      rows = [...records].sort((a, b) => {
        const av = display(id, a[id]);
        const bv = display(id, b[id]);
        const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
        return desc ? -cmp : cmp;
      });
    }
    return rows.slice(0, maxRows);
  }, [records, sortState, maxRows]);

  // Row-number prepend: add synthetic _row field
  const numberedData = useMemo(
    () => data.map((r, i) => ({ ...r, _row: i + 1 } as DQLRecord)),
    [data],
  );

  const colDefs = useMemo(
    () => [
      // Row-number frozen column
      {
        id: "_row",
        accessor: "_row" as keyof DQLRecord,
        label: "#",
        header: () => (
          <Text style={{ fontSize: "0.72rem", opacity: 0.45, userSelect: "none" }}>#</Text>
        ),
        cell: ({ value }: { value: unknown }) => (
          <Text style={{ fontSize: "0.75rem", opacity: 0.4, userSelect: "none", fontFamily: "var(--dt-font-mono, monospace)" }}>
            {String(value)}
          </Text>
        ),
        width: "auto" as const,
      },
      // Data columns
      ...effectiveCols.map((c, idx) => ({
        id: c.name,
        accessor: c.name as keyof DQLRecord,
        label: c.name,
        header: () => (
          <ColumnHeaderMenu
            name={c.name}
            typeLabel={typeLabels[c.name] ?? ""}
            colIndex={idx}
            totalCols={effectiveCols.length}
            sortState={sortState}
            lineWrap={lineWrap}
            onSort={handleSort}
            onMoveLeft={handleMoveLeft}
            onMoveRight={handleMoveRight}
            onToggleLineWrap={handleToggleWrap}
            onHide={handleHide}
            onQueryModify={onQueryModify}
          />
        ),
        cell: ({ value }: { value: unknown }) => (
          <CellValueMenu
            fieldName={c.name}
            rawValue={value}
            displayValue={display(c.name, value)}
            onQueryModify={onQueryModify}
            isNull={value == null}
          />
        ),
        width: "auto" as const,
      })),
    ],
    [
      effectiveCols, sortState, lineWrap, typeLabels,
      handleSort, handleMoveLeft, handleMoveRight, handleToggleWrap, handleHide,
      onQueryModify,
    ],
  );

  const visibleColCount = effectiveCols.length;

  if (records.length === 0) {
    return (
      <Flex
        flexDirection="column"
        alignItems="center"
        style={{ padding: "32px 16px", opacity: 0.5 }}
        gap={8}
      >
        <Paragraph style={{ margin: 0 }}>No records returned.</Paragraph>
        <Text style={{ fontSize: "0.8rem" }}>The query ran successfully but matched zero rows.</Text>
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap={0}>
      {/* ── DT Notebook-style toolbar ── */}
      <Flex
        alignItems="center"
        justifyContent="space-between"
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid rgba(127,127,127,0.15)",
          background: "rgba(127,127,127,0.04)",
          borderRadius: "4px 4px 0 0",
        }}
        gap={8}
      >
        <Flex alignItems="center" gap={8}>
          <Text style={{ fontSize: "0.78rem", fontWeight: 600 }}>
            {records.length.toLocaleString()} record{records.length !== 1 ? "s" : ""}
          </Text>
          <Text style={{ fontSize: "0.72rem", opacity: 0.45 }}>·</Text>
          <Text style={{ fontSize: "0.78rem", opacity: 0.7 }}>
            {visibleColCount} field{visibleColCount !== 1 ? "s" : ""}
          </Text>
          {hiddenCols.size > 0 && (
            <>
              <Text style={{ fontSize: "0.72rem", opacity: 0.45 }}>·</Text>
              <Button
                variant="default"
                onClick={() => setHiddenCols(new Set())}
                style={{ fontSize: "0.75rem", padding: "1px 6px" }}
              >
                {hiddenCols.size} hidden — show all
              </Button>
            </>
          )}
        </Flex>
        <Flex alignItems="center" gap={4}>
          {sortState && (
            <Chip style={{ fontSize: "0.72rem" }}>
              Sorted: {sortState.id} {sortState.desc ? "↓" : "↑"}
            </Chip>
          )}
          <Button
            variant="default"
            onClick={() => exportCSV(records, columns)}
            style={{ padding: "2px 8px", fontSize: "0.78rem" }}
          >
            <Flex alignItems="center" gap={4}>
              <DownloadIcon size={14} />
              Export CSV
            </Flex>
          </Button>
        </Flex>
      </Flex>

      {/* ── Data table ── */}
      <DataTable
        data={numberedData}
        columns={colDefs}
        fullWidth
        resizable
        lineWrap={lineWrap}
      />

      {/* ── Footer ── */}
      {records.length > maxRows && (
        <Flex
          style={{
            padding: "4px 12px",
            borderTop: "1px solid rgba(127,127,127,0.15)",
            background: "rgba(127,127,127,0.04)",
            borderRadius: "0 0 4px 4px",
          }}
        >
          <Text style={{ fontSize: "0.75rem", opacity: 0.6 }}>
            Showing first {maxRows.toLocaleString()} of {records.length.toLocaleString()} records
          </Text>
        </Flex>
      )}
    </Flex>
  );
};
