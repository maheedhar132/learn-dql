import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Flex, Grid, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
  Link,
} from "@dynatrace/strato-components/typography";
import { Chip } from "@dynatrace/strato-components/content";
import { TextInput } from "@dynatrace/strato-components/forms";
import { Button } from "@dynatrace/strato-components/buttons";
import { ALL_SCENARIOS } from "../lib/dql";
import { getProgress } from "../lib/progress";
import type { Scenario } from "../lib/types/dql";

const TRACK_ORDER: { key: string; title: string; blurb: string }[] = [
  { key: "onboarding", title: "Onboarding", blurb: "New to DQL? Start here — 6 short lessons covering the fundamentals." },
  { key: "dql", title: "DQL", blurb: "Query, filter, aggregate and shape Grail data." },
];

const FIRST_LESSON_ID = ALL_SCENARIOS[0]?.id;

const CaseCard = ({
  scenario,
  done,
}: {
  scenario: Scenario;
  done: boolean;
}) => (
  <Surface>
    <Flex flexDirection="column" padding={16} gap={8} style={{ height: "100%" }}>
      <Flex justifyContent="space-between" alignItems="center" gap={8}>
        <Chip>{scenario.difficulty}</Chip>
        {done && <Chip color="success">Completed</Chip>}
      </Flex>
      <Link as={RouterLink} to={`/learn/${scenario.id}`}>
        <Strong>{scenario.title}</Strong>
      </Link>
      <Paragraph>{scenario.company}</Paragraph>
      <Paragraph>
        {scenario.briefing.length > 140
          ? `${scenario.briefing.slice(0, 140)}…`
          : scenario.briefing}
      </Paragraph>
      <Paragraph>{scenario.steps.length} lesson step{scenario.steps.length !== 1 ? "s" : ""}</Paragraph>
    </Flex>
  </Surface>
);

export const Learn = () => {
  const completed = useMemo(() => new Set(getProgress().completedCases), []);
  const isFirstVisit = completed.size === 0;
  const [search, setSearch] = useState("");

  const filterScenarios = (list: Scenario[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.briefing.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q),
    );
  };

  return (
    <Flex flexDirection="column" padding={32} gap={32}>
      <Flex flexDirection="column" gap={8}>
        <Heading level={1}>Lessons</Heading>
        <Paragraph>
          {ALL_SCENARIOS.length} lessons · {completed.size} completed
        </Paragraph>
      </Flex>

      {isFirstVisit && FIRST_LESSON_ID && (
        <Surface>
          <Flex padding={20} gap={16} alignItems="center" justifyContent="space-between">
            <Flex flexDirection="column" gap={4}>
              <Strong>New here? Start with the Onboarding track</Strong>
              <Paragraph>
                Six short lessons that take you from "what is a log?" to writing your first grouped query — no Dynatrace experience needed.
              </Paragraph>
            </Flex>
            <Button
              variant="accent"
              as={RouterLink}
              to={`/learn/${FIRST_LESSON_ID}`}
            >
              Start learning →
            </Button>
          </Flex>
        </Surface>
      )}

      <TextInput
        placeholder="Search lessons by title, topic, or company…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {TRACK_ORDER.map((track) => {
        const cases = filterScenarios(
          ALL_SCENARIOS.filter((s) => (s.track ?? "dql") === track.key),
        );
        if (cases.length === 0) return null;
        return (
          <Flex key={track.key} flexDirection="column" gap={12}>
            <Flex flexDirection="column" gap={2}>
              <Heading level={2}>
                {track.title} ({cases.length})
              </Heading>
              <Paragraph>{track.blurb}</Paragraph>
            </Flex>
            <Divider />
            <Grid gridTemplateColumns="repeat(3, 1fr)" gap={16}>
              {cases.map((s) => (
                <CaseCard
                  key={s.id}
                  scenario={s}
                  done={completed.has(s.id)}
                />
              ))}
            </Grid>
          </Flex>
        );
      })}

      {search.trim() &&
        TRACK_ORDER.every(
          (t) =>
            filterScenarios(ALL_SCENARIOS.filter((s) => (s.track ?? "dql") === t.key))
              .length === 0,
        ) && (
          <Paragraph>No lessons match "{search}".</Paragraph>
        )}
    </Flex>
  );
};
