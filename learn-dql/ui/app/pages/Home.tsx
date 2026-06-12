import React, { useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Flex, Grid, Surface, Divider } from "@dynatrace/strato-components/layouts";
import { TitleBar } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip, ProgressBar } from "@dynatrace/strato-components/content";
import { DQLSignetIcon } from "@dynatrace/strato-icons";
import { ALL_SCENARIOS } from "../lib/dql";
import { getProgress } from "../lib/progress";
import { logHuntScenarios } from "../lib/dql/log-hunt-scenarios";

export const Home = () => {
  const navigate = useNavigate();
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
    const huntTotal = logHuntScenarios.length;
    const huntDone = progress.completedHunts.length;
    return [
      { label: "Onboarding", total: onboardingTotal, done: onboardingDone, to: "/learn" },
      { label: "DQL Lessons", total: dqlTotal, done: dqlDone, to: "/learn" },
      { label: "Log Hunt", total: huntTotal, done: huntDone, to: "/log-hunt" },
    ];
  }, [progress]);

  const resumeScenario = useMemo(
    () => ALL_SCENARIOS.find((s) => !progress.completedCases.includes(s.id)),
    [progress],
  );

  const featuredHunt = useMemo(
    () => logHuntScenarios.find((h) => !progress.completedHunts.includes(h.id)),
    [progress],
  );

  return (
    <Flex flexDirection="column" gap={0}>
      <TitleBar>
        <TitleBar.Prefix>
          <DQLSignetIcon />
        </TitleBar.Prefix>
        <TitleBar.Title>Learn DQL</TitleBar.Title>
        <TitleBar.Subtitle>
          Master the Dynatrace Query Language through hands-on lessons
        </TitleBar.Subtitle>
        <TitleBar.Suffix>
          <Button as={RouterLink} to="/learn" variant="accent">All lessons</Button>
          <Button as={RouterLink} to="/log-hunt">Log Hunt</Button>
          <Button as={RouterLink} to="/sandbox">Open Sandbox</Button>
        </TitleBar.Suffix>
      </TitleBar>

      <Flex flexDirection="column" padding={32} gap={32}>
        {/* ── Progress track cards ── */}
        <Grid gridTemplateColumns="repeat(3, 1fr)" gap={16}>
          {trackStats.map(({ label, total, done, to }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const color = pct === 100 ? "success" : pct > 0 ? "primary" : "neutral";
            return (
              <Surface key={label}>
                <Flex flexDirection="column" padding={20} gap={12}>
                  <Flex justifyContent="space-between" alignItems="baseline">
                    <Strong>{label}</Strong>
                    <Paragraph style={{ fontSize: "0.8rem", margin: 0 }}>
                      {done}/{total}
                    </Paragraph>
                  </Flex>
                  <ProgressBar
                    value={pct}
                    color={color}
                    density="condensed"
                    aria-label={`${label} progress`}
                  >
                    <ProgressBar.Label>
                      {pct === 100 ? "Completed" : pct > 0 ? "In progress" : "Not started"}
                    </ProgressBar.Label>
                    <ProgressBar.Value>{pct}%</ProgressBar.Value>
                  </ProgressBar>
                  <Button
                    as={RouterLink}
                    to={to}
                    variant={pct === 0 ? "accent" : "default"}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {pct === 100 ? "Review" : pct > 0 ? "Continue" : "Start"}
                  </Button>
                </Flex>
              </Surface>
            );
          })}
        </Grid>

        <Divider />

        {/* ── Resume / Log Hunt teasers ── */}
        <Grid gridTemplateColumns="repeat(2, 1fr)" gap={16}>
          {/* Resume where you left off */}
          <Surface>
            <Flex flexDirection="column" padding={20} gap={12}>
              <Flex gap={8} alignItems="center">
                <Heading level={3} style={{ margin: 0 }}>Continue learning</Heading>
                {progress.completedCases.length > 0 && (
                  <Chip color="primary">{progress.completedCases.length} done</Chip>
                )}
              </Flex>
              {resumeScenario ? (
                <>
                  <Paragraph style={{ margin: 0 }}>
                    Up next: <Strong>{resumeScenario.title}</Strong>
                  </Paragraph>
                  <Paragraph style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>
                    {resumeScenario.briefing.length > 100
                      ? `${resumeScenario.briefing.slice(0, 100)}…`
                      : resumeScenario.briefing}
                  </Paragraph>
                  <Button
                    variant="accent"
                    style={{ alignSelf: "flex-start" }}
                    onClick={() => navigate(`/learn/${resumeScenario.id}`)}
                  >
                    Resume →
                  </Button>
                </>
              ) : (
                <>
                  <Paragraph style={{ margin: 0 }}>
                    You've completed all lessons! Head to Log Hunt for a real challenge.
                  </Paragraph>
                  <Button as={RouterLink} to="/log-hunt" variant="accent" style={{ alignSelf: "flex-start" }}>
                    Go to Log Hunt →
                  </Button>
                </>
              )}
            </Flex>
          </Surface>

          {/* Featured Log Hunt */}
          <Surface>
            <Flex flexDirection="column" padding={20} gap={12}>
              <Flex gap={8} alignItems="center">
                <Heading level={3} style={{ margin: 0 }}>Log Hunt</Heading>
                <Chip>{logHuntScenarios.length} cases</Chip>
              </Flex>
              {featuredHunt ? (
                <>
                  <Paragraph style={{ margin: 0 }}>
                    {featuredHunt.emoji} <Strong>{featuredHunt.title}</Strong>
                    {" "}
                    <Chip>{featuredHunt.difficulty}</Chip>
                  </Paragraph>
                  <Paragraph style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>
                    {featuredHunt.story.length > 100
                      ? `${featuredHunt.story.slice(0, 100)}…`
                      : featuredHunt.story}
                  </Paragraph>
                  <Button
                    variant="default"
                    style={{ alignSelf: "flex-start" }}
                    onClick={() => navigate("/log-hunt")}
                  >
                    Browse hunts →
                  </Button>
                </>
              ) : (
                <>
                  <Paragraph style={{ margin: 0 }}>
                    All {logHuntScenarios.length} cases solved. You're a true DQL detective!
                  </Paragraph>
                  <Button as={RouterLink} to="/log-hunt" variant="default" style={{ alignSelf: "flex-start" }}>
                    Review cases
                  </Button>
                </>
              )}
            </Flex>
          </Surface>
        </Grid>
      </Flex>
    </Flex>
  );
};
