import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.NavItems>
        <AppHeader.AppNavLink as={Link} to="/" />
        <AppHeader.NavItem as={Link} to="/learn">
          Learn
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/sandbox">
          Sandbox
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/log-hunt">
          Log Hunt
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/notebook">
          Notebook
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/codex">
          Reference
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/settings">
          Settings
        </AppHeader.NavItem>
      </AppHeader.NavItems>
    </AppHeader>
  );
};
