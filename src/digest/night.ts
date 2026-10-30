import type { RigConfig } from '../config.js';
import { readNight } from './read.js';
import type { Night } from './types.js';

// The `:night` path param is the edge: only YYYY-MM-DD reaches the file system, so a param
// like `..%2F..` can't read outside runsDir. Anything else is a night with no file (404).
const NIGHT_ID = /^\d{4}-\d{2}-\d{2}$/;

// The one read behind both the page and the JSON, so they can't disagree (ADR 0001).
export function loadNight(config: RigConfig, night: string): Night | null {
  return NIGHT_ID.test(night) ? readNight(config.runsDir, night) : null;
}
