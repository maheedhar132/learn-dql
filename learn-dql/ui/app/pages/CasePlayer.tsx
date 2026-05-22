import React, { useMemo, useState, useEffect } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import { Flex, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
  Code,
  Link,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { DQLEditor } from "@dynatrace/strato-components-preview/editors";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { ALL_SCENARIOS } from "../lib/dql";
import {
  validateStep,
  runQuery,
  pipelineToQuery,
  type ValidationResult,
} from "../lib/validate";
import { markStepComplete } from "../lib/progress";
import { ResultTable } from "../components/ResultTable";

export const CasePlayer = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const scenarioIndex = useMemo(
    () => ALL_SCENARIOS.findIndex((s) => s.id === caseId),
    [caseId],
  );
  const scenario = scenarioIndex >= 0 ? ALL_SCENARIOS[scenarioIndex] : undefined;
  const nextScenario = scenarioIndex >= 0 ? ALL_SCENARIOS[scenarioIndex + 1] : undefined;

  const [stepIndex, setStepIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isExploration, setIsExploration] = useState(false);

  const step = scenario?.steps[stepIndex];

  useEffect(() => {
    setQuery("");
    setResult(null);
    setIsExploration(false);
  }, [stepIndex, caseId]);

  if (!scenario || !step) {
    return (
      <Flex flexDirection="column" padding={32} gap={12}>
        <Heading level={2}>Lesson not found</Heading>
        <Link as={RouterLink} to="/learn">
          Back to Learn
        </Link>
      </Flex>
    );
  }

  const isDqlStep = (step.expectedPipeline?.length ?? 0) > 0;
  const isDplStep = !isDqlStep && !!step.dpl;
  // Concept-only steps (no editor) auto-pass so Next step is always enabled.
  const passed = !isDqlStep || (result?.passed ?? false);
  const isLastStep = stepIndex === scenario.steps.length - 1;

  function markAndAdvance(fn: () => void) {
    if (!isDqlStep) markStepComplete(scenario!.id, stepIndex, scenario!.steps.length);
    fn();
  }

  function runWithQuery(q: string) {
    if (!step || !scenario) return;
    setIsExploration(false);
    const v = validateStep(q, step.expectedPipeline, step.sampleData);
    setResult(v);
    if (v.passed) markStepComplete(scenario.id, stepIndex, scenario.steps.length);
  }

  function onQueryModify(
    action: "summarize" | "filter",
    fieldName: string,
    filterValue?: string,
  ) {
    if (!step) return;
    let newQuery: string;
    if (action === "filter" && filterValue) {
      newQuery = query
        ? `${query}\n| filter ${fieldName} ${filterValue}`
        : `fetch logs\n| filter ${fieldName} ${filterValue}`;
    } else if (action === "summarize") {
      newQuery = query
        ? `${query}\n| summarize count(), by:{${fieldName}}`
        : `fetch logs\n| summarize count(), by:{${fieldName}}`;
    } else {
      return;
    }
    setQuery(newQuery);
    const outcome = runQuery(newQuery, step.sampleData);
    setIsExploration(true);
    setResult({
      passed: false,
      message: `Exploring: ${newQuery}`,
      userOutcome: outcome,
      expectedOutcome: { records: [], columns: [] },
    });
  }

  return (
    <Flex flexDirection="column" padding={32} gap={20}>
      <Flex flexDirection="column" gap={4}>
        <Link as={RouterLink} to="/learn">
          ← All lessons
        </Link>
        <Flex alignItems="center" gap={12}>
          <Heading level={1}>{scenario.title}</Heading>
          <Chip>{scenario.difficulty}</Chip>
        </Flex>
        <Paragraph>
          <Strong>{scenario.company}</Strong> — {scenario.briefing}
        </Paragraph>
      </Flex>

      <Divider />

      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={3}>
          Step {stepIndex + 1} / {scenario.steps.length}: {step.title}
        </Heading>
        <Flex gap={8}>
          <Button
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => i - 1)}
          >
            Previous
          </Button>
          {isLastStep ? (
            <Button
              variant="accent"
              disabled={!passed || !nextScenario}
              onClick={() => markAndAdvance(() => nextScenario && navigate(`/learn/${nextScenario.id}`))}
            >
              {nextScenario ? "Next lesson →" : "All done!"}
            </Button>
          ) : (
            <Button
              variant="accent"
              disabled={!passed}
              onClick={() => markAndAdvance(() => setStepIndex((i) => i + 1))}
            >
              Next step
            </Button>
          )}
        </Flex>
      </Flex>

      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          <Flex alignItems="center" gap={8}>
            <Chip>Lesson</Chip>
            <Strong>{step.lesson}</Strong>
          </Flex>
          <Paragraph style={{ lineHeight: 1.6 }}>{step.narration}</Paragraph>
          <Paragraph>
            <Strong>Goal: </Strong>{step.goal}
          </Paragraph>
          {isDqlStep && (
            <Flex flexDirection="column" gap={6}>
              <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>
                Reference query — try writing it yourself in the editor below, or use Fill example:
              </Paragraph>
              <Code>{pipelineToQuery(step.expectedPipeline)}</Code>
            </Flex>
          )}
          {!isDqlStep && step.referenceQuery && (
            <Flex flexDirection="column" gap={6}>
              <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>
                Reference query (conceptual — not validated in the offline engine):
              </Paragraph>
              <Code>{step.referenceQuery}</Code>
            </Flex>
          )}
          <Paragraph style={{ fontSize: "0.75rem", opacity: 0.4, margin: 0 }}>
            Runs on an offline simulation engine with sample data. Results may differ from live Dynatrace Grail.
          </Paragraph>
        </Flex>
      </Surface>

      {isDqlStep ? (
        <>
          <DQLEditor value={query} onChange={(v) => setQuery(v)} />
          <Flex gap={8} alignItems="center">
            <Button variant="accent" onClick={() => runWithQuery(query)}>
              Run query
            </Button>
            <Button onClick={() => setQuery(pipelineToQuery(step.expectedPipeline))}>
              Fill example
            </Button>
          </Flex>

          {result && (
            <Flex flexDirection="column" gap={12}>
              <Flex
                flexDirection="column"
                gap={12}
                padding={12}
                style={{
                  borderRadius: 4,
                  background: isExploration
                    ? Colors.Background.Container.Neutral.Default
                    : result.passed
                    ? Colors.Background.Container.Success.Default
                    : Colors.Background.Container.Critical.Default,
                }}
              >
                <Strong>{result.message}</Strong>
                <Paragraph>
                  {isExploration ? "Result" : "Your result"} ({result.userOutcome.records.length} records):
                </Paragraph>
                <ResultTable
                  records={result.userOutcome.records}
                  columns={result.userOutcome.columns}
                  onQueryModify={onQueryModify}
                />
              </Flex>

              {!result.passed && !isExploration && result.expectedOutcome.records.length > 0 && (
                <Flex
                  flexDirection="column"
                  gap={12}
                  padding={12}
                  style={{
                    borderRadius: 4,
                    background: Colors.Background.Container.Neutral.Default,
                  }}
                >
                  <Strong>Expected result ({result.expectedOutcome.records.length} records):</Strong>
                  <ResultTable
                    records={result.expectedOutcome.records}
                    columns={result.expectedOutcome.columns}
                    onQueryModify={onQueryModify}
                  />
                </Flex>
              )}
            </Flex>
          )}
        </>
      ) : isDplStep ? (
        <Surface>
          <Flex flexDirection="column" padding={16} gap={8}>
            <Strong>Dynatrace Pattern Language exercise</Strong>
            <Paragraph>Sample input lines:</Paragraph>
            {step.dpl?.inputs.map((line, i) => (
              <Code key={i}>{line}</Code>
            ))}
            <Paragraph>
              <Strong>Expected pattern:</Strong>
            </Paragraph>
            <Code>{step.dpl?.expectedPattern}</Code>
            <Paragraph>
              <Strong>Fields extracted:</Strong>{" "}
              {step.dpl?.expectedFields.join(", ")}
            </Paragraph>
          </Flex>
        </Surface>
      ) : null}
    </Flex>
  );
};
