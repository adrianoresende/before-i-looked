import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';
import type { RunStatus } from './types.js';

export type Counts = Record<RunStatus, number>;

// Line counts by status for the board. A Night's rows can't give these: a row keeps only
// retries and the last status, so ok and fail lines are lost. So this reads the file itself,
// with readNight's own parser, so both agree on which lines count.
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
    const line = parseLine(raw);
    if (line !== null) counts[line.status] += 1;
  }
  return counts;
}
