import React, { useState, useMemo, useCallback, useEffect } from "react";
import { DataTable } from "@dynatrace/strato-components-preview/tables";
import { Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  CopyIcon,
  ArrowSmallUpIcon,
  ArrowSmallDownIcon,
  GroupIcon,
  LineChartIcon,
  ParseIcon,
  ArrowSmallLeftIcon,
  ArrowSmallRightIcon,
  PinIcon,
  WrapTextIcon,
  WrapTextOffIcon,
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

interface SortState { id: string; desc: boolean }

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function display(fieldName: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    // Format ISO timestamps like DT Notebooks: "18/05/2026, 13:27:41"
    if (ISO_RE.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toLocaleString("en-GB");
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
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
        padding: "5px 10px",
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

// ─── Column header menu ──────────────────────────────────────────────────────

interface ColumnHeaderMenuProps {
  name: string;
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
              padding: "4px 0",
            }}
          >
            <MenuItem
              icon={<CopyIcon size={16} />}
              label="Copy field name"
              onClick={() => { void navigator.clipboard.writeText(name); close(); }}
            />

            <MenuDivider />

            <MenuSection label="Add command to query" />
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
            <MenuItem
              icon={<GroupIcon size={16} />}
              label="Summarize"
              onClick={() => { onQueryModify?.("summarize", name); close(); }}
            />
            <MenuItem icon={<LineChartIcon size={16} />} label="Convert to time series" disabled />
            <MenuItem icon={<ParseIcon size={16} />}     label="Extract fields"          disabled />

            <MenuDivider />

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

  // Reset layout state whenever the column set changes (new query result).
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

  const colDefs = useMemo(
    () =>
      effectiveCols.map((c, idx) => ({
        id: c.name,
        accessor: c.name as keyof DQLRecord,
        label: c.name,
        header: () => (
          <ColumnHeaderMenu
            name={c.name}
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
        cell: ({ value }: { value: unknown }) => <>{display(c.name, value)}</>,
        width: "auto" as const,
      })),
    [
      effectiveCols, sortState, lineWrap,
      handleSort, handleMoveLeft, handleMoveRight, handleToggleWrap, handleHide,
      onQueryModify,
    ],
  );

  if (records.length === 0) {
    return <Flex padding={16}><Paragraph>No records.</Paragraph></Flex>;
  }

  return (
    <Flex flexDirection="column" gap={4}>
      {hiddenCols.size > 0 && (
        <Flex alignItems="center" gap={8}>
          <Text style={{ fontSize: "0.8rem", opacity: 0.6 }}>
            {hiddenCols.size} column{hiddenCols.size > 1 ? "s" : ""} hidden
          </Text>
          <Button
            variant="default"
            onClick={() => setHiddenCols(new Set())}
            style={{ fontSize: "0.8rem", padding: "2px 8px" }}
          >
            Show all
          </Button>
        </Flex>
      )}
      <DataTable
        data={data}
        columns={colDefs}
        fullWidth
        resizable
        lineWrap={lineWrap}
      />
      {records.length > maxRows && (
        <Paragraph style={{ fontSize: "0.875rem", opacity: 0.7 }}>
          Showing first {maxRows} of {records.length} records.
        </Paragraph>
      )}
    </Flex>
  );
};
