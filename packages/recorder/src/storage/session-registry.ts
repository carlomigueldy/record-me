// packages/recorder/src/storage/session-registry.ts
// A localStorage-backed registry of live IDB chunk-store DB names. Enables a
// Safari-safe stale sweep that does not depend on indexedDB.databases()
// (unavailable in Safari). Issue #60.

export const REGISTRY_KEY = 'record-me-idb-sessions';
// Shrunk from the old 24h databases()-only window: registry entries are cheap
// and each session deregisters itself on clear(), so leftovers are rare.
export const STALE_REGISTRY_THRESHOLD_MS = 60 * 60 * 1000; // 1h

interface Entry {
  name: string;
  ts: number;
}

function safeRead(): Entry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.name === 'string') : [];
  } catch {
    return [];
  }
}

function safeWrite(entries: Entry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
  } catch {
    /* best-effort */
  }
}

export function registerSession(name: string, now: number): void {
  const entries = safeRead().filter((e) => e.name !== name);
  entries.push({ name, ts: now });
  safeWrite(entries);
}

export function deregisterSession(name: string): void {
  safeWrite(safeRead().filter((e) => e.name !== name));
}

/**
 * Advance the timestamp of an active session so it is never swept by a
 * concurrent tab's start() sweep while the session is still in use.
 *
 * The registry timestamp only advances past construction when this is called,
 * which means a session recording for >1h would be swept by another tab
 * without heartbeating. Call after each successful append or assemble.
 * (MINOR 2 fix — Phase 6 review.)
 */
export function touchSession(name: string, now: number): void {
  const entries = safeRead();
  const idx = entries.findIndex((e) => e.name === name);
  if (idx === -1) return; // deregistered already — nothing to update
  entries[idx] = { name, ts: now };
  safeWrite(entries);
}

/**
 * Force a registry entry to be treated as stale on the NEXT
 * sweepRegisteredSessions() call, regardless of how recently it was touched.
 *
 * Used by IndexedDbChunkStore.clear() when deleteDatabase is blocked or errors:
 * the heartbeat (touchSession) may have left the entry's ts FRESH, which would
 * cause sweepRegisteredSessions to skip it (age < STALE_REGISTRY_THRESHOLD_MS)
 * and leave the prior session's bytes visible in the new session — a §15.5
 * privacy violation. Setting ts=0 makes (now - 0) always >= the threshold so
 * the entry is retried on the very next start().
 */
export function markStale(name: string): void {
  const entries = safeRead();
  const idx = entries.findIndex((e) => e.name === name);
  if (idx === -1) return; // already deregistered — nothing to mark
  entries[idx] = { name, ts: 0 };
  safeWrite(entries);
}

/**
 * Attempt to delete an IDB database.
 * Returns true only when onsuccess fires — meaning the DB was actually deleted.
 * Returns false on onerror or onblocked (DB still exists; keep the registry
 * entry so a future sweep can retry — MAJOR 5 fix).
 */
function deleteDb(name: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(true); // nothing to delete in this environment
      return;
    }
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

/** Delete any registered DB older than the threshold; keep fresh ones.
 *  If deletion is blocked or errors, the entry is kept so a later sweep retries.
 */
export async function sweepRegisteredSessions(now: number): Promise<void> {
  const entries = safeRead();
  if (entries.length === 0) return;
  const survivors: Entry[] = [];
  for (const entry of entries) {
    if (now - entry.ts >= STALE_REGISTRY_THRESHOLD_MS) {
      const deleted = await deleteDb(entry.name);
      // Keep the entry when deletion did not succeed (blocked / errored) so a
      // later start() can retry. The entry is only removed when onsuccess confirms
      // the DB is gone (spec §15.5 'no artifacts persist' guarantee).
      if (!deleted) survivors.push(entry);
    } else {
      survivors.push(entry);
    }
  }
  safeWrite(survivors);
}
