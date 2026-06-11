import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Grid, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Strong,
  Code,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { TextInput } from "@dynatrace/strato-components/forms";
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
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = entry.explanation.length > 100;
  const displayedExplanation =
    !shouldCollapse || expanded
      ? entry.explanation
      : `${entry.explanation.slice(0, 100)}…`;

  return (
    <Surface>
      <Flex flexDirection="column" padding={20} gap={12}>
        {/* Header row */}
        <Flex justifyContent="space-between" alignItems="flex-start" gap={8} flexWrap="wrap">
          <Strong style={{ fontSize: "1rem" }}>{entry.title}</Strong>
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
        <Paragraph style={{ margin: 0, opacity: 0.8, fontSize: "0.9rem" }}>
          {entry.description}
        </Paragraph>

        {/* Query display */}
        <Code
          style={{
            display: "block",
            whiteSpace: "pre",
            fontSize: "0.8rem",
            overflowX: "auto",
            padding: "8px",
            borderRadius: "4px",
          }}
        >
          {entry.query}
        </Code>

        {/* Explanation (collapsible) */}
        <Flex flexDirection="column" gap={4}>
          <Paragraph style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>
            {displayedExplanation}
          </Paragraph>
          {shouldCollapse && (
            <Button
              variant="default"
              style={{ alignSelf: "flex-start", padding: 0, fontSize: "0.8rem" }}
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? "Show less" : "Show more"}
            </Button>
          )}
        </Flex>

        <Divider />

        {/* Footer row */}
        <Flex justifyContent="space-between" alignItems="center">
          <Paragraph style={{ margin: 0, fontSize: "0.75rem", opacity: 0.5 }}>
            +{entry.xpReward} XP
          </Paragraph>
          {entry.liveOnly ? (
            <Paragraph style={{ margin: 0, fontSize: "0.78rem", opacity: 0.55 }}>
              Runs in a live Dynatrace tenant — copy into a Notebook there
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
    <Flex flexDirection="column" padding={32} gap={24}>
      {/* Header */}
      <Flex flexDirection="column" gap={8}>
        <Heading level={1}>📚 DQL Query Reference</Heading>
        <Paragraph style={{ opacity: 0.75, maxWidth: 640, margin: 0 }}>
          A searchable library of production-ready DQL patterns. Each query is annotated with an
          explanation and difficulty rating. Click <Strong>Try in Sandbox</Strong> to run any
          query against live sample data.
        </Paragraph>
      </Flex>

      {/* Filter bar */}
      <Surface>
        <Flex flexDirection="column" padding={16} gap={12}>
          {/* Search */}
          <TextInput
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
        <Surface>
          <Flex flexDirection="column" padding={40} alignItems="center" gap={12}>
            <Paragraph style={{ fontSize: "1.5rem", margin: 0 }}>🔍</Paragraph>
            <Heading level={3}>No queries match your filters</Heading>
            <Paragraph style={{ opacity: 0.65, margin: 0, textAlign: "center" }}>
              Try adjusting your search text or clearing the category and difficulty filters.
            </Paragraph>
            <Button variant="accent" onClick={clearFilters}>
              Clear filters
            </Button>
          </Flex>
        </Surface>
      )}
    </Flex>
  );
};
