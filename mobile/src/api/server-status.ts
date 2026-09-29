import axios from 'axios';
import { create } from 'zustand';

export type ServerState = 'unknown' | 'waking' | 'ready' | 'unreachable';

export const useServerStatus = create<{ state: ServerState }>(() => ({ state: 'unknown' }));

const setState = (state: ServerState) => useServerStatus.setState({ state });

// The hosted API sleeps after 15 minutes without traffic and takes up to about a
// minute to wake. Re-check a little before the 15-minute mark, and give the
// wake-up check far longer than a normal request's timeout.
const STALE_AFTER_MS = 12 * 60_000;
const WAKE_TIMEOUT_MS = 90_000;
// Only show the banner if the check is actually slow, so an awake server never flashes it.
const BANNER_DELAY_MS = 1500;

let lastContact = 0;
let inflight: Promise<void> | null = null;

export function markServerContact() {
  lastContact = Date.now();
  if (useServerStatus.getState().state !== 'ready') setState('ready');
}

/**
 * Resolves once the server has answered /health (or the wake-up attempt gave
 * up). Never rejects: if the server is truly unreachable, the caller's own
 * request fails with its normal error. Concurrent callers share one check.
 */
export function ensureServerAwake(baseURL: string, force = false): Promise<void> {
  if (!force && Date.now() - lastContact < STALE_AFTER_MS) return Promise.resolve();
  if (inflight) return inflight;

  const banner = setTimeout(() => setState('waking'), BANNER_DELAY_MS);
  inflight = axios
    .get(`${baseURL}/health`, { timeout: WAKE_TIMEOUT_MS })
    .then(() => markServerContact())
    .catch(() => setState('unreachable'))
    .finally(() => {
      clearTimeout(banner);
      inflight = null;
    });
  return inflight;
}
