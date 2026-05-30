/**
 * StudioSurfaceArt — Recording studio surface illustration.
 * Static + ambient CSS art; timer value is passed in (tick owned by StudioSurface).
 * aria-hidden="true" — decorative.
 */
interface StudioSurfaceArtProps {
  /** Formatted timer string, e.g. "00:42:18" */
  timer: string;
}

export function StudioSurfaceArt({ timer }: StudioSurfaceArtProps) {
  return (
    <div
      aria-hidden="true"
      className="studio-surface-art"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '18px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        /* Topbar */
        .studio-surface-art .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid var(--color-line-soft);
        }
        .studio-surface-art .topbar-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .studio-surface-art .rec-dot {
          position: relative;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: var(--color-amber);
        }
        .studio-surface-art .rec-dot::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 999px;
          background: var(--color-amber);
          opacity: 0.25;
        }
        @media (prefers-reduced-motion: no-preference) {
          .studio-surface-art .rec-dot::after {
            animation: studio-halo 1.8s ease-out infinite;
          }
          @keyframes studio-halo {
            0%   { opacity: 0.35; transform: scale(0.8); }
            100% { opacity: 0;    transform: scale(2.2); }
          }
        }
        .studio-surface-art .rec-label {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--color-ivory);
        }
        .studio-surface-art .rec-timer {
          font-family: var(--font-mono);
          font-size: 13px;
          letter-spacing: 0.05em;
          color: var(--color-ivory);
          font-variant-numeric: tabular-nums;
        }
        .studio-surface-art .topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--color-ivory-mut);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        /* Canvas area */
        .studio-surface-art .canvas {
          position: relative;
          flex: 1;
          min-height: 220px;
          background:
            radial-gradient(circle at 70% 40%, rgba(229,162,74,0.06), transparent 60%),
            linear-gradient(180deg, #14171d 0%, #0f1218 100%);
        }
        /* Demo window inside canvas */
        .studio-surface-art .demo-window {
          position: absolute;
          top: 24px;
          left: 24px;
          right: 24px;
          bottom: 24px;
          border-radius: 8px;
          background: linear-gradient(180deg, #1d212a 0%, #161a21 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
        }
        .studio-surface-art .demo-window .bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 28px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .studio-surface-art .demo-window .bar::before {
          content: '• • •';
          position: absolute;
          top: 8px;
          left: 12px;
          letter-spacing: 6px;
          color: var(--color-ivory-low);
          font-size: 12px;
        }
        .studio-surface-art .demo-window .content {
          position: absolute;
          top: 42px;
          left: 18px;
          right: 18px;
          bottom: 14px;
          display: grid;
          gap: 8px;
          align-content: start;
        }
        .studio-surface-art .demo-window .content .heading {
          height: 16px;
          width: 52%;
          background: rgba(237,230,214,0.18);
          border-radius: 3px;
        }
        .studio-surface-art .demo-window .content .row {
          height: 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 2px;
        }
        .studio-surface-art .demo-window .content .row.s  { width: 72%; }
        .studio-surface-art .demo-window .content .row.m  { width: 88%; }
        .studio-surface-art .demo-window .content .row.amber {
          background: rgba(229,162,74,0.32);
          width: 30%;
        }
        /* Amber cursor highlight */
        .studio-surface-art .cursor-hl {
          position: absolute;
          left: 60%;
          top: 56%;
          width: 26px;
          height: 26px;
        }
        .studio-surface-art .cursor-hl::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 2px solid var(--color-amber);
          box-shadow: 0 0 32px rgba(229,162,74,0.18);
        }
        .studio-surface-art .cursor-hl::after {
          content: '';
          position: absolute;
          left: 11px;
          top: 9px;
          width: 0;
          height: 0;
          border-left: 8px solid var(--color-ivory);
          border-bottom: 12px solid transparent;
          transform: rotate(-18deg);
        }
        @media (prefers-reduced-motion: no-preference) {
          .studio-surface-art .cursor-hl::before {
            animation: studio-ring 2.2s ease-out infinite;
          }
          @keyframes studio-ring {
            0%   { transform: scale(0.7); opacity: 1; }
            100% { transform: scale(2.4); opacity: 0; }
          }
        }
        /* Round PiP */
        .studio-surface-art .pip {
          position: absolute;
          right: 40px;
          bottom: 40px;
          width: 80px;
          height: 80px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 30%, #4a463c 0%, #1d1b16 80%);
          border: 2px solid var(--color-ivory);
          box-shadow: 0 10px 30px rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .studio-surface-art .pip::before {
          content: '';
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: var(--color-ivory-dim);
          box-shadow: 0 -12px 0 -4px var(--color-ivory-dim);
        }
        /* Controls row */
        .studio-surface-art .controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-top: 1px solid var(--color-line-soft);
        }
        .studio-surface-art .chips {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .studio-surface-art .chip {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--color-line);
          color: var(--color-ivory-dim);
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .studio-surface-art .chip.active {
          border-color: var(--color-amber);
          color: var(--color-amber);
        }
        .studio-surface-art .stop-btn {
          padding: 8px 16px;
          border-radius: 999px;
          background: var(--color-ivory);
          color: var(--color-bg);
          font-family: var(--font-sans);
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.02em;
          border: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .studio-surface-art .stop-btn .sq {
          width: 8px;
          height: 8px;
          background: var(--color-bg);
          border-radius: 1px;
        }
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="rec-dot" />
          <span className="rec-label">Rec</span>
          <span className="rec-timer">{timer}</span>
        </div>
        <div className="topbar-right">
          <span>1080p · 30fps</span>
          <span>H.264 · 4.2 Mbps</span>
        </div>
      </div>

      {/* Canvas with demo window */}
      <div className="canvas">
        <div className="demo-window">
          <div className="bar" />
          <div className="content">
            <div className="heading" />
            <div className="row m" />
            <div className="row s" />
            <div className="row m" />
            <div className="row amber" />
            <div className="row s" />
          </div>
        </div>
        <div className="cursor-hl" />
        <div className="pip" />
      </div>

      {/* Controls row */}
      <div className="controls">
        <div className="chips">
          <span className="chip active">Screen + cam</span>
          <span className="chip">Screen only</span>
          <span className="chip">Cam only</span>
        </div>
        <button className="stop-btn" type="button" tabIndex={-1}>
          <span className="sq" />
          Stop &amp; render
        </button>
      </div>
    </div>
  );
}
