import React, { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Flex, Grid, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { TextInput } from "@dynatrace/strato-components/forms";
import { ALL_SCENARIOS } from "../lib/dql";
import { getProgress } from "../lib/progress";
import type { Scenario } from "../lib/types/dql";

const TRACK_ORDER = [
  {
    key: "onboarding",
    title: "Onboarding",
    blurb: "Start here — 6 beginner lessons covering core DQL commands.",
  },
  {
    key: "dql",
    title: "DQL Lessons",
    blurb: "Query, filter, aggregate, and shape Grail data across all difficulty levels.",
  },
] as const;

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

function timeEstimate(steps: number): string {
  if (steps <= 2) return "~5 min";
  if (steps <= 3) return "~8 min";
  if (steps <= 4) return "~12 min";
  return "~15 min";
}

const LessonCard = ({
  scenario,
  done,
}: {
  scenario: Scenario;
  done: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <Surface
      onClick={() => navigate(`/learn/${scenario.id}`)}
      style={{ cursor: "pointer" }}
    >
      <Flex
        flexDirection="column"
        padding={16}
        gap={8}
        style={{ height: "100%", minHeight: 160 }}
      >
        <Flex justifyContent="space-between" alignItems="flex-start" gap={8}>
          <Flex gap={6} flexWrap="wrap">
            <Chip>{scenario.difficulty}</Chip>
            <Chip>{timeEstimate(scenario.steps.length)}</Chip>
          </Flex>
          {done && <Chip color="success">✓ Done</Chip>}
        </Flex>

        <Strong style={{ fontSize: "0.95rem", lineHeight: 1.4 }}>
          {scenario.title}
        </Strong>

        <Paragraph
          style={{
            fontSize: "0.85rem",
            lineHeight: 1.5,
            opacity: 0.8,
            flexGrow: 1,
            margin: 0,
          }}
        >
          {scenario.briefing.length > 120
            ? `${scenario.briefing.slice(0, 120)}…`
            : scenario.briefing}
        </Paragraph>

        <Paragraph style={{ fontSize: "0.75rem", opacity: 0.5, margin: 0 }}>
          {scenario.steps.length} step{scenario.steps.length !== 1 ? "s" : ""}
        </Paragraph>
      </Flex>
    </Surface>
  );
};

export const Learn = () => {
  const completed = useMemo(() => new Set(getProgress().completedCases), []);

  const onboardingScenarios = useMemo(
    () => ALL_SCENARIOS.filter((s) => s.track === "onboarding"),
    [],
  );
  const onboardingComplete = useMemo(
    () => onboardingScenarios.length > 0 && onboardingScenarios.every((s) => completed.has(s.id)),
    [onboardingScenarios, completed],
  );

  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "done" | "todo">("all");

  const query = search.toLowerCase();

  function matchScenario(s: Scenario): boolean {
    if (filterDifficulty && s.difficulty !== filterDifficulty) return false;
    if (filterStatus === "done" && !completed.has(s.id)) return false;
    if (filterStatus === "todo" && completed.has(s.id)) return false;
    if (query && !s.title.toLowerCase().includes(query) && !s.briefing.toLowerCase().includes(query)) return false;
    return true;
  }

  const anyFilterActive = !!filterDifficulty || filterStatus !== "all" || !!search;

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      {/* ── Header ── */}
      <Flex flexDirection="column" gap={6}>
        <Heading level={1}>Lessons</Heading>
        <Paragraph>
          {ALL_SCENARIOS.length} lessons · {completed.size} completed
        </Paragraph>
      </Flex>

      {/* ── Onboarding banner ── */}
      {!onboardingComplete && (
        <Surface>
          <Flex padding={16} gap={16} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Flex flexDirection="column" gap={4}>
              <Strong>New to DQL?</Strong>
              <Paragraph style={{ margin: 0, opacity: 0.8, fontSize: "0.9rem" }}>
                Start with the Onboarding track — 6 beginner lessons covering the core commands.
              </Paragraph>
            </Flex>
            <Button
              as={RouterLink}
              to={`/learn/${onboardingScenarios[0]?.id ?? ""}`}
              variant="accent"
            >
              Start Onboarding →
            </Button>
          </Flex>
        </Surface>
      )}

      {/* ── Filters ── */}
      <Flex gap={12} alignItems="center" flexWrap="wrap">
        <TextInput
          value={search}
          onChange={(v) => setSearch(v ?? "")}
          placeholder="Search lessons…"
          style={{ minWidth: 200 }}
        />

        <Flex gap={6}>
          {DIFFICULTIES.map((d) => (
            <Button
              key={d}
              variant={filterDifficulty === d ? "accent" : "default"}
              onClick={() => setFilterDifficulty(filterDifficulty === d ? null : d)}
            >
              {d}
            </Button>
          ))}
        </Flex>

        <Flex gap={6}>
          {(["all", "todo", "done"] as const).map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "accent" : "default"}
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "All" : s === "todo" ? "To do" : "Completed"}
            </Button>
          ))}
        </Flex>

        {anyFilterActive && (
          <Button
            variant="default"
            onClick={() => {
              setSearch("");
              setFilterDifficulty(null);
              setFilterStatus("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </Flex>

      {/* ── Tracks ── */}
      {TRACK_ORDER.map((track) => {
        const trackAll = ALL_SCENARIOS.filter(
          (s) => (s.track ?? "dql") === track.key,
        );
        const trackFiltered = trackAll.filter(matchScenario);
        const doneCount = trackAll.filter((s) => completed.has(s.id)).length;

        if (trackFiltered.length === 0) return null;

        return (
          <Flex key={track.key} flexDirection="column" gap={12}>
            <Flex flexDirection="column" gap={2}>
              <Flex alignItems="baseline" gap={12}>
                <Heading level={2}>{track.title}</Heading>
                <Paragraph style={{ opacity: 0.55, margin: 0, fontSize: "0.85rem" }}>
                  {doneCount}/{trackAll.length} completed
                </Paragraph>
              </Flex>
              <Paragraph style={{ opacity: 0.75 }}>{track.blurb}</Paragraph>
            </Flex>
            <Divider />
            <Grid gridTemplateColumns="repeat(3, 1fr)" gap={16}>
              {trackFiltered.map((s) => (
                <LessonCard key={s.id} scenario={s} done={completed.has(s.id)} />
              ))}
            </Grid>
          </Flex>
        );
      })}

      {/* ── Footer reference ── */}
      <Flex justifyContent="center" paddingTop={16}>
        <Paragraph style={{ fontSize: "0.75rem", opacity: 0.4, textAlign: "center" }}>
          Free in-app simulation — learn without affecting your Dynatrace environment or incurring any charges.
        </Paragraph>
      </Flex>
    </Flex>
  );
};
