import { Page } from "@dynatrace/strato-components-preview/layouts";
import React from "react";
import { Route, Routes, Link as RouterLink } from "react-router-dom";
import { Flex } from "@dynatrace/strato-components/layouts";
import { EmptyState } from "@dynatrace/strato-components/content";
import { Button } from "@dynatrace/strato-components/buttons";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { Learn } from "./pages/Learn";
import { CasePlayer } from "./pages/CasePlayer";
import { Sandbox } from "./pages/Sandbox";
import { LogHunt } from "./pages/LogHunt";
import { LogHuntPlayer } from "./pages/LogHuntPlayer";
import { Codex } from "./pages/Codex";
import { Settings } from "./pages/Settings";

const NotFound = () => (
  <Flex flexDirection="column" padding={48} alignItems="center">
    <EmptyState>
      <EmptyState.VisualPreset context="generic" type="something-missing" />
      <EmptyState.Title>Page not found</EmptyState.Title>
      <EmptyState.Details>That page doesn't exist in Learn DQL.</EmptyState.Details>
      <EmptyState.Actions>
        <Button as={RouterLink} to="/" variant="accent">Back to Home</Button>
      </EmptyState.Actions>
    </EmptyState>
  </Flex>
);

export const App = () => {
  return (
    <Page>
      <Page.Header>
        <Header />
      </Page.Header>
      <Page.Main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:caseId" element={<CasePlayer />} />
          <Route path="/sandbox" element={<Sandbox />} />
          <Route path="/log-hunt" element={<LogHunt />} />
          <Route path="/log-hunt/:huntId" element={<LogHuntPlayer />} />
          <Route path="/codex" element={<Codex />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Page.Main>
    </Page>
  );
};
