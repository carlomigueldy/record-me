// packages/recorder/src/storage/memory.ts
import type { ChunkStore } from './index';

export class MemoryChunkStore implements ChunkStore {
  private chunks: Blob[] = [];
  private byteCount = 0;

  get bytes(): number {
    return this.byteCount;
  }

  async append(chunk: Blob): Promise<void> {
    this.chunks.push(chunk);
    this.byteCount += chunk.size;
  }

  async assemble(mimeType: string): Promise<Blob> {
    return new Blob(this.chunks, { type: mimeType });
  }

  async clear(): Promise<void> {
    this.chunks = [];
    this.byteCount = 0;
  }
}
