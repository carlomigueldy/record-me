// packages/recorder/src/errors.test.ts
import { describe, it, expect } from 'vitest';
import { RecorderError, mapDomException } from './errors';

describe('RecorderError', () => {
  it('carries kind, message, and optional cause', () => {
    const cause = new Error('boom');
    const err = new RecorderError('permission-denied', 'screen denied', { cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('RecorderError');
    expect(err.kind).toBe('permission-denied');
    expect(err.message).toBe('screen denied');
    expect(err.cause).toBe(cause);
  });

  it('serialises to a plain object via toJSON', () => {
    const err = new RecorderError('storage-failed', 'IDB quota');
    expect(err.toJSON()).toEqual({
      name: 'RecorderError',
      kind: 'storage-failed',
      message: 'IDB quota',
    });
  });
});

describe('mapDomException', () => {
  it('maps NotAllowedError to permission-denied', () => {
    const dom = new DOMException('denied', 'NotAllowedError');
    const err = mapDomException(dom, 'screen');
    expect(err.kind).toBe('permission-denied');
    expect(err.message).toContain('screen');
    expect(err.cause).toBe(dom);
  });

  it('maps NotFoundError to track-failed', () => {
    const dom = new DOMException('no cam', 'NotFoundError');
    const err = mapDomException(dom, 'camera');
    expect(err.kind).toBe('track-failed');
    expect(err.message).toContain('camera');
  });

  it('maps NotReadableError to track-failed', () => {
    const dom = new DOMException('busy', 'NotReadableError');
    expect(mapDomException(dom, 'mic').kind).toBe('track-failed');
  });

  it('maps unknown DOMException to track-failed', () => {
    const dom = new DOMException('weird', 'AbortError');
    expect(mapDomException(dom, 'screen').kind).toBe('track-failed');
  });

  it('wraps non-DOMException errors as track-failed', () => {
    const err = mapDomException(new Error('boom'), 'screen');
    expect(err.kind).toBe('track-failed');
    expect(err.cause).toBeInstanceOf(Error);
  });

  it('wraps a thrown primitive (non-Error) as track-failed', () => {
    const err = mapDomException('a string thrown', 'mic');
    expect(err.kind).toBe('track-failed');
    expect(err.message).toContain('a string thrown');
  });
});
