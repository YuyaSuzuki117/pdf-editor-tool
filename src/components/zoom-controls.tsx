'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { getPageText } from '@/lib/pdf-engine';
import { rotatePage } from '@/lib/pdf-editor';
import { loadDocumentFromBytes } from '@/lib/pdf-engine';
import { showDqToast } from '@/lib/toast';

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5];

const ZoomControls = React.memo(function ZoomControls() {
  const { state, dispatch } = usePDF();
  const containerRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);

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

  const fitPage = useCallback(() => {
    const container = document.querySelector('.pdf-canvas-container') as HTMLElement;
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement;
    if (!container || !canvas) { setScale(1); return; }
    const containerH = container.clientHeight - 32;
    const containerW = container.clientWidth;
    const canvasW = canvas.width / (window.devicePixelRatio || 1);
    const canvasH = canvas.height / (window.devicePixelRatio || 1);
    if (canvasW === 0 || canvasH === 0) { setScale(1); return; }
    const currentScale = state.scale;
    const scaleForHeight = (containerH / canvasH) * currentScale;
    const scaleForWidth = (containerW / canvasW) * currentScale;
    setScale(Math.min(scaleForHeight, scaleForWidth));
  }, [setScale, state.scale]);

  // ページ回転
  const handleRotate = useCallback(async () => {
    if (!state.pdfData) return;
    try {
      const newBytes = await rotatePage(state.pdfData, state.currentPage - 1);
      dispatch({
        type: 'UPDATE_PDF_DATA',
        payload: { pdfData: newBytes.buffer as ArrayBuffer, numPages: state.numPages },
      });
      showDqToast('ページを回転しました', 'success');
    } catch {
      showDqToast('回転に失敗しました', 'error');
    }
  }, [state.pdfData, state.currentPage, state.numPages, dispatch]);

  // R キーで回転イベントを受信
  useEffect(() => {
    const handler = () => { handleRotate(); };
    window.addEventListener('quick-rotate', handler);
    return () => window.removeEventListener('quick-rotate', handler);
  }, [handleRotate]);

  // テキストコピー
  const handleCopyText = useCallback(async () => {
    if (!state.pdfData || copying) return;
    setCopying(true);
    try {
      const doc = await loadDocumentFromBytes(state.pdfData);
      const text = await getPageText(doc, state.currentPage);
      doc.destroy();
      if (!text.trim()) {
        showDqToast('このページにテキストがありません', 'info');
        return;
      }
      await navigator.clipboard.writeText(text);
      showDqToast(`P.${state.currentPage}のテキストをコピーしました`, 'success');
    } catch {
      showDqToast('テキストコピーに失敗しました', 'error');
    } finally {
      setCopying(false);
    }
  }, [state.pdfData, state.currentPage, copying]);

  const pct = Math.round(state.scale * 100);

  const leverBtnStyle = {
    background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 50%, #2a1e12 100%)',
    border: '2px solid #8b6914',
    boxShadow: '0 3px 0 #1a1008, 0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(139,105,20,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)',
    outline: '1px solid #2a1e12',
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 right-3 z-[45] flex flex-col items-center gap-1.5"
    >
      <div
        className="flex flex-col items-center gap-1 p-1.5 rounded-none"
        style={{
          background: 'linear-gradient(180deg, #3a3228 0%, #2a2218 100%)',
          border: '2px solid #5c4a2e',
          boxShadow: '0 2px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(92,74,46,0.2)',
        }}
      >
        {/* ズームイン */}
        <button
          onClick={zoomIn}
          disabled={state.scale >= 5}
          className="flex items-center justify-center w-10 h-9 min-w-[44px] rounded-none cursor-pointer select-none active:scale-95 transition-transform"
          style={leverBtnStyle}
          aria-label="ズームイン"
        >
          <span className="dq-title text-base leading-none">+</span>
        </button>

        {/* ズーム率 */}
        <button
          onClick={fitWidth}
          className="px-2 py-0.5 rounded-none cursor-pointer select-none active:scale-95"
          style={{
            background: 'radial-gradient(circle, #1a1008 60%, #2a1e12 100%)',
            border: '2px solid #5c4a2e',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(92,74,46,0.2)',
          }}
          title="幅に合わせる (100%)"
          aria-label={`${pct}% - クリックで幅に合わせる`}
        >
          <span className="dq-text text-xs whitespace-nowrap" style={{ color: '#d4a017', textShadow: '0 0 6px rgba(212,160,23,0.4)' }}>
            {pct}%
          </span>
        </button>

        {/* ズームアウト */}
        <button
          onClick={zoomOut}
          disabled={state.scale <= 0.25}
          className="flex items-center justify-center w-10 h-9 min-w-[44px] rounded-none cursor-pointer select-none active:scale-95 transition-transform"
          style={leverBtnStyle}
          aria-label="ズームアウト"
        >
          <span className="dq-title text-base leading-none">-</span>
        </button>

        {/* 区切り線 */}
        <div style={{ width: '80%', height: 1, background: 'linear-gradient(90deg, transparent 0%, #5c4a2e 30%, #8b6914 50%, #5c4a2e 70%, transparent 100%)' }} />

        {/* ページ全体表示 */}
        <button
          onClick={fitPage}
          className="flex items-center justify-center w-10 h-9 min-w-[44px] rounded-none cursor-pointer select-none active:scale-95 transition-transform"
          style={leverBtnStyle}
          aria-label="ページ全体表示"
          title="ページ全体表示"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2" strokeLinecap="round">
            <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
          </svg>
        </button>

        {/* 区切り線 */}
        <div style={{ width: '80%', height: 1, background: 'linear-gradient(90deg, transparent 0%, #5c4a2e 30%, #8b6914 50%, #5c4a2e 70%, transparent 100%)' }} />

        {/* ページ回転 */}
        <button
          onClick={handleRotate}
          className="flex items-center justify-center w-10 h-9 min-w-[44px] rounded-none cursor-pointer select-none active:scale-95 transition-transform"
          style={leverBtnStyle}
          aria-label="ページ回転"
          title="ページを90°回転"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2" strokeLinecap="round">
            <path d="M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>

        {/* テキストコピー */}
        <button
          onClick={handleCopyText}
          disabled={copying}
          className="flex items-center justify-center w-10 h-9 min-w-[44px] rounded-none cursor-pointer select-none active:scale-95 transition-transform"
          style={leverBtnStyle}
          aria-label="テキストコピー"
          title="このページのテキストをコピー"
        >
          {copying ? (
            <div className="dq-spinner-sm" style={{ width: 14, height: 14 }} />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h2v2H4zM4 10h2v2H4zM4 14h2v2H4zM10 6h10M10 10h10M10 14h7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
});

export default ZoomControls;
