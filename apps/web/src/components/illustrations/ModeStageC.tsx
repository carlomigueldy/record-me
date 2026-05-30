/**
 * ModeStageC — Camera Only illustration
 * Decorative preview for recording Mode C in the landing triptych.
 * CSS-only; no animations needed (static round frame).
 */
export function ModeStageC() {
  return (
    <div
      aria-hidden="true"
      className="mode-stage-c"
      style={{
        position: 'relative',
        aspectRatio: '16 / 10',
        borderRadius: '10px',
        background: 'radial-gradient(circle at 50% 45%, #2a2e36 0%, #14171d 70%)',
        border: '1px solid var(--color-line-soft)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .mode-stage-c .scanline {
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
        /* Round camera frame */
        .mode-stage-c .frame {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 60%;
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(circle at 38% 28%, #4a463c 0%, #29251c 70%);
          box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(237,230,214,0.08);
          z-index: 1;
        }
        /* Head silhouette */
        .mode-stage-c .frame::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 38%;
          transform: translate(-50%, -50%);
          width: 30%;
          aspect-ratio: 1;
          border-radius: 999px;
          background: var(--color-ivory-dim);
        }
        /* Shoulders silhouette */
        .mode-stage-c .frame::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 10%;
          transform: translateX(-50%);
          width: 50%;
          height: 32%;
          border-radius: 999px 999px 0 0;
          background: var(--color-ivory-dim);
        }
      `}</style>
      <div className="frame" />
      <div className="scanline" />
    </div>
  );
}
