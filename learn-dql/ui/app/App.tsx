import { Page } from "@dynatrace/strato-components-preview/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { Learn } from "./pages/Learn";
import { CasePlayer } from "./pages/CasePlayer";
import { Sandbox } from "./pages/Sandbox";
import { LogHunt } from "./pages/LogHunt";
import { LogHuntPlayer } from "./pages/LogHuntPlayer";
import { Notebook } from "./pages/Notebook";
import { Codex } from "./pages/Codex";
import { Settings } from "./pages/Settings";

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
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/codex" element={<Codex />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Page.Main>
    </Page>
  );
};
