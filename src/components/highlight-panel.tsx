'use client';

import { useState, useRef, useCallback } from 'react';
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
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const getPos = (e: React.TouchEvent) => {
    const el = overlayRef.current!;
    const r = el.getBoundingClientRect();
    return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startPos.current = getPos(e);
    setRect(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startPos.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const x = Math.min(startPos.current.x, pos.x);
    const y = Math.min(startPos.current.y, pos.y);
    const w = Math.abs(pos.x - startPos.current.x);
    const h = Math.abs(pos.y - startPos.current.y);
    setRect({ x, y, w, h });
  };

  const handleTouchEnd = () => {
    startPos.current = null;
  };

  const handleConfirm = useCallback(() => {
    if (!rect || rect.w < 5 || rect.h < 5) return;
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'highlight',
      page: state.currentPage,
      position: { x: rect.x, y: rect.y },
      content: '',
      style: { color, opacity: 0.35, width: rect.w, height: rect.h },
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
          className="fixed inset-0 z-30 touch-none"
          style={{ top: 0, bottom: '70px' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {rect && (
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
          )}
        </div>
      )}
      <SlidePanel isOpen={isOpen} onClose={onClose} title="ようがん ながし">
        <div className="space-y-4">
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--window-border)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm">ようがんを ながす はんいを ドラッグで きめろ！</p>
          </div>
          <div>
            <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>ようがんの いろ</p>
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
              せんたく はんい: {Math.round(rect.w)} x {Math.round(rect.h)}px
            </div>
          )}
          <button
            onClick={handleConfirm}
            disabled={!rect}
            className="dq-btn w-full"
          >
            ようがん りゅうにゅう！
          </button>
        </div>
      </SlidePanel>
    </>
  );
}
