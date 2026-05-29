'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RecordMode, RecordingResolution } from '@record-me/recorder';
import { Button, MetaChip, RecDot, StudioShell } from '@record-me/ui';
import { useRecorder } from '../../../hooks/use-recorder';
import { analytics } from '../../../lib/analytics';
import {
  getStudioCapabilities,
  browserName,
  type StudioCapabilities,
} from '../../../lib/capabilities';
import { formatDuration, formatMegabytes, capMinutesToMs } from '../../../lib/format';
import { derivePhase } from './studio-phase';
import { ModePicker } from './ModePicker';
import { CapSelector } from './CapSelector';
import { LivePreview } from './LivePreview';
import { ReviewPane } from './ReviewPane';
import { ErrorState } from './ErrorState';
import { UnsupportedState } from './UnsupportedState';

const MODE_LABELS: Record<RecordMode, string> = {
  'screen+cam+cursor': 'screen + camera + cursor',
  'screen+cursor': 'screen + cursor',
  'cam-only': 'camera only',
};

export function Studio() {
  const recorder = useRecorder();
  const [caps, setCaps] = useState<StudioCapabilities | null>(null);

  // Setup selections (lifted so the shell footer + body share them).
  const [mode, setMode] = useState<RecordMode>('screen+cursor');
  const [capMinutes, setCapMinutes] = useState(10);
  const [resolution, setResolution] = useState<RecordingResolution>('1080p');
  const [cursorHighlights, setCursorHighlights] = useState(true);
  const resolutionTouched = useRef(false);
  const prevState = useRef(recorder.state);
  const startedTracked = useRef(false);
  const stoppedTracked = useRef(false);
  const unsupportedTracked = useRef(false);

  // Client-only capability probe; clamp the selected mode to what's available.
  useEffect(() => {
    const c = getStudioCapabilities();
    setCaps(c);
    if (c.availableModes.length > 0 && !c.availableModes.includes('screen+cursor')) {
      setMode(c.availableModes[0]!);
    }
  }, []);

  const supported = caps ? caps.supported : true;
  const availableModes = caps?.availableModes ?? ['screen+cam+cursor', 'screen+cursor', 'cam-only'];
  const phase = derivePhase(recorder.state, recorder.result, recorder.error, supported);
  const showCursorToggle = mode === 'screen+cam+cursor' || mode === 'screen+cursor';

  // Resolution auto-step: cap ≥ 30 min defaults to 720p unless the user overrode.
  const onCapChange = useCallback((minutes: number) => {
    setCapMinutes(minutes);
    if (!resolutionTouched.current) setResolution(minutes >= 30 ? '720p' : '1080p');
  }, []);
  const onResolutionChange = useCallback((r: RecordingResolution) => {
    resolutionTouched.current = true;
    setResolution(r);
  }, []);

  // Destructure stable recorder methods so useMemo dep arrays can reference them
  // directly without listing the entire recorder object.
  const {
    pause: recorderPause,
    resume: recorderResume,
    stop: recorderStop,
    reset: recorderReset,
  } = recorder;

  const onSelectMode = useCallback((m: RecordMode) => {
    setMode(m);
    analytics.modeSelected(m);
  }, []);

  const onStart = useCallback(() => {
    void recorder.start({
      mode,
      maxDurationMs: capMinutesToMs(capMinutes),
      resolution,
      cursorHighlights,
    });
  }, [recorder, mode, capMinutes, resolution, cursorHighlights]);

  const onDownload = useCallback(() => {
    const result = recorder.result;
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.suggestedFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    analytics.recordingDownloaded({
      mode,
      duration_seconds: Math.round(result.durationMs / 1000),
      bytes: result.bytes,
      mime_type: result.mimeType,
    });
  }, [recorder.result, mode]);

  // recording_started fires once per session on the first entry into 'recording'.
  // startedTracked guards against double-fire on pause→resume (paused→recording
  // also satisfies prevState !== 'recording', so a ref flag is required).
  useEffect(() => {
    if (recorder.state === 'recording' && !startedTracked.current) {
      startedTracked.current = true;
      analytics.recordingStarted({ mode, resolution, cap_minutes: capMinutes });
    }
    if (recorder.state === 'idle') startedTracked.current = false;
    prevState.current = recorder.state;
  }, [recorder.state, mode, resolution, capMinutes]);

  // recording_stopped once per session on the ready edge with a result.
  useEffect(() => {
    if (recorder.state === 'ready' && recorder.result && !stoppedTracked.current) {
      stoppedTracked.current = true;
      analytics.recordingStopped({
        mode,
        duration_seconds: Math.round(recorder.result.durationMs / 1000),
        bytes: recorder.result.bytes,
        mime_type: recorder.result.mimeType,
      });
    }
    if (recorder.state !== 'ready') stoppedTracked.current = false;
  }, [recorder.state, recorder.result, mode]);

  // permission_denied analytics.
  useEffect(() => {
    if (recorder.error?.kind === 'permission-denied') {
      analytics.permissionDenied(recorder.error.subject ?? 'screen');
    }
  }, [recorder.error]);

  // browser_unsupported analytics.
  useEffect(() => {
    if (caps && !caps.supported && !unsupportedTracked.current) {
      unsupportedTracked.current = true;
      const feature = !caps.hasMediaRecorder
        ? 'MediaRecorder'
        : !caps.supportedMimeType
          ? 'mimeType'
          : 'getUserMedia';
      analytics.browserUnsupported({ feature, ua_browser: browserName(navigator.userAgent) });
    }
  }, [caps]);

  const onCursorHighlightsChange = useCallback((enabled: boolean) => {
    setCursorHighlights(enabled);
    if (!enabled) analytics.cursorHighlightDisabled('opt-out');
  }, []);

  // ----- Render: one persistent StudioShell, body + controls per phase -----
  const header = useMemo(() => {
    if (phase === 'live' || phase === 'paused' || phase === 'finalizing') {
      return (
        <>
          <div className="flex items-center gap-3">
            <RecDot active={phase === 'live'} />
            <span className="font-mono text-sm text-ivory">
              {formatDuration(recorder.durationMs)}
            </span>
            <span className="font-mono text-xs text-ivory-dim">
              · {formatMegabytes(recorder.bytes)}
            </span>
          </div>
          <MetaChip>{MODE_LABELS[mode]}</MetaChip>
        </>
      );
    }
    if (phase === 'review' && recorder.result) {
      return (
        <>
          <span className="font-mono text-sm text-ivory">
            ready · {formatDuration(recorder.result.durationMs)}
          </span>
          <MetaChip>{formatMegabytes(recorder.result.bytes)}</MetaChip>
        </>
      );
    }
    return (
      <>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-dim">
          studio · ready
        </span>
        <MetaChip>{MODE_LABELS[mode]}</MetaChip>
      </>
    );
  }, [phase, recorder.durationMs, recorder.bytes, recorder.result, mode]);

  const footer = useMemo(() => {
    if (phase === 'setup') {
      return (
        <>
          <CapSelector
            capMinutes={capMinutes}
            resolution={resolution}
            cursorHighlights={cursorHighlights}
            showCursorToggle={showCursorToggle}
            onCapChange={onCapChange}
            onResolutionChange={onResolutionChange}
            onCursorHighlightsChange={onCursorHighlightsChange}
          />
          <Button onClick={onStart} disabled={availableModes.length === 0}>
            ▶ Start recording
          </Button>
        </>
      );
    }
    if (phase === 'live' || phase === 'paused') {
      return (
        <>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-dim">
            live preview
          </span>
          <div className="flex items-center gap-3">
            {phase === 'live' ? (
              <Button variant="ghost" onClick={recorderPause}>
                ⏸ Pause
              </Button>
            ) : (
              <Button variant="ghost" onClick={recorderResume}>
                ▶ Resume
              </Button>
            )}
            <Button variant="secondary" onClick={recorderStop}>
              ■ Stop
            </Button>
          </div>
        </>
      );
    }
    if (phase === 'review') {
      return (
        <>
          <Button variant="ghost" onClick={() => void recorderReset()}>
            ↻ Re-record
          </Button>
          <Button onClick={onDownload}>⤓ Download</Button>
        </>
      );
    }
    return null;
  }, [
    phase,
    capMinutes,
    resolution,
    cursorHighlights,
    showCursorToggle,
    availableModes.length,
    onCapChange,
    onResolutionChange,
    onCursorHighlightsChange,
    onStart,
    onDownload,
    recorderPause,
    recorderResume,
    recorderStop,
    recorderReset,
  ]);

  const body = (() => {
    switch (phase) {
      case 'unsupported':
        return <UnsupportedState />;
      case 'error':
        return recorder.error ? (
          <ErrorState error={recorder.error} onRetry={() => void recorderReset()} />
        ) : null;
      case 'setup':
        return (
          <div className="flex flex-col gap-6 p-6">
            <ModePicker selected={mode} available={availableModes} onSelect={onSelectMode} />
            {showCursorToggle ? (
              <p className="text-xs leading-relaxed text-ivory-dim">
                Click highlights work when you record this tab. For highlights in other apps,
                install the record-me extension (coming soon).
              </p>
            ) : null}
          </div>
        );
      case 'requesting':
        return (
          <div className="flex min-h-[40dvh] items-center justify-center p-10">
            <p className="font-mono text-xs uppercase tracking-widest text-ivory-dim">
              waiting for permission…
            </p>
          </div>
        );
      case 'live':
      case 'paused':
        return <LivePreview stream={recorder.previewStream} />;
      case 'finalizing':
        return (
          <div className="flex min-h-[40dvh] items-center justify-center p-10">
            <p className="font-mono text-xs uppercase tracking-widest text-ivory-dim">
              finalizing…
            </p>
          </div>
        );
      case 'review':
        return recorder.result ? <ReviewPane url={recorder.result.url} /> : null;
    }
  })();

  return (
    <StudioShell className="w-full max-w-5xl" header={header} footer={footer}>
      {body}
    </StudioShell>
  );
}
