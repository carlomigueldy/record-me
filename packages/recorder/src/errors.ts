// packages/recorder/src/errors.ts
import type { RecorderErrorKind } from './types';

export type PermissionSubject = 'screen' | 'camera' | 'mic';

export class RecorderError extends Error {
  public readonly kind: RecorderErrorKind;
  public override readonly cause?: unknown;

  constructor(kind: RecorderErrorKind, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'RecorderError';
    this.kind = kind;
    if (options && 'cause' in options) {
      this.cause = options.cause;
    }
  }

  toJSON(): { name: string; kind: RecorderErrorKind; message: string } {
    return { name: this.name, kind: this.kind, message: this.message };
  }
}

export function mapDomException(input: unknown, subject: PermissionSubject): RecorderError {
  if (input instanceof DOMException) {
    if (input.name === 'NotAllowedError') {
      return new RecorderError('permission-denied', `${subject} permission denied`, {
        cause: input,
      });
    }
    return new RecorderError('track-failed', `${subject} track unavailable: ${input.message}`, {
      cause: input,
    });
  }
  const message = input instanceof Error ? input.message : String(input);
  return new RecorderError('track-failed', `${subject} acquisition failed: ${message}`, {
    cause: input,
  });
}
