/**
 * Pulse Formatters
 *
 * Shared formatting logic for pulses CLI output.
 */

import type {
  PulseRecord,
  PulseRun,
  PulseStatus,
} from '@openaidy/shared-types';
import { formatRelativeDate, formatFullDate } from './sessions.js';

// ---------------------------------------------------------------------------
// Status icon
// ---------------------------------------------------------------------------

function statusIcon(status: PulseStatus): string {
  switch (status) {
    case 'active':
      return '●';
    case 'paused':
      return '○';
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    default:
      return '?';
  }
}

// ---------------------------------------------------------------------------
// formatPulseList
// ---------------------------------------------------------------------------

export function formatPulseList(pulses: PulseRecord[]): string {
  if (pulses.length === 0) {
    return 'No pulses found.\n\nCreate one with: openaidy pulses create';
  }

  const lines: string[] = [];
  for (const pulse of pulses) {
    const icon = statusIcon(pulse.status);
    lines.push(`  ${icon} ${pulse.name}`);
    lines.push(`    ID:       ${pulse.id}`);
    lines.push(`    Schedule: ${pulse.scheduleHuman}`);
    lines.push(`    Status:   ${pulse.status}`);
    if (pulse.nextRunAt) {
      lines.push(`    Next run: ${formatRelativeDate(pulse.nextRunAt)}`);
    }
    if (pulse.lastRunAt) {
      lines.push(`    Last run: ${formatRelativeDate(pulse.lastRunAt)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

// ---------------------------------------------------------------------------
// formatPulseDetail
// ---------------------------------------------------------------------------

export function formatPulseDetail(pulse: PulseRecord): string {
  const lines: string[] = [];

  lines.push(pulse.name);
  lines.push('=======' + '='.repeat(pulse.name.length));
  lines.push(`ID:           ${pulse.id}`);
  lines.push(`Status:       ${statusIcon(pulse.status)} ${pulse.status}`);
  lines.push(`Schedule:     ${pulse.scheduleHuman}`);
  lines.push(`Created:      ${formatFullDate(pulse.createdAt)}`);
  if (pulse.nextRunAt) lines.push(`Next run:     ${formatFullDate(pulse.nextRunAt)}`);
  if (pulse.lastRunAt) lines.push(`Last run:     ${formatFullDate(pulse.lastRunAt)}`);
  if (pulse.agentId) lines.push(`Agent ID:     ${pulse.agentId}`);
  if (pulse.sessionId) lines.push(`Session ID:   ${pulse.sessionId}`);
  lines.push('');
  lines.push('Prompt');
  lines.push('------');
  lines.push(pulse.prompt);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// formatPulseRuns
// ---------------------------------------------------------------------------

export function formatPulseRuns(runs: PulseRun[], pulseName: string): string {
  if (runs.length === 0) {
    return `No runs found for "${pulseName}".\n\nTrigger a run with: openaidy pulses trigger ${pulseName}`;
  }

  const lines: string[] = [
    `Runs for "${pulseName}"`,
    '=======================',
    '',
  ];

  for (const run of runs) {
    const icon =
      run.status === 'succeeded'
        ? '✓'
        : run.status === 'failed'
          ? '✗'
          : run.status === 'running'
            ? '…'
            : '○';
    lines.push(`  ${icon} ${run.id}`);
    lines.push(`    Status:   ${run.status}`);
    if (run.durationMs) lines.push(`    Duration: ${run.durationMs}ms`);
    if (run.error) lines.push(`    Error:    ${run.error}`);
    lines.push(`    Started:  ${formatRelativeDate(run.createdAt)}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

// ---------------------------------------------------------------------------
// formatEmptyState
// ---------------------------------------------------------------------------

export function formatEmptyState(): string {
  return 'No pulses found.\n\nCreate one with: openaidy pulses create';
}