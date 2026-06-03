/**
 * Pulses Update Command Handler
 *
 * Implements `openaidy pulses update <id>` command.
 */

import * as p from '@clack/prompts';
import { resolveCLIConfig } from '../../lib/config.js';
import { readAdminToken } from '../../lib/admin-token.js';
import type { CommandResult } from '../../types.js';
import type { PulseRecord, PulseScheduleInput } from '@openaidy/shared-types';

type UpdateOptions = {
  name?: string;
  prompt?: string;
  status?: 'active' | 'paused';
  every?: string;
  daily?: string;
  cron?: string;
  at?: string;
  agentId?: string;
  sessionId?: string;
};

function parseArgs(args: string[]): { pulseId: string; opts: UpdateOptions } {
  const opts: UpdateOptions = {};
  const ids: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--name') opts.name = args[++i]!;
    else if (arg === '--prompt') opts.prompt = args[++i]!;
    else if (arg === '--status') opts.status = args[++i]! as 'active' | 'paused';
    else if (arg === '--every') opts.every = args[++i]!;
    else if (arg === '--daily') opts.daily = args[++i]!;
    else if (arg === '--cron') opts.cron = args[++i]!;
    else if (arg === '--at') opts.at = args[++i]!;
    else if (arg === '--agent-id') opts.agentId = args[++i]!;
    else if (arg === '--session-id') opts.sessionId = args[++i]!;
    else if (!arg.startsWith('-')) ids.push(arg);
  }
  return { pulseId: ids[0] ?? '', opts };
}

function buildScheduleInput(opts: UpdateOptions): PulseScheduleInput | undefined {
  if (opts.every) {
    const everyValues = ['15m', '30m', '1h', '6h', '12h', '1d', '1w'] as const;
    if (!everyValues.includes(opts.every as typeof everyValues[number])) {
      throw new Error(`Invalid --every value "${opts.every}". Valid: ${everyValues.join(', ')}`);
    }
    return { every: opts.every };
  }
  if (opts.daily) {
    const parts = opts.daily.split(':');
    if (parts.length !== 2) throw new Error('--daily must be in HH:MM format');
    return {
      daily: {
        hour: parseInt(parts[0]!, 10),
        minute: parseInt(parts[1]!, 10),
      },
    };
  }
  if (opts.cron) return { cron: opts.cron };
  if (opts.at) return { at: opts.at };
  return undefined;
}

function showHelp(): void {
  p.note(
    `Usage: openaidy pulses update <id> [options]

Update an existing pulse.

Arguments:
  <id>    Pulse ID (required)

Options:
  --name <name>       Rename the pulse
  --prompt <prompt>   Update the prompt
  --status <status>   Set status: active or paused
  --every <interval>  Change schedule interval (15m, 30m, 1h, 6h, 12h, 1d, 1w)
  --daily <HH:MM>     Run daily at a specific time
  --cron <expr>       Use a cron expression
  --at <ISO-date>     Run once at a specific date

Examples:
  pnpm openaidy pulses update pulse_abc123 --status paused
  pnpm openaidy pulses update pulse_abc123 --every 1h --prompt "New prompt"
  pnpm openaidy pulses update pulse_abc123 --name "New Name"

Exit Codes:
  0  Success
  1  Error
  2  Missing required argument`,
    'Help',
  );
}

export async function pulsesUpdateHandler(
  args: string[],
): Promise<CommandResult> {
  if (args.includes('-h') || args.includes('--help')) {
    showHelp();
    return { exitCode: 0 };
  }

  const { pulseId, opts } = parseArgs(args);

  if (!pulseId) {
    const msg = 'Pulse ID is required.\n\nUsage: openaidy pulses update <id> [options]';
    p.log.error(msg);
    return { exitCode: 2, error: msg };
  }

  const body: Record<string, unknown> = {};
  if (opts.name !== undefined) body.name = opts.name;
  if (opts.prompt !== undefined) body.prompt = opts.prompt;
  if (opts.status !== undefined) body.status = opts.status;
  if (opts.agentId !== undefined) body.agentId = opts.agentId;
  if (opts.sessionId !== undefined) body.sessionId = opts.sessionId;

  if (opts.every || opts.daily || opts.cron || opts.at) {
    try {
      body.schedule = buildScheduleInput(opts);
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      return { exitCode: 2, error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (Object.keys(body).length === 0) {
    const msg = 'No update options provided. Use --help for available options.';
    p.log.error(msg);
    return { exitCode: 2, error: msg };
  }

  const config = resolveCLIConfig();
  const tokenResult = await readAdminToken(config.tokenPath);
  if (!tokenResult.ok) {
    p.log.error(tokenResult.error);
    return { exitCode: 1, error: tokenResult.error };
  }

  let res: Response;
  try {
    res = await fetch(`${config.httpUrl}/api/pulses/${pulseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = `Cannot reach server: ${err instanceof Error ? err.message : String(err)}`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  if (res.status === 404) {
    p.log.error(`Pulse "${pulseId}" not found.`);
    return { exitCode: 1, error: `Pulse "${pulseId}" not found.` };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const msg = `Server returned ${res.status}: ${body.message ?? res.statusText}`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  const { pulse } = (await res.json()) as { pulse: PulseRecord };
  p.log.success(`Pulse "${pulse.name}" updated.`);
  return { exitCode: 0 };
}