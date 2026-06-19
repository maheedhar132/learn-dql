import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";
import { SettingIcon } from "@dynatrace/strato-icons";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.Navigation>
        <AppHeader.Logo as={Link} to="/" />
        <AppHeader.NavigationItem as={Link} to="/sandbox">
          Sandbox
        </AppHeader.NavigationItem>
      </AppHeader.Navigation>
      <AppHeader.ActionItems>
        <AppHeader.ActionButton as={Link} to="/settings" prefixIcon={<SettingIcon />}>
          Settings
        </AppHeader.ActionButton>
      </AppHeader.ActionItems>
    </AppHeader>
  );
};
