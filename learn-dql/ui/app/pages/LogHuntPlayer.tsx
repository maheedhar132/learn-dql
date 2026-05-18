import React, { useState, useEffect } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import { Flex, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
  Link,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { logHuntScenarios, type LogHuntMCQ } from "../lib/dql/log-hunt-scenarios";
import { runQuery } from "../lib/validate";
import { ResultTable } from "../components/ResultTable";
import type { RunOutcome } from "../lib/validate";

// ─── Free-form query sandbox ──────────────────────────────────────────────────

function QuerySandbox({ sampleData }: { sampleData: ReturnType<typeof runQuery>["records"] }) {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  // sampleData is actually DQLRecord[] — keep param typed simply
  function run() {
    setOutcome(runQuery(query, sampleData as Parameters<typeof runQuery>[1]));
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
      <Flex gap={8}>
        <Button variant="accent" onClick={run}>Run query</Button>
      </Flex>
      {outcome && (
        <Flex flexDirection="column" gap={4}>
          {outcome.error ? (
            <Paragraph style={{ color: Colors.Charts.Threshold.Bad.Default, fontSize: "0.875rem" }}>
              {outcome.error}
            </Paragraph>
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
                  applyModify(action === "summarize"
                    ? `${base}\n| summarize count(), by:{${fieldName}}`
                    : action === "filter" && filterValue
                    ? `${base}\n| filter ${fieldName} ${filterValue}`
                    : base);
                }}
              />
            </>
          )}
        </Flex>
      )}
    </Flex>
  );
}

// ─── MCQ ──────────────────────────────────────────────────────────────────────

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
          : wrong   ? Colors.Charts.Threshold.Bad.Default
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
            const isWrongOpt   = submitted && isSelected && opt !== mcq.correctAnswer;
            return (
              <Button
                key={opt}
                variant="default"
                onClick={() => { if (!submitted) setSelected(opt); }}
                style={{
                  justifyContent: "flex-start",
                  background: isCorrectOpt ? `${Colors.Charts.Threshold.Good.Default}22`
                    : isWrongOpt ? `${Colors.Charts.Threshold.Bad.Default}22`
                    : isSelected ? "rgba(127,127,127,0.15)"
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
          <Paragraph style={{
            color: correct ? Colors.Charts.Threshold.Good.Default : Colors.Charts.Threshold.Bad.Default,
            fontSize: "0.9rem",
          }}>
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
  const [caseSolved, setCaseSolved] = useState(false);

  useEffect(() => { setCaseSolved(false); }, [huntId]);

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

  // Collect all sample data across tasks (they share the same dataset per hunt)
  const sampleData = scenario.tasks[0]?.sampleData ?? [];

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <Flex flexDirection="column" gap={6}>
        <Link as={RouterLink} to="/log-hunt">← All hunts</Link>
        <Flex alignItems="center" gap={12}>
          <Heading level={1}>{scenario.emoji} {scenario.title}</Heading>
          <Chip>{scenario.difficulty}</Chip>
          {caseSolved && <Chip color="success">Case closed</Chip>}
        </Flex>
      </Flex>

      <Divider />

      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          <Heading level={3} style={{ margin: 0 }}>The Briefing</Heading>
          <Paragraph>{scenario.story}</Paragraph>
        </Flex>
      </Surface>

      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          <Heading level={3} style={{ margin: 0 }}>Your Investigation</Heading>
          <Paragraph>{scenario.investigation}</Paragraph>
        </Flex>
      </Surface>

      <Divider />

      <QuerySandbox sampleData={sampleData} />

      <Divider />

      <MCQPanel mcq={scenario.mcq} onSolved={() => setCaseSolved(true)} />

      {caseSolved && (
        <Surface>
          <Flex flexDirection="column" padding={16} gap={12} alignItems="center">
            <Heading level={2} style={{ textAlign: "center" }}>Case closed! 🎉</Heading>
            <Paragraph style={{ textAlign: "center", opacity: 0.8 }}>
              You cracked <Strong>{scenario.title}</Strong>.
            </Paragraph>
            <Flex gap={12}>
              <Button variant="default" onClick={() => navigate("/log-hunt")}>All hunts</Button>
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
