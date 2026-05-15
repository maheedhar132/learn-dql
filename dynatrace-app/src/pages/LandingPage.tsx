import React, { useMemo } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Badge, Surface } from '@dynatrace/strato-components/containers';
import { Tooltip } from '@dynatrace/strato-components/feedback';
import {
  BookOpenIcon,
  TerminalIcon,
  PlayCircleIcon,
  FolderSearchIcon,
  JoystickIcon,
  CheckmarkCircleIcon,
  ArrowRightIcon,
} from '@dynatrace/strato-icons';
import { useAppContext } from '../context/AppContext';
import { ALL_SCENARIOS } from '../lib/dql';
import type { Phase } from '../types/app.types';

interface PhaseCardData {
  phase: Phase;
  phaseNum: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  stat?: string;
}

export function LandingPage() {
  const { state, navigate } = useAppContext();
  const { caseProgress, gameScores } = state;

  const completedCases = useMemo(
    () => Object.values(caseProgress).filter((p) => p.completed).length,
    [caseProgress],
  );

  const totalCases = ALL_SCENARIOS.length;

  const bestGameScore = useMemo(
    () => Math.max(...Object.values(gameScores)),
    [gameScores],
  );

  const PHASES: PhaseCardData[] = [
    {
      phase: 'codex',
      phaseNum: '0',
      title: 'Codex',
      description:
        'Interactive DQL & DPL reference guide. Every command, function, operator, and data type — with syntax and live examples.',
      icon: <BookOpenIcon />,
      accentColor: '#7dd3fc',
      stat: '20+ commands',
    },
    {
      phase: 'sandbox',
      phaseNum: '1',
      title: 'Sandbox',
      description:
        'Free-form query editor. Run any DQL pipeline against synthetic sample data and explore the results in real time.',
      icon: <TerminalIcon />,
      accentColor: '#86efac',
      stat: 'No objectives',
    },
    {
      phase: 'visualize',
      phaseNum: '2',
      title: 'Visualize',
      description:
        'Watch each DQL command physically transform your data: rows filter out, tables merge, columns appear, time buckets fill.',
      icon: <PlayCircleIcon />,
      accentColor: '#fcd34d',
      stat: '8 animations',
    },
    {
      phase: 'cases',
      phaseNum: '3',
      title: 'Cases',
      description:
        'Multi-step guided investigations across DQL, DPL, and combined tracks. Each case is a real-world incident to resolve.',
      icon: <FolderSearchIcon />,
      accentColor: '#f9a8d4',
      stat: `${completedCases}/${totalCases} solved`,
    },
    {
      phase: 'arcade',
      phaseNum: '4',
      title: 'Arcade',
      description:
        'Five fast-paced mini-games to reinforce your skills: Timer Rush, Pipeline Builder, DQL Quiz, DPL Matcher, DPL Builder.',
      icon: <JoystickIcon />,
      accentColor: '#c4b5fd',
      stat: bestGameScore > 0 ? `Best: ${bestGameScore}` : '5 games',
    },
  ];

  return (
    <Flex
      flexDirection="column"
      style={{ padding: '2.5rem 2rem', gap: '2.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <Flex flexDirection="column" style={{ gap: '0.75rem' }}>
        <Flex alignItems="center" style={{ gap: '0.75rem' }}>
          <Heading level={1}>DQL Investigator</Heading>
          <Badge color="neutral">AppEngine</Badge>
        </Flex>
        <Text style={{ maxWidth: '600px', lineHeight: '1.6' }}>
          Master Dynatrace Query Language and Pattern Language through
          hands-on investigations, animated visualizations, and skill-reinforcement
          games — all natively inside Dynatrace.
        </Text>
      </Flex>

      {/* ── Progress summary ──────────────────────────────────────────────── */}
      {completedCases > 0 && (
        <Flex style={{ gap: '1rem' }} alignItems="center">
          <CheckmarkCircleIcon style={{ color: '#22c55e' }} />
          <Text>
            <strong>{completedCases}</strong> of <strong>{totalCases}</strong> cases completed
          </Text>
          {bestGameScore > 0 && (
            <Text style={{ color: 'var(--dt-color-neutral-400, #94a3b8)' }}>
              · Best game score: <strong>{bestGameScore}</strong>
            </Text>
          )}
        </Flex>
      )}

      {/* ── Phase cards ───────────────────────────────────────────────────── */}
      <Flex flexWrap="wrap" style={{ gap: '1rem' }}>
        {PHASES.map((p) => (
          <PhaseCard key={p.phase} data={p} onEnter={() => navigate(p.phase)} />
        ))}
      </Flex>

      {/* ── Quick-start hint ──────────────────────────────────────────────── */}
      <Text size="small" style={{ color: 'var(--dt-color-neutral-400, #94a3b8)' }}>
        New here? Start with{' '}
        <Button variant="minimal" onClick={() => navigate('codex')}>
          Codex
        </Button>{' '}
        to learn the syntax, then{' '}
        <Button variant="minimal" onClick={() => navigate('cases')}>
          Cases
        </Button>{' '}
        to put it into practice.
      </Text>
    </Flex>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase card sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface PhaseCardProps {
  data: PhaseCardData;
  onEnter: () => void;
}

function PhaseCard({ data, onEnter }: PhaseCardProps) {
  return (
    <Surface
      style={{
        width: '220px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1.25rem',
        border: `1px solid var(--dt-color-neutral-700, #334155)`,
        borderTop: `3px solid ${data.accentColor}`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onClick={onEnter}
    >
      {/* Header */}
      <Flex alignItems="center" style={{ gap: '0.5rem' }}>
        <span style={{ color: data.accentColor, fontSize: '1.25rem', lineHeight: 1 }}>
          {data.icon}
        </span>
        <Flex flexDirection="column">
          <Text size="small" style={{ color: 'var(--dt-color-neutral-400, #94a3b8)', lineHeight: 1 }}>
            Phase {data.phaseNum}
          </Text>
          <Heading level={4} style={{ margin: 0 }}>
            {data.title}
          </Heading>
        </Flex>
      </Flex>

      {/* Description */}
      <Text size="small" style={{ lineHeight: '1.5', flex: 1 }}>
        {data.description}
      </Text>

      {/* Footer */}
      <Flex alignItems="center" justifyContent="space-between">
        {data.stat && (
          <Text size="small" style={{ color: data.accentColor }}>
            {data.stat}
          </Text>
        )}
        <Tooltip text={`Enter ${data.title}`} placement="bottom">
          <Button
            variant="default"
            onClick={(e) => { e.stopPropagation(); onEnter(); }}
            style={{ marginLeft: 'auto' }}
          >
            <ArrowRightIcon />
          </Button>
        </Tooltip>
      </Flex>
    </Surface>
  );
}
