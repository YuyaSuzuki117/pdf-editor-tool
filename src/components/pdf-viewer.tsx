'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes, renderPage } from '@/lib/pdf-engine';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export default function PDFViewer() {
  const { state, dispatch } = usePDF();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [docReady, setDocReady] = useState(false);
  const [pageLabel, setPageLabel] = useState('');
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
        const fitScale = (containerWidth / viewport.width) * state.scale;
        if (!cancelled && canvasRef.current) {
          await renderPage(doc, state.currentPage, canvasRef.current, fitScale);
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
      <canvas
        ref={canvasRef}
        className="shadow-lg my-4"
        onClick={handleTap}
      />
      {pageLabel && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-1.5 rounded-full z-40 pointer-events-none">
          {pageLabel}
        </div>
      )}
    </div>
  );
}
