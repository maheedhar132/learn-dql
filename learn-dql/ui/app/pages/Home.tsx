import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Flex, Grid, Surface } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { ProgressBar } from "@dynatrace/strato-components/content";
import { ALL_SCENARIOS } from "../lib/dql";
import { getProgress } from "../lib/progress";

const TRACKS = [
  { key: "onboarding", label: "Onboarding", to: "/learn" },
  { key: "dql", label: "DQL Lessons", to: "/learn" },
  { key: "hunt", label: "Log Hunt", to: "/log-hunt" },
] as const;

export const Home = () => {
  const progress = useMemo(() => getProgress(), []);

  const trackStats = useMemo(() => {
    const onboardingTotal = ALL_SCENARIOS.filter((s) => s.track === "onboarding").length;
    const dqlTotal = ALL_SCENARIOS.filter((s) => s.track === "dql").length;
    const onboardingDone = ALL_SCENARIOS.filter(
      (s) => s.track === "onboarding" && progress.completedCases.includes(s.id),
    ).length;
    const dqlDone = ALL_SCENARIOS.filter(
      (s) => s.track === "dql" && progress.completedCases.includes(s.id),
    ).length;
    const huntTotal = 3; // fixed number of Log Hunt scenarios
    const huntDone = progress.completedHunts.length;
    return [
      { label: "Onboarding", total: onboardingTotal, done: onboardingDone, to: "/learn" },
      { label: "DQL Lessons", total: dqlTotal, done: dqlDone, to: "/learn" },
      { label: "Log Hunt", total: huntTotal, done: huntDone, to: "/log-hunt" },
    ];
  }, [progress]);

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
        Master the <Strong>Dynatrace Query Language</Strong> through hands-on,
        step-by-step lessons. Write real queries against sample data — any query
        that produces the correct result passes. No exact syntax required.
      </Paragraph>

      <Grid gridTemplateColumns="repeat(3, 1fr)" gap={16} style={{ width: "100%", maxWidth: 720 }}>
        {trackStats.map(({ label, total, done, to }) => {
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const color = pct === 100 ? "success" : pct > 0 ? "primary" : "neutral";
          return (
            <Surface key={label}>
              <Flex flexDirection="column" padding={20} gap={10}>
                <Flex justifyContent="space-between" alignItems="baseline">
                  <Strong>{label}</Strong>
                  <Paragraph style={{ fontSize: "0.8rem", opacity: 0.7, margin: 0 }}>
                    {done}/{total}
                  </Paragraph>
                </Flex>
                <ProgressBar value={pct} color={color} density="condensed" aria-label={`${label} progress`}>
                  <ProgressBar.Label>{pct === 100 ? "Completed" : pct > 0 ? "In progress" : "Not started"}</ProgressBar.Label>
                  <ProgressBar.Value>{pct}%</ProgressBar.Value>
                </ProgressBar>
                <Button as={RouterLink} to={to} variant={pct === 0 ? "accent" : "default"} style={{ alignSelf: "flex-start" }}>
                  {pct === 100 ? "Review" : pct > 0 ? "Continue" : "Start"}
                </Button>
              </Flex>
            </Surface>
          );
        })}
      </Grid>

      <Flex gap={16} paddingTop={8}>
        <Button as={RouterLink} to="/learn" variant="accent">
          All lessons
        </Button>
        <Button as={RouterLink} to="/sandbox">
          Open Sandbox
        </Button>
      </Flex>
    </Flex>
  );
};
