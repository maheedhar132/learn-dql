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
      </AppHeader.NavItems>
    </AppHeader>
  );
};
