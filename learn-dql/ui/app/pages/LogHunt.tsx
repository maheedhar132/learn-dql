import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Grid, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { logHuntScenarios } from "../lib/dql/log-hunt-scenarios";
import { getProgress } from "../lib/progress";

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

export const LogHunt = () => {
  const navigate = useNavigate();
  const completedHunts = useMemo(() => new Set(getProgress().completedHunts), []);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "done" | "todo">("all");

  const visibleScenarios = useMemo(() => {
    return logHuntScenarios.filter((s) => {
      if (filterDifficulty && s.difficulty !== filterDifficulty) return false;
      if (filterStatus === "done" && !completedHunts.has(s.id)) return false;
      if (filterStatus === "todo" && completedHunts.has(s.id)) return false;
      return true;
    });
  }, [filterDifficulty, filterStatus, completedHunts]);

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <Flex flexDirection="column" gap={8}>
        <Heading level={1}>🕵️ Log Hunt</Heading>
        <Paragraph>
          Solve story-driven mysteries using DQL. Each hunt drops you into a real-world incident —
          read the full brief, understand what you're looking for, then write your own queries to crack the case.
        </Paragraph>
        <Paragraph style={{ fontSize: "0.85rem", opacity: 0.6 }}>
          {completedHunts.size} / {logHuntScenarios.length} cases closed
        </Paragraph>
      </Flex>

      <Divider />

      {/* ── Filters ── */}
      <Flex gap={12} alignItems="center" flexWrap="wrap">
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
              {s === "all" ? "All" : s === "todo" ? "Unsolved" : "Solved"}
            </Button>
          ))}
        </Flex>
        {(filterDifficulty || filterStatus !== "all") && (
          <Button variant="default" onClick={() => { setFilterDifficulty(null); setFilterStatus("all"); }}>
            Clear filters
          </Button>
        )}
      </Flex>

      {visibleScenarios.length === 0 && (
        <Paragraph style={{ opacity: 0.6 }}>No hunts match the current filters.</Paragraph>
      )}

      <Grid gridTemplateColumns="repeat(3, 1fr)" gap={20}>
        {visibleScenarios.map((scenario) => {
          const done = completedHunts.has(scenario.id);
          return (
            <Surface key={scenario.id}>
              <Flex flexDirection="column" padding={20} gap={12} style={{ height: "100%" }}>
                <Flex justifyContent="space-between" alignItems="flex-start">
                  <Heading level={3} style={{ margin: 0, fontSize: "1.25rem" }}>
                    {scenario.emoji} {scenario.title}
                  </Heading>
                  <Flex gap={6}>
                    {done && <Chip color="success">Case closed</Chip>}
                    <Chip>{scenario.difficulty}</Chip>
                  </Flex>
                </Flex>

                <Paragraph style={{ flexGrow: 1, fontSize: "0.85rem", lineHeight: 1.5 }}>
                  {scenario.story.length > 160
                    ? `${scenario.story.slice(0, 160)}…`
                    : scenario.story}
                </Paragraph>

                <Button
                  variant={done ? "default" : "accent"}
                  onClick={() => navigate(`/log-hunt/${scenario.id}`)}
                >
                  {done ? "Revisit" : "Start hunt"}
                </Button>
              </Flex>
            </Surface>
          );
        })}
      </Grid>
    </Flex>
  );
};
