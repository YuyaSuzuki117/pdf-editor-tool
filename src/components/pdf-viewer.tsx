'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes, renderPage } from '@/lib/pdf-engine';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextStyle, DrawStyle, HighlightStyle } from '@/types/pdf';

export default function PDFViewer() {
  const { state, dispatch } = usePDF();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [docReady, setDocReady] = useState(false);
  const [pageLabel, setPageLabel] = useState('');
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [fitScale, setFitScale] = useState(1);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const labelTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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
        window.dispatchEvent(
          new CustomEvent('pdf-tap', { detail: { x, y, page: state.currentPage } })
        );
      }
      return;
    }
    if (state.toolMode !== 'view') return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
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
      window.dispatchEvent(
        new CustomEvent('pdf-tap', { detail: { x, y, page: state.currentPage } })
      );
    }
  }, [state.toolMode, state.currentPage]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ANNOTATION', payload: id });
  }, [dispatch]);

  // 現在のページのアノテーションを取得
  const currentAnnotations = state.annotations.filter(
    (a) => a.page === state.currentPage
  );

  // SVGパスからpointsを抽出するヘルパー
  const parseSvgPath = (svgPath: string) => {
    return svgPath
      .split(/[ML]/)
      .filter(Boolean)
      .map((p) => {
        const [x, y] = p.trim().split(',').map(Number);
        return { x, y };
      });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto pdf-canvas-container bg-gray-100 dark:bg-gray-900 flex items-start justify-center"
      onTouchStart={handleTouchStart}
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
          className="shadow-lg block"
          onClick={handleTap}
        />
        {/* アノテーションオーバーレイ */}
        {docReady && canvasSize.width > 0 && (
          <div
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {currentAnnotations.map((ann) => {
              if (ann.type === 'text') {
                const style = ann.style as TextStyle;
                return (
                  <div
                    key={ann.id}
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
                    {state.toolMode === 'view' && (
                      <button
                        onClick={() => handleDeleteAnnotation(ann.id)}
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
                const points = parseSvgPath(ann.content);
                if (points.length < 2) return null;
                // ポイントのbounding boxを計算
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
                    key={ann.id}
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
                    {state.toolMode === 'view' && (
                      <button
                        onClick={() => handleDeleteAnnotation(ann.id)}
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
                    key={ann.id}
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
                    {state.toolMode === 'view' && (
                      <button
                        onClick={() => handleDeleteAnnotation(ann.id)}
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
            })}
          </div>
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
