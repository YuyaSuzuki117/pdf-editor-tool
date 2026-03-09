'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes, renderPage } from '@/lib/pdf-engine';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, TextStyle, DrawStyle, HighlightStyle, ShapeStyle, NoteStyle } from '@/types/pdf';

// メモ化されたアノテーションアイテム
const AnnotationItem = React.memo(function AnnotationItem({
  ann,
  fitScale,
  toolMode,
  parsedPoints,
  onDelete,
  onUpdate,
}: {
  ann: Annotation;
  fitScale: number;
  toolMode: string;
  parsedPoints?: { x: number; y: number }[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
}) {
  const [dragState, setDragState] = useState({
    dragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const dragDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragDistRef.current = 0;
    isDraggingRef.current = false;
    setDragState({
      dragging: true,
      startX: clientX,
      startY: clientY,
      offsetX: 0,
      offsetY: 0,
    });
  }, []);

  useEffect(() => {
    if (!dragState.dragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragState.startX;
      const dy = clientY - dragState.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      dragDistRef.current = dist;
      if (dist >= 5) {
        isDraggingRef.current = true;
      }
      offsetRef.current = { x: dx, y: dy };
      setDragState((prev) => ({ ...prev, offsetX: dx, offsetY: dy }));
    };

    const onEnd = () => {
      if (isDraggingRef.current) {
        const finalX = offsetRef.current.x;
        const finalY = offsetRef.current.y;
        if (ann.type === 'draw') {
          // drawアノテーションはcontent内の座標を全てオフセット
          const newContent = ann.content.replace(
            /([ML])([\d.]+),([\d.]+)/g,
            (_match, cmd, xStr, yStr) => {
              const nx = parseFloat(xStr) + finalX;
              const ny = parseFloat(yStr) + finalY;
              return `${cmd}${nx},${ny}`;
            }
          );
          onUpdate(ann.id, { content: newContent });
        } else {
          onUpdate(ann.id, {
            position: {
              x: ann.position.x + finalX,
              y: ann.position.y + finalY,
            },
          });
        }
      }
      offsetRef.current = { x: 0, y: 0 };
      setDragState({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    // dragState.offsetXとoffsetYは依存に含めない（onEnd内ではstale closureだが、
    // onUpdateはposition計算のため最新のoffsetを使う必要がある）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState.dragging, dragState.startX, dragState.startY, ann.id, ann.position.x, ann.position.y, onUpdate]);

  // ダブルクリック/ダブルタップで再編集
  const handleDoubleClick = useCallback(() => {
    if (ann.type !== 'text') return;
    window.dispatchEvent(new CustomEvent('edit-annotation', { detail: { annotation: ann } }));
  }, [ann]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, [startDrag]);

  const draggingStyle: React.CSSProperties = isDraggingRef.current && dragState.dragging
    ? { opacity: 0.7, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50 }
    : {};

  const dragTransform = dragState.dragging
    ? `translate(${dragState.offsetX}px, ${dragState.offsetY}px)`
    : undefined;

  if (ann.type === 'text') {
    const style = ann.style as TextStyle;
    return (
      <div
        className="absolute pointer-events-auto group"
        style={{
          left: ann.position.x,
          top: ann.position.y,
          fontSize: style.fontSize * (fitScale / 1),
          color: style.color,
          fontFamily: style.fontFamily || 'Helvetica, Arial, sans-serif',
          fontWeight: style.bold ? 'bold' : 'normal',
          fontStyle: style.italic ? 'italic' : 'normal',
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          textShadow: '0 0 2px rgba(255,255,255,0.5)',
          cursor: 'grab',
          userSelect: 'none',
          transform: dragTransform,
          transition: dragState.dragging ? 'none' : 'transform 0.1s',
          ...draggingStyle,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onDoubleClick={handleDoubleClick}
      >
        {ann.content}
        {(
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (dragDistRef.current < 5) onDelete(ann.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute -top-3 -right-5 bg-red-500 text-white rounded-full w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
            style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto' }}
            aria-label="削除"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
  if (ann.type === 'draw') {
    const style = ann.style as DrawStyle;
    const points = parsedPoints || [];
    if (points.length < 2) return null;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const pad = style.strokeWidth * 2;
    const svgWidth = maxX - minX + pad * 2;
    const svgHeight = maxY - minY + pad * 2;
    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x - minX + pad},${p.y - minY + pad}`)
      .join('');
    return (
      <div
        className="absolute pointer-events-auto group"
        style={{
          left: minX - pad,
          top: minY - pad,
          width: svgWidth,
          height: svgHeight,
          cursor: 'grab',
          userSelect: 'none',
          transform: dragTransform,
          transition: dragState.dragging ? 'none' : 'transform 0.1s',
          ...draggingStyle,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }} role="img" aria-label="描画アノテーション">
          <path
            d={pathData}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {(
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (dragDistRef.current < 5) onDelete(ann.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
            style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto' }}
            aria-label="削除"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
  if (ann.type === 'highlight') {
    const style = ann.style as HighlightStyle;
    const mode = style.markupMode || 'highlight';
    const displayHeight = (mode === 'underline' || mode === 'strikethrough') ? 3 : style.height;
    const displayOpacity = mode === 'redact' ? 1 : style.opacity;
    const displayColor = mode === 'redact' ? '#000000' : style.color;
    return (
      <div
        className="absolute pointer-events-auto group"
        style={{
          left: ann.position.x,
          top: ann.position.y,
          width: style.width,
          height: displayHeight,
          backgroundColor: displayColor,
          opacity: dragState.dragging && isDraggingRef.current ? 0.7 * displayOpacity : displayOpacity,
          borderRadius: mode === 'redact' ? 0 : 2,
          cursor: 'grab',
          userSelect: 'none',
          transform: dragTransform,
          transition: dragState.dragging ? 'none' : 'transform 0.1s',
          ...(isDraggingRef.current && dragState.dragging ? { boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50 } : {}),
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (dragDistRef.current < 5) onDelete(ann.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
          style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto', opacity: 1 }}
          aria-label="削除"
        >
          <X size={14} />
        </button>
      </div>
    );
  }
  if (ann.type === 'image') {
    const style = ann.style as Record<string, string | number>;
    const imgWidth = (style.width as number) || 150;
    const imgHeight = (style.height as number) || 150;

    const handleResize = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const startW = imgWidth;
      const startH = imgHeight;
      const aspect = startW / startH;

      const onMove = (ev: MouseEvent | TouchEvent) => {
        const cx = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
        const cy = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
        const dx = cx - startX;
        const dy = cy - startY;
        const delta = Math.max(dx, dy);
        const newW = Math.max(30, startW + delta);
        const newH = Math.max(30, newW / aspect);
        onUpdate(ann.id, { style: { ...ann.style, width: Math.round(newW), height: Math.round(newH) } });
      };
      const onEnd = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    };

    return (
      <div
        className="absolute pointer-events-auto group"
        style={{
          left: ann.position.x,
          top: ann.position.y,
          width: imgWidth,
          height: imgHeight,
          cursor: 'grab',
          userSelect: 'none',
          transform: dragTransform,
          transition: dragState.dragging ? 'none' : 'transform 0.1s',
          ...draggingStyle,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ann.content}
          alt="スタンプ・画像アノテーション"
          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
        />
        {/* リサイズハンドル（右下） */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, var(--ynk-gold) 50%)',
            pointerEvents: 'auto',
          }}
          onMouseDown={handleResize}
          onTouchStart={handleResize}
          aria-label="リサイズ"
        />
        {(
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (dragDistRef.current < 5) onDelete(ann.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
            style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto' }}
            aria-label="削除"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
  if (ann.type === 'shape') {
    const style = ann.style as ShapeStyle;
    let shapeData: { shapeType: string; x1: number; y1: number; x2: number; y2: number; filled?: boolean; fillColor?: string };
    try { shapeData = JSON.parse(ann.content); } catch { return null; }
    const x = Math.min(shapeData.x1, shapeData.x2);
    const y = Math.min(shapeData.y1, shapeData.y2);
    const w = Math.abs(shapeData.x2 - shapeData.x1);
    const h = Math.abs(shapeData.y2 - shapeData.y1);
    const pad = style.strokeWidth * 2;

    const renderShape = () => {
      switch (shapeData.shapeType) {
        case 'rectangle':
          return (
            <>
              {shapeData.filled && shapeData.fillColor && (
                <rect x={pad} y={pad} width={w} height={h} fill={shapeData.fillColor} opacity={0.3} />
              )}
              <rect x={pad} y={pad} width={w} height={h} fill="none" stroke={style.strokeColor} strokeWidth={style.strokeWidth} />
            </>
          );
        case 'circle':
          return (
            <>
              {shapeData.filled && shapeData.fillColor && (
                <ellipse cx={w/2+pad} cy={h/2+pad} rx={w/2} ry={h/2} fill={shapeData.fillColor} opacity={0.3} />
              )}
              <ellipse cx={w/2+pad} cy={h/2+pad} rx={w/2} ry={h/2} fill="none" stroke={style.strokeColor} strokeWidth={style.strokeWidth} />
            </>
          );
        case 'line':
          return <line x1={shapeData.x1 - x + pad} y1={shapeData.y1 - y + pad} x2={shapeData.x2 - x + pad} y2={shapeData.y2 - y + pad} stroke={style.strokeColor} strokeWidth={style.strokeWidth} strokeLinecap="round" />;
        case 'arrow': {
          const ax1 = shapeData.x1 - x + pad;
          const ay1 = shapeData.y1 - y + pad;
          const ax2 = shapeData.x2 - x + pad;
          const ay2 = shapeData.y2 - y + pad;
          const angle = Math.atan2(ay2 - ay1, ax2 - ax1);
          const headLen = Math.max(12, style.strokeWidth * 4);
          return (
            <>
              <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} stroke={style.strokeColor} strokeWidth={style.strokeWidth} strokeLinecap="round" />
              <line x1={ax2} y1={ay2} x2={ax2 - headLen * Math.cos(angle - Math.PI/6)} y2={ay2 - headLen * Math.sin(angle - Math.PI/6)} stroke={style.strokeColor} strokeWidth={style.strokeWidth} strokeLinecap="round" />
              <line x1={ax2} y1={ay2} x2={ax2 - headLen * Math.cos(angle + Math.PI/6)} y2={ay2 - headLen * Math.sin(angle + Math.PI/6)} stroke={style.strokeColor} strokeWidth={style.strokeWidth} strokeLinecap="round" />
            </>
          );
        }
        default: return null;
      }
    };

    return (
      <div
        className="absolute pointer-events-auto group"
        style={{
          left: x - pad, top: y - pad,
          width: w + pad * 2, height: h + pad * 2,
          cursor: 'grab', userSelect: 'none',
          transform: dragTransform,
          transition: dragState.dragging ? 'none' : 'transform 0.1s',
          ...draggingStyle,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <svg width={w + pad * 2} height={h + pad * 2} style={{ overflow: 'visible' }}>
          {renderShape()}
        </svg>
        <button
          onClick={(e) => { e.stopPropagation(); if (dragDistRef.current < 5) onDelete(ann.id); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
          style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto' }}
          aria-label="削除"
        >
          <X size={14} />
        </button>
      </div>
    );
  }
  if (ann.type === 'note') {
    const style = ann.style as NoteStyle;
    return (
      <div
        className="absolute pointer-events-auto group"
        style={{
          left: ann.position.x, top: ann.position.y,
          cursor: 'grab', userSelect: 'none',
          transform: dragTransform,
          transition: dragState.dragging ? 'none' : 'transform 0.1s',
          ...draggingStyle,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div style={{
          width: 28, height: 28,
          background: style.noteColor || '#fde047',
          borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,0,0,0.2)',
        }} title={ann.content}>
          📝
        </div>
        {ann.content && (
          <div className="hidden group-hover:block absolute left-0 top-8 z-50" style={{
            background: style.noteColor || '#fde047',
            color: '#1a1008', padding: '8px 12px', borderRadius: 4,
            fontSize: 12, maxWidth: 200, minWidth: 100,
            boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
            border: '1px solid rgba(0,0,0,0.2)',
            wordBreak: 'break-word',
          }}>
            {ann.content}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); if (dragDistRef.current < 5) onDelete(ann.id); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
          style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto' }}
          aria-label="削除"
        >
          <X size={14} />
        </button>
      </div>
    );
  }
  return null;
});

export default function PDFViewer() {
  const { state, dispatch } = usePDF();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [docReady, setDocReady] = useState(false);
  const [pageLabel, setPageLabel] = useState('');
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [textCursor, setTextCursor] = useState<{ x: number; y: number } | null>(null);
  const [pageOpacity, setPageOpacity] = useState(1);
  const [pageJumpInput, setPageJumpInput] = useState(false);
  const [pageJumpValue, setPageJumpValue] = useState('');
  const prevPageRef = useRef(state.currentPage);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const labelTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTapTime = useRef(0);
  const renderTaskRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPageLabel = useCallback(() => {
    setPageLabel(`${state.currentPage} / ${state.numPages}`);
    if (labelTimer.current) clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(() => setPageLabel(''), 2000);
  }, [state.currentPage, state.numPages]);

  // PDF読み込み（前のドキュメントを破棄してメモリ解放）
  useEffect(() => {
    if (!state.pdfData) return;
    let cancelled = false;
    setDocReady(false);
    (async () => {
      try {
        // 前のドキュメントを破棄
        if (docRef.current) {
          docRef.current.destroy();
          docRef.current = null;
        }
        const doc = await loadDocumentFromBytes(state.pdfData!);
        if (!cancelled) {
          docRef.current = doc;
          setDocReady(true);
        } else {
          doc.destroy();
        }
      } catch (err) {
        console.error('PDF load error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [state.pdfData]);

  // unmount時にPDFドキュメントとcanvasを解放
  useEffect(() => {
    return () => {
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
      // canvasのメモリ解放
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, []);

  // ページ描画（debounce付き: 連続ページ送りでレンダリングが重ならないように）
  useEffect(() => {
    if (!docReady || !docRef.current || !canvasRef.current || !containerRef.current) return;
    let cancelled = false;

    // ページが変わった場合はフェードアウト開始
    const pageChanged = prevPageRef.current !== state.currentPage;
    if (pageChanged) {
      setPageOpacity(0);
      prevPageRef.current = state.currentPage;
    }

    // 前のレンダリング予約をキャンセル
    if (renderTaskRef.current) {
      clearTimeout(renderTaskRef.current);
    }

    renderTaskRef.current = setTimeout(async () => {
      try {
        if (cancelled || !docRef.current || !canvasRef.current || !containerRef.current) return;
        const doc = docRef.current;
        const page = await doc.getPage(state.currentPage);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current!.clientWidth;
        const computedFitScale = (containerWidth / viewport.width) * state.scale;
        if (!cancelled && canvasRef.current) {
          await renderPage(doc, state.currentPage, canvasRef.current, computedFitScale);
          if (cancelled) return;
          const scaledViewport = page.getViewport({ scale: computedFitScale });
          setCanvasSize({
            width: Math.floor(scaledViewport.width),
            height: Math.floor(scaledViewport.height),
          });
          setFitScale(computedFitScale);
          // レンダリング完了後にフェードイン
          requestAnimationFrame(() => {
            if (!cancelled) setPageOpacity(1);
          });
        }
      } catch (err) {
        if (!cancelled) console.error('Page render error:', err);
      }
    }, 50);

    showPageLabel();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        clearTimeout(renderTaskRef.current);
      }
    };
  }, [docReady, state.currentPage, state.scale, showPageLabel]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // ピンチズーム開始
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartScale.current = state.scale;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current > 0) {
      // ピンチズーム中
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = pinchStartScale.current * (dist / pinchStartDist.current);
      dispatch({ type: 'SET_SCALE', payload: Math.max(0.25, Math.min(5, newScale)) });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pinchStartDist.current > 0 && e.touches.length < 2) {
      pinchStartDist.current = 0;
      return;
    }
    if (state.toolMode === 'text' || state.toolMode === 'image') {
      // テキストモードではタッチもタップとして処理
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      // 微小な移動ならタップとみなす
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.changedTouches[0].clientX - rect.left;
        const y = e.changedTouches[0].clientY - rect.top;
        if (state.toolMode === 'text') { setTextCursor({ x, y }); }
        window.dispatchEvent(
          new CustomEvent('pdf-tap', { detail: { x, y, page: state.currentPage, renderScale: fitScale } })
        );
      }
      return;
    }
    if (state.toolMode !== 'view') return;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const isTap = Math.abs(dx) < 10 && Math.abs(dy) < 10;

    // ダブルタップ検出: 300ms以内の2回目のタップでscaleを1にリセット
    if (isTap) {
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        dispatch({ type: 'SET_SCALE', payload: 1 });
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;
    }

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && state.currentPage < state.numPages) {
        dispatch({ type: 'SET_PAGE', payload: state.currentPage + 1 });
      } else if (dx > 0 && state.currentPage > 1) {
        dispatch({ type: 'SET_PAGE', payload: state.currentPage - 1 });
      }
    }
  };

  const handleTap = useCallback((e: React.MouseEvent) => {
    if (state.toolMode === 'text' || state.toolMode === 'image') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setTextCursor({ x, y });
      window.dispatchEvent(
        new CustomEvent('pdf-tap', { detail: { x, y, page: state.currentPage, renderScale: fitScale } })
      );
    }
  }, [state.toolMode, state.currentPage, fitScale]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ANNOTATION', payload: id });
  }, [dispatch]);

  const handleUpdateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    dispatch({ type: 'UPDATE_ANNOTATION', payload: { id, updates } });
  }, [dispatch]);

  // Ctrl+Wheel ズーム（useRefで最新scaleを参照してstale closure回避）
  const scaleRef = useRef(state.scale);
  scaleRef.current = state.scale;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      dispatch({ type: 'SET_SCALE', payload: scaleRef.current + delta });
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [dispatch]);

  // テキストモード以外のときカーソルをリセット
  useEffect(() => {
    if (state.toolMode !== 'text') {
      setTextCursor(null);
    }
  }, [state.toolMode]);

  // 現在のページのアノテーションを取得（useMemoでキャッシュ）
  const currentAnnotations = useMemo(
    () => state.annotations.filter((a) => a.page === state.currentPage),
    [state.annotations, state.currentPage]
  );

  // SVGパスからpointsを抽出（useMemoでキャッシュ）
  const parsedPaths = useMemo(() => {
    const map = new Map<string, { x: number; y: number }[]>();
    for (const ann of currentAnnotations) {
      if (ann.type === 'draw') {
        map.set(
          ann.id,
          ann.content
            .split(/[ML]/)
            .filter(Boolean)
            .map((p) => {
              const [x, y] = p.trim().split(',').map(Number);
              return { x, y };
            })
        );
      }
    }
    return map;
  }, [currentAnnotations]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto pdf-canvas-container flex items-start justify-center"
      style={{ background: 'var(--background)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {!docReady && state.pdfData && (
        <div className="flex items-center justify-center h-full">
          <div className="dq-spinner" />
        </div>
      )}
      <div className="relative my-4" style={{ width: canvasSize.width || 'auto', height: canvasSize.height || 'auto' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`PDFページ ${state.currentPage} / ${state.numPages}`}
          className="shadow-lg block dq-page-fade"
          style={{ cursor: (state.toolMode === 'text' || state.toolMode === 'image') ? 'crosshair' : undefined, opacity: pageOpacity }}
          data-render-scale={fitScale}
          onClick={handleTap}
        />
        {/* アノテーションオーバーレイ */}
        {docReady && canvasSize.width > 0 && (
          <div
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {currentAnnotations.map((ann) => (
              <AnnotationItem
                key={ann.id}
                ann={ann}
                fitScale={fitScale}
                toolMode={state.toolMode}
                parsedPoints={parsedPaths.get(ann.id)}
                onDelete={handleDeleteAnnotation}
                onUpdate={handleUpdateAnnotation}
              />
            ))}
            {/* テキストモード時のカーソルインジケーター */}
            {state.toolMode === 'text' && textCursor && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: textCursor.x - 8,
                  top: textCursor.y - 8,
                  width: 16,
                  height: 16,
                }}
              >
                {/* 縦線 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 7,
                    top: 0,
                    width: 2,
                    height: 16,
                    background: '#ef4444',
                    borderRadius: 1,
                  }}
                />
                {/* 横線 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 7,
                    width: 16,
                    height: 2,
                    background: '#ef4444',
                    borderRadius: 1,
                  }}
                />
              </div>
            )}
          </div>
        )}
        {/* テキストモード時のcanvasカーソル変更 */}
        {state.toolMode === 'text' && (
          <div
            className="absolute inset-0 cursor-crosshair"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </div>
      {/* ページナビゲーションコントロール */}
      {docReady && state.numPages > 1 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1">
          <button
            onClick={() => state.currentPage > 1 && dispatch({ type: 'SET_PAGE', payload: state.currentPage - 1 })}
            disabled={state.currentPage <= 1}
            className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] cursor-pointer select-none active:scale-90 transition-transform disabled:opacity-30"
            style={{
              background: 'linear-gradient(180deg, rgba(59,42,26,0.95) 0%, rgba(26,16,8,0.95) 100%)',
              border: '2px solid #5c4a2e',
              borderRadius: 4,
            }}
            aria-label="前のページ"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          {pageJumpInput ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = parseInt(pageJumpValue, 10);
                if (p >= 1 && p <= state.numPages) dispatch({ type: 'SET_PAGE', payload: p });
                setPageJumpInput(false);
              }}
              className="flex items-center"
            >
              <input
                type="number"
                min={1}
                max={state.numPages}
                value={pageJumpValue}
                onChange={(e) => setPageJumpValue(e.target.value)}
                onBlur={() => setPageJumpInput(false)}
                autoFocus
                className="w-12 h-9 text-center text-sm bg-black/80 text-white border-2 border-[var(--ynk-gold)] rounded"
                style={{ fontFamily: 'monospace' }}
              />
              <span className="text-xs text-white/60 mx-1">/ {state.numPages}</span>
            </form>
          ) : (
            <button
              onClick={() => { setPageJumpValue(String(state.currentPage)); setPageJumpInput(true); }}
              className="h-9 px-3 flex items-center justify-center cursor-pointer select-none"
              style={{
                background: 'linear-gradient(180deg, rgba(59,42,26,0.95) 0%, rgba(26,16,8,0.95) 100%)',
                border: '2px solid #5c4a2e',
                borderRadius: 4,
                minWidth: 60,
              }}
              title="クリックでページジャンプ"
              aria-label={`ページ ${state.currentPage} / ${state.numPages}。クリックでジャンプ`}
            >
              <span className="dq-text text-xs" style={{ color: 'var(--ynk-gold)' }}>
                {state.currentPage} / {state.numPages}
              </span>
            </button>
          )}
          <button
            onClick={() => state.currentPage < state.numPages && dispatch({ type: 'SET_PAGE', payload: state.currentPage + 1 })}
            disabled={state.currentPage >= state.numPages}
            className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] cursor-pointer select-none active:scale-90 transition-transform disabled:opacity-30"
            style={{
              background: 'linear-gradient(180deg, rgba(59,42,26,0.95) 0%, rgba(26,16,8,0.95) 100%)',
              border: '2px solid #5c4a2e',
              borderRadius: 4,
            }}
            aria-label="次のページ"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}
      {/* 単一ページ時のページラベル */}
      {pageLabel && state.numPages <= 1 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-1.5 rounded-full z-40 pointer-events-none">
          {pageLabel}
        </div>
      )}
      {/* モードインジケーター */}
      {state.toolMode !== 'view' && state.toolMode !== 'pages' && state.toolMode !== 'save' && (
        <div
          className="fixed top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(42,30,18,0.95) 0%, rgba(26,16,8,0.9) 100%)',
            border: '2px solid var(--ynk-gold)',
            padding: '4px 16px',
            fontFamily: 'DotGothic16, monospace',
            fontSize: 12,
            color: 'var(--ynk-gold)',
            textShadow: '0 0 8px rgba(212,160,23,0.4)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}
        >
          {state.toolMode === 'text' && 'テキストモード - PDFをタップして配置'}
          {state.toolMode === 'draw' && 'フリーハンド描画モード'}
          {state.toolMode === 'shape' && '図形描画モード - ドラッグで図形を配置'}
          {state.toolMode === 'highlight' && 'マーカーモード - ドラッグで範囲選択'}
          {state.toolMode === 'image' && 'スタンプモード - PDFをタップして配置'}
        </div>
      )}
    </div>
  );
}
