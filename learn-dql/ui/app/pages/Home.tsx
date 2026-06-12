import React, { useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Flex, Grid, Surface, TitleBar } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { DQLSignetIcon } from "@dynatrace/strato-icons";
import { ALL_SCENARIOS } from "../lib/dql";
import { getProgress } from "../lib/progress";
import { logHuntScenarios } from "../lib/dql/log-hunt-scenarios";

// ─── Card image URLs (place the provided PNGs in learn-dql/ui/assets/) ──────
// learn-dql/ui/assets/home-learn-dql.png  → the Dynatrace Learn DQL logo
// learn-dql/ui/assets/home-sandbox.png    → the Sandbox illustration
// learn-dql/ui/assets/home-log-hunt.png   → the Log Hunt robot illustration
const IMG_LEARN  = new URL("../../assets/home-learn-dql.png",  import.meta.url).href;
const IMG_SANDBOX = new URL("../../assets/home-sandbox.png",   import.meta.url).href;
const IMG_LOG_HUNT = new URL("../../assets/home-log-hunt.png", import.meta.url).href;

// ─── Gradient fallbacks (used while images haven't been placed yet) ──────────
const GRAD_LEARN =
  "linear-gradient(135deg, #0b1a2e 0%, #1a2f4f 50%, #162440 100%)";
const GRAD_SANDBOX =
  "linear-gradient(135deg, #0a1628 0%, #1b1040 50%, #0d2240 100%)";
const GRAD_LOG_HUNT =
  "linear-gradient(135deg, #0b1a2e 0%, #0f1e3a 50%, #1a1040 100%)";

// ─── CardImage ────────────────────────────────────────────────────────────────

