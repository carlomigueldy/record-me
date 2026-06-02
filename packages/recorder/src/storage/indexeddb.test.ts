// packages/recorder/src/storage/indexeddb.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IndexedDbChunkStore } from './indexeddb';
import { sweepRegisteredSessions, REGISTRY_KEY } from './session-registry';

function bytes(n: number): Blob {
  return new Blob([new Uint8Array(n)]);
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('IndexedDbChunkStore', () => {
  let store: IndexedDbChunkStore;

  beforeEach(() => {
    store = new IndexedDbChunkStore(`test-${Math.random().toString(36).slice(2, 8)}`);
  });

  it('starts at 0 bytes', () => {
    expect(store.bytes).toBe(0);
  });

  it('appends chunks and tracks bytes', async () => {
    await store.append(bytes(100));
    await store.append(bytes(50));
    expect(store.bytes).toBe(150);
  });

  it('assembles chunks in append order', async () => {
    await store.append(new Blob([new Uint8Array([1, 2])]));
    await store.append(new Blob([new Uint8Array([3, 4])]));
    await store.append(new Blob([new Uint8Array([5, 6])]));
    const assembled = await store.assemble('video/webm');
    expect(assembled.size).toBe(6);
    expect(assembled.type).toBe('video/webm');
  });

  it('clear() deletes the underlying database and resets bytes', async () => {
    await store.append(bytes(10));
    expect(store.bytes).toBe(10);
    await store.clear();
    expect(store.bytes).toBe(0);
    // Re-using the same instance after clear should accept new appends cleanly.
    await store.append(bytes(7));
    expect(store.bytes).toBe(7);
  });

  it('assemble on an empty store returns an empty blob', async () => {
    const assembled = await store.assemble('video/mp4');
    expect(assembled.size).toBe(0);
    expect(assembled.type).toBe('video/mp4');
  });

  it('multiple stores with different sessionIds do not collide', async () => {
    const a = new IndexedDbChunkStore('session-a');
    const b = new IndexedDbChunkStore('session-b');
    await a.append(bytes(100));
    await b.append(bytes(200));
    expect(a.bytes).toBe(100);
    expect(b.bytes).toBe(200);
    const aBlob = await a.assemble('video/mp4');
    const bBlob = await b.assemble('video/mp4');
    expect(aBlob.size).toBe(100);
    expect(bBlob.size).toBe(200);
    await a.clear();
    await b.clear();
  });

  // MAJOR 2 (indexeddb) — blocked-delete must retain the registry entry for retry.
  // Before the fix, deleteDb() resolved on onblocked (treated as success) and
  // clear() always called deregisterSession(), removing the entry even when the
  // IDB database was NOT deleted. This defeated the sweepRegisteredSessions retry
  // mechanism and broke the §15 'no artifacts persist' guarantee on the blocked path.
  it('clear() retains the session-registry entry when deleteDatabase is blocked', async () => {
    localStorage.clear();
    const sessionId = 'blocked-delete-regression';
    const blockedStore = new IndexedDbChunkStore(sessionId);

    // Confirm the constructor registered the session.
    const regBefore = localStorage.getItem(REGISTRY_KEY);
    expect(regBefore).toContain(`record-me-chunks-${sessionId}`);

    // Simulate a blocked deleteDatabase (another connection holds the DB open).
    // onblocked fires but onsuccess never fires — the DB still exists.
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((_name: string) => {
      const req = {} as IDBOpenDBRequest;
      queueMicrotask(() => (req as unknown as { onblocked?: () => void }).onblocked?.());
      return req;
    });

    await blockedStore.clear();

    // The registry entry MUST still be present so the next start()'s
    // sweepRegisteredSessions() can retry the deletion.
    const regAfter = localStorage.getItem(REGISTRY_KEY);
    expect(regAfter).toContain(`record-me-chunks-${sessionId}`);

    // In-memory counters ARE reset regardless (they don't depend on DB state).
    expect(blockedStore.bytes).toBe(0);
  });

  // MAJOR P1 regression — §15.5 path: blocked clear() + heartbeat defeat.
  // Scenario: a session's deleteDatabase is blocked during clear() AND the
  // heartbeat (touchSession from append) left the entry's ts FRESH. Without
  // markStale(), sweepRegisteredSessions skips the entry (age < 1h) and the
  // prior session's bytes persist into the next session — a §15.5 violation.
  // After the fix: clear() calls markStale() on the false branch, so the very
  // next sweepRegisteredSessions() call retries the deletion.
  it('blocked clear() leaves entry stale so the next sweep retries deletion', async () => {
    localStorage.clear();
    const sessionId = 'fresh-blocked-regression';
    const store = new IndexedDbChunkStore(sessionId);
    const dbName = `record-me-chunks-${sessionId}`;

    // Heartbeat: simulate a recent append making the entry FRESH.
    // (touchSession is called inside append(); we can also call it directly
    //  by doing an actual append, but here we use the registry import for clarity.)
    // After append(), the entry ts is ~now — well within the 1h threshold.
    await store.append(new Blob([new Uint8Array(8)]));

    // Confirm the entry exists and is fresh (non-zero ts).
    const regRaw = localStorage.getItem(REGISTRY_KEY);
    expect(regRaw).toContain(dbName);
    const regEntries = JSON.parse(regRaw!) as Array<{ name: string; ts: number }>;
    const entry = regEntries.find((e) => e.name === dbName);
    expect(entry).toBeDefined();
    expect(entry!.ts).toBeGreaterThan(0); // FRESH — heartbeat advanced it

    // Now simulate clear() with a blocked deleteDatabase.
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((_name: string) => {
      const req = {} as IDBOpenDBRequest;
      queueMicrotask(() => (req as unknown as { onblocked?: () => void }).onblocked?.());
      return req;
    });

    await store.clear();
    vi.restoreAllMocks();

    // After the fix: the entry must be stale-marked (ts=0).
    const regAfterClear = localStorage.getItem(REGISTRY_KEY);
    expect(regAfterClear).toContain(dbName);
    const entriesAfterClear = JSON.parse(regAfterClear!) as Array<{ name: string; ts: number }>;
    const markedEntry = entriesAfterClear.find((e) => e.name === dbName);
    expect(markedEntry).toBeDefined();
    expect(markedEntry!.ts).toBe(0); // stale-marked — not fresh

    // Simulate the NEXT start()'s sweep: now=Date.now() (huge number >> 1h).
    // The stale-marked entry must be picked up and its DB deleted.
    const deleted: string[] = [];
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((name: string) => {
      deleted.push(name);
      const req = {} as IDBOpenDBRequest;
      queueMicrotask(() => (req as unknown as { onsuccess?: () => void }).onsuccess?.());
      return req;
    });

    await sweepRegisteredSessions(Date.now());

    // The leftover DB was swept — not carried into the new session.
    expect(deleted).toContain(dbName);
    expect(localStorage.getItem(REGISTRY_KEY)).not.toContain(dbName);
  });
});
