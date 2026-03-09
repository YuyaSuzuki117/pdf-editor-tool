'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { loadSettings, saveSettings } from '@/lib/user-settings';
import SlidePanel from './slide-panel';
import type { Annotation, ShapeStyle } from '@/types/pdf';

type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line';

const shapeTypes: { type: ShapeType; label: string; icon: string }[] = [
  { type: 'rectangle', label: '矩形', icon: '▭' },
  { type: 'circle', label: '円', icon: '○' },
  { type: 'arrow', label: '矢印', icon: '→' },
  { type: 'line', label: '直線', icon: '╱' },
];

const strokeColors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
const fillColors = ['#fde047', '#86efac', '#93c5fd', '#f9a8d4', '#fdba74', 'transparent'];
const strokeWidths = [1, 2, 4, 8];

export default function ShapePanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapeType, setShapeType] = useState<ShapeType>(() => (loadSettings().shapeType as ShapeType) || 'rectangle');
  const [strokeColor, setStrokeColor] = useState(() => loadSettings().shapeStrokeColor || '#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(() => loadSettings().shapeStrokeWidth || 2);
  const [filled, setFilled] = useState(false);
  const [fillColor, setFillColor] = useState('#fde047');
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const isDrawing = useRef(false);
  const shapeRenderScale = useRef(1);

  useEffect(() => {
    saveSettings({ shapeType, shapeStrokeColor: strokeColor, shapeStrokeWidth: strokeWidth });
  }, [shapeType, strokeColor, strokeWidth]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pdfCanvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
    if (!pdfCanvas) return;
    const rect = pdfCanvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;
    const scaleAttr = pdfCanvas.getAttribute('data-render-scale');
    if (scaleAttr) shapeRenderScale.current = parseFloat(scaleAttr);
  }, []);

  const positionCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pdfCanvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
    if (!pdfCanvas) return;
    const rect = pdfCanvas.getBoundingClientRect();
    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(setupCanvas, 100);
      const container = document.querySelector('.pdf-canvas-container');
      const handleScroll = () => positionCanvas();
      container?.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      return () => {
        container?.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen, setupCanvas, positionCanvas]);

  const drawPreview = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (filled && fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = 0.3;
    }

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    ctx.globalAlpha = 1;
    ctx.setLineDash([6, 4]);

    switch (shapeType) {
      case 'rectangle':
        if (filled && fillColor !== 'transparent') {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = fillColor;
          ctx.fillRect(x, y, w, h);
          ctx.globalAlpha = 1;
        }
        ctx.strokeRect(x, y, w, h);
        break;
      case 'circle': {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = w / 2;
        const ry = h / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (filled && fillColor !== 'transparent') {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.stroke();
        break;
      }
      case 'line':
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;
      case 'arrow': {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // 矢頭
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = Math.max(12, strokeWidth * 4);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      }
    }
    ctx.setLineDash([]);
  }, [shapeType, strokeColor, strokeWidth, filled, fillColor]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    startPos.current = pos;
    isDrawing.current = true;
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current || !startPos.current) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentRect({ x1: startPos.current.x, y1: startPos.current.y, x2: pos.x, y2: pos.y });
    drawPreview(startPos.current.x, startPos.current.y, pos.x, pos.y);
  };

  const handleEnd = () => {
    if (!isDrawing.current || !startPos.current || !currentRect) {
      isDrawing.current = false;
      return;
    }
    isDrawing.current = false;
    const r = currentRect;
    const minDist = Math.sqrt(Math.pow(r.x2 - r.x1, 2) + Math.pow(r.y2 - r.y1, 2));
    if (minDist < 5) {
      setCurrentRect(null);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      return;
    }

    const shapeData = JSON.stringify({
      shapeType,
      x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2,
      filled, fillColor: filled ? fillColor : undefined,
    });

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'shape',
      page: state.currentPage,
      position: { x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2) },
      content: shapeData,
      style: { shapeType, strokeColor, strokeWidth, fillColor: filled ? fillColor : undefined, filled } as ShapeStyle,
      renderScale: shapeRenderScale.current,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });

    setCurrentRect(null);
    startPos.current = null;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  };

  return (
    <>
      {isOpen && (
        <canvas
          ref={canvasRef}
          className="fixed z-[45] touch-none"
          style={{ cursor: 'crosshair' }}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
        />
      )}
      <SlidePanel isOpen={isOpen} onClose={onClose} title="図形描画" allowInteraction>
        <div className="space-y-4">
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--window-border)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm">ドラッグで図形を配置（連続配置可能）</p>
          </div>

          {/* 図形タイプ */}
          <div>
            <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>図形の種類</p>
            <div className="flex gap-2">
              {shapeTypes.map((s) => (
                <button
                  key={s.type}
                  onClick={() => setShapeType(s.type)}
                  className="dq-btn-small flex-1 flex flex-col items-center justify-center min-h-[52px] gap-0.5"
                  style={shapeType === s.type
                    ? { borderColor: '#d4a017', boxShadow: '0 0 8px rgba(212,160,23,0.5)' }
                    : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }
                  }
                >
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span style={{ fontSize: 10 }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 線の色 */}
          <div>
            <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>線の色</p>
            <div className="flex gap-3">
              {strokeColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setStrokeColor(c)}
                  className={`dq-color-btn w-10 h-10 ${strokeColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c, borderColor: strokeColor === c ? '#d4a017' : '#5c3d2e', borderWidth: 3, borderStyle: 'solid', borderRadius: 4 }}
                />
              ))}
              <label className="w-10 h-10 rounded cursor-pointer overflow-hidden" style={{ border: '3px solid #5c3d2e' }}>
                <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-full h-full cursor-pointer" style={{ padding: 0, border: 'none' }} />
              </label>
            </div>
          </div>

          {/* 線幅 */}
          <div>
            <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>線の太さ</p>
            <div className="flex gap-2">
              {strokeWidths.map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className="dq-btn-small flex items-center justify-center min-h-[44px] min-w-[44px]"
                  style={strokeWidth === w ? {} : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
                >
                  <div className="rounded-full" style={{ width: w * 3, height: w * 3, background: strokeWidth === w ? '#1a1008' : 'var(--ynk-bone)' }} />
                </button>
              ))}
            </div>
          </div>

          {/* 塗りつぶし */}
          {(shapeType === 'rectangle' || shapeType === 'circle') && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} style={{ accentColor: '#d4a017', width: 20, height: 20 }} />
                <span className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>塗りつぶし</span>
              </label>
              {filled && (
                <div className="flex gap-2 mt-2">
                  {fillColors.filter(c => c !== 'transparent').map((c) => (
                    <button
                      key={c}
                      onClick={() => setFillColor(c)}
                      className={`dq-color-btn w-8 h-8 ${fillColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c, borderColor: fillColor === c ? '#d4a017' : '#5c3d2e', borderWidth: 2, borderStyle: 'solid', borderRadius: 4 }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SlidePanel>
    </>
  );
}
