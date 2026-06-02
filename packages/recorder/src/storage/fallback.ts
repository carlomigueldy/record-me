// packages/recorder/src/storage/fallback.ts
import type { ChunkStore } from './index';
import { MemoryChunkStore } from './memory';

/**
 * Wraps a primary (IndexedDB) store. On the first append() failure it flips to
 * a MemoryChunkStore for all subsequent chunks and fires onFallback() exactly
 * once. Chunks already committed to the primary are preserved: assemble()
 * concatenates the primary's assembled blob (chunks 0..k) followed by the
 * memory blob (chunks k+1..n), which keeps recording order intact because the
 * fallback always happens at the tail. Spec § 14.
 */
export class FallbackChunkStore implements ChunkStore {
  private readonly memory = new MemoryChunkStore();
  private degraded = false;
  /**
   * Serialization chain for append() calls. MAJOR 3: the recorder fires
   * store.append() per timeslice without awaiting, so concurrent appends are
   * normal. Without serialization, an in-flight IDB append can overlap with the
   * next one: if the in-flight one fails after the next one has already checked
   * `this.degraded === false` and committed to IDB, chunks arrive out of order
   * in assemble(), and onFallback can fire more than once.
   *
   * The invariant ("fallback always happens at the tail") only holds when
   * appends are totally ordered. We enforce that here with a simple promise
   * chain — each new append waits for the previous one to settle first.
   */
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly primary: ChunkStore,
    private readonly onFallback: () => void,
  ) {}

  get bytes(): number {
    return this.primary.bytes + this.memory.bytes;
  }

  append(chunk: Blob): Promise<void> {
    // Chain onto the previous append so appends are fully serialized.
    this.tail = this.tail.then(() => this.appendInner(chunk));
    return this.tail;
  }

  private async appendInner(chunk: Blob): Promise<void> {
    if (this.degraded) {
      await this.memory.append(chunk);
      return;
    }
    try {
      await this.primary.append(chunk);
    } catch {
      // Set degraded BEFORE the first await after the throw so concurrent
      // callers that are already chained see the flag even before their turn.
      this.degraded = true;
      // MINOR 1 fix: append the failed chunk to memory FIRST so it is
      // not lost if onFallback() throws. Then invoke onFallback() inside a
      // try/catch — a throwing callback must not poison the serialization
      // chain or lose chunks already committed to memory.
      await this.memory.append(chunk);
      try {
        this.onFallback();
      } catch {
        /* c8 ignore next */
        // onFallback errors are notifications only — recording continues.
      }
    }
  }

  async assemble(mimeType: string): Promise<Blob> {
    if (!this.degraded) return this.primary.assemble(mimeType);
    // Best-effort recovery of whatever committed to the primary before failure.
    const primaryBlob = await this.primary
      .assemble(mimeType)
      .catch(() => new Blob([], { type: mimeType }));
    const memoryBlob = await this.memory.assemble(mimeType);
    return new Blob([primaryBlob, memoryBlob], { type: mimeType });
  }

  async clear(): Promise<void> {
    await Promise.allSettled([this.primary.clear(), this.memory.clear()]);
  }
}
