import React from 'react';
import {
  Flex,
  Button,
  Text,
  Tooltip,
  Badge,
} from '@dynatrace/strato-components-full';
import {
  BookOpenIcon,
  TerminalIcon,
  PlayCircleIcon,
  FolderSearchIcon,
  JoystickIcon,
  HomeIcon,
} from '@dynatrace/strato-icons';
import { useAppContext } from '../context/AppContext';
import type { Phase } from '../types/app.types';

interface NavItem {
  phase: Phase;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  tooltip: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    phase: 'codex',
    label: 'Codex',
    shortLabel: '0',
    icon: <BookOpenIcon />,
    tooltip: 'Phase 0 — DQL & DPL reference guide',
  },
  {
    phase: 'sandbox',
    label: 'Sandbox',
    shortLabel: '1',
    icon: <TerminalIcon />,
    tooltip: 'Phase 1 — Free-form query editor',
  },
  {
    phase: 'visualize',
    label: 'Visualize',
    shortLabel: '2',
    icon: <PlayCircleIcon />,
    tooltip: 'Phase 2 — Animated data transformations',
  },
  {
    phase: 'cases',
    label: 'Cases',
    shortLabel: '3',
    icon: <FolderSearchIcon />,
    tooltip: 'Phase 3 — Guided investigation scenarios',
  },
  {
    phase: 'arcade',
    label: 'Arcade',
    shortLabel: '4',
    icon: <JoystickIcon />,
    tooltip: 'Phase 4 — Skill-reinforcement mini-games',
  },
];

export function TopNav() {
  const { state, navigate } = useAppContext();
  const { currentPhase, caseProgress } = state;

  const completedCases = Object.values(caseProgress).filter((p) => p.completed).length;

  return (
    <Flex
      alignItems="center"
      style={{
        height: '52px',
        padding: '0 1rem',
        borderBottom: '1px solid var(--dt-color-neutral-700, #334155)',
        flexShrink: 0,
        gap: '0.25rem',
      }}
    >
      {/* Logo / Home */}
      <Tooltip text="Home" placement="bottom">
        <Button
          variant={currentPhase === 'landing' ? 'emphasized' : 'default'}
          onClick={() => navigate('landing')}
          style={{ marginRight: '0.5rem' }}
        >
          <HomeIcon />
          <Text
            style={{
              fontWeight: 700,
              letterSpacing: '-0.01em',
              display: 'inline',
            }}
          >
            DQL Investigator
          </Text>
        </Button>
      </Tooltip>

      <Flex
        style={{
          width: '1px',
          height: '24px',
          background: 'var(--dt-color-neutral-700, #334155)',
          margin: '0 0.5rem',
        }}
      />

      {/* Phase navigation */}
      {NAV_ITEMS.map((item) => {
        const isActive = currentPhase === item.phase;
        return (
          <Tooltip key={item.phase} text={item.tooltip} placement="bottom">
            <Button
              variant={isActive ? 'emphasized' : 'default'}
              onClick={() => navigate(item.phase)}
            >
              {item.icon}
              {item.label}
            </Button>
          </Tooltip>
        );
      })}

      {/* Progress badge — pushes to the right */}
      <Flex style={{ marginLeft: 'auto', alignItems: 'center', gap: '0.5rem' }}>
        {completedCases > 0 && (
          <Tooltip text={`${completedCases} case${completedCases !== 1 ? 's' : ''} completed`} placement="bottom">
            <Badge color="success">{completedCases} solved</Badge>
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
}
