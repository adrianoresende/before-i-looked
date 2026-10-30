import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunStatus } from './types.js';

export type Counts = Record<RunStatus, number>;

// Line counts by status for the board. A Night's rows can't give these: a row keeps only
// retries and the last status, so ok and fail lines are lost. So this reads the file itself,
// counting a line only when it has a non-empty `at` and `job` and a known `status` (the same
// bar readNight sets for a valid line).
// null when the file can't be read; the board renders `—`.
export function countNight(runsDir: string, night: string): Counts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: Counts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      continue;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const { at, job, status } = value as Record<string, unknown>;
    if (typeof at !== 'string' || at === '' || typeof job !== 'string' || job === '') continue;
    if (status === 'ok' || status === 'retry' || status === 'fail') counts[status] += 1;
  }
  return counts;
}
