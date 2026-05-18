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
import { logHuntScenarios, type LogHuntTask } from "../lib/dql/log-hunt-scenarios";
import { runQuery, validateStep, pipelineToQuery } from "../lib/validate";
import { ResultTable } from "../components/ResultTable";
import type { ValidationResult } from "../lib/validate";

// ─── Per-task editor state ───────────────────────────────────────────────────

interface TaskState {
  query: string;
  result: ValidationResult | null;
  showHint: boolean;
  showSolution: boolean;
}

function emptyTaskState(): TaskState {
  return { query: "", result: null, showHint: false, showSolution: false };
}

// ─── Single task panel ────────────────────────────────────────────────────────

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
  const passed = state.result?.passed ?? false;

  function run() {
    const v = validateStep(state.query, task.expectedPipeline, task.sampleData);
    onChange({ ...state, result: v });
  }

  function runExploration(q: string) {
    const outcome = runQuery(q, task.sampleData);
    onChange({
      ...state,
      query: q,
      result: {
        passed: false,
        message: `Exploring`,
        userOutcome: outcome,
        expectedOutcome: { records: [], columns: [] },
      },
    });
  }

  const solution = pipelineToQuery(task.expectedPipeline);

  const borderColor = passed
    ? Colors.Background.Container.Success.Default
    : state.result && !passed
    ? Colors.Charts.Threshold.Bad.Default
    : "transparent";

  return (
    <Surface
      style={{
        borderLeft: `3px solid ${borderColor}`,
        transition: "border-color 0.2s",
      }}
    >
      <Flex flexDirection="column" padding={16} gap={12}>
        {/* Task header */}
        <Flex alignItems="center" gap={12}>
          <Chip color={passed ? "success" : "neutral"}>
            {passed ? "✓ Solved" : `Task ${index + 1}`}
          </Chip>
          <Paragraph style={{ fontWeight: 600, margin: 0 }}>{task.question}</Paragraph>
        </Flex>

        {/* Query editor */}
        <DQLEditor
          value={state.query}
          onChange={(v) => onChange({ ...state, query: v ?? "" })}
          style={{ minHeight: 72 }}
        />

        {/* Action row */}
        <Flex gap={8} alignItems="center">
          <Button variant="accent" onClick={run}>
            Run query
          </Button>
          <Button
            variant="default"
            onClick={() => onChange({ ...state, showHint: !state.showHint })}
          >
            {state.showHint ? "Hide hint" : "Hint"}
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onChange({ ...state, showSolution: !state.showSolution });
            }}
          >
            {state.showSolution ? "Hide solution" : "Show solution"}
          </Button>
        </Flex>

        {state.showHint && (
          <Paragraph style={{ opacity: 0.7, fontSize: "0.875rem" }}>
            Hint: <Code>{task.hint}</Code>
          </Paragraph>
        )}
        {state.showSolution && (
          <Paragraph style={{ fontSize: "0.875rem" }}>
            Solution: <Code>{solution}</Code>
          </Paragraph>
        )}

        {/* Result feedback */}
        {state.result && (
          <Flex flexDirection="column" gap={8}>
            <Paragraph
              style={{
                color: passed
                  ? Colors.Background.Container.Success.Default
                  : state.result.message.startsWith("Exploring")
                  ? undefined
                  : Colors.Charts.Threshold.Bad.Default,
                fontWeight: 500,
                fontSize: "0.875rem",
              }}
            >
              {passed ? "✓ Correct — your result matches the expected output." : state.result.message}
            </Paragraph>

            {state.result.userOutcome.records.length > 0 && (
              <Flex flexDirection="column" gap={4}>
                <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                  Your result ({state.result.userOutcome.records.length} records):
                </Paragraph>
                <ResultTable
                  records={state.result.userOutcome.records}
                  columns={state.result.userOutcome.columns}
                  maxRows={50}
                  onQueryModify={(action, fieldName) => {
                    const base = state.query || "fetch logs";
                    const newQ = action === "summarize"
                      ? `${base} | summarize count(), by:{${fieldName}}`
                      : base;
                    runExploration(newQ);
                  }}
                />
              </Flex>
            )}
          </Flex>
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
    scenario ? scenario.tasks.map(emptyTaskState) : [],
  );

  // Reset if scenario changes
  useEffect(() => {
    if (scenario) setTaskStates(scenario.tasks.map(emptyTaskState));
  }, [huntId]);

  if (!scenario) {
    return (
      <Flex flexDirection="column" padding={32} gap={12}>
        <Heading level={2}>Hunt not found</Heading>
        <Link as={RouterLink} to="/log-hunt">Back to Log Hunt</Link>
      </Flex>
    );
  }

  const solvedCount = taskStates.filter((s) => s.result?.passed).length;
  const allSolved = solvedCount === scenario.tasks.length;

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
          {allSolved && <Chip color="success">All solved</Chip>}
        </Flex>
        <Paragraph style={{ opacity: 0.6, fontSize: "0.85rem" }}>
          {solvedCount} / {scenario.tasks.length} tasks solved
        </Paragraph>
      </Flex>

      <Divider />

      {/* Story block */}
      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          <Heading level={3} style={{ margin: 0 }}>The Briefing</Heading>
          <Paragraph>{scenario.story}</Paragraph>
        </Flex>
      </Surface>

      {/* Investigation block */}
      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          <Heading level={3} style={{ margin: 0 }}>Your Investigation</Heading>
          <Paragraph>{scenario.investigation}</Paragraph>
        </Flex>
      </Surface>

      <Divider />

      {/* Task panels */}
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

      {/* Completion footer */}
      {allSolved && (
        <Surface>
          <Flex flexDirection="column" padding={20} gap={12} alignItems="center">
            <Heading level={2} style={{ textAlign: "center" }}>
              Case closed! 🎉
            </Heading>
            <Paragraph style={{ textAlign: "center", opacity: 0.8 }}>
              You solved all {scenario.tasks.length} tasks in{" "}
              <Strong>{scenario.title}</Strong>.
            </Paragraph>
            <Flex gap={12}>
              <Button variant="default" onClick={() => navigate("/log-hunt")}>
                All hunts
              </Button>
              {nextHunt && (
                <Button
                  variant="accent"
                  onClick={() => navigate(`/log-hunt/${nextHunt.id}`)}
                >
                  Next hunt: {nextHunt.emoji} {nextHunt.title} →
                </Button>
              )}
            </Flex>
          </Flex>
        </Surface>
      )}
    </Flex>
  );
};
