import { Page } from "@dynatrace/strato-components-preview/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { Learn } from "./pages/Learn";
import { CasePlayer } from "./pages/CasePlayer";
import { Sandbox } from "./pages/Sandbox";

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
        </Routes>
      </Page.Main>
    </Page>
  );
};
