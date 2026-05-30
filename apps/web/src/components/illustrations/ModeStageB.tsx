/**
 * ModeStageB — Screen + Cursor illustration
 * Decorative preview for recording Mode B in the landing triptych.
 * CSS-only ambient animations; reduced-motion respects @media.
 */
export function ModeStageB() {
  return (
    <div
      aria-hidden="true"
      className="mode-stage-b"
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
        .mode-stage-b .scanline {
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
        .mode-stage-b .window {
          position: absolute;
          inset: 16px;
          border-radius: 6px;
          background: linear-gradient(180deg, #1d212a 0%, #161a21 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
          z-index: 1;
        }
        .mode-stage-b .window::before {
          content: '• • •';
          position: absolute;
          top: 8px;
          left: 12px;
          letter-spacing: 6px;
          color: var(--color-ivory-low);
          font-size: 14px;
        }
        /* Grid texture */
        .mode-stage-b .grid {
          position: absolute;
          top: 52px;
          left: 18px;
          right: 18px;
          bottom: 18px;
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 22px 22px;
          z-index: 2;
        }
        /* Cursor */
        .mode-stage-b .cursor {
          position: absolute;
          left: 38%;
          top: 50%;
          width: 18px;
          height: 18px;
          z-index: 5;
        }
        .mode-stage-b .cursor::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 2px solid var(--color-amber);
        }
        .mode-stage-b .cursor::after {
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
          .mode-stage-b .cursor::before {
            animation: stage-b-ring 2s ease-out infinite;
          }
          @keyframes stage-b-ring {
            0%   { box-shadow: 0 0 0 0 var(--color-amber); opacity: 1; }
            100% { box-shadow: 0 0 0 14px transparent; opacity: 0; }
          }
        }
      `}</style>
      <div className="window" />
      <div className="grid" />
      <div className="cursor" />
      <div className="scanline" />
    </div>
  );
}
