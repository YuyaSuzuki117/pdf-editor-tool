'use client';

import { useEffect, useState, useCallback } from 'react';
import { RotateCw, Trash2, ChevronUp, ChevronDown, X, FilePlus } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { YuunamaLilith } from '@/components/dq-characters';
import { loadDocumentFromBytes, renderPageToDataURL } from '@/lib/pdf-engine';
import { rotatePage, deletePage, mergePdfs, reorderPages } from '@/lib/pdf-editor';

interface PageThumb {
  index: number;
  dataURL: string;
}

export default function PageManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [loading, setLoading] = useState(false);

  const generateThumbnails = useCallback(async () => {
    if (!state.pdfData) return;
    setLoading(true);
    setThumbnails([]);
    const doc = await loadDocumentFromBytes(state.pdfData);
    // プレースホルダーを先に設定
    const placeholders: PageThumb[] = [];
    for (let i = 0; i < doc.numPages; i++) {
      placeholders.push({ index: i, dataURL: '' });
    }
    setThumbnails(placeholders);
    setLoading(false);

    // 1枚ずつ非ブロッキングで生成（setTimeoutで分割）
    for (let i = 1; i <= doc.numPages; i++) {
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            const dataURL = await renderPageToDataURL(doc, i, 0.3);
            setThumbnails((prev) =>
              prev.map((t) => (t.index === i - 1 ? { ...t, dataURL } : t))
            );
          } catch {
            // サムネイル生成失敗は無視（プレースホルダーのまま）
          }
          resolve();
        }, 0);
      });
    }

    // サムネイル生成完了後にPDFドキュメントを解放
    doc.destroy();
  }, [state.pdfData]);

  useEffect(() => {
    if (isOpen) generateThumbnails();
  }, [isOpen, generateThumbnails]);

  const handleRotate = async (pageIndex: number) => {
    if (!state.pdfData) return;
    const newBytes = await rotatePage(state.pdfData, pageIndex);
    dispatch({
      type: 'UPDATE_PDF_DATA',
      payload: { pdfData: newBytes.buffer as ArrayBuffer, numPages: state.numPages },
    });
    generateThumbnails();
  };

  const handleDelete = async (pageIndex: number) => {
    if (!state.pdfData || state.numPages <= 1) return;
    if (!confirm(`ページ${pageIndex + 1}を削除しますか？`)) return;
    const newBytes = await deletePage(state.pdfData, pageIndex);
    const newNumPages = state.numPages - 1;
    dispatch({
      type: 'UPDATE_PDF_DATA',
      payload: { pdfData: newBytes.buffer as ArrayBuffer, numPages: newNumPages },
    });
    if (state.currentPage > newNumPages) {
      dispatch({ type: 'SET_PAGE', payload: newNumPages });
    }
    generateThumbnails();
  };

  const handleInsertPDF = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !state.pdfData) return;
      const newBuffer = await file.arrayBuffer();
      const merged = await mergePdfs([state.pdfData, newBuffer]);
      const doc = await loadDocumentFromBytes(merged.buffer as ArrayBuffer);
      const numPages = doc.numPages;
      doc.destroy(); // ページ数取得後に即解放
      dispatch({
        type: 'UPDATE_PDF_DATA',
        payload: { pdfData: merged.buffer as ArrayBuffer, numPages },
      });
      generateThumbnails();
    };
    input.click();
  };

  const handleMove = async (pageIndex: number, direction: 'up' | 'down') => {
    if (!state.pdfData) return;
    const total = state.numPages;
    if (direction === 'up' && pageIndex === 0) return;
    if (direction === 'down' && pageIndex >= total - 1) return;

    const swapWith = direction === 'up' ? pageIndex - 1 : pageIndex + 1;
    const newOrder = Array.from({ length: total }, (_, i) => i);
    newOrder[pageIndex] = swapWith;
    newOrder[swapWith] = pageIndex;

    const newBytes = await reorderPages(state.pdfData, newOrder);
    dispatch({
      type: 'UPDATE_PDF_DATA',
      payload: { pdfData: newBytes.buffer as ArrayBuffer, numPages: total },
    });

    // 現在のページが移動対象なら追従
    if (state.currentPage === pageIndex + 1) {
      dispatch({ type: 'SET_PAGE', payload: swapWith + 1 });
    } else if (state.currentPage === swapWith + 1) {
      dispatch({ type: 'SET_PAGE', payload: pageIndex + 1 });
    }

    generateThumbnails();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--background)' }}>
      {/* ヘッダー */}
      <div
        className="dq-window flex items-center justify-between px-4 py-3"
        style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', flexShrink: 0 }}
      >
        <h2 className="dq-title text-lg">ページ管理</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--ynk-bone)', opacity: 0.7 }}>
            {state.numPages}ページ
          </span>
          <button
            onClick={handleInsertPDF}
            className="dq-btn-small flex items-center gap-1 justify-center"
            title="PDFを追加"
            style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)', padding: '4px 10px' }}
          >
            <FilePlus size={16} />
            <span className="text-xs hidden sm:inline">追加</span>
          </button>
          <button
            onClick={onClose}
            className="dq-close-btn"
            style={{ background: 'linear-gradient(180deg, #4a4a4a 0%, #333 100%)', border: '2px solid #7a5540', borderRadius: '50%', color: '#d4a017', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* サムネイルグリッド */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <YuunamaLilith size={56} bounce />
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>ページを よみこみちゅう...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {thumbnails.map((thumb) => {
              const isActive = state.currentPage === thumb.index + 1;
              const isFirst = thumb.index === 0;
              const isLast = thumb.index === thumbnails.length - 1;

              return (
                <div key={thumb.index} className="relative group flex flex-col items-center">
                  {/* サムネイル */}
                  <div
                    className="dq-thumbnail-frame cursor-pointer w-full transition-shadow"
                    style={{
                      border: `3px solid ${isActive ? '#d4a017' : '#7a5540'}`,
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: '#1a1008',
                      boxShadow: isActive
                        ? '0 0 14px rgba(245, 214, 123, 0.5)'
                        : '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                    onClick={() => {
                      dispatch({ type: 'SET_PAGE', payload: thumb.index + 1 });
                      onClose();
                    }}
                  >
                    {thumb.dataURL ? (
                      <img src={thumb.dataURL} alt={`ページ ${thumb.index + 1}`} className="w-full" />
                    ) : (
                      <div className="w-full aspect-[3/4] flex items-center justify-center" style={{ background: '#2a1e12' }}>
                        <div className="dq-spinner-sm" />
                      </div>
                    )}
                  </div>

                  {/* ページ番号 */}
                  <p className="dq-text text-center text-xs mt-1" style={{ color: isActive ? '#d4a017' : 'var(--ynk-bone)', fontWeight: isActive ? 700 : 400 }}>
                    {thumb.index + 1}
                  </p>

                  {/* 操作ボタン群（右上） */}
                  <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRotate(thumb.index); }}
                      className="dq-btn-small flex items-center justify-center"
                      title="回転"
                      style={{ minHeight: 28, minWidth: 28, padding: 3 }}
                    >
                      <RotateCw size={13} />
                    </button>
                    {state.numPages > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(thumb.index); }}
                        className="dq-btn-danger flex items-center justify-center"
                        title="削除"
                        style={{ minHeight: 28, minWidth: 28, padding: 3 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* 移動ボタン群（左側） */}
                  {state.numPages > 1 && (
                    <div className="absolute top-1 left-1 flex flex-col gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMove(thumb.index, 'up'); }}
                        className="dq-btn-small flex items-center justify-center"
                        title="前へ移動"
                        disabled={isFirst}
                        style={{
                          minHeight: 28, minWidth: 28, padding: 3,
                          opacity: isFirst ? 0.3 : 1,
                          cursor: isFirst ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMove(thumb.index, 'down'); }}
                        className="dq-btn-small flex items-center justify-center"
                        title="後へ移動"
                        disabled={isLast}
                        style={{
                          minHeight: 28, minWidth: 28, padding: 3,
                          opacity: isLast ? 0.3 : 1,
                          cursor: isLast ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
