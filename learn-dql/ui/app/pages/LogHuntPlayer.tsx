import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
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
import Colors from "@dynatrace/strato-design-tokens/colors";
import { logHuntScenarios, type LogHuntMCQ } from "../lib/dql/log-hunt-scenarios";
import { runQuery } from "../lib/validate";
import { markHuntComplete } from "../lib/progress";
import { ResultTable } from "../components/ResultTable";
import type { RunOutcome } from "../lib/validate";

// ─── Derive fields from sample data ──────────────────────────────────────────

function deriveFields(records: ReturnType<typeof runQuery>["records"]): string[] {
  if (records.length === 0) return [];
  const first = records[0] as Record<string, unknown>;
  return Object.keys(first).filter((k) => k !== "content");
}

// ─── Free-form query sandbox ──────────────────────────────────────────────────

function QuerySandbox({
  sampleData,
  onRun,
}: {
  sampleData: ReturnType<typeof runQuery>["records"];
  onRun?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  function run() {
    if (!query.trim()) return;
    setOutcome(runQuery(query, sampleData as Parameters<typeof runQuery>[1]));
    onRun?.();
  }

  function applyModify(newQ: string) {
    setQuery(newQ);
    setOutcome(runQuery(newQ, sampleData as Parameters<typeof runQuery>[1]));
  }

  return (
    <Flex flexDirection="column" gap={12}>
      <DQLEditor
        value={query}
        onChange={(v) => setQuery(v ?? "")}
        style={{ minHeight: 100 }}
      />
      <Flex gap={8} alignItems="center">
        <Button variant="accent" disabled={!query.trim()} onClick={run}>
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
        <Flex flexDirection="column" gap={8}>
          {outcome.error ? (
            <MessageContainer variant="critical">
              <MessageContainer.Title>Query error</MessageContainer.Title>
              <MessageContainer.Description>{outcome.error}</MessageContainer.Description>
            </MessageContainer>
          ) : (
            <>
              <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                {outcome.records.length} record(s):
              </Paragraph>
              <ResultTable
                records={outcome.records}
                columns={outcome.columns}
                maxRows={100}
                onQueryModify={(action, fieldName, filterValue) => {
                  const base = query || "fetch logs";
                  applyModify(
                    action === "summarize"
                      ? `${base}\n| summarize count(), by:{${fieldName}}`
                      : action === "filter" && filterValue
                      ? `${base}\n| filter ${fieldName} ${filterValue}`
                      : base,
                  );
                }}
              />
            </>
          )}
        </Flex>
      )}
    </Flex>
  );
}

// ─── Keyboard shortcut wiring ─────────────────────────────────────────────────

function useCtrlEnter(fn: () => void) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") fn();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [fn]);
}

// ─── MCQ ──────────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;

