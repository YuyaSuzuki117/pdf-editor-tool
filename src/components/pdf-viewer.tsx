'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes, renderPage } from '@/lib/pdf-engine';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, TextStyle, DrawStyle, HighlightStyle } from '@/types/pdf';

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
    return (
      <div
        className="absolute pointer-events-auto group"
        style={{
          left: ann.position.x,
          top: ann.position.y,
          width: style.width,
          height: style.height,
          backgroundColor: style.color,
          opacity: dragState.dragging && isDraggingRef.current ? 0.7 * style.opacity : style.opacity,
          borderRadius: 2,
          cursor: 'grab',
          userSelect: 'none',
          transform: dragTransform,
          transition: dragState.dragging ? 'none' : 'transform 0.1s',
          ...(isDraggingRef.current && dragState.dragging ? { boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50 } : {}),
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {(
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
        )}
      </div>
    );
  }
  if (ann.type === 'image') {
    const style = ann.style as Record<string, string | number>;
    const imgWidth = (style.width as number) || 150;
    const imgHeight = (style.height as number) || 150;
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

  // Ctrl+Wheel ズーム
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      dispatch({ type: 'SET_SCALE', payload: state.scale + delta });
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [dispatch, state.scale]);

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
      {pageLabel && (
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
          {state.toolMode === 'highlight' && 'マーカーモード - ドラッグで範囲選択'}
          {state.toolMode === 'image' && 'スタンプモード - PDFをタップして配置'}
        </div>
      )}
    </div>
  );
}
