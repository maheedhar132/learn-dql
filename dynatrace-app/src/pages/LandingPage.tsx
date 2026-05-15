import React from 'react';
import {
  Flex,
  Heading,
  Text,
  Button,
  Container,
} from '@dynatrace/strato-components-full';
import {
  BookIcon,
  SearchIcon,
  BarChartIcon,
  FolderIcon,
  GamepadIcon,
} from '@dynatrace/strato-icons';
import { useAppContext } from '../context/AppContext';
import type { Phase } from '../types/app.types';

interface PhaseCard {
  phase: Phase;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const PHASES: PhaseCard[] = [
  {
    phase: 'codex',
    title: 'Phase 0',
    subtitle: 'Codex',
    description: 'Interactive DQL & DPL reference guide with syntax, examples, and cheatsheets for every command.',
    icon: <BookIcon />,
    color: '#7dd3fc',
  },
  {
    phase: 'sandbox',
    title: 'Phase 1',
    subtitle: 'Sandbox',
    description: 'Free-form query editor. Run any DQL pipeline against sample data and explore results instantly.',
    icon: <SearchIcon />,
    color: '#86efac',
  },
  {
    phase: 'visualize',
    title: 'Phase 2',
    subtitle: 'Visualize',
    description: 'Watch each DQL command transform your data with animated step-by-step visualizations.',
    icon: <BarChartIcon />,
    color: '#fcd34d',
  },
  {
    phase: 'cases',
    title: 'Phase 3',
    subtitle: 'Cases',
    description: '60+ guided multi-step scenarios. Solve real investigations using DQL and DPL.',
    icon: <FolderIcon />,
    color: '#f9a8d4',
  },
  {
    phase: 'arcade',
    title: 'Phase 4',
    subtitle: 'Arcade',
    description: 'Five fast-paced mini-games to reinforce your DQL skills under pressure.',
    icon: <GamepadIcon />,
    color: '#c4b5fd',
  },
];

export function LandingPage() {
  const { navigate } = useAppContext();

  return (
    <Flex flexDirection="column" style={{ minHeight: '100%', padding: '2rem' }}>
      {/* Hero */}
      <Flex flexDirection="column" alignItems="center" style={{ paddingBottom: '3rem', textAlign: 'center' }}>
        <Heading level={1}>DQL Investigator</Heading>
        <Text style={{ maxWidth: '560px', marginTop: '0.75rem' }}>
          Master Dynatrace Query Language and Pattern Language through hands-on
          investigations, visualizations, and games — all inside Dynatrace.
        </Text>
      </Flex>

      {/* Phase cards */}
      <Container>
        <Flex flexWrap="wrap" gap={16} justifyContent="center">
          {PHASES.map((p) => (
            <Flex
              key={p.phase}
              flexDirection="column"
              style={{
                width: '280px',
                border: '1px solid var(--dt-color-neutral-700, #334155)',
                borderRadius: '8px',
                padding: '1.5rem',
                gap: '0.75rem',
              }}
            >
              <Flex alignItems="center" gap={8}>
                <span style={{ color: p.color, fontSize: '1.5rem' }}>{p.icon}</span>
                <Flex flexDirection="column">
                  <Text size="small" style={{ color: 'var(--dt-color-neutral-400, #94a3b8)' }}>
                    {p.title}
                  </Text>
                  <Heading level={3}>{p.subtitle}</Heading>
                </Flex>
              </Flex>
              <Text size="small">{p.description}</Text>
              <Button
                onClick={() => navigate(p.phase)}
                style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
              >
                Enter {p.subtitle}
              </Button>
            </Flex>
          ))}
        </Flex>
      </Container>
    </Flex>
  );
}
