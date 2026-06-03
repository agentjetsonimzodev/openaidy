/**
 * Pulses List Command Handler
 *
 * Implements `openaidy pulses list` command.
 */

import * as p from '@clack/prompts';
import { resolveCLIConfig } from '../../lib/config.js';
import { readAdminToken } from '../../lib/admin-token.js';
import { formatPulseList, formatEmptyState } from '../../formatters/pulses.js';
import type { CommandResult } from '../../types.js';
import type { PulseListResponse } from '@openaidy/shared-types';

export async function pulsesListHandler(args: string[]): Promise<CommandResult> {
  if (args.includes('-h') || args.includes('--help')) {
    p.note(
      `Usage: openaidy pulses list [--status <status>] [--limit <n>] [--offset <n>]

List all pulses (scheduled AI tasks).

Options:
  --status <status>  Filter by status: active, paused, completed, failed
  --limit <n>        Maximum number of results (default: 50, max: 100)
  --offset <n>       Pagination offset (default: 0)

Examples:
  pnpm openaidy pulses list
  pnpm openaidy pulses list --status active
  pnpm openaidy pulses list --limit 10

Exit Codes:
  0  Success
  1  Error (server unreachable, not authenticated)
  2  Invalid arguments`,
      'Help',
    );
    return { exitCode: 0 };
  }

  // Parse options
  const opts: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--status') opts.status = args[++i]!;
    else if (args[i] === '--limit') opts.limit = args[++i]!;
    else if (args[i] === '--offset') opts.offset = args[++i]!;
    else if (!args[i]!.startsWith('-')) rest.push(args[i]!);
  }

  if (rest.length > 0) {
    return { exitCode: 2, error: `Unknown argument(s): ${rest.join(', ')}` };
  }

  const config = resolveCLIConfig();
  const tokenResult = await readAdminToken(config.tokenPath);
  if (!tokenResult.ok) {
    p.log.error(tokenResult.error);
    return { exitCode: 1, error: tokenResult.error };
  }

  // Build query params
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.limit) params.set('limit', opts.limit);
  if (opts.offset) params.set('offset', opts.offset);

  let res: Response;
  try {
    res = await fetch(`${config.httpUrl}/api/pulses?${params}`, {
      headers: { Authorization: `Bearer ${tokenResult.token}` },
    });
  } catch (err) {
    const msg = `Cannot reach server at ${config.httpUrl}.\n${err instanceof Error ? err.message : String(err)}\n\nMake sure the server is running.`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const msg = `Server returned ${res.status}: ${body.message ?? res.statusText}`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  const data = (await res.json()) as PulseListResponse;

  if (data.pulses.length === 0) {
    p.note(formatEmptyState(), 'Pulses');
  } else {
    p.note(formatPulseList(data.pulses), `Pulses (${data.total})`);
  }

  return { exitCode: 0 };
}