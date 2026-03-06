'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import SlidePanel from './slide-panel';
import type { Annotation } from '@/types/pdf';

const highlightColors = [
  { label: '黄', value: '#fde047', bg: 'bg-yellow-300' },
  { label: '緑', value: '#86efac', bg: 'bg-green-300' },
  { label: 'ピンク', value: '#f9a8d4', bg: 'bg-pink-300' },
  { label: '青', value: '#93c5fd', bg: 'bg-blue-300' },
];

export default function HighlightPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [color, setColor] = useState('#fde047');
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [overlayBounds, setOverlayBounds] = useState<{ left: number; top: number; width: number; height: number }>({ left: 0, top: 0, width: 0, height: 0 });
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const highlightRenderScale = useRef(1);

  // overlayをPDFcanvasの位置に合わせる
  const updateOverlayBounds = useCallback(() => {
    const pdfCanvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
    if (!pdfCanvas) return;
    const r = pdfCanvas.getBoundingClientRect();
    setOverlayBounds({ left: r.left, top: r.top, width: r.width, height: r.height });
    const scaleAttr = pdfCanvas.getAttribute('data-render-scale');
    if (scaleAttr) highlightRenderScale.current = parseFloat(scaleAttr);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(updateOverlayBounds, 100);
      const container = document.querySelector('.pdf-canvas-container');
      const handleScroll = () => updateOverlayBounds();
      container?.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      return () => {
        container?.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen, updateOverlayBounds]);

  const getPosFromTouch = (e: React.TouchEvent) => {
    const el = overlayRef.current!;
    const r = el.getBoundingClientRect();
    return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
  };

  const getPosFromMouse = (e: React.MouseEvent) => {
    const el = overlayRef.current!;
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const startSelection = (pos: { x: number; y: number }) => {
    startPos.current = pos;
    setRect(null);
  };

  const moveSelection = (pos: { x: number; y: number }) => {
    if (!startPos.current) return;
    const x = Math.min(startPos.current.x, pos.x);
    const y = Math.min(startPos.current.y, pos.y);
    const w = Math.abs(pos.x - startPos.current.x);
    const h = Math.abs(pos.y - startPos.current.y);
    setRect({ x, y, w, h });
  };

  const endSelection = () => {
    startPos.current = null;
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startSelection(getPosFromTouch(e));
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    moveSelection(getPosFromTouch(e));
  };
  const handleTouchEnd = () => endSelection();

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startSelection(getPosFromMouse(e));
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    moveSelection(getPosFromMouse(e));
  };
  const handleMouseUp = () => endSelection();

  const handleConfirm = useCallback(() => {
    if (!rect || rect.w < 5 || rect.h < 5) return;
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'highlight',
      page: state.currentPage,
      position: { x: rect.x, y: rect.y },
      content: '',
      style: { color, opacity: 0.35, width: rect.w, height: rect.h },
      renderScale: highlightRenderScale.current,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    setRect(null);
    onClose();
  }, [rect, color, state.currentPage, dispatch, onClose]);

  return (
    <>
      {isOpen && (
        <div
          ref={overlayRef}
          className="fixed z-[45] touch-none cursor-crosshair"
          style={{
            left: overlayBounds.left,
            top: overlayBounds.top,
            width: overlayBounds.width,
            height: overlayBounds.height,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {rect && (
            <>
              {/* 塗り */}
              <div
                className="absolute rounded"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.w,
                  height: rect.h,
                  backgroundColor: color,
                  opacity: 0.35,
                }}
              />
              {/* 点線ボーダーアニメーション */}
              <div
                className="absolute rounded"
                style={{
                  left: rect.x - 1,
                  top: rect.y - 1,
                  width: rect.w + 2,
                  height: rect.h + 2,
                  border: '2px dashed rgba(255,255,255,0.8)',
                  animation: 'dq-marching-ants 0.5s linear infinite',
                  pointerEvents: 'none',
                }}
              />
              {/* サイズ表示 */}
              {startPos.current && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: rect.x + rect.w + 4,
                    top: rect.y + rect.h + 4,
                    background: 'rgba(0,0,0,0.75)',
                    color: '#d4a017',
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                  }}
                >
                  {Math.round(rect.w)} x {Math.round(rect.h)}
                </div>
              )}
            </>
          )}
        </div>
      )}
      <SlidePanel isOpen={isOpen} onClose={onClose} title="マーカー" allowInteraction>
        <div className="space-y-4">
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--window-border)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm">マーカーを引く範囲をドラッグで選択</p>
          </div>
          <div>
            <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>マーカーの色</p>
            <div className="flex gap-3">
              {highlightColors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`dq-color-btn w-12 h-12 ${color === c.value ? 'active' : ''}`}
                  style={{ backgroundColor: c.value, borderColor: color === c.value ? '#d4a017' : '#5c3d2e', borderWidth: 3, borderStyle: 'solid', borderRadius: 4 }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          {rect && (
            <div className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
              選択範囲: {Math.round(rect.w)} x {Math.round(rect.h)}px
            </div>
          )}
          <button
            onClick={handleConfirm}
            disabled={!rect}
            className="dq-btn w-full"
          >
            マーカーを追加
          </button>
        </div>
      </SlidePanel>
    </>
  );
}
