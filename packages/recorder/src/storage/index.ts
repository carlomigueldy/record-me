// packages/recorder/src/storage/index.ts
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
}

// Implemented in Task E3 once both memory + indexeddb stores exist.
export function createChunkStore(_opts: CreateChunkStoreOptions): ChunkStore {
  throw new Error('createChunkStore not yet implemented');
}
