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

  const leverBtnStyle = {
    background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 50%, #2a1e12 100%)',
    border: '2px solid #8b6914',
    boxShadow: '0 3px 0 #1a1008, 0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(139,105,20,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)',
    /* 鉄のリベット風 */
    outline: '1px solid #2a1e12',
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-3 z-50 flex flex-col items-center gap-1.5"
    >
      {/* パネルフレーム */}
      <div
        className="flex flex-col items-center gap-1.5 p-1.5 rounded-none"
        style={{
          background: 'linear-gradient(180deg, #3a3228 0%, #2a2218 100%)',
          border: '2px solid #5c4a2e',
          boxShadow: '0 2px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(92,74,46,0.2)',
        }}
      >
        {/* ズームイン - レバーを上に引く */}
        <button
          onClick={zoomIn}
          disabled={state.scale >= 5}
          className="flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-none cursor-pointer select-none active:scale-95 transition-transform"
          style={leverBtnStyle}
          aria-label="ズームイン"
        >
          <span className="dq-title text-lg leading-none">+</span>
        </button>

        {/* 中央ダイヤル風インジケーター */}
        <div
          className="px-2 py-1 rounded-none"
          style={{
            background: 'radial-gradient(circle, #1a1008 60%, #2a1e12 100%)',
            border: '2px solid #5c4a2e',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(92,74,46,0.2)',
          }}
        >
          <span className="dq-text text-xs whitespace-nowrap" style={{ color: '#d4a017', textShadow: '0 0 6px rgba(212,160,23,0.4)' }}>
            {pct}%
          </span>
        </div>

        {/* ズームアウト - レバーを下に引く */}
        <button
          onClick={zoomOut}
          disabled={state.scale <= 0.25}
          className="flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-none cursor-pointer select-none active:scale-95 transition-transform"
          style={leverBtnStyle}
          aria-label="ズームアウト"
        >
          <span className="dq-title text-lg leading-none">-</span>
        </button>

        {/* 区切り線（鉄のリベット） */}
        <div style={{ width: '80%', height: 2, background: 'linear-gradient(90deg, transparent 0%, #5c4a2e 30%, #8b6914 50%, #5c4a2e 70%, transparent 100%)' }} />

        {/* 幅に合わせる - ダイヤル風 */}
        <button
          onClick={fitWidth}
          className="flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-none cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            ...leverBtnStyle,
            borderRadius: '0',
          }}
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
    </div>
  );
}
