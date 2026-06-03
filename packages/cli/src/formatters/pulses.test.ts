/**
 * Pulses Formatter Tests
 */

import { describe, it, expect } from 'vitest';
import {
  formatPulseList,
  formatPulseDetail,
  formatPulseRuns,
  formatEmptyState,
} from './pulses.js';
import type { PulseRecord, PulseRun } from '@openaidy/shared-types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makePulse(overrides: Partial<PulseRecord> = {}): PulseRecord {
  return {
    id: 'pulse-001',
    name: 'Test Pulse',
    prompt: 'What is the weather?',
    schedule: { cron: '0 * * * *' },
    scheduleHuman: 'Every hour',
    status: 'active',
    nextRunAt: '2026-01-01T12:00:00Z',
    lastRunAt: '2026-01-01T11:00:00Z',
    createdAt: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

function makeRun(overrides: Partial<PulseRun> = {}): PulseRun {
  return {
    id: 'run-001',
    jobId: 'pulse-001',
    status: 'succeeded',
    durationMs: 1234,
    createdAt: '2026-01-01T11:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formatPulseList
// ---------------------------------------------------------------------------

describe('formatPulseList', () => {
  it('returns empty state when list is empty', () => {
    const output = formatPulseList([]);
    expect(output).toContain('No pulses found');
    expect(output).toContain('openaidy pulses create');
  });

  it('formats a single active pulse', () => {
    const pulse = makePulse({ name: 'Daily Digest', status: 'active' });
    const output = formatPulseList([pulse]);
    expect(output).toContain('Daily Digest');
    expect(output).toContain('pulse-001');
    expect(output).toContain('●'); // active icon
  });

  it('formats paused pulse with circle icon', () => {
    const pulse = makePulse({ status: 'paused' });
    const output = formatPulseList([pulse]);
    expect(output).toContain('○'); // paused icon
    expect(output).toContain('paused');
  });

  it('formats failed pulse with X icon', () => {
    const pulse = makePulse({ status: 'failed' });
    const output = formatPulseList([pulse]);
    expect(output).toContain('✗');
    expect(output).toContain('failed');
  });

  it('shows schedule human description', () => {
    const pulse = makePulse({ scheduleHuman: 'Every 15 minutes' });
    const output = formatPulseList([pulse]);
    expect(output).toContain('Every 15 minutes');
  });

  it('shows next run time', () => {
    const pulse = makePulse({ nextRunAt: '2026-06-01T09:00:00Z' });
    const output = formatPulseList([pulse]);
    expect(output).toContain('Next run:');
  });

  it('shows last run time', () => {
    const pulse = makePulse({ lastRunAt: '2026-06-01T08:00:00Z' });
    const output = formatPulseList([pulse]);
    expect(output).toContain('Last run:');
  });
});

// ---------------------------------------------------------------------------
// formatPulseDetail
// ---------------------------------------------------------------------------

describe('formatPulseDetail', () => {
  it('formats pulse with all fields', () => {
    const pulse = makePulse({ name: 'My Pulse', agentId: 'agent-1', sessionId: 'sess-1' });
    const output = formatPulseDetail(pulse);
    expect(output).toContain('My Pulse');
    expect(output).toContain('pulse-001');
    expect(output).toContain('● active');
    expect(output).toContain('Every hour');
    expect(output).toContain('What is the weather?');
    expect(output).toContain('Agent ID:');
    expect(output).toContain('Session ID:');
  });

  it('omits optional fields when not present', () => {
    const pulse = makePulse({ agentId: undefined, sessionId: undefined, lastRunAt: undefined, nextRunAt: undefined });
    const output = formatPulseDetail(pulse);
    expect(output).toContain('My Pulse');
    expect(output).not.toContain('Agent ID:');
    expect(output).not.toContain('Session ID:');
  });

  it('shows full date for created/next/last run times', () => {
    const pulse = makePulse({
      createdAt: '2026-01-01T10:00:00Z',
      nextRunAt: '2026-01-01T12:00:00Z',
      lastRunAt: '2026-01-01T11:00:00Z',
    });
    const output = formatPulseDetail(pulse);
    expect(output).toContain('Created:');
    expect(output).toContain('Next run:');
    expect(output).toContain('Last run:');
  });
});

// ---------------------------------------------------------------------------
// formatPulseRuns
// ---------------------------------------------------------------------------

describe('formatPulseRuns', () => {
  it('returns empty state when no runs', () => {
    const output = formatPulseRuns([], 'Test Pulse');
    expect(output).toContain('No runs found');
    expect(output).toContain('Test Pulse');
    expect(output).toContain('opaidy pulses trigger');
  });

  it('shows check icon for succeeded run', () => {
    const run = makeRun({ status: 'succeeded' });
    const output = formatPulseRuns([run], 'Test');
    expect(output).toContain('✓');
  });

  it('shows X icon for failed run', () => {
    const run = makeRun({ status: 'failed' });
    const output = formatPulseRuns([run], 'Test');
    expect(output).toContain('✗');
    expect(output).toContain('failed');
  });

  it('shows ellipsis for running run', () => {
    const run = makeRun({ status: 'running' });
    const output = formatPulseRuns([run], 'Test');
    expect(output).toContain('…');
  });

  it('shows duration when present', () => {
    const run = makeRun({ durationMs: 5000 });
    const output = formatPulseRuns([run], 'Test');
    expect(output).toContain('5000ms');
  });

  it('shows error when present', () => {
    const run = makeRun({ error: 'Rate limited' });
    const output = formatPulseRuns([run], 'Test');
    expect(output).toContain('Rate limited');
  });
});

// ---------------------------------------------------------------------------
// formatEmptyState
// ---------------------------------------------------------------------------

describe('formatEmptyState', () => {
  it('returns empty state with create hint', () => {
    const output = formatEmptyState();
    expect(output).toContain('No pulses found');
    expect(output).toContain('openaidy pulses create');
  });
});