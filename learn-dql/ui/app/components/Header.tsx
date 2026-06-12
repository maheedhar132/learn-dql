import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";
import { SettingIcon } from "@dynatrace/strato-icons";

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

        <AppHeader.NavItem as={Link} to="/codex">
          Reference
        </AppHeader.NavItem>
      </AppHeader.NavItems>
      <AppHeader.ActionItems>
        <AppHeader.ActionButton as={Link} to="/settings" prefixIcon={<SettingIcon />}>
          Settings
        </AppHeader.ActionButton>
      </AppHeader.ActionItems>
    </AppHeader>
  );
};
