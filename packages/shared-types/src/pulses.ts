/**
 * Pulse Types
 *
 * Shared type definitions for pulse (scheduled AI task) API responses.
 */

export type PulseStatus = 'active' | 'paused' | 'completed' | 'failed';

/** Schedule as returned by GET /pulses and related endpoints */
export type PulseSchedule =
  | { cron: string }
  | { at: string };

/** A single pulse as returned by GET /pulses and GET /pulses/:id */
export type PulseRecord = {
  id: string;
  name: string;
  prompt: string;
  schedule: PulseSchedule;
  /** Human-readable schedule description (e.g. "Every 15 minutes") */
  scheduleHuman: string;
  status: PulseStatus;
  agentId?: string;
  sessionId?: string;
  lastRunAt?: string; // ISO date string
  nextRunAt: string; // ISO date string
  createdAt: string; // ISO date string
};

/** A pulse run (execution record) as returned by GET /pulses/:id/history */
export type PulseRun = {
  id: string;
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  /** Duration in milliseconds */
  durationMs?: number;
  error?: string;
  createdAt: string; // ISO date string
};

/** API response for GET /pulses */
export type PulseListResponse = {
  pulses: PulseRecord[];
  total: number;
  limit: number;
  offset: number;
};

/** API response for GET /pulses/:id/history */
export type PulseHistoryResponse = {
  runs: PulseRun[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Schedule input format for creating a pulse via CLI.
 * Matches the server's internal ScheduleInput discriminated union.
 */
export type PulseScheduleInput =
  | { every: '15m' | '30m' | '1h' | '6h' | '12h' | '1d' | '1w' }
  | { daily: { hour: number; minute: number } }
  | { cron: string; tz?: string }
  | { at: string };