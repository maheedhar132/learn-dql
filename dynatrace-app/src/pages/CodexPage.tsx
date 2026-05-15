import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';

/**
 * Phase 0: Codex — DQL & DPL interactive reference guide.
 * Full implementation: Phase D
 */
export function CodexPage() {
  return (
    <Flex flexDirection="column" style={{ padding: '2rem', height: '100%' }}>
      <Heading level={2}>Codex</Heading>
      <Text>DQL &amp; DPL reference guide — Phase D implementation.</Text>
    </Flex>
  );
}
