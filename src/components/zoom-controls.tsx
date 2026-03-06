'use client';

import { useCallback, useRef } from 'react';
import { usePDF } from '@/contexts/pdf-context';

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5];

export default function ZoomControls() {
  const { state, dispatch } = usePDF();
  const containerRef = useRef<HTMLDivElement>(null);

  const setScale = useCallback(
    (s: number) => dispatch({ type: 'SET_SCALE', payload: s }),
    [dispatch],
  );

  const zoomIn = useCallback(() => {
    const next = ZOOM_STEPS.find((s) => s > state.scale);
    setScale(next ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  }, [state.scale, setScale]);

  const zoomOut = useCallback(() => {
    const prev = [...ZOOM_STEPS].reverse().find((s) => s < state.scale);
    setScale(prev ?? ZOOM_STEPS[0]);
  }, [state.scale, setScale]);

  const fitWidth = useCallback(() => {
    setScale(1);
  }, [setScale]);

  const pct = Math.round(state.scale * 100);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-3 z-50 flex flex-col items-center gap-1.5"
    >
      {/* ズームイン */}
      <button
        onClick={zoomIn}
        disabled={state.scale >= 5}
        className="dq-window flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-full cursor-pointer select-none active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 100%)', border: '2px solid #8b6914', boxShadow: '0 2px 0 #2a1e12, 0 3px 6px rgba(0,0,0,0.4)' }}
        aria-label="ズームイン"
      >
        <span className="dq-title text-lg leading-none">+</span>
      </button>

      {/* 現在倍率 */}
      <div className="dq-window px-2 py-0.5 rounded-lg" style={{ background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 100%)', border: '2px solid #5c4a2e' }}>
        <span className="dq-text text-xs whitespace-nowrap">{pct}%</span>
      </div>

      {/* ズームアウト */}
      <button
        onClick={zoomOut}
        disabled={state.scale <= 0.25}
        className="dq-window flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-full cursor-pointer select-none active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 100%)', border: '2px solid #8b6914', boxShadow: '0 2px 0 #2a1e12, 0 3px 6px rgba(0,0,0,0.4)' }}
        aria-label="ズームアウト"
      >
        <span className="dq-title text-lg leading-none">-</span>
      </button>

      {/* 幅に合わせる */}
      <button
        onClick={fitWidth}
        className="dq-window flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-full cursor-pointer select-none active:scale-95 transition-transform mt-1"
        style={{ background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 100%)', border: '2px solid #8b6914', boxShadow: '0 2px 0 #2a1e12, 0 3px 6px rgba(0,0,0,0.4)' }}
        aria-label="幅に合わせる"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ynk-gold)"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
        </svg>
      </button>
    </div>
  );
}
