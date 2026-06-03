/**
 * Pulses Create Command Handler
 *
 * Implements `openaidy pulses create` command.
 */

import * as p from '@clack/prompts';
import { resolveCLIConfig } from '../../lib/config.js';
import { readAdminToken } from '../../lib/admin-token.js';
import type { CommandResult } from '../../types.js';
import type { PulseScheduleInput } from '@openaidy/shared-types';

type CreateOptions = {
  name?: string;
  prompt?: string;
  every?: string;
  daily?: string;
  cron?: string;
  at?: string;
  agentId?: string;
  sessionId?: string;
};

function parseArgs(args: string[]): { opts: CreateOptions; rest: string[] } {
  const opts: CreateOptions = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--name') opts.name = args[++i]!;
    else if (arg === '--prompt') opts.prompt = args[++i]!;
    else if (arg === '--every') opts.every = args[++i]!;
    else if (arg === '--daily') opts.daily = args[++i]!;
    else if (arg === '--cron') opts.cron = args[++i]!;
    else if (arg === '--at') opts.at = args[++i]!;
    else if (arg === '--agent-id') opts.agentId = args[++i]!;
    else if (arg === '--session-id') opts.sessionId = args[++i]!;
    else if (!arg.startsWith('-')) rest.push(arg);
  }
  return { opts, rest };
}

function buildScheduleInput(opts: CreateOptions): PulseScheduleInput {
  if (opts.every) {
    const everyValues = ['15m', '30m', '1h', '6h', '12h', '1d', '1w'] as const;
    if (!everyValues.includes(opts.every as typeof everyValues[number])) {
      throw new Error(
        `Invalid --every value "${opts.every}". Valid: ${everyValues.join(', ')}`,
      );
    }
    return { every: opts.every };
  }
  if (opts.daily) {
    const parts = opts.daily.split(':');
    if (parts.length !== 2) {
      throw new Error('--daily must be in HH:MM format, e.g. "09:30"');
    }
    const hour = parseInt(parts[0]!, 10);
    const minute = parseInt(parts[1]!, 10);
    if (isNaN(hour) || isNaN(minute)) {
      throw new Error('--daily must be in HH:MM format');
    }
    return { daily: { hour, minute } };
  }
  if (opts.cron) {
    return { cron: opts.cron };
  }
  if (opts.at) {
    return { at: opts.at };
  }
  throw new Error('A schedule must be provided via --every, --daily, --cron, or --at.');
}

function showHelp(): void {
  p.note(
    `Usage: openaidy pulses create --name <name> --prompt <prompt> --every <interval>

Create a new pulse (scheduled AI task).

Required:
  --name <name>      Name for this pulse
  --prompt <prompt>  The prompt/question to run on schedule

Schedule (pick one):
  --every <interval>  Run every N minutes/hours/days.
                       Valid: 15m, 30m, 1h, 6h, 12h, 1d, 1w
  --daily <HH:MM>     Run daily at a specific time (e.g. "09:30")
  --cron <expr>       Run on a cron expression (e.g. "0 */6 * * *")
  --at <ISO-date>     Run once at a specific date (e.g. "2026-06-01T09:00:00Z")

Optional:
  --agent-id <id>    Associate with a specific agent
  --session-id <id>   Associate with a session (must be a valid UUID)

Examples:
  pnpm openaidy pulses create --name "Daily News" --prompt "What happened today?" --every 1d
  pnpm openaidy pulses create --name "Morning Brief" --prompt "Summarize my emails" --daily 08:00
  pnpm openaidy pulses create --name "Weekly Review" --prompt "What did I accomplish this week?" --every 1w

Exit Codes:
  0  Success
  1  Error (server unreachable, not authenticated, validation failed)
  2  Missing required arguments`,
    'Help',
  );
}

export async function pulsesCreateHandler(
  args: string[],
): Promise<CommandResult> {
  if (args.includes('-h') || args.includes('--help')) {
    showHelp();
    return { exitCode: 0 };
  }

  const { opts, rest } = parseArgs(args);

  // Name: positional or --name
  const name = opts.name ?? rest[0];
  if (!name) {
    const msg = 'Missing required --name argument.\n\nUsage: openaidy pulses create --name <name> --prompt <prompt> ...';
    p.log.error(msg);
    return { exitCode: 2, error: msg };
  }

  // Prompt: --prompt or positional
  const prompt = opts.prompt ?? rest[1];
  if (!prompt) {
    const msg = 'Missing required --prompt argument.\n\nUsage: openaidy pulses create --name <name> --prompt <prompt> ...';
    p.log.error(msg);
    return { exitCode: 2, error: msg };
  }

  // Build schedule
  let scheduleInput: PulseScheduleInput;
  try {
    scheduleInput = buildScheduleInput(opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    p.log.error(msg);
    return { exitCode: 2, error: msg };
  }

  const config = resolveCLIConfig();
  const tokenResult = await readAdminToken(config.tokenPath);
  if (!tokenResult.ok) {
    p.log.error(tokenResult.error);
    return { exitCode: 1, error: tokenResult.error };
  }

  const body: Record<string, unknown> = { name, prompt, schedule: scheduleInput };
  if (opts.agentId) body.agentId = opts.agentId;
  if (opts.sessionId) body.sessionId = opts.sessionId;

  let res: Response;
  try {
    res = await fetch(`${config.httpUrl}/api/pulses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = `Cannot reach server at ${config.httpUrl}.\n${err instanceof Error ? err.message : String(err)}`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const msg = `Server returned ${res.status}: ${body.message ?? res.statusText}`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  p.log.success(`Pulse "${name}" created successfully.`);
  return { exitCode: 0 };
}