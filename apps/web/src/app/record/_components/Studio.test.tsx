import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as RecorderModule from '@record-me/recorder';
import type { RecorderOptions } from '@record-me/recorder';

interface MockHandle {
  opts: RecorderOptions;
  start: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  salvage: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  /** Drive the engine to the error state with a track-failed kind. */
  simulateTrackFailed: () => void;
  /** Fire the cursor-scope-missed callback (surface is not this tab). */
  simulateCursorScopeMissed: () => void;
}

const handles: RecorderOptions[] = [];
const mockHandles: MockHandle[] = [];

vi.mock('@record-me/recorder', async (importOriginal) => {
  const actual = await importOriginal<typeof RecorderModule>();
  return {
    ...actual,
    createRecorder: (opts: RecorderOptions) => {
      const handle: MockHandle = {
        opts,
        start: vi.fn(async () => {
          opts.onStateChange?.('requesting-permissions');
          opts.onPreviewReady?.({} as MediaStream);
          opts.onStateChange?.('recording');
        }),
        pause: vi.fn(() => opts.onStateChange?.('paused')),
        resume: vi.fn(() => opts.onStateChange?.('recording')),
        stop: vi.fn(async () => {
          opts.onStateChange?.('finalizing');
          const result = {
            blob: new Blob(['x']),
            url: 'blob:mock',
            mimeType: 'video/mp4',
            durationMs: 5000,
            bytes: 9,
            suggestedFilename: 'record-me-2026-05-29-001.mp4',
            release: vi.fn(async () => {}),
          };
          opts.onStateChange?.('ready');
          opts.onResult?.(result);
          return result;
        }),
        salvage: vi.fn(async () => {
          const result = {
            blob: new Blob(['partial']),
            url: 'blob:partial-mock',
            mimeType: 'video/mp4',
            durationMs: 3000,
            bytes: 7,
            suggestedFilename: 'record-me-2026-05-29-001-partial.mp4',
            partial: true as const,
            release: vi.fn(async () => {}),
          };
          opts.onStateChange?.('ready');
          opts.onResult?.(result);
          return result;
        }),
        dispose: vi.fn(),
        simulateTrackFailed: () => {
          opts.onError?.({
            name: 'RecorderError',
            kind: 'track-failed',
            message: 'Screen track ended',
          });
          opts.onStateChange?.('error');
        },
        simulateCursorScopeMissed: () => {
          opts.onCursorScopeMissed?.();
        },
      };
      handles.push(opts);
      mockHandles.push(handle);
      return handle;
    },
    // Force a fully-supported desktop environment for the test.
    probeCapabilities: () => ({
      hasMediaRecorder: true,
      hasGetDisplayMedia: true,
      hasGetUserMedia: true,
      supportedMimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      isSafari: false,
      isMobile: false,
    }),
  };
});

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));
import { track } from '@vercel/analytics';
import { Studio } from './Studio';

beforeEach(() => {
  handles.length = 0;
  mockHandles.length = 0;
  vi.clearAllMocks();
});

describe('Studio', () => {
  it('renders the setup triptych and the Start button', async () => {
    render(<Studio />);
    expect(await screen.findByText('Screen + Cursor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('selecting a mode fires mode_selected', async () => {
    render(<Studio />);
    await userEvent.click(await screen.findByRole('radio', { name: /Camera only/ }));
    expect(track).toHaveBeenCalledWith('mode_selected', { mode: 'cam-only' });
  });

  it('Start → live shows the REC dot and fires recording_started', async () => {
    render(<Studio />);
    await userEvent.click(await screen.findByRole('button', { name: /start recording/i }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: /recording/i })).toBeInTheDocument(),
    );
    expect(track).toHaveBeenCalledWith(
      'recording_started',
      expect.objectContaining({ resolution: '1080p', cap_minutes: 10 }),
    );
  });

  it('Stop → review shows Download and fires recording_stopped', async () => {
    render(<Studio />);
    await userEvent.click(await screen.findByRole('button', { name: /start recording/i }));
    await userEvent.click(await screen.findByRole('button', { name: /stop/i }));
    expect(await screen.findByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      'recording_stopped',
      expect.objectContaining({ mime_type: 'video/mp4', duration_seconds: 5 }),
    );
  });

  it('track-failed error shows Save partial recording + fires recording_stopped with partial:true', async () => {
    render(<Studio />);
    // Start the recording.
    await userEvent.click(await screen.findByRole('button', { name: /start recording/i }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: /recording/i })).toBeInTheDocument(),
    );

    // Simulate a mid-recording track failure (the screen share pill was clicked).
    const handle = mockHandles.at(-1)!;
    act(() => {
      handle.simulateTrackFailed();
    });

    // Error pane must offer "Save partial recording" and "Start over".
    const saveBtn = await screen.findByRole('button', { name: /save partial recording/i });
    expect(saveBtn).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();

    // Click Save partial recording — engine salvage() fires and delivers a partial result.
    await userEvent.click(saveBtn);

    // recording_stopped must fire with partial:true.
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith(
        'recording_stopped',
        expect.objectContaining({ partial: true }),
      ),
    );
  });

  it('fires cursor_highlight_disabled(not-record-me-tab) when the engine reports cursor scope missed', async () => {
    render(<Studio />);
    await userEvent.click(await screen.findByRole('button', { name: /start recording/i }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: /recording/i })).toBeInTheDocument(),
    );

    // Simulate the engine reporting that the captured surface is not this tab.
    const handle = mockHandles.at(-1)!;
    act(() => {
      handle.simulateCursorScopeMissed();
    });

    await waitFor(() =>
      expect(track).toHaveBeenCalledWith('cursor_highlight_disabled', {
        reason: 'not-record-me-tab',
      }),
    );
  });

  it('pause → resume fires recording_started exactly once', async () => {
    render(<Studio />);
    // Start recording.
    await userEvent.click(await screen.findByRole('button', { name: /start recording/i }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: /recording/i })).toBeInTheDocument(),
    );
    // Pause then resume — should NOT fire a second recording_started.
    await userEvent.click(screen.getByRole('button', { name: /pause/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /resume/i }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: /recording/i })).toBeInTheDocument(),
    );
    // recording_started must have been called exactly once despite the state
    // cycling through paused → recording again.
    const startedCalls = vi
      .mocked(track)
      .mock.calls.filter(([event]) => event === 'recording_started');
    expect(startedCalls).toHaveLength(1);
  });
});
