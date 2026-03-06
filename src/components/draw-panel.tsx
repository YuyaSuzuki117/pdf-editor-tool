'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, Eraser, Undo2, Trash2 } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import SlidePanel from './slide-panel';
import type { Annotation } from '@/types/pdf';

const strokeColors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
const strokeWidths = [1, 2, 4, 8];

export default function DrawPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isEraser, setIsEraser] = useState(false);
  const pathsRef = useRef<{ points: { x: number; y: number }[]; color: string; width: number }[]>([]);
  const currentPath = useRef<{ x: number; y: number }[]>([]);
  const isDrawing = useRef(false);

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
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(setupCanvas, 100);
      pathsRef.current = [];
    }
  }, [isOpen, setupCanvas]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const path of pathsRef.current) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  const getPos = (e: React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    currentPath.current = [getPos(e)];
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentPath.current.push(pos);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const points = currentPath.current;
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = isEraser ? '#f8f9fa' : strokeColor;
    ctx.lineWidth = isEraser ? strokeWidth * 3 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleTouchEnd = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    pathsRef.current.push({
      points: [...currentPath.current],
      color: isEraser ? '#f8f9fa' : strokeColor,
      width: isEraser ? strokeWidth * 3 : strokeWidth,
    });
    currentPath.current = [];
  };

  const handleUndo = () => {
    pathsRef.current.pop();
    redraw();
  };

  const handleClear = () => {
    pathsRef.current = [];
    redraw();
  };

  const handleConfirm = () => {
    for (const path of pathsRef.current) {
      if (path.points.length < 2) continue;
      const svgPath = path.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join('');
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'draw',
        page: state.currentPage,
        position: path.points[0],
        content: svgPath,
        style: { strokeColor: path.color, strokeWidth: path.width },
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    }
    onClose();
  };

  return (
    <>
      {isOpen && (
        <canvas
          ref={canvasRef}
          className="fixed z-30 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      )}
      <SlidePanel isOpen={isOpen} onClose={onClose} title="ほりえ">
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEraser(false)}
              className={`dq-btn-small flex items-center gap-2 px-4 py-2 min-h-[44px] ${!isEraser ? '' : ''}`}
              style={!isEraser ? {} : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
            >
              <Pencil size={18} /> つるはし
            </button>
            <button
              onClick={() => setIsEraser(true)}
              className={`dq-btn-small flex items-center gap-2 px-4 py-2 min-h-[44px]`}
              style={isEraser ? {} : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
            >
              <Eraser size={18} /> うめもどし
            </button>
            <button onClick={handleUndo} className="dq-btn-small flex items-center justify-center min-h-[44px] min-w-[44px]" style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}>
              <Undo2 size={18} />
            </button>
            <button onClick={handleClear} className="dq-btn-danger flex items-center justify-center min-h-[44px] min-w-[44px]">
              <Trash2 size={18} />
            </button>
          </div>
          {!isEraser && (
            <div>
              <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>こうみゃくの いろ</p>
              <div className="flex gap-3">
                {strokeColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setStrokeColor(c)}
                    className={`dq-color-btn w-10 h-10 ${strokeColor === c ? 'active' : ''}`}
                    style={{ backgroundColor: c, borderColor: strokeColor === c ? '#d4a017' : '#5c3d2e', borderWidth: 3, borderStyle: 'solid', borderRadius: 4 }}
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>みぞの ふかさ</p>
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
          <button
            onClick={handleConfirm}
            className="dq-btn w-full"
          >
            ほりえ かんせい！
          </button>
        </div>
      </SlidePanel>
    </>
  );
}
