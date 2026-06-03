/**
 * Pulses History Command Handler
 *
 * Implements `openaidy pulses history <id>` command.
 */

import * as p from '@clack/prompts';
import { resolveCLIConfig } from '../../lib/config.js';
import { readAdminToken } from '../../lib/admin-token.js';
import { formatPulseRuns } from '../../formatters/pulses.js';
import type { CommandResult } from '../../types.js';
import type { PulseRecord, PulseHistoryResponse } from '@openaidy/shared-types';

export async function pulsesHistoryHandler(
  args: string[],
): Promise<CommandResult> {
  if (args.includes('-h') || args.includes('--help')) {
    p.note(
      `Usage: openaidy pulses history <id> [--limit <n>] [--offset <n>]

List execution history (runs) for a pulse.

Arguments:
  <id>    Pulse ID (required)

Options:
  --limit <n>   Maximum results (default: 50, max: 100)
  --offset <n>  Pagination offset (default: 0)

Examples:
  pnpm openaidy pulses history pulse_abc123
  pnpm openaidy pulses history pulse_abc123 --limit 10

Exit Codes:
  0  Success
  1  Error (not found, not authenticated)
  2  Missing required argument`,
      'Help',
    );
    return { exitCode: 0 };
  }

  const ids = args.filter((a) => !a.startsWith('-'));
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') opts.limit = args[++i]!;
    else if (args[i] === '--offset') opts.offset = args[++i]!;
  }

  if (ids.length === 0) {
    const msg = 'Pulse ID is required.\n\nUsage: openaidy pulses history <id>';
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

  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', opts.limit);
  if (opts.offset) params.set('offset', opts.offset);

  let res: Response;
  try {
    res = await fetch(`${config.httpUrl}/api/pulses/${pulseId}/history?${params}`, {
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

  const { runs, total } = (await res.json()) as PulseHistoryResponse;

  // Fetch pulse name for display
  let pulseName = pulseId;
  try {
    const detailRes = await fetch(`${config.httpUrl}/api/pulses/${pulseId}`, {
      headers: { Authorization: `Bearer ${tokenResult.token}` },
    });
    if (detailRes.ok) {
      const { pulse } = (await detailRes.json()) as { pulse: PulseRecord };
      pulseName = pulse.name;
    }
  } catch {
    // Non-fatal: use ID as fallback
  }

  p.note(formatPulseRuns(runs, pulseName), `Runs (${total})`);

  return { exitCode: 0 };
}