import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Flex, Grid, Surface } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { ALL_SCENARIOS } from "../lib/dql";

interface Stat {
  label: string;
  value: string;
}

export const Home = () => {
  const stats: Stat[] = useMemo(() => {
    const byTrack = (t: string) =>
      ALL_SCENARIOS.filter((s) => s.track === t).length;
    return [
      { label: "Guided cases", value: String(ALL_SCENARIOS.length) },
      { label: "Onboarding", value: String(byTrack("onboarding")) },
      { label: "DQL", value: String(byTrack("dql")) },
      { label: "DPL", value: String(byTrack("dpl")) },
    ];
  }, []);

  return (
    <Flex flexDirection="column" alignItems="center" padding={32} gap={24}>
      <img
        src="./assets/Dynatrace_Logo.svg"
        alt="Dynatrace Logo"
        width={96}
        height={96}
      />
      <Heading level={1}>Learn DQL</Heading>
      <Paragraph style={{ maxWidth: 640, textAlign: "center" }}>
        Master the <Strong>Dynatrace Query Language</Strong> and{" "}
        <Strong>Dynatrace Pattern Language</Strong> through hands-on, step-by-step
        cases. Write real queries; each step is validated by comparing your
        result to a reference — any correct query passes.
      </Paragraph>

      <Grid gridTemplateColumns="repeat(4, 1fr)" gap={16}>
        {stats.map((s) => (
          <Surface key={s.label}>
            <Flex
              flexDirection="column"
              alignItems="center"
              padding={20}
              gap={4}
            >
              <Heading level={2}>{s.value}</Heading>
              <Paragraph>{s.label}</Paragraph>
            </Flex>
          </Surface>
        ))}
      </Grid>

      <Flex gap={16} paddingTop={16}>
        <Button as={RouterLink} to="/learn" variant="accent">
          Start learning
        </Button>
        <Button as={RouterLink} to="/sandbox">
          Open Sandbox
        </Button>
      </Flex>
    </Flex>
  );
};
