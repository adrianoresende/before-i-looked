import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const line = (at: string, job: string, status: string, owner: string | null = 'ana', error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error === undefined ? {} : { error }) });

const NORMAL = [
  line('2026-10-28T02:00:00+01:00', 'zeta-sync', 'ok'),
  line('2026-10-28T02:05:00+01:00', 'alpha-backup', 'retry', 'ana', 'timeout'),
  line('2026-10-28T02:06:00+01:00', 'alpha-backup', 'retry', 'ana', 'timeout'),
  line('2026-10-28T02:07:00+01:00', 'alpha-backup', 'retry', 'ana', 'timeout'),
  line('2026-10-28T02:08:00+01:00', 'alpha-backup', 'ok'),
  line('2026-10-28T02:10:00+01:00', 'mid-report', 'fail', 'bo', 'disk full'),
  line('2026-10-28T02:20:00+01:00', 'calm-job', 'ok'),
].join('\n') + '\n';

const BAD = [
  line('2026-10-27T02:00:00+01:00', 'b-job', 'ok'),
  'this is not json',
  line('2026-10-27T02:01:00+01:00', 'a-job', 'ok'),
].join('\n') + '\n';

const NORMAL_JOBS = ['alpha-backup', 'calm-job', 'mid-report', 'zeta-sync'];

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(join(dir, '2026-10-28.jsonl'), NORMAL);
  writeFileSync(join(dir, '2026-10-26.jsonl'), '');
  writeFileSync(join(dir, '2026-10-27.jsonl'), BAD);
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

// Jobs in the order they appear in the page.
function jobsInPage(html: string): string[] {
  return NORMAL_JOBS.map((job) => ({ job, at: html.indexOf(job) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.job);
}

describe('GET /digest/:night', () => {
  it('renders 200 with the lane banner and one table sorted by job', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html.match(/<table/g)).toHaveLength(1);
    expect(jobsInPage(html)).toEqual(NORMAL_JOBS);
  });

  it('marks rows with 3+ retries or a fail with class warn, and only those', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const rows = html.split(/<tr\b/).slice(1);
    const warn = (job: string) => {
      const row = rows.find((r) => r.includes(job));
      expect(row, `row for ${job}`).toBeDefined();
      return /class="[^"]*\bwarn\b/.test((row ?? '').split('>')[0] ?? '');
    };
    expect(warn('alpha-backup')).toBe(true);
    expect(warn('mid-report')).toBe(true);
    expect(warn('calm-job')).toBe(false);
    expect(warn('zeta-sync')).toBe(false);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty file', async () => {
    const res = await app.request('/digest/2026-10-26');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders 200 with the good rows when a line is bad', async () => {
    const res = await app.request('/digest/2026-10-27');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a-job');
    expect(html).toContain('b-job');
    expect(html.indexOf('a-job')).toBeLessThan(html.indexOf('b-job'));
  });

  it('answers 404 for a path-traversal night', async () => {
    const res = await app.request('/digest/..%2F..');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns { night, rows, badLines } with rows sorted by job', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(body.night).toBe('2026-10-28');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(NORMAL_JOBS);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('gives no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-10-26');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: unknown[]; badLines: number };
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts a bad line and keeps the good rows', async () => {
    const res = await app.request('/api/digest/2026-10-27');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['a-job', 'b-job']);
  });

  it('answers 404 for a night that is not a date', async () => {
    const res = await app.request('/api/digest/not-a-date');
    expect(res.status).toBe(404);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as { rows: { job: string }[] };
    expect(jobsInPage(html)).toEqual(body.rows.map((r) => r.job));
  });
});
