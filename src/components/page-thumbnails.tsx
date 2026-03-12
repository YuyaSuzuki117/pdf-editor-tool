'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes, renderPageToDataURL } from '@/lib/pdf-engine';
import { uiEvents } from '@/lib/ui-events';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const THUMB_WIDTH = 80;
type ThumbnailData = { dataURL: string; width: number; height: number };

const PageThumbnails = React.memo(function PageThumbnails() {
  const { state, dispatch } = usePDF();
  const [isOpen, setIsOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<Map<number, ThumbnailData>>(new Map());
  const [loading, setLoading] = useState(false);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfDataRef = useRef<ArrayBuffer | null>(null);

  // (モバイル判定は将来用に保持、現在未使用)

  // PDFデータが変わったらサムネイル生成
  useEffect(() => {
    if (!state.pdfData || state.pdfData === pdfDataRef.current) return;
    pdfDataRef.current = state.pdfData;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setThumbnails(new Map());
      try {
        if (docRef.current) {
          docRef.current.destroy();
        }
        const doc = await loadDocumentFromBytes(state.pdfData!);
        if (cancelled) { doc.destroy(); return; }
        docRef.current = doc;

        // 順番にサムネイル生成（一気にやるとメモリ消費が大きい）
        const newThumbs = new Map<number, ThumbnailData>();
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;
          const scale = THUMB_WIDTH / 595; // A4幅=595pt基準
          const rendered = await renderPageToDataURL(doc, i, Math.max(0.15, scale));
          newThumbs.set(i, rendered);
          setThumbnails(new Map(newThumbs));
        }
      } catch (err) {
        console.error('Thumbnail generation error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.pdfData]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    const toggleHandler = () => setIsOpen((current) => !current);
    window.addEventListener(uiEvents.openThumbnailStrip, openHandler);
    window.addEventListener(uiEvents.toggleThumbnailStrip, toggleHandler);
    return () => {
      window.removeEventListener(uiEvents.openThumbnailStrip, openHandler);
      window.removeEventListener(uiEvents.toggleThumbnailStrip, toggleHandler);
    };
  }, []);

  // 現在のページにスクロール
  useEffect(() => {
    if (!scrollRef.current || !isOpen) return;
    const item = scrollRef.current.querySelector(`[data-page="${state.currentPage}"]`);
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [state.currentPage, isOpen]);

  const handlePageClick = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, [dispatch]);

  // ページごとのアノテーション数
  const annotationCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const ann of state.annotations) {
      counts.set(ann.page, (counts.get(ann.page) || 0) + 1);
    }
    return counts;
  }, [state.annotations]);

  if (!state.pdfData || state.numPages <= 1) return null;

  return (
    <>
      {/* トグルボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-0 z-[42] flex flex-col items-center justify-center w-10 h-20 cursor-pointer select-none gap-1"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'linear-gradient(90deg, #3b2a1a 0%, #2a1e12 100%)',
          border: '2px solid #5c4a2e',
          borderLeft: 'none',
          borderRadius: '0 4px 4px 0',
          boxShadow: '2px 0 8px rgba(0,0,0,0.5)',
        }}
        title={isOpen ? 'サムネイルを閉じる' : 'ページサムネイル'}
        aria-label={isOpen ? 'サムネイルを閉じる' : 'ページサムネイルを開く'}
      >
        {isOpen ? <ChevronLeft size={14} style={{ color: 'var(--ynk-gold)' }} /> : <ChevronRight size={14} style={{ color: 'var(--ynk-gold)' }} />}
        <span className="dq-text text-[10px]" style={{ color: 'var(--ynk-gold)', writingMode: 'vertical-rl', textOrientation: 'upright', lineHeight: 1 }}>
          {isOpen ? '閉' : '頁'}
        </span>
      </button>

      {/* サムネイルパネル */}
      {isOpen && (
        <div
          className="fixed left-0 z-[42] page-thumbnail-strip"
          style={{
            top: 56,
            bottom: 56,
            width: THUMB_WIDTH + 28,
            background: 'linear-gradient(90deg, #1e1508 0%, #2a1e12 100%)',
            borderRight: '2px solid #5c4a2e',
            boxShadow: '4px 0 12px rgba(0,0,0,0.5)',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div ref={scrollRef} className="flex flex-col items-center gap-2 py-2 px-1.5">
            {loading && thumbnails.size === 0 && (
              <div className="dq-spinner-sm my-4" />
            )}
            {Array.from({ length: state.numPages }, (_, i) => i + 1).map((page) => {
              const thumb = thumbnails.get(page);
              const isCurrent = page === state.currentPage;
              const annCount = annotationCounts.get(page) || 0;
              return (
                <button
                  key={page}
                  data-page={page}
                  onClick={() => handlePageClick(page)}
                  className="relative flex flex-col items-center cursor-pointer select-none group"
                  style={{ width: THUMB_WIDTH + 8 }}
                >
                  <div
                    style={{
                      width: THUMB_WIDTH,
                      minHeight: THUMB_WIDTH * 1.4,
                      border: isCurrent ? '2px solid #d4a017' : '2px solid #5c4a2e',
                      boxShadow: isCurrent ? '0 0 8px rgba(212,160,23,0.5)' : '0 1px 4px rgba(0,0,0,0.3)',
                      background: '#fff',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {thumb ? (
                      <Image
                        src={thumb.dataURL}
                        alt={`ページ ${page}`}
                        width={thumb.width}
                        height={thumb.height}
                        className="w-full h-auto block"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full" style={{ minHeight: THUMB_WIDTH * 1.4 }}>
                        <div className="dq-spinner-sm" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className="dq-text"
                      style={{
                        fontSize: 9,
                        color: isCurrent ? '#d4a017' : 'var(--ynk-bone)',
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        opacity: isCurrent ? 1 : 0.6,
                      }}
                    >
                      {page}
                    </span>
                    {annCount > 0 && (
                      <span
                        style={{
                          fontSize: 7,
                          background: 'rgba(212,160,23,0.3)',
                          color: '#d4a017',
                          padding: '0 3px',
                          borderRadius: 2,
                          fontWeight: 700,
                        }}
                      >
                        {annCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
});

export default PageThumbnails;
