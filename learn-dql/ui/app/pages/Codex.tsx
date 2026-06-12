import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Grid, Surface, Divider, TitleBar } from "@dynatrace/strato-components/layouts";
import {
  Paragraph,
  Strong,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip, CodeSnippet, ExpandableText, EmptyState } from "@dynatrace/strato-components/content";
import { SearchInput } from "@dynatrace/strato-components/forms";
import {
  QUERY_LIBRARY,
  getAllCategories,
  type QueryCategory,
  type QueryDifficulty,
} from "../lib/dql/query-library";

const CATEGORY_ICONS: Record<QueryCategory, string> = {
  logs: "📋",
  metrics: "📊",
  spans: "🔗",
  bizevents: "💼",
  joins: "🔀",
  aggregation: "∑",
  parsing: "🔍",
  system: "⚙️",
  entities: "🏗️",
};

const FREE_CATEGORIES = new Set<QueryCategory>(["system", "entities"]);

type DifficultyColor = "success" | "critical" | undefined;

const DIFFICULTY_COLORS: Record<QueryDifficulty, DifficultyColor> = {
  simple: "success",
  intermediate: undefined,
  advanced: "critical",
};

const DIFFICULTIES: QueryDifficulty[] = ["simple", "intermediate", "advanced"];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface QueryCardProps {
  entry: (typeof QUERY_LIBRARY)[number];
  onTryInSandbox: () => void;
}

const QueryCard = ({ entry, onTryInSandbox }: QueryCardProps) => {
  return (
    <Surface>
      <Flex flexDirection="column" padding={20} gap={12}>
        {/* Header row */}
        <Flex justifyContent="space-between" alignItems="flex-start" gap={8} flexWrap="wrap">
          <Strong>{entry.title}</Strong>
          <Flex gap={6} flexShrink={0}>
            <Chip color={DIFFICULTY_COLORS[entry.difficulty]}>{capitalize(entry.difficulty)}</Chip>
            <Chip>
              {CATEGORY_ICONS[entry.category]} {capitalize(entry.category)}
            </Chip>
            {FREE_CATEGORIES.has(entry.category) && (
              <Chip color="success">Free</Chip>
            )}
            {entry.liveOnly && (
              <Chip color="warning">Live tenant</Chip>
            )}
          </Flex>
        </Flex>

        {/* Description */}
        <Paragraph style={{ margin: 0 }}>
          {entry.description}
        </Paragraph>

        {/* Query display */}
        <CodeSnippet language="dql" showCopyAction>
          {entry.query}
        </CodeSnippet>

        {/* Explanation (collapsible) */}
        <ExpandableText>
          {entry.explanation}
        </ExpandableText>

        <Divider />

        {/* Footer row */}
        <Flex justifyContent="space-between" alignItems="center">
          <Chip>+{entry.xpReward} XP</Chip>
          {entry.liveOnly ? (
            <Paragraph style={{ margin: 0 }}>
              Copy into a live Dynatrace Notebook to run
            </Paragraph>
          ) : (
            <Button variant="default" onClick={onTryInSandbox}>
              Try in Sandbox →
            </Button>
          )}
        </Flex>
      </Flex>
    </Surface>
  );
};

export const Codex = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<QueryCategory | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<QueryDifficulty | null>(null);

  const categories = useMemo(() => getAllCategories(), []);

  const filtered = useMemo(() => {
    const lower = searchText.toLowerCase();
    return QUERY_LIBRARY.filter((entry) => {
      if (activeCategory && entry.category !== activeCategory) return false;
      if (activeDifficulty && entry.difficulty !== activeDifficulty) return false;
      if (lower) {
        const hit =
          entry.title.toLowerCase().includes(lower) ||
          entry.description.toLowerCase().includes(lower) ||
          entry.query.toLowerCase().includes(lower);
        if (!hit) return false;
      }
      return true;
    });
  }, [searchText, activeCategory, activeDifficulty]);

  const hasActiveFilters = searchText !== "" || activeCategory !== null || activeDifficulty !== null;

  function clearFilters() {
    setSearchText("");
    setActiveCategory(null);
    setActiveDifficulty(null);
  }

  return (
    <Flex flexDirection="column" gap={0}>
      <TitleBar>
        <TitleBar.Title>DQL Query Reference</TitleBar.Title>
        <TitleBar.Subtitle>
          A searchable library of production-ready DQL patterns with explanations and difficulty ratings.
        </TitleBar.Subtitle>
      </TitleBar>

      <Flex flexDirection="column" padding={32} gap={24}>

      {/* Filter bar */}
      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          {/* Search */}
          <SearchInput
            value={searchText}
            onChange={(v) => setSearchText(v ?? "")}
            placeholder="Search by title, description, or query text…"
            aria-label="Search queries"
          />

          {/* Category filters */}
          <Flex gap={8} flexWrap="wrap" alignItems="center">
            <Paragraph style={{ margin: 0, fontSize: "0.85rem", opacity: 0.6, flexShrink: 0 }}>
              Category:
            </Paragraph>
            <Button
              variant={activeCategory === null ? "accent" : "default"}
              onClick={() => setActiveCategory(null)}
            >
              All
            </Button>
            {categories.map(({ id, label, count }) => (
              <Button
                key={id}
                variant={activeCategory === id ? "accent" : "default"}
                onClick={() => setActiveCategory(activeCategory === id ? null : id)}
              >
                {CATEGORY_ICONS[id]} {label}{" "}
                <Chip style={{ marginLeft: 4 }}>{count}</Chip>
              </Button>
            ))}
          </Flex>

          {/* Difficulty filters */}
          <Flex gap={8} flexWrap="wrap" alignItems="center">
            <Paragraph style={{ margin: 0, fontSize: "0.85rem", opacity: 0.6, flexShrink: 0 }}>
              Difficulty:
            </Paragraph>
            <Button
              variant={activeDifficulty === null ? "accent" : "default"}
              onClick={() => setActiveDifficulty(null)}
            >
              All
            </Button>
            {DIFFICULTIES.map((d) => (
              <Button
                key={d}
                variant={activeDifficulty === d ? "accent" : "default"}
                onClick={() => setActiveDifficulty(activeDifficulty === d ? null : d)}
              >
                {capitalize(d)}
              </Button>
            ))}
          </Flex>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Flex>
              <Button variant="default" onClick={clearFilters}>
                Clear filters ✕
              </Button>
            </Flex>
          )}
        </Flex>
      </Surface>

      {/* Stats line */}
      <Paragraph style={{ margin: 0, fontSize: "0.85rem", opacity: 0.6 }}>
        {filtered.length} of {QUERY_LIBRARY.length} queries
      </Paragraph>

      {/* Query grid */}
      {filtered.length > 0 ? (
        <Grid gridTemplateColumns="repeat(auto-fill, minmax(500px, 1fr))" gap={16}>
          {filtered.map((entry) => (
            <QueryCard
              key={entry.id}
              entry={entry}
              onTryInSandbox={() => navigate("/sandbox", { state: { query: entry.query } })}
            />
          ))}
        </Grid>
      ) : (
        <EmptyState>
          <EmptyState.VisualPreset context="generic" type="no-result" />
          <EmptyState.Title>No queries match your filters</EmptyState.Title>
          <EmptyState.Details>
            Try adjusting your search text or clearing the category and difficulty filters.
          </EmptyState.Details>
          <EmptyState.Actions>
            <Button variant="accent" onClick={clearFilters}>Clear filters</Button>
          </EmptyState.Actions>
        </EmptyState>
      )}

      </Flex>
    </Flex>
  );
};
