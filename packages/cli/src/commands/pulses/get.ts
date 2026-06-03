/**
 * Pulses Get Command Handler
 *
 * Implements `openaidy pulses get <id>` command.
 */

import * as p from '@clack/prompts';
import { resolveCLIConfig } from '../../lib/config.js';
import { readAdminToken } from '../../lib/admin-token.js';
import { formatPulseDetail } from '../../formatters/pulses.js';
import type { CommandResult } from '../../types.js';
import type { PulseRecord } from '@openaidy/shared-types';

export async function pulsesGetHandler(args: string[]): Promise<CommandResult> {
  if (args.includes('-h') || args.includes('--help')) {
    p.note(
      `Usage: openaidy pulses get <id>

Get detailed information about a specific pulse.

Arguments:
  <id>    Pulse ID (required)

Examples:
  pnpm openaidy pulses get pulse_abc123

Exit Codes:
  0  Success
  1  Error (server unreachable, not authenticated)
  2  Missing required argument`,
      'Help',
    );
    return { exitCode: 0 };
  }

  // Collect non-option args as potential IDs
  const ids = args.filter((a) => !a.startsWith('-'));

  if (ids.length === 0) {
    const msg = 'Pulse ID is required.\n\nUsage: openaidy pulses get <id>';
    p.log.error(msg);
    return { exitCode: 2, error: msg };
  }

  const pulseId = ids[0]!;
  const config = resolveCLIConfig();
  const tokenResult = await readAdminToken(config.tokenPath);
  if (!tokenResult.ok) {
    p.log.error(tokenResult.error);
    return { exitCode: 1, error: tokenResult.error };
  }

  let res: Response;
  try {
    res = await fetch(`${config.httpUrl}/api/pulses/${pulseId}`, {
      headers: { Authorization: `Bearer ${tokenResult.token}` },
    });
  } catch (err) {
    const msg = `Cannot reach server at ${config.httpUrl}.\n${err instanceof Error ? err.message : String(err)}`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  if (res.status === 404) {
    const msg = `Pulse "${pulseId}" not found.`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const msg = `Server returned ${res.status}: ${body.message ?? res.statusText}`;
    p.log.error(msg);
    return { exitCode: 1, error: msg };
  }

  const { pulse } = (await res.json()) as { pulse: PulseRecord };
  p.note(formatPulseDetail(pulse), pulse.name);

  return { exitCode: 0 };
}