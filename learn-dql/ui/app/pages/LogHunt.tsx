import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Flex, Grid, Surface, Divider } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Link,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { logHuntScenarios } from "../lib/dql/log-hunt-scenarios";

export const LogHunt = () => {
  const navigate = useNavigate();
  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <Flex flexDirection="column" gap={8}>
        <Heading level={1}>🕵️ Log Hunt</Heading>
        <Paragraph>
          Solve story-driven mysteries using DQL. Each hunt drops you into a real-world incident —
          read the full brief, understand what you're looking for, then write your own queries to crack the case.
        </Paragraph>
      </Flex>

      <Divider />

      <Grid gridTemplateColumns="repeat(3, 1fr)" gap={20}>
        {logHuntScenarios.map((scenario) => (
          <Surface key={scenario.id}>
            <Flex flexDirection="column" padding={20} gap={12} style={{ height: "100%" }}>
              <Flex justifyContent="space-between" alignItems="flex-start">
                <Heading level={3} style={{ margin: 0, fontSize: "1.25rem" }}>
                  {scenario.emoji} {scenario.title}
                </Heading>
                <Chip>{scenario.difficulty}</Chip>
              </Flex>

              <Paragraph style={{ flexGrow: 1 }}>
                {scenario.story.length > 200
                  ? `${scenario.story.slice(0, 200)}…`
                  : scenario.story}
              </Paragraph>

              <Paragraph style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                Open investigation · {scenario.difficulty}
              </Paragraph>

              <Button variant="accent" onClick={() => navigate(`/log-hunt/${scenario.id}`)}>
                Start hunt
              </Button>
            </Flex>
          </Surface>
        ))}
      </Grid>
    </Flex>
  );
};
