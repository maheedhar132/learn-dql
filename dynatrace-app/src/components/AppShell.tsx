import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { TopNav } from './TopNav';
import { useLocation } from 'react-router-dom';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Wraps every page with the persistent top navigation bar and a scrollable
 * content area. The nav bar is always visible; only the inner content scrolls.
 */
export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation();
  const isCasesActive = pathname === '/cases';

  return (
    <Flex
      flexDirection="column"
      style={{ height: '100vh', overflow: 'hidden' }}
    >
      <TopNav />
      <Flex
        flexDirection="column"
        style={{
          flex: 1,
          overflow: isCasesActive ? 'hidden' : 'auto',
          position: 'relative',
        }}
      >
        {children}
      </Flex>
    </Flex>
  );
}
