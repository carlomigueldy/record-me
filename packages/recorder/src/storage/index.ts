// packages/recorder/src/storage/index.ts
import { MemoryChunkStore } from './memory';
import { IndexedDbChunkStore } from './indexeddb';
import { FallbackChunkStore } from './fallback';
import type { ChunkStorageStrategy } from '../types';

export interface ChunkStore {
  readonly bytes: number;
  append(chunk: Blob): Promise<void>;
  assemble(mimeType: string): Promise<Blob>;
  clear(): Promise<void>;
}

export interface CreateChunkStoreOptions {
  strategy: ChunkStorageStrategy;
  maxDurationMs: number;
  sessionId?: string;
  /** Invoked once if an IDB store degrades to in-memory mid-recording. */
  onFallback?: () => void;
}

const AUTO_IDB_THRESHOLD_MS = 10 * 60_000; // > 10 min → IDB spill (spec § 7.5)

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChunkStore(opts: CreateChunkStoreOptions): ChunkStore {
  if (opts.strategy === 'memory') return new MemoryChunkStore();
  if (opts.strategy === 'indexeddb') {
    return wrap(new IndexedDbChunkStore(opts.sessionId ?? newSessionId()), opts.onFallback);
  }
  if (opts.maxDurationMs > AUTO_IDB_THRESHOLD_MS) {
    return wrap(new IndexedDbChunkStore(opts.sessionId ?? newSessionId()), opts.onFallback);
  }
  return new MemoryChunkStore();
}

function wrap(store: ChunkStore, onFallback: (() => void) | undefined): ChunkStore {
  return onFallback ? new FallbackChunkStore(store, onFallback) : store;
}

export { MemoryChunkStore } from './memory';
export { IndexedDbChunkStore } from './indexeddb';
export { FallbackChunkStore } from './fallback';
