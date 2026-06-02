import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  registerSession,
  deregisterSession,
  sweepRegisteredSessions,
  touchSession,
  markStale,
  REGISTRY_KEY,
} from './session-registry';

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('session-registry', () => {
  it('registers and deregisters a DB name with a timestamp', () => {
    registerSession('record-me-chunks-abc', 1000);
    expect(localStorage.getItem(REGISTRY_KEY)).toContain('record-me-chunks-abc');
    deregisterSession('record-me-chunks-abc');
    expect(localStorage.getItem(REGISTRY_KEY)).not.toContain('record-me-chunks-abc');
  });

  it('sweeps entries older than the threshold and deletes their DBs', async () => {
    const now = 10_000_000;
    registerSession('record-me-chunks-stale', now - 5_000_000); // older than 1h
    registerSession('record-me-chunks-fresh', now - 1_000); // recent
    const deleted: string[] = [];
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((name: string) => {
      deleted.push(name);
      const req = {} as IDBOpenDBRequest;
      queueMicrotask(() => (req as unknown as { onsuccess?: () => void }).onsuccess?.());
      return req;
    });

    await sweepRegisteredSessions(now);

    expect(deleted).toContain('record-me-chunks-stale');
    expect(deleted).not.toContain('record-me-chunks-fresh');
    expect(localStorage.getItem(REGISTRY_KEY)).not.toContain('record-me-chunks-stale');
    expect(localStorage.getItem(REGISTRY_KEY)).toContain('record-me-chunks-fresh');
  });

  it('is a no-op when localStorage is unavailable', async () => {
    const orig = globalThis.localStorage;
    // @ts-expect-error force-remove
    delete globalThis.localStorage;
    await expect(sweepRegisteredSessions(0)).resolves.toBeUndefined();
    expect(() => registerSession('x', 0)).not.toThrow();
    globalThis.localStorage = orig;
  });

  // MAJOR 5 — blocked/errored deletion must retain the registry entry for retry
  it('keeps a stale entry in the registry when deleteDatabase is blocked', async () => {
    const now = 10_000_000;
    registerSession('record-me-chunks-blocked', now - 5_000_000); // stale (> 1h)

    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((_name: string) => {
      const req = {} as IDBOpenDBRequest;
      // Simulate onblocked — DB was NOT deleted (another connection holds it).
      queueMicrotask(() => (req as unknown as { onblocked?: () => void }).onblocked?.());
      return req;
    });

    await sweepRegisteredSessions(now);

    // Entry must still be present so the next start() can retry the sweep.
    expect(localStorage.getItem(REGISTRY_KEY)).toContain('record-me-chunks-blocked');
  });

  // MINOR 2 — heartbeat: a session that is >1h old but was recently touched
  // (i.e. touchSession() advanced its ts to within the threshold window) must
  // NOT be swept. Without touchSession(), the ts stays at construction time and
  // a long-running recording is a sweep target for another tab.
  it('>1h-old but recently-touched session is retained by sweepRegisteredSessions', async () => {
    const now = 10_000_000;
    // Register a session that is 2h old at construction time.
    registerSession('record-me-chunks-long-running', now - 2 * 60 * 60 * 1000);
    // Touch it 30 minutes before `now` — well within the 1h threshold.
    touchSession('record-me-chunks-long-running', now - 30 * 60 * 1000);

    const deleted: string[] = [];
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((name: string) => {
      deleted.push(name);
      const req = {} as IDBOpenDBRequest;
      queueMicrotask(() => (req as unknown as { onsuccess?: () => void }).onsuccess?.());
      return req;
    });

    await sweepRegisteredSessions(now);

    // The session was recently touched so it is fresh — must NOT be deleted.
    expect(deleted).not.toContain('record-me-chunks-long-running');
    expect(localStorage.getItem(REGISTRY_KEY)).toContain('record-me-chunks-long-running');
  });

  // touchSession() on an unknown name is a no-op (e.g. called after clear()).
  it('touchSession on an unknown name is a no-op', () => {
    expect(() => touchSession('record-me-chunks-nonexistent', Date.now())).not.toThrow();
  });

  // MAJOR P1 regression 1 — markStale: an entry with ts=0 is swept by
  // sweepRegisteredSessions even when `now` is very small (1ms after epoch).
  // Before the fix, a blocked/errored clear() left the entry's ts FRESH via
  // the heartbeat, so the sweep skipped it and the bytes persisted into the
  // next session — a §15.5 privacy violation.
  it('markStale(name) makes the entry deleted by sweepRegisteredSessions regardless of age', async () => {
    // Register a session and immediately mark it stale (simulates blocked clear).
    registerSession('record-me-chunks-stale-marked', Date.now());
    markStale('record-me-chunks-stale-marked');

    // Verify the entry exists in the registry.
    expect(localStorage.getItem(REGISTRY_KEY)).toContain('record-me-chunks-stale-marked');

    const deleted: string[] = [];
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((name: string) => {
      deleted.push(name);
      const req = {} as IDBOpenDBRequest;
      queueMicrotask(() => (req as unknown as { onsuccess?: () => void }).onsuccess?.());
      return req;
    });

    // Use a very small `now` (well below the 1h threshold for a fresh entry)
    // — the stale-marked entry MUST still be swept because ts=0.
    await sweepRegisteredSessions(3_600_001); // just over 1h since epoch

    expect(deleted).toContain('record-me-chunks-stale-marked');
    expect(localStorage.getItem(REGISTRY_KEY)).not.toContain('record-me-chunks-stale-marked');
  });

  // markStale on an unknown name is a no-op (e.g. called after deregister).
  it('markStale on an unknown name is a no-op', () => {
    expect(() => markStale('record-me-chunks-nonexistent')).not.toThrow();
  });

  it('keeps a stale entry in the registry when deleteDatabase errors', async () => {
    const now = 10_000_000;
    registerSession('record-me-chunks-errored', now - 5_000_000); // stale

    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((_name: string) => {
      const req = {} as IDBOpenDBRequest;
      queueMicrotask(() => (req as unknown as { onerror?: () => void }).onerror?.());
      return req;
    });

    await sweepRegisteredSessions(now);

    // Entry must still be present — DB still exists (deletion errored).
    expect(localStorage.getItem(REGISTRY_KEY)).toContain('record-me-chunks-errored');
  });
});
