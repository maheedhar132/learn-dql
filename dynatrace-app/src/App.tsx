import React from 'react';
import { AppRoot } from '@dynatrace/strato-components-full';
import { AppProvider } from './context/AppContext';
import { AppRouter } from './AppRouter';

/**
 * Root component.
 *
 * <AppRoot> provides the Dynatrace Strato theme context and design token
 * injection for every component in the tree.
 *
 * <AppProvider> wraps the React Context that carries all application state
 * and action dispatchers to every page and component.
 */
export function App() {
  return (
    <AppRoot>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </AppRoot>
  );
}
