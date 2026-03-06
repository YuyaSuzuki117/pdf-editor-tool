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
}: {
  ann: Annotation;
  fitScale: number;
  toolMode: string;
  parsedPoints?: { x: number; y: number }[];
  onDelete: (id: string) => void;
}) {
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
        }}
      >
        {ann.content}
        {toolMode === 'view' && (
          <button
            onClick={() => onDelete(ann.id)}
            className="absolute -top-2 -right-4 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto' }}
          >
            <X size={12} />
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
        }}
      >
        <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
          <path
            d={pathData}
            fill="none"
            stroke={style.strokeColor}
            strokeWidth={style.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {toolMode === 'view' && (
          <button
            onClick={() => onDelete(ann.id)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto' }}
          >
            <X size={12} />
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
          opacity: style.opacity,
          borderRadius: 2,
        }}
      >
        {toolMode === 'view' && (
          <button
            onClick={() => onDelete(ann.id)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{ fontSize: 12, lineHeight: 1, pointerEvents: 'auto', opacity: 1 }}
          >
            <X size={12} />
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
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const labelTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTapTime = useRef(0);

  const showPageLabel = useCallback(() => {
    setPageLabel(`${state.currentPage} / ${state.numPages}`);
    if (labelTimer.current) clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(() => setPageLabel(''), 2000);
  }, [state.currentPage, state.numPages]);

  // PDF読み込み
  useEffect(() => {
    if (!state.pdfData) return;
    let cancelled = false;
    setDocReady(false);
    (async () => {
      try {
        const doc = await loadDocumentFromBytes(state.pdfData!);
        if (!cancelled) {
          docRef.current = doc;
          setDocReady(true);
        }
      } catch (err) {
        console.error('PDF load error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [state.pdfData]);

  // ページ描画
  useEffect(() => {
    if (!docReady || !docRef.current || !canvasRef.current || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const doc = docRef.current!;
        const page = await doc.getPage(state.currentPage);
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current!.clientWidth;
        const computedFitScale = (containerWidth / viewport.width) * state.scale;
        if (!cancelled && canvasRef.current) {
          await renderPage(doc, state.currentPage, canvasRef.current, computedFitScale);
          const scaledViewport = page.getViewport({ scale: computedFitScale });
          setCanvasSize({
            width: Math.floor(scaledViewport.width),
            height: Math.floor(scaledViewport.height),
          });
          setFitScale(computedFitScale);
        }
      } catch (err) {
        console.error('Page render error:', err);
      }
    })();
    showPageLabel();
    return () => { cancelled = true; };
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
    if (state.toolMode === 'text') {
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
        setTextCursor({ x, y });
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
    if (state.toolMode === 'text') {
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

  // テキストモード以外のときカーソルをリセット
  useEffect(() => {
    if (state.toolMode !== 'text') {
      setTextCursor(null);
    }
  }, [state.toolMode]);

  // 現在のページのアノテーションを取得
  const currentAnnotations = state.annotations.filter(
    (a) => a.page === state.currentPage
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
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="relative my-4" style={{ width: canvasSize.width || 'auto', height: canvasSize.height || 'auto' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`PDFページ ${state.currentPage} / ${state.numPages}`}
          className="shadow-lg block"
          style={{ cursor: state.toolMode === 'text' ? 'crosshair' : undefined }}
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
    </div>
  );
}
