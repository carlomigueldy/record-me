// packages/recorder/src/storage/indexeddb.ts
import type { ChunkStore } from './index';
import { RecorderError } from '../errors';
import { registerSession, deregisterSession, touchSession, markStale } from './session-registry';

const DB_PREFIX = 'record-me-chunks-';
const STORE_NAME = 'chunks';

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'seq' });
    };
    req.onsuccess = () => resolve(req.result);
    /* c8 ignore start — IDB open errors are environment-specific, not unit-testable */
    req.onerror = () =>
      reject(
        new RecorderError('storage-failed', `failed to open IDB ${name}`, { cause: req.error }),
      );
    /* c8 ignore stop */
  });
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  // Real browsers have Blob.arrayBuffer(), but fake-indexeddb's structured-
  // clone shim shadows the global Blob with a minimal polyfill that lacks it.
  // FileReader is the cross-environment fallback. We always use FileReader so
  // both code paths are exercised by tests under the fake-idb-shadowed Blob.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    /* c8 ignore next 4 — FileReader.onerror is environment-specific, not unit-testable */
    reader.onerror = () =>
      reject(
        new RecorderError('storage-failed', 'failed to read chunk bytes', { cause: reader.error }),
      );
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Attempt to delete an IDB database.
 *
 * Returns true only when onsuccess fires (the DB was actually deleted).
 * Returns false on onerror or onblocked (the DB still exists, e.g. because a
 * concurrent connection holds it open). Callers that need a retry net (clear())
 * must distinguish these outcomes — resolving on onblocked would cause the
 * caller to believe the data is gone when it is not.
 */
function deleteDb(name: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve(true);
    /* c8 ignore start — IDB delete errors / blocked-by-open-conn are environment-specific */
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
    /* c8 ignore stop */
  });
}

export class IndexedDbChunkStore implements ChunkStore {
  private readonly dbName: string;
  private seq = 0;
  private byteCount = 0;

  constructor(sessionId: string) {
    this.dbName = `${DB_PREFIX}${sessionId}`;
    registerSession(this.dbName, Date.now());
  }

  get bytes(): number {
    return this.byteCount;
  }

  async append(chunk: Blob): Promise<void> {
    // Serialize as ArrayBuffer for storage. fake-indexeddb's structured clone
    // does not round-trip Blob instances cleanly (the rehydrated value lacks
    // Blob methods), so we stash the raw bytes + mime + size and reconstruct
    // the Blob in assemble().
    const buffer = await blobToArrayBuffer(chunk);
    const db = await openDb(this.dbName);
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        /* c8 ignore next 4 — IDB tx errors are environment-specific, not unit-testable */
        tx.onerror = () =>
          reject(
            new RecorderError('storage-failed', 'append transaction failed', { cause: tx.error }),
          );
        tx.objectStore(STORE_NAME).add({
          seq: this.seq++,
          buffer,
          type: chunk.type,
          size: chunk.size,
        });
      });
      this.byteCount += chunk.size;
      // MINOR 2: heartbeat the registry so a still-active session is not
      // swept by another tab's start(). Without this, the ts stays at
      // construction time and any session open for >1h is a sweep candidate.
      touchSession(this.dbName, Date.now());
    } finally {
      db.close();
    }
  }

  async assemble(mimeType: string): Promise<Blob> {
    const db = await openDb(this.dbName);
    try {
      const parts: BlobPart[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const result: BlobPart[] = [];
        const cursorReq = tx.objectStore(STORE_NAME).openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            const value = cursor.value as { seq: number; buffer: ArrayBuffer };
            result.push(value.buffer);
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve(result);
        /* c8 ignore next 4 — IDB tx errors are environment-specific, not unit-testable */
        tx.onerror = () =>
          reject(
            new RecorderError('storage-failed', 'assemble transaction failed', { cause: tx.error }),
          );
      });
      const blob = new Blob(parts, { type: mimeType });
      // Heartbeat on assemble too: salvage/review scenarios may hold the
      // session open for extended periods without new appends.
      touchSession(this.dbName, Date.now());
      return blob;
    } finally {
      db.close();
    }
  }

  async clear(): Promise<void> {
    const deleted = await deleteDb(this.dbName);
    if (deleted) {
      // Database was actually deleted — remove the registry entry entirely.
      deregisterSession(this.dbName);
    } else {
      // deleteDatabase was blocked (another connection holds it open) or
      // errored — the bytes still exist in IDB, so we keep the registry entry
      // for the next start()'s sweepRegisteredSessions() to retry. However,
      // the heartbeat (touchSession in append/assemble) may have left the
      // entry's ts FRESH (age < STALE_REGISTRY_THRESHOLD_MS), which would
      // cause the sweep to SKIP it and leave the prior session's bytes visible
      // in the next session — a §15.5 privacy violation. Force the entry stale
      // (ts=0) so the very next sweep retries the deletion unconditionally.
      markStale(this.dbName);
    }
    this.seq = 0;
    this.byteCount = 0;
  }
}
