/**
 * Pulses Trigger Command Handler
 *
 * Implements `openaidy pulses trigger <id>` command.
 */

import * as p from '@clack/prompts';
import { resolveCLIConfig } from '../../lib/config.js';
import { readAdminToken } from '../../lib/admin-token.js';
import type { CommandResult } from '../../types.js';
import type { PulseRecord } from '@openaidy/shared-types';

export async function pulsesTriggerHandler(
  args: string[],
): Promise<CommandResult> {
  if (args.includes('-h') || args.includes('--help')) {
    p.note(
      `Usage: openaidy pulses trigger <id>

Manually trigger a pulse to run immediately (outside of its schedule).

Arguments:
  <id>    Pulse ID (required)

Examples:
  pnpm openaidy pulses trigger pulse_abc123

Exit Codes:
  0  Success (triggered successfully)
  1  Error (not found, not authenticated)
  2  Missing required argument`,
      'Help',
    );
    return { exitCode: 0 };
  }

  const ids = args.filter((a) => !a.startsWith('-'));

  if (ids.length === 0) {
    const msg = 'Pulse ID is required.\n\nUsage: openaidy pulses trigger <id>';
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
    res = await fetch(`${config.httpUrl}/api/pulses/${pulseId}/trigger`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResult.token}` },
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

  p.log.success(`Pulse "${pulseId}" triggered.`);

  // Optionally show the run info
  const data = (await res.json()) as { run?: { id: string; status: string } };
  if (data.run) {
    p.log.success(`Run started: ${data.run.id} (${data.run.status})`);
  }

  return { exitCode: 0 };
}