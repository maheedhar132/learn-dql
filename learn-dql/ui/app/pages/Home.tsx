import React, { useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Flex, Grid, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip, ProgressBar } from "@dynatrace/strato-components/content";
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

  // Resume: first incomplete scenario (skip completed ones)
  const resumeScenario = useMemo(() => {
    return ALL_SCENARIOS.find((s) => !progress.completedCases.includes(s.id));
  }, [progress]);

  // Featured Log Hunt: first unsolved hunt
  const featuredHunt = useMemo(() => {
    return logHuntScenarios.find((h) => !progress.completedHunts.includes(h.id));
  }, [progress]);

  return (
    <Flex flexDirection="column" alignItems="center" padding={32} gap={32}>
      {/* ── Hero ── */}
      <Flex flexDirection="column" alignItems="center" gap={16} style={{ maxWidth: 640, width: "100%" }}>
        <img
          src="./assets/Dynatrace_Logo.svg"
          alt="Dynatrace Logo"
          width={80}
          height={80}
        />
        <Heading level={1}>Learn DQL</Heading>
        <Paragraph style={{ textAlign: "center", opacity: 0.8 }}>
          Master the <Strong>Dynatrace Query Language</Strong> through hands-on lessons.
          Write real queries against sample data — any query that produces the correct result passes.
        </Paragraph>
      </Flex>

      {/* ── Progress track cards ── */}
      <Grid
        gridTemplateColumns="repeat(3, 1fr)"
        gap={16}
        style={{ width: "100%", maxWidth: 780 }}
      >
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

      {/* ── CTA buttons ── */}
      <Flex gap={12} flexWrap="wrap" justifyContent="center">
        <Button as={RouterLink} to="/learn" variant="accent">
          All lessons
        </Button>
        <Button as={RouterLink} to="/log-hunt" variant="default">
          Log Hunt
        </Button>
        <Button as={RouterLink} to="/sandbox" variant="default">
          Open Sandbox
        </Button>
      </Flex>

      <Divider style={{ width: "100%", maxWidth: 780 }} />

      {/* ── Resume / Log Hunt teasers ── */}
      <Grid
        gridTemplateColumns="repeat(2, 1fr)"
        gap={16}
        style={{ width: "100%", maxWidth: 780 }}
      >
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
                <Paragraph style={{ opacity: 0.8, margin: 0, fontSize: "0.9rem" }}>
                  Up next: <Strong>{resumeScenario.title}</Strong>
                </Paragraph>
                <Paragraph
                  style={{ opacity: 0.6, fontSize: "0.82rem", margin: 0, lineHeight: 1.4 }}
                >
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
                <Paragraph style={{ opacity: 0.8, margin: 0 }}>
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
              <Heading level={3} style={{ margin: 0 }}>🕵️ Log Hunt</Heading>
              <Chip>{logHuntScenarios.length} cases</Chip>
            </Flex>
            {featuredHunt ? (
              <>
                <Paragraph style={{ opacity: 0.8, margin: 0, fontSize: "0.9rem" }}>
                  {featuredHunt.emoji} <Strong>{featuredHunt.title}</Strong>
                  {" "}
                  <Chip>{featuredHunt.difficulty}</Chip>
                </Paragraph>
                <Paragraph
                  style={{ opacity: 0.6, fontSize: "0.82rem", margin: 0, lineHeight: 1.4 }}
                >
                  {featuredHunt.story.length > 100
                    ? `${featuredHunt.story.slice(0, 100)}…`
                    : featuredHunt.story}
                </Paragraph>
                <Button
                  variant="default"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => navigate(`/log-hunt/${featuredHunt.id}`)}
                >
                  Start hunt →
                </Button>
              </>
            ) : (
              <>
                <Paragraph style={{ opacity: 0.8, margin: 0 }}>
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

      {/* ── Footer ── */}
      <Paragraph style={{ fontSize: "0.75rem", opacity: 0.35, textAlign: "center", paddingTop: 8 }}>
        Free in-app simulation — learn without affecting your Dynatrace environment or incurring any charges.
      </Paragraph>
    </Flex>
  );
};
