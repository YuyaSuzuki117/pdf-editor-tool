'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { loadSettings, saveSettings } from '@/lib/user-settings';
import SlidePanel from './slide-panel';
import type { Annotation, HighlightStyle } from '@/types/pdf';

type MarkupMode = 'highlight' | 'underline' | 'strikethrough' | 'redact';

const highlightColors = [
  { label: '黄', value: '#fde047' },
  { label: '緑', value: '#86efac' },
  { label: 'ピンク', value: '#f9a8d4' },
  { label: '青', value: '#93c5fd' },
];

const lineColors = [
  { label: '赤', value: '#ef4444' },
  { label: '青', value: '#3b82f6' },
  { label: '緑', value: '#22c55e' },
  { label: '黒', value: '#000000' },
];

const markupModes: { mode: MarkupMode; label: string; desc: string }[] = [
  { mode: 'highlight', label: 'マーカー', desc: '半透明マーカー' },
  { mode: 'underline', label: '下線', desc: '下線を引く' },
  { mode: 'strikethrough', label: '取消線', desc: '取り消し線' },
  { mode: 'redact', label: '墨消し', desc: '黒で完全に隠す' },
];

export default function HighlightPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const settings = loadSettings();
  const [markupMode, setMarkupMode] = useState<MarkupMode>((settings.highlightMode as MarkupMode) || 'highlight');
  const [color, setColor] = useState(settings.highlightColor || '#fde047');
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [overlayBounds, setOverlayBounds] = useState<{ left: number; top: number; width: number; height: number }>({ left: 0, top: 0, width: 0, height: 0 });
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const highlightRenderScale = useRef(1);

  useEffect(() => {
    saveSettings({ highlightMode: markupMode, highlightColor: color });
  }, [markupMode, color]);

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

  const startSelection = (pos: { x: number; y: number }) => { startPos.current = pos; setRect(null); };
  const moveSelection = (pos: { x: number; y: number }) => {
    if (!startPos.current) return;
    const x = Math.min(startPos.current.x, pos.x);
    const y = Math.min(startPos.current.y, pos.y);
    const w = Math.abs(pos.x - startPos.current.x);
    const h = Math.abs(pos.y - startPos.current.y);
    setRect({ x, y, w, h });
  };
  const endSelection = () => { startPos.current = null; };

  const handleTouchStart = (e: React.TouchEvent) => { e.preventDefault(); startSelection(getPosFromTouch(e)); };
  const handleTouchMove = (e: React.TouchEvent) => { e.preventDefault(); moveSelection(getPosFromTouch(e)); };
  const handleTouchEnd = () => endSelection();
  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); startSelection(getPosFromMouse(e)); };
  const handleMouseMove = (e: React.MouseEvent) => { moveSelection(getPosFromMouse(e)); };
  const handleMouseUp = () => endSelection();

  const handleConfirm = useCallback(() => {
    if (!rect || rect.w < 5 || rect.h < 5) return;

    const effectiveColor = markupMode === 'redact' ? '#000000' : color;
    const effectiveOpacity = markupMode === 'redact' ? 1 : markupMode === 'highlight' ? 0.35 : 1;
    const effectiveHeight = (markupMode === 'underline' || markupMode === 'strikethrough') ? 3 : rect.h;

    const style: HighlightStyle = {
      color: effectiveColor,
      opacity: effectiveOpacity,
      width: rect.w,
      height: effectiveHeight,
      markupMode,
    };

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'highlight',
      page: state.currentPage,
      position: {
        x: rect.x,
        y: markupMode === 'underline' ? rect.y + rect.h - 3 :
           markupMode === 'strikethrough' ? rect.y + rect.h / 2 - 1.5 :
           rect.y,
      },
      content: '',
      style,
      renderScale: highlightRenderScale.current,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    setRect(null);
  }, [rect, color, markupMode, state.currentPage, dispatch]);

  const activeColors = markupMode === 'highlight' ? highlightColors : lineColors;
  const previewColor = markupMode === 'redact' ? '#000000' : color;
  const previewOpacity = markupMode === 'redact' ? 0.9 : markupMode === 'highlight' ? 0.35 : 0.8;

  return (
    <>
      {isOpen && (
        <div
          ref={overlayRef}
          className="fixed z-[45] touch-none cursor-crosshair"
          style={{
            left: overlayBounds.left, top: overlayBounds.top,
            width: overlayBounds.width, height: overlayBounds.height,
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
              <div
                className="absolute rounded"
                style={{
                  left: rect.x, top: rect.y, width: rect.w,
                  height: (markupMode === 'underline' || markupMode === 'strikethrough') ? 3 : rect.h,
                  marginTop: markupMode === 'underline' ? rect.h - 3 : markupMode === 'strikethrough' ? rect.h / 2 - 1.5 : 0,
                  backgroundColor: previewColor,
                  opacity: previewOpacity,
                }}
              />
              <div
                className="absolute rounded"
                style={{
                  left: rect.x - 1, top: rect.y - 1,
                  width: rect.w + 2, height: rect.h + 2,
                  border: '2px dashed rgba(255,255,255,0.8)',
                  animation: 'dq-marching-ants 0.5s linear infinite',
                  pointerEvents: 'none',
                }}
              />
              {startPos.current && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: rect.x + rect.w + 4, top: rect.y + rect.h + 4,
                    background: 'rgba(0,0,0,0.75)', color: '#d4a017',
                    fontSize: 11, padding: '2px 6px', borderRadius: 3,
                    whiteSpace: 'nowrap', fontFamily: 'monospace',
                  }}
                >
                  {Math.round(rect.w)} x {Math.round(rect.h)}
                </div>
              )}
            </>
          )}
        </div>
      )}
      <SlidePanel isOpen={isOpen} onClose={onClose} title="マーカー・注釈" allowInteraction>
        <div className="space-y-4">
          {/* モード切替 */}
          <div className="flex gap-1">
            {markupModes.map((m) => (
              <button
                key={m.mode}
                onClick={() => setMarkupMode(m.mode)}
                className="dq-btn-small flex-1 text-center min-h-[40px] text-xs"
                style={markupMode === m.mode
                  ? { borderColor: '#d4a017', boxShadow: '0 0 8px rgba(212,160,23,0.5)' }
                  : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }
                }
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--window-border)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm">ドラッグで範囲を選択 → 自動適用</p>
          </div>

          {/* 色選択（墨消し以外） */}
          {markupMode !== 'redact' && (
            <div>
              <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>色</p>
              <div className="flex gap-3">
                {activeColors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`dq-color-btn w-12 h-12 ${color === c.value ? 'active' : ''}`}
                    style={{ backgroundColor: c.value, borderColor: color === c.value ? '#d4a017' : '#5c3d2e', borderWidth: 3, borderStyle: 'solid', borderRadius: 4 }}
                    title={c.label}
                  />
                ))}
                <label className="w-12 h-12 rounded cursor-pointer overflow-hidden" style={{ border: '3px solid #5c3d2e' }}>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-full cursor-pointer" style={{ padding: 0, border: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {markupMode === 'redact' && (
            <div className="dq-message-box" style={{ background: 'rgba(153,27,27,0.2)', border: '2px solid #ef4444', borderRadius: 4, padding: '12px 16px' }}>
              <p className="dq-text text-sm" style={{ color: '#fca5a5' }}>
                墨消し: 黒い矩形で内容を完全に隠します。保存後は復元不可能です。
              </p>
            </div>
          )}

          {rect && (
            <div className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
              選択範囲: {Math.round(rect.w)} x {Math.round(rect.h)}px
            </div>
          )}
          <button onClick={handleConfirm} disabled={!rect} className="dq-btn w-full">
            {markupMode === 'highlight' ? 'マーカーを追加' :
             markupMode === 'underline' ? '下線を追加' :
             markupMode === 'strikethrough' ? '取消線を追加' :
             '墨消しを追加'}
          </button>
        </div>
      </SlidePanel>
    </>
  );
}