function MCQPanel({
  mcq,
  queriesRan,
  onSolved,
}: {
  mcq: LogHuntMCQ;
  queriesRan: boolean;
  onSolved: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const exhausted = attempts >= MAX_ATTEMPTS;
  const locked = solved || exhausted;

  function submit() {
    if (!selected || locked) return;
    if (selected === mcq.correctAnswer) {
      setSolved(true);
      onSolved();
    } else {
      setAttempts((n) => n + 1);
      setSelected(null);
    }
  }

  return (
    <Surface
      style={{
        borderLeft: `3px solid ${
          solved
            ? Colors.Charts.Threshold.Good.Default
            : exhausted
            ? Colors.Charts.Threshold.Bad.Default
            : "transparent"
        }`,
        transition: "border-color 0.2s",
      }}
    >
      <Flex flexDirection="column" padding={16} gap={16}>
        <Flex alignItems="center" gap={12}>
          <Chip>Final Verdict</Chip>
          <Paragraph style={{ fontWeight: 600, margin: 0 }}>
            {mcq.question}
          </Paragraph>
          {attempts > 0 && !solved && !exhausted && (
            <Chip>{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} left</Chip>
          )}
        </Flex>

        {!queriesRan && !solved && (
          <MessageContainer variant="neutral">
            <MessageContainer.Title>Investigate first</MessageContainer.Title>
            <MessageContainer.Description>
              Run at least one query above before submitting your verdict.
            </MessageContainer.Description>
          </MessageContainer>
        )}

        <Flex flexDirection="column" gap={8}>
          {mcq.options.map((opt) => {
            const isSelected = selected === opt;
            const showCorrect = (solved || exhausted) && opt === mcq.correctAnswer;
            return (
              <Button
                key={opt}
                variant="default"
                onClick={() => {
                  if (!locked) setSelected(opt);
                }}
                style={{
                  justifyContent: "flex-start",
                  background: showCorrect
                    ? `${Colors.Charts.Threshold.Good.Default}22`
                    : isSelected
                    ? "rgba(127,127,127,0.15)"
                    : "transparent",
                  border: isSelected
                    ? `1px solid ${showCorrect ? Colors.Charts.Threshold.Good.Default : "rgba(127,127,127,0.4)"}`
                    : showCorrect
                    ? `1px solid ${Colors.Charts.Threshold.Good.Default}`
                    : "1px solid transparent",
                  cursor: locked ? "default" : "pointer",
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {showCorrect ? "✓ " : ""}{opt}
              </Button>
            );
          })}
        </Flex>

        {!locked && (
          <Button
            variant="accent"
            disabled={!selected || !queriesRan}
            onClick={submit}
          >
            Submit verdict
          </Button>
        )}

        {solved && (
          <MessageContainer variant="success">
            <MessageContainer.Title>Correct verdict!</MessageContainer.Title>
            <MessageContainer.Description>{mcq.explanation}</MessageContainer.Description>
          </MessageContainer>
        )}

        {!solved && attempts > 0 && attempts < MAX_ATTEMPTS && (
          <MessageContainer variant="warning">
            <MessageContainer.Title>Incorrect — keep investigating</MessageContainer.Title>
            <MessageContainer.Description>
              That wasn't the right answer. Review the data and try again — {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining.
            </MessageContainer.Description>
          </MessageContainer>
        )}

        {exhausted && !solved && (
          <MessageContainer variant="critical">
            <MessageContainer.Title>Out of attempts</MessageContainer.Title>
            <MessageContainer.Description>
              The correct answer was {mcq.correctAnswer}. {mcq.explanation}
            </MessageContainer.Description>
          </MessageContainer>
        )}
      </Flex>
    </Surface>
  );
}

// ─── Task card with hidden solution ──────────────────────────────────────────

function TaskCard({ index, question, solution }: { index: number; question: string; solution: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Flex flexDirection="column" gap={4}>
      <Paragraph style={{ fontSize: "0.85rem", fontWeight: 600, margin: 0 }}>
        {index + 1}. {question}
      </Paragraph>
      {revealed ? (
        <Flex flexDirection="column" gap={4}>
          <Code style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {solution}
          </Code>
          <Button
            variant="default"
            onClick={() => setRevealed(false)}
            style={{ alignSelf: "flex-start", fontSize: "0.75rem", padding: "2px 8px" }}
          >
            Hide solution
          </Button>
        </Flex>
      ) : (
        <Button
          variant="default"
          onClick={() => setRevealed(true)}
          style={{ alignSelf: "flex-start", fontSize: "0.75rem", padding: "2px 8px" }}
        >
          Show solution
        </Button>
      )}
    </Flex>
  );
}

// ─── LogHuntPlayer ────────────────────────────────────────────────────────────

export const LogHuntPlayer = () => {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const scenario = logHuntScenarios.find((s) => s.id === huntId);
  const [caseSolved, setCaseSolved] = useState(false);
  const [hintIndex, setHintIndex] = useState(-1);
  const [queriesRan, setQueriesRan] = useState(false);

  // Reset all player-level state when the hunt changes.
  // NOTE: QuerySandbox and MCQPanel also carry their own local state (query text,
  // selected answer, attempts). We force-remount them via key={huntId} so React
  // destroys and recreates those subtrees on navigation, fully clearing their state.
  useEffect(() => {
    setCaseSolved(false);
    setHintIndex(-1);
    setQueriesRan(false);
  }, [huntId]);

  const nextHuntIndex =
    logHuntScenarios.findIndex((s) => s.id === huntId) + 1;
  const nextHunt = logHuntScenarios[nextHuntIndex];

  const sampleData = useMemo(
    () => scenario?.tasks[0]?.sampleData ?? [],
    [scenario],
  );
  const fieldNames = useMemo(() => deriveFields(sampleData), [sampleData]);
  const hints = scenario?.hints ?? [];
  const hasMoreHints = hintIndex < hints.length - 1;

  if (!scenario) {
    return (
      <Flex flexDirection="column" padding={32} gap={12}>
        <Heading level={2}>Hunt not found</Heading>
        <Link as={RouterLink} to="/log-hunt">
          Back to Log Hunt
        </Link>
      </Flex>
    );
  }

  return (
    <Grid gridTemplateColumns="1fr 260px" gap={24} style={{ padding: 32 }} alignItems="start">
      {/* ── Main column ── */}
      <Flex flexDirection="column" gap={24}>
        {/* Header */}
        <Flex flexDirection="column" gap={6}>
          <Link as={RouterLink} to="/log-hunt">
            ← All hunts
          </Link>
          <Flex alignItems="center" gap={12} flexWrap="wrap">
            <Heading level={1}>
              {scenario.emoji} {scenario.title}
            </Heading>
            <Chip>{scenario.difficulty}</Chip>
            {caseSolved && <Chip color="success">Case closed</Chip>}
          </Flex>
        </Flex>

        <Divider />

        {/* Story */}
        <Surface>
          <Flex flexDirection="column" padding={16} gap={12}>
            <Heading level={3} style={{ margin: 0 }}>
              The Briefing
            </Heading>
            <Paragraph>{scenario.story}</Paragraph>
          </Flex>
        </Surface>

        {/* Investigation guide */}
        <Surface>
          <Flex flexDirection="column" padding={16} gap={12}>
            <Heading level={3} style={{ margin: 0 }}>
              Your Investigation
            </Heading>
            <Paragraph>{scenario.investigation}</Paragraph>
          </Flex>
        </Surface>

        <Divider />

        {/* Query sandbox — keyed by huntId so local state resets on navigation */}
        <QuerySandbox key={huntId} sampleData={sampleData} onRun={() => setQueriesRan(true)} />

        <Divider />

        {/* MCQ — keyed by huntId so selected/attempts/solved state resets on navigation */}
        <MCQPanel
          key={huntId}
          mcq={scenario.mcq}
          queriesRan={queriesRan}
          onSolved={() => {
            setCaseSolved(true);
            markHuntComplete(huntId!);
          }}
        />

        {/* Completion card */}
        {caseSolved && (
          <Surface>
            <Flex
              flexDirection="column"
              padding={16}
              gap={12}
              alignItems="center"
            >
              <Heading level={2} style={{ textAlign: "center" }}>
                Case closed! 🎉
              </Heading>
              <Paragraph style={{ textAlign: "center", opacity: 0.8 }}>
                You cracked <Strong>{scenario.title}</Strong>.
              </Paragraph>
              <Flex gap={12}>
                <Button
                  variant="default"
                  onClick={() => navigate("/log-hunt")}
                >
                  All hunts
                </Button>
                {nextHunt && (
                  <Button
                    variant="accent"
                    onClick={() => navigate(`/log-hunt/${nextHunt.id}`)}
                  >
                    Next: {nextHunt.emoji} {nextHunt.title} →
                  </Button>
                )}
              </Flex>
            </Flex>
          </Surface>
        )}
      </Flex>

      {/* ── Sidebar ── */}
      <Flex flexDirection="column" gap={16}>
        {/* Available fields */}
        <Surface>
          <Flex flexDirection="column" padding={16} gap={12}>
            <Strong>Available fields</Strong>
            <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>
              Fields you can query in fetch logs
            </Paragraph>
            <Flex flexDirection="column" gap={6}>
              {fieldNames.map((f) => (
                <Code key={f}>{f}</Code>
              ))}
              {fieldNames.length > 0 && (
                <Code>content</Code>
              )}
            </Flex>
          </Flex>
        </Surface>

        {/* Investigation tasks */}
        <Surface>
          <Flex flexDirection="column" padding={16} gap={12}>
            <Strong>Investigation tasks</Strong>
            <Paragraph style={{ fontSize: "0.78rem", opacity: 0.55, margin: 0 }}>
              Try to answer each question with a query before revealing the solution.
            </Paragraph>
            <Flex flexDirection="column" gap={16}>
              {scenario.tasks.map((task, i) => (
                <TaskCard key={task.id} index={i} question={task.question} solution={task.solution} />
              ))}
            </Flex>
          </Flex>
        </Surface>

        {/* Progressive hints */}
        {hints.length > 0 && (
          <Surface>
            <Flex flexDirection="column" padding={16} gap={12}>
              <Strong>Hints</Strong>
              {hintIndex >= 0 && (
                <Flex flexDirection="column" gap={8}>
                  {hints.slice(0, hintIndex + 1).map((h, i) => (
                    <Paragraph key={i} style={{ fontSize: "0.82rem", margin: 0, lineHeight: 1.5 }}>
                      {i + 1}. {h}
                    </Paragraph>
                  ))}
                </Flex>
              )}
              {hasMoreHints ? (
                <Button
                  variant="default"
                  onClick={() => setHintIndex((n) => n + 1)}
                >
                  {hintIndex < 0 ? "Show first hint" : "Show next hint"}
                </Button>
              ) : (
                hintIndex >= 0 && (
                  <Paragraph style={{ fontSize: "0.78rem", opacity: 0.5, margin: 0 }}>
                    All hints revealed.
                  </Paragraph>
                )
              )}
            </Flex>
          </Surface>
        )}

        {/* Disclaimer */}
        <Paragraph style={{ fontSize: "0.72rem", opacity: 0.35, margin: 0 }}>
          Free in-app simulation — no Dynatrace charges.
        </Paragraph>
      </Flex>
    </Grid>
  );
};
