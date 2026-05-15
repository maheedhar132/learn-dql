import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';

/**
 * Phase 1: Sandbox — free-form DQL query editor.
 * Full implementation: Phase E
 */
export function SandboxPage() {
  return (
    <Flex flexDirection="column" style={{ padding: '2rem', height: '100%' }}>
      <Heading level={2}>Query Sandbox</Heading>
      <Text>Free-form DQL query editor — Phase E implementation.</Text>
    </Flex>
  );
}
