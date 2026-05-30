/**
 * ModeStageA — Screen + Camera + Cursor illustration
 * Decorative preview for recording Mode A in the landing triptych.
 * CSS-only ambient animations; reduced-motion respects @media.
 */
export function ModeStageA() {
  return (
    <div
      aria-hidden="true"
      className="mode-stage-a"
      style={{
        position: 'relative',
        aspectRatio: '16 / 10',
        borderRadius: '10px',
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-line-soft)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        /* Scanline overlay */
        .mode-stage-a .scanline {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            180deg,
            rgba(255,255,255,0.012) 0 2px,
            transparent 2px 4px
          );
          pointer-events: none;
          z-index: 3;
        }
        /* Browser window */
        .mode-stage-a .window {
          position: absolute;
          inset: 14px;
          border-radius: 6px;
          background: linear-gradient(180deg, #1d212a 0%, #161a21 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
          z-index: 1;
        }
        .mode-stage-a .window::before {
          content: '• • •';
          position: absolute;
          top: 8px;
          left: 12px;
          letter-spacing: 6px;
          color: var(--color-ivory-low);
          font-size: 14px;
        }
        /* Toolbar bar */
        .mode-stage-a .toolbar {
          position: absolute;
          top: 30px;
          left: 28px;
          right: 28px;
          height: 8px;
          background: rgba(255,255,255,0.04);
          border-radius: 2px;
          z-index: 2;
        }
        /* Content grid */
        .mode-stage-a .content {
          position: absolute;
          top: 48px;
          left: 28px;
          right: 28px;
          bottom: 28px;
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 6px;
          z-index: 2;
        }
        .mode-stage-a .content .col {
          background: rgba(255,255,255,0.025);
          border-radius: 4px;
        }
        .mode-stage-a .content .body {
          display: grid;
          gap: 4px;
          padding: 8px;
        }
        .mode-stage-a .content .body span {
          display: block;
          height: 6px;
          background: rgba(255,255,255,0.04);
          border-radius: 2px;
        }
        .mode-stage-a .content .body span:nth-child(odd) { width: 76%; }
        .mode-stage-a .content .body span:nth-child(3n) {
          width: 58%;
          background: rgba(var(--color-amber-rgb, 229 162 74) / 0.18);
        }
        /* Webcam PiP */
        .mode-stage-a .webcam {
          position: absolute;
          right: 22px;
          bottom: 22px;
          width: 64px;
          height: 64px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 30%, #3d3a32 0%, #1c1a16 70%);
          border: 2px solid var(--color-ivory);
          box-shadow: 0 6px 20px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4;
        }
        .mode-stage-a .webcam::before {
          content: '';
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: var(--color-ivory-dim);
          box-shadow: 0 -10px 0 -4px var(--color-ivory-dim);
        }
        /* Cursor */
        .mode-stage-a .cursor {
          position: absolute;
          left: 46%;
          top: 56%;
          width: 18px;
          height: 18px;
          z-index: 5;
        }
        .mode-stage-a .cursor::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 2px solid var(--color-amber);
        }
        .mode-stage-a .cursor::after {
          content: '';
          position: absolute;
          left: 7px;
          top: 6px;
          width: 0;
          height: 0;
          border-left: 6px solid var(--color-ivory);
          border-bottom: 9px solid transparent;
          transform: rotate(-15deg);
        }
        @media (prefers-reduced-motion: no-preference) {
          .mode-stage-a .cursor::before {
            animation: stage-a-ring 2s ease-out infinite;
          }
          @keyframes stage-a-ring {
            0%   { box-shadow: 0 0 0 0 var(--color-amber); opacity: 1; }
            100% { box-shadow: 0 0 0 14px transparent; opacity: 0; }
          }
        }
      `}</style>
      {/* Browser window */}
      <div className="window" />
      {/* Toolbar */}
      <div className="toolbar" />
      {/* Content area */}
      <div className="content">
        <div className="col" />
        <div className="body">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      {/* Webcam PiP */}
      <div className="webcam" />
      {/* Cursor with amber ring */}
      <div className="cursor" />
      {/* Scanline overlay */}
      <div className="scanline" />
    </div>
  );
}