function CardImage({
  src,
  fallbackGradient,
  alt,
}: {
  src: string;
  fallbackGradient: string;
  alt: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: 220,
        backgroundImage: `url(${src}), ${fallbackGradient}`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
        flexShrink: 0,
      }}
      role="img"
      aria-label={alt}
    />
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export const Home = () => {
  const navigate = useNavigate();
  const progress = useMemo(() => getProgress(), []);

  // ── Onboarding progress ──
  const onboardingScenarios = useMemo(
    () => ALL_SCENARIOS.filter((s) => s.track === "onboarding"),
    [],
  );
  const dqlScenarios = useMemo(
    () => ALL_SCENARIOS.filter((s) => s.track !== "onboarding"),
    [],
  );

  const onboardingDone = useMemo(
    () => onboardingScenarios.filter((s) => progress.completedCases.includes(s.id)).length,
    [onboardingScenarios, progress],
  );
  const dqlDone = useMemo(
    () => dqlScenarios.filter((s) => progress.completedCases.includes(s.id)).length,
    [dqlScenarios, progress],
  );

  // ── Continue (first incomplete scenario, any track) ──
  const resumeScenario = useMemo(
    () => ALL_SCENARIOS.find((s) => !progress.completedCases.includes(s.id)),
    [progress],
  );

  const hasAnyProgress = progress.completedCases.length > 0;

  // ── Log Hunt stats ──
  const huntsDone = progress.completedHunts.length;

  return (
    <Flex flexDirection="column" gap={0}>
      <TitleBar>
        <TitleBar.Prefix>
          <DQLSignetIcon />
        </TitleBar.Prefix>
        <TitleBar.Title>Learn DQL</TitleBar.Title>
        <TitleBar.Subtitle>
          Master the Dynatrace Query Language through hands-on lessons, a free sandbox, and detective-style investigations.
        </TitleBar.Subtitle>
      </TitleBar>

      <Flex flexDirection="column" padding={32} gap={0}>
        <Grid gridTemplateColumns="repeat(3, 1fr)" gap={24} alignItems="start">

          {/* ── Card 1: Learn DQL ── */}
          <Surface>
            <Flex flexDirection="column" gap={0}>
              <CardImage src={IMG_LEARN} fallbackGradient={GRAD_LEARN} alt="Learn DQL" />

              <Flex flexDirection="column" padding={24} gap={20}>
                <Flex flexDirection="column" gap={6}>
                  <Heading level={2} style={{ margin: 0 }}>Learn DQL</Heading>
                  <Paragraph style={{ margin: 0 }}>
                    Step-by-step guided lessons that take you from zero to confident with the Dynatrace Query Language. Pick a track based on where you are today.
                  </Paragraph>
                  {hasAnyProgress && (
                    <Chip color="primary">{progress.completedCases.length} lesson{progress.completedCases.length !== 1 ? "s" : ""} completed</Chip>
                  )}
                </Flex>

                {/* ── Mode sub-cards ── */}
                <Flex flexDirection="column" gap={12}>

                  {/* Onboarding */}
                  <Surface>
                    <Flex flexDirection="column" padding={16} gap={8}>
                      <Flex justifyContent="space-between" alignItems="center">
                        <Strong>Onboarding</Strong>
                        <Chip>
                          {onboardingDone}/{onboardingScenarios.length}
                        </Chip>
                      </Flex>
                      <Paragraph style={{ margin: 0 }}>
                        Brand new to DQL? Start here. Six bite-sized lessons walk you through the essential commands — <Strong>fetch</Strong>, <Strong>filter</Strong>, <Strong>summarize</Strong>, <Strong>sort</Strong> — so you can read and write basic queries with confidence before moving on.
                      </Paragraph>
                      <Button
                        variant={onboardingDone === 0 ? "accent" : "default"}
                        style={{ alignSelf: "flex-start" }}
                        as={RouterLink}
                        to="/learn"
                      >
                        {onboardingDone === onboardingScenarios.length
                          ? "Review Onboarding"
                          : onboardingDone > 0
                          ? "Continue Onboarding"
                          : "Start Onboarding →"}
                      </Button>
                    </Flex>
                  </Surface>

                  {/* DQL Lessons */}
                  <Surface>
                    <Flex flexDirection="column" padding={16} gap={8}>
                      <Flex justifyContent="space-between" alignItems="center">
                        <Strong>DQL Lessons</Strong>
                        <Chip>
                          {dqlDone}/{dqlScenarios.length}
                        </Chip>
                      </Flex>
                      <Paragraph style={{ margin: 0 }}>
                        Already know the basics? Go deeper. These lessons cover parsing, aggregation, join, append, log analysis, and advanced patterns — each tied to a real-world scenario you'd encounter in a Dynatrace environment.
                      </Paragraph>
                      <Button
                        variant="default"
                        style={{ alignSelf: "flex-start" }}
                        as={RouterLink}
                        to="/learn"
                      >
                        {dqlDone > 0 ? "Continue Lessons" : "Browse Lessons →"}
                      </Button>
                    </Flex>
                  </Surface>
                </Flex>

                {/* ── Continue / Resume button ── */}
                {resumeScenario ? (
                  <Flex flexDirection="column" gap={8}>
                    <Flex alignItems="center" gap={8}>
                      <Paragraph style={{ margin: 0 }}>
                        Up next: <Strong>{resumeScenario.title}</Strong>
                      </Paragraph>
                      <Chip>{resumeScenario.difficulty}</Chip>
                    </Flex>
                    <Button
                      variant="accent"
                      onClick={() => navigate(`/learn/${resumeScenario.id}`)}
                    >
                      Continue where you left off →
                    </Button>
                  </Flex>
                ) : (
                  <Button variant="accent" as={RouterLink} to="/learn">
                    Review all lessons →
                  </Button>
                )}
              </Flex>
            </Flex>
          </Surface>

          {/* ── Card 2: Sandbox ── */}
          <Surface>
            <Flex flexDirection="column" gap={0}>
              <CardImage src={IMG_SANDBOX} fallbackGradient={GRAD_SANDBOX} alt="Sandbox" />

              <Flex flexDirection="column" padding={24} gap={20}>
                <Flex flexDirection="column" gap={6}>
                  <Heading level={2} style={{ margin: 0 }}>Sandbox</Heading>
                  <Paragraph style={{ margin: 0 }}>
                    A free-form DQL editor connected to a rich offline dataset — no Grail DDU cost, no Dynatrace environment needed. Write any query, see results instantly.
                  </Paragraph>
                </Flex>

                <Flex flexDirection="column" gap={12}>
                  <Surface>
                    <Flex flexDirection="column" padding={16} gap={8}>
                      <Strong>What you can do</Strong>
                      <Paragraph style={{ margin: 0 }}>
                        Explore 8 realistic data sources — application logs, Kubernetes events, audit trails, security events, APM spans, infrastructure metrics, auth logs, and business events. Each dataset is pre-loaded with thousands of records so every query produces meaningful output.
                      </Paragraph>
                    </Flex>
                  </Surface>

                  <Surface>
                    <Flex flexDirection="column" padding={16} gap={8}>
                      <Strong>Non-Grail impacting</Strong>
                      <Paragraph style={{ margin: 0 }}>
                        Everything runs entirely in your browser. No queries touch your Dynatrace tenant, no data leaves your machine, and there is zero DDU consumption — safe to experiment freely.
                      </Paragraph>
                    </Flex>
                  </Surface>
                </Flex>

                <Button variant="accent" as={RouterLink} to="/sandbox">
                  Open Sandbox →
                </Button>
              </Flex>
            </Flex>
          </Surface>

          {/* ── Card 3: Log Hunt ── */}
          <Surface>
            <Flex flexDirection="column" gap={0}>
              <CardImage src={IMG_LOG_HUNT} fallbackGradient={GRAD_LOG_HUNT} alt="Log Hunt" />

              <Flex flexDirection="column" padding={24} gap={20}>
                <Flex flexDirection="column" gap={6}>
                  <Heading level={2} style={{ margin: 0 }}>Log Hunt</Heading>
                  <Flex gap={8} alignItems="center">
                    <Paragraph style={{ margin: 0 }}>
                      Learn DQL by solving real-world detective cases. Each hunt gives you a story, a sample dataset, and a mystery to crack — only your queries can surface the truth.
                    </Paragraph>
                  </Flex>
                  {huntsDone > 0 && (
                    <Chip color="success">{huntsDone} / {logHuntScenarios.length} cases closed</Chip>
                  )}
                </Flex>

                <Flex flexDirection="column" gap={12}>
                  <Surface>
                    <Flex flexDirection="column" padding={16} gap={8}>
                      <Strong>How it works</Strong>
                      <Paragraph style={{ margin: 0 }}>
                        You receive a detailed briefing about an incident — a breach, an outage, a spike. Then you write DQL queries against the case's log data to find the root cause. Once you've gathered enough evidence, submit your verdict to close the case.
                      </Paragraph>
                    </Flex>
                  </Surface>

                  <Surface>
                    <Flex flexDirection="column" padding={16} gap={8}>
                      <Strong>{logHuntScenarios.length} cases across 3 difficulty levels</Strong>
                      <Flex gap={6} flexWrap="wrap">
                        <Chip>Beginner</Chip>
                        <Chip>Intermediate</Chip>
                        <Chip>Advanced</Chip>
                      </Flex>
                    </Flex>
                  </Surface>
                </Flex>

                <Button variant="accent" as={RouterLink} to="/log-hunt">
                  Browse hunts →
                </Button>
              </Flex>
            </Flex>
          </Surface>

        </Grid>
      </Flex>
    </Flex>
  );
};
