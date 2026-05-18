import React, { useState, useEffect } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import { Flex, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
  Link,
  Code,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { logHuntScenarios, type LogHuntTask, type LogHuntMCQ } from "../lib/dql/log-hunt-scenarios";
import { runQuery } from "../lib/validate";
import { ResultTable } from "../components/ResultTable";
import type { RunOutcome } from "../lib/validate";

// ─── Task panel (exploratory — no pass/fail) ──────────────────────────────────

interface TaskState {
  query: string;
  outcome: RunOutcome | null;
  showSolution: boolean;
}

function emptyTask(): TaskState {
  return { query: "", outcome: null, showSolution: false };
}

function TaskPanel({
  task,
  index,
  state,
  onChange,
}: {
  task: LogHuntTask;
  index: number;
  state: TaskState;
  onChange: (next: TaskState) => void;
}) {
  function run() {
    const outcome = runQuery(state.query, task.sampleData);
    onChange({ ...state, outcome });
  }

  return (
    <Surface>
      <Flex flexDirection="column" padding={16} gap={12}>
        <Flex alignItems="center" gap={12}>
          <Chip>Task {index + 1}</Chip>
          <Paragraph style={{ fontWeight: 600, margin: 0 }}>{task.question}</Paragraph>
        </Flex>

        <DQLEditor
          value={state.query}
          onChange={(v) => onChange({ ...state, query: v ?? "" })}
          style={{ minHeight: 72 }}
        />

        <Flex gap={8} alignItems="center">
          <Button variant="accent" onClick={run}>
            Run query
          </Button>
          <Button
            variant="default"
            onClick={() => onChange({ ...state, showSolution: !state.showSolution })}
          >
            {state.showSolution ? "Hide solution" : "Show solution"}
          </Button>
        </Flex>

        {state.showSolution && (
          <Paragraph style={{ fontSize: "0.875rem", opacity: 0.8 }}>
            Solution: <Code>{task.solution}</Code>
          </Paragraph>
        )}

        {state.outcome && (
          <Flex flexDirection="column" gap={4}>
            {state.outcome.error ? (
              <Paragraph style={{ color: Colors.Charts.Threshold.Bad.Default, fontSize: "0.875rem" }}>
                {state.outcome.error}
              </Paragraph>
            ) : (
              <>
                <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                  {state.outcome.records.length} record(s):
                </Paragraph>
                <ResultTable
                  records={state.outcome.records}
                  columns={state.outcome.columns}
                  maxRows={50}
                  onQueryModify={(action, fieldName) => {
                    const base = state.query || "fetch logs";
                    const newQ = action === "summarize"
                      ? `${base} | summarize count(), by:{${fieldName}}`
                      : base;
                    const newOutcome = runQuery(newQ, task.sampleData);
                    onChange({ ...state, query: newQ, outcome: newOutcome });
                  }}
                />
              </>
            )}
          </Flex>
        )}
      </Flex>
    </Surface>
  );
}

// ─── MCQ component ────────────────────────────────────────────────────────────

function MCQPanel({ mcq, onSolved }: { mcq: LogHuntMCQ; onSolved: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = submitted && selected === mcq.correctAnswer;
  const wrong = submitted && selected !== mcq.correctAnswer;

  function submit() {
    if (!selected) return;
    setSubmitted(true);
    if (selected === mcq.correctAnswer) onSolved();
  }

  return (
    <Surface
      style={{
        borderLeft: `3px solid ${
          correct ? Colors.Charts.Threshold.Good.Default
          : wrong ? Colors.Charts.Threshold.Bad.Default
          : "transparent"
        }`,
        transition: "border-color 0.2s",
      }}
    >
      <Flex flexDirection="column" padding={16} gap={16}>
        <Flex alignItems="center" gap={12}>
          <Chip>Final Verdict</Chip>
          <Paragraph style={{ fontWeight: 600, margin: 0 }}>{mcq.question}</Paragraph>
        </Flex>

        <Flex flexDirection="column" gap={8}>
          {mcq.options.map((opt) => {
            const isSelected = selected === opt;
            const isCorrectOpt = submitted && opt === mcq.correctAnswer;
            const isWrongOpt = submitted && isSelected && opt !== mcq.correctAnswer;
            return (
              <Button
                key={opt}
                variant="default"
                onClick={() => { if (!submitted) setSelected(opt); }}
                style={{
                  justifyContent: "flex-start",
                  background: isCorrectOpt
                    ? `${Colors.Charts.Threshold.Good.Default}22`
                    : isWrongOpt
                    ? `${Colors.Charts.Threshold.Bad.Default}22`
                    : isSelected
                    ? "rgba(127,127,127,0.15)"
                    : "transparent",
                  border: isSelected
                    ? `1px solid ${isCorrectOpt ? Colors.Charts.Threshold.Good.Default : isWrongOpt ? Colors.Charts.Threshold.Bad.Default : "rgba(127,127,127,0.4)"}`
                    : "1px solid transparent",
                  cursor: submitted ? "default" : "pointer",
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {isCorrectOpt ? "✓ " : isWrongOpt ? "✗ " : ""}{opt}
              </Button>
            );
          })}
        </Flex>

        {!submitted && (
          <Button variant="accent" disabled={!selected} onClick={submit}>
            Submit verdict
          </Button>
        )}

        {submitted && (
          <Paragraph
            style={{
              color: correct ? Colors.Charts.Threshold.Good.Default : Colors.Charts.Threshold.Bad.Default,
              fontSize: "0.9rem",
            }}
          >
            {correct ? "✓ Correct! " : "✗ Wrong. "}{mcq.explanation}
          </Paragraph>
        )}
      </Flex>
    </Surface>
  );
}

// ─── LogHuntPlayer ────────────────────────────────────────────────────────────

export const LogHuntPlayer = () => {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const scenario = logHuntScenarios.find((s) => s.id === huntId);

  const [taskStates, setTaskStates] = useState<TaskState[]>(() =>
    scenario ? scenario.tasks.map(emptyTask) : [],
  );
  const [caseSolved, setCaseSolved] = useState(false);

  useEffect(() => {
    if (scenario) {
      setTaskStates(scenario.tasks.map(emptyTask));
      setCaseSolved(false);
    }
  }, [huntId]);

  if (!scenario) {
    return (
      <Flex flexDirection="column" padding={32} gap={12}>
        <Heading level={2}>Hunt not found</Heading>
        <Link as={RouterLink} to="/log-hunt">Back to Log Hunt</Link>
      </Flex>
    );
  }

  const nextHuntIndex = logHuntScenarios.findIndex((s) => s.id === huntId) + 1;
  const nextHunt = logHuntScenarios[nextHuntIndex];

  function updateTask(i: number, next: TaskState) {
    setTaskStates((prev) => prev.map((s, idx) => (idx === i ? next : s)));
  }

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      {/* Back + header */}
      <Flex flexDirection="column" gap={6}>
        <Link as={RouterLink} to="/log-hunt">← All hunts</Link>
        <Flex alignItems="center" gap={12}>
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
          <Heading level={3} style={{ margin: 0 }}>The Briefing</Heading>
          <Paragraph>{scenario.story}</Paragraph>
        </Flex>
      </Surface>

      {/* Investigation guidance */}
      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          <Heading level={3} style={{ margin: 0 }}>Your Investigation</Heading>
          <Paragraph>{scenario.investigation}</Paragraph>
        </Flex>
      </Surface>

      <Divider />

      {/* Exploratory task panels */}
      <Flex flexDirection="column" gap={16}>
        {scenario.tasks.map((task, i) => (
          <TaskPanel
            key={task.id}
            task={task}
            index={i}
            state={taskStates[i]}
            onChange={(next) => updateTask(i, next)}
          />
        ))}
      </Flex>

      <Divider />

      {/* Final MCQ */}
      <MCQPanel mcq={scenario.mcq} onSolved={() => setCaseSolved(true)} />

      {/* Case closed footer */}
      {caseSolved && (
        <Surface>
          <Flex flexDirection="column" padding={16} gap={12} alignItems="center">
            <Heading level={2} style={{ textAlign: "center" }}>Case closed! 🎉</Heading>
            <Paragraph style={{ textAlign: "center", opacity: 0.8 }}>
              You cracked <Strong>{scenario.title}</Strong>.
            </Paragraph>
            <Flex gap={12}>
              <Button variant="default" onClick={() => navigate("/log-hunt")}>
                All hunts
              </Button>
              {nextHunt && (
                <Button variant="accent" onClick={() => navigate(`/log-hunt/${nextHunt.id}`)}>
                  Next: {nextHunt.emoji} {nextHunt.title} →
                </Button>
              )}
            </Flex>
          </Flex>
        </Surface>
      )}
    </Flex>
  );
};
