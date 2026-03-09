'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, Eraser, Undo2, Trash2, X } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { loadSettings, saveSettings } from '@/lib/user-settings';
import SlidePanel from './slide-panel';
import type { Annotation } from '@/types/pdf';
import { dqConfirm } from '@/components/dq-confirm';

const strokeColors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ffffff'];
const strokeColorNames: Record<string, string> = {
  '#000000': '黒',
  '#ef4444': '赤',
  '#3b82f6': '青',
  '#22c55e': '緑',
  '#f59e0b': 'オレンジ',
  '#8b5cf6': '紫',
  '#ffffff': '白',
};
const strokeWidths = [1, 2, 4, 8];

export default function DrawPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokeColor, setStrokeColor] = useState(() => loadSettings().drawColor || '#000000');
  const [strokeWidth, setStrokeWidth] = useState(() => loadSettings().drawWidth || 2);
  const [isEraser, setIsEraser] = useState(false);
  const pathsRef = useRef<{ points: { x: number; y: number }[]; color: string; width: number; eraser?: boolean }[]>([]);
  const currentPath = useRef<{ x: number; y: number }[]>([]);
  const [strokeCount, setStrokeCount] = useState(0);
  const isDrawing = useRef(false);
  const drawRenderScale = useRef(1);
  const dprRef = useRef(1);

  const updateStrokeCount = useCallback(() => {
    setStrokeCount(pathsRef.current.length);
  }, []);

  // 設定変更時に保存
  useEffect(() => {
    saveSettings({ drawColor: strokeColor, drawWidth: strokeWidth });
  }, [strokeColor, strokeWidth]);

  const positionCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pdfCanvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
    if (!pdfCanvas) return;
    const rect = pdfCanvas.getBoundingClientRect();
    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pdfCanvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
    if (!pdfCanvas) return;
    const rect = pdfCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    // DPR対応: CSSサイズとcanvas解像度を分離
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    positionCanvas();

    // renderScaleをPDFcanvasのdata属性から取得
    const scaleAttr = pdfCanvas.getAttribute('data-render-scale');
    if (scaleAttr) drawRenderScale.current = parseFloat(scaleAttr);
  }, [positionCanvas]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(setupCanvas, 100);
      pathsRef.current = [];
      setStrokeCount(0);

      // スクロール時に描画canvasの位置を追従させる
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

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = dprRef.current;
    ctx.scale(dpr, dpr);
    ctx.restore();
    for (const path of pathsRef.current) {
      if (path.points.length < 2) continue;
      ctx.save();
      if (path.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.beginPath();
      ctx.strokeStyle = path.eraser ? 'rgba(0,0,0,1)' : path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  const getPosFromTouch = (e: React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  };

  const getPosFromMouse = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (pos: { x: number; y: number }) => {
    isDrawing.current = true;
    currentPath.current = [pos];
  };

  const moveDraw = (pos: { x: number; y: number }) => {
    if (!isDrawing.current) return;
    currentPath.current.push(pos);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const points = currentPath.current;
    if (points.length < 2) return;
    ctx.save();
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.strokeStyle = strokeColor;
    }
    ctx.lineWidth = isEraser ? strokeWidth * 3 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
  };

  const endDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    pathsRef.current.push({
      points: [...currentPath.current],
      color: isEraser ? 'rgba(0,0,0,1)' : strokeColor,
      width: isEraser ? strokeWidth * 3 : strokeWidth,
      eraser: isEraser,
    });
    currentPath.current = [];
    updateStrokeCount();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startDraw(getPosFromTouch(e));
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    moveDraw(getPosFromTouch(e));
  };
  const handleTouchEnd = () => endDraw();

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDraw(getPosFromMouse(e));
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    moveDraw(getPosFromMouse(e));
  };
  const handleMouseUp = () => endDraw();
  const handleMouseLeave = () => endDraw();

  const handleUndo = () => {
    pathsRef.current.pop();
    redraw();
    updateStrokeCount();
  };

  const handleClear = () => {
    pathsRef.current = [];
    redraw();
    updateStrokeCount();
  };

  const handleConfirm = () => {
    for (const path of pathsRef.current) {
      if (path.points.length < 2 || path.eraser) continue; // 消しゴムストロークは保存しない
      const svgPath = path.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join('');
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'draw',
        page: state.currentPage,
        position: path.points[0],
        content: svgPath,
        style: { strokeColor: path.color, strokeWidth: path.width },
        renderScale: drawRenderScale.current,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    }
    onClose();
  };

  const handleCancel = async () => {
    if (pathsRef.current.length > 0) {
      if (!(await dqConfirm('未確定の描画があります。\nキャンセルしますか？'))) return;
    }
    pathsRef.current = [];
    setStrokeCount(0);
    onClose();
  };

  const handleCloseWithCheck = async () => {
    if (pathsRef.current.length > 0) {
      if (!(await dqConfirm('未確定の描画があります。\n閉じますか？'))) return;
    }
    pathsRef.current = [];
    setStrokeCount(0);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <canvas
          ref={canvasRef}
          className="fixed z-[45] touch-none"
          role="img"
          aria-label="フリーハンド描画キャンバス"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      )}
      <SlidePanel isOpen={isOpen} onClose={handleCloseWithCheck} title="フリーハンド描画" allowInteraction>
        <div className="space-y-4">
          {/* ストローク数表示 */}
          {strokeCount > 0 && (
            <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--ynk-gold)', borderRadius: 4, padding: '8px 12px' }}>
              <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
                ストローク数: {strokeCount}本
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setIsEraser(false)}
              className={`dq-btn-small flex items-center gap-2 px-4 py-2 min-h-[44px] ${!isEraser ? '' : ''}`}
              style={!isEraser ? {} : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
            >
              <Pencil size={18} /> ペン
            </button>
            <button
              onClick={() => setIsEraser(true)}
              className={`dq-btn-small flex items-center gap-2 px-4 py-2 min-h-[44px]`}
              style={isEraser ? {} : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
            >
              <Eraser size={18} /> 消しゴム
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
              <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>ペンの色</p>
              <div className="flex gap-2 flex-wrap">
                {strokeColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setStrokeColor(c)}
                    className={`dq-color-btn w-9 h-9 ${strokeColor === c ? 'active' : ''}`}
                    style={{ backgroundColor: c, borderColor: strokeColor === c ? '#d4a017' : '#5c3d2e', borderWidth: 3, borderStyle: 'solid', borderRadius: 4 }}
                    title={strokeColorNames[c] || c}
                    aria-label={strokeColorNames[c] || c}
                  />
                ))}
                <label className="w-9 h-9 rounded cursor-pointer overflow-hidden" style={{ border: '3px solid #5c3d2e' }}>
                  <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-full h-full cursor-pointer" style={{ padding: 0, border: 'none' }} />
                </label>
              </div>
            </div>
          )}
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
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="dq-btn-small flex items-center justify-center gap-2 flex-1 min-h-[44px]"
              style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
            >
              <X size={18} /> キャンセル
            </button>
            <button
              onClick={handleConfirm}
              className="dq-btn flex-1"
            >
              描画を確定
            </button>
          </div>
        </div>
      </SlidePanel>
    </>
  );
}
