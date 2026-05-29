// packages/recorder/src/errors.ts
import type { RecorderErrorKind, PermissionSubject } from './types';

export class RecorderError extends Error {
  public readonly kind: RecorderErrorKind;
  public readonly subject?: PermissionSubject;
  public override readonly cause?: unknown;

  constructor(
    kind: RecorderErrorKind,
    message: string,
    options?: { cause?: unknown; subject?: PermissionSubject },
  ) {
    super(message);
    this.name = 'RecorderError';
    this.kind = kind;
    if (options?.subject) this.subject = options.subject;
    if (options && 'cause' in options) {
      this.cause = options.cause;
    }
  }

  toJSON(): {
    name: string;
    kind: RecorderErrorKind;
    subject: PermissionSubject | undefined;
    message: string;
  } {
    return { name: this.name, kind: this.kind, subject: this.subject, message: this.message };
  }
}

export function mapDomException(input: unknown, subject: PermissionSubject): RecorderError {
  if (input instanceof DOMException) {
    if (input.name === 'NotAllowedError') {
      return new RecorderError('permission-denied', `${subject} permission denied`, {
        cause: input,
        subject,
      });
    }
    return new RecorderError('track-failed', `${subject} track unavailable: ${input.message}`, {
      cause: input,
      subject,
    });
  }
  const message = input instanceof Error ? input.message : String(input);
  return new RecorderError('track-failed', `${subject} acquisition failed: ${message}`, {
    cause: input,
    subject,
  });
}
