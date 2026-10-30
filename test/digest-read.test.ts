import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');
  const row = (job: string) => night?.rows.find((r) => r.job === job);

  it('gives one row per job, sorted by job, and counts the bad line', () => {
    expect(night?.night).toBe('2026-10-28');
    expect(night?.badLines).toBe(1);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs and retries, keeps the last status and why it retried', () => {
    expect(row('fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps a failed job with its error', () => {
    expect(row('notes/backup')).toMatchObject({ runs: 1, retries: 0, lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    expect(row('digest/render')).toMatchObject({ owner: null, lastStatus: 'ok', lastError: null });
  });

  it('keeps times as written, offset included', () => {
    expect(row('lane/sync')).toMatchObject({
      runs: 8,
      retries: 1,
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
  });
});

describe('readNight edge cases', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('returns null when the night has no file', () => {
    expect(readNight(dir, '1999-01-01')).toBeNull();
  });

  it('gives a night with no rows for an empty file', () => {
    writeFileSync(join(dir, 'empty.jsonl'), '');
    expect(readNight(dir, 'empty')).toEqual({ night: 'empty', rows: [], badLines: 0 });
  });

  it('counts lines that parse but fail validation, and skips blank lines', () => {
    const lines = [
      '{"at":"2026-10-28T23:00:00+01:00","job":"a","status":"ok","owner":"x"}',
      '{"at":"2026-10-28T23:00:00+01:00","status":"ok","owner":"x"}',
      '{"job":"a","status":"ok","owner":"x"}',
      '{"at":"2026-10-28T23:00:00+01:00","job":"a","status":"skipped","owner":"x"}',
      '[]',
      '',
    ];
    writeFileSync(join(dir, 'mixed.jsonl'), lines.join('\n') + '\n');
    const night = readNight(dir, 'mixed');
    expect(night?.badLines).toBe(4);
    expect(night?.rows).toHaveLength(1);
  });
});
