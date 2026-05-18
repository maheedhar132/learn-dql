import React, { useMemo, useState, useEffect } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
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
  pipelineToQuery,
  type ValidationResult,
} from "../lib/validate";
import { markStepComplete } from "../lib/progress";
import { ResultTable } from "../components/ResultTable";

export const CasePlayer = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const scenario = useMemo(
    () => ALL_SCENARIOS.find((s) => s.id === caseId),
    [caseId],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const step = scenario?.steps[stepIndex];

  // Reset per-step UI when navigating between steps.
  useEffect(() => {
    setQuery("");
    setResult(null);
    setShowHint(false);
    setShowSolution(false);
  }, [stepIndex, caseId]);

  if (!scenario || !step) {
    return (
      <Flex flexDirection="column" padding={32} gap={12}>
        <Heading level={2}>Case not found</Heading>
        <Link as={RouterLink} to="/learn">
          Back to Learn
        </Link>
      </Flex>
    );
  }

  const isDqlStep = (step.expectedPipeline?.length ?? 0) > 0;
  const passed = result?.passed ?? false;
  const isLastStep = stepIndex === scenario.steps.length - 1;

  function onRun() {
    if (!step || !scenario) return;
    const v = validateStep(query, step.expectedPipeline, step.sampleData);
    setResult(v);
    if (v.passed) {
      markStepComplete(scenario.id, stepIndex, scenario.steps.length);
    }
  }

  function onQueryModify(
    action: "summarize" | "filter",
    fieldName: string,
    filterValue?: string,
  ) {
    if (action === "filter" && filterValue) {
      const newQuery = query
        ? `${query} | filter ${fieldName} ${filterValue}`
        : `fetch logs | filter ${fieldName} ${filterValue}`;
      setQuery(newQuery);
    } else if (action === "summarize") {
      const newQuery = query
        ? `${query} | summarize count = count(), by:{${fieldName}}`
        : `fetch logs | summarize count = count(), by:{${fieldName}}`;
      setQuery(newQuery);
    }
  }

  return (
    <Flex flexDirection="column" padding={32} gap={20}>
      <Flex flexDirection="column" gap={4}>
        <Link as={RouterLink} to="/learn">
          ← All cases
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
          <Button
            variant="accent"
            disabled={!passed || isLastStep}
            onClick={() => setStepIndex((i) => i + 1)}
          >
            Next step
          </Button>
        </Flex>
      </Flex>

      <Surface>
        <Flex flexDirection="column" padding={16} gap={8}>
          <Paragraph>{step.narration}</Paragraph>
          <Paragraph>
            <Strong>Lesson:</Strong> {step.lesson}
          </Paragraph>
          <Paragraph>
            <Strong>Goal:</Strong> {step.goal}
          </Paragraph>
        </Flex>
      </Surface>

      {isDqlStep ? (
        <>
          <DQLEditor value={query} onChange={(v) => setQuery(v)} />
          <Flex gap={8} alignItems="center">
            <Button variant="accent" onClick={onRun}>
              Run query
            </Button>
            <Button onClick={() => setShowHint(true)}>Hint</Button>
            <Button onClick={() => setShowSolution(true)}>Show solution</Button>
          </Flex>

          {showHint && (
            <Surface>
              <Flex padding={12} flexDirection="column" gap={4}>
                <Strong>Hint</Strong>
                <Paragraph>{step.hint}</Paragraph>
              </Flex>
            </Surface>
          )}

          {showSolution && (
            <Surface>
              <Flex padding={12} flexDirection="column" gap={4}>
                <Strong>Reference solution</Strong>
                <Code>{pipelineToQuery(step.expectedPipeline)}</Code>
              </Flex>
            </Surface>
          )}

          {result && (
            <Flex
              flexDirection="column"
              gap={12}
              padding={12}
              style={{
                borderRadius: 4,
                background: result.passed
                  ? Colors.Background.Container.Success.Default
                  : Colors.Background.Container.Critical.Default,
              }}
            >
              <Strong>{result.message}</Strong>
              <Paragraph>
                Your result ({result.userOutcome.records.length} records):
              </Paragraph>
              <ResultTable
                records={result.userOutcome.records}
                columns={result.userOutcome.columns}
                onQueryModify={onQueryModify}
              />
            </Flex>
          )}
        </>
      ) : (
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
            <Paragraph>
              Interactive DPL pattern validation is wired into the engine
              (lib/dpl) and will be enabled in this view next.
            </Paragraph>
          </Flex>
        </Surface>
      )}
    </Flex>
  );
};
