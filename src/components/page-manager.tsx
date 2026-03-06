'use client';

import { useEffect, useState, useCallback } from 'react';
import { RotateCw, Trash2, ChevronUp, ChevronDown, X, FilePlus } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes, renderPageToDataURL } from '@/lib/pdf-engine';
import { rotatePage, deletePage, mergePdfs } from '@/lib/pdf-editor';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--background)' }}>
      <div className="dq-window flex items-center justify-between p-4" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <h2 className="dq-title text-lg">ページ管理</h2>
        <div className="flex gap-2">
          <button
            onClick={handleInsertPDF}
            className="dq-btn-small flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
          >
            <FilePlus size={20} />
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
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="dq-spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {thumbnails.map((thumb) => (
              <div key={thumb.index} className="relative group">
                <div
                  className={`dq-thumbnail-frame cursor-pointer ${
                    state.currentPage === thumb.index + 1 ? 'active' : ''
                  }`}
                  style={{
                    border: `3px solid ${state.currentPage === thumb.index + 1 ? '#d4a017' : '#7a5540'}`,
                    borderRadius: 4,
                    overflow: 'hidden',
                    background: '#1a1008',
                    boxShadow: state.currentPage === thumb.index + 1 ? '0 0 12px rgba(245, 214, 123, 0.5)' : '0 2px 8px rgba(0,0,0,0.4)',
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
                <p className="dq-text text-center text-xs mt-1" style={{ color: 'var(--ynk-gold)' }}>{thumb.index + 1}</p>
                <div className="absolute top-1 right-1 flex flex-col gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRotate(thumb.index); }}
                    className="dq-btn-small flex items-center justify-center"
                    style={{ minHeight: 32, minWidth: 32, padding: 4 }}
                  >
                    <RotateCw size={14} />
                  </button>
                  {state.numPages > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(thumb.index); }}
                      className="dq-btn-danger flex items-center justify-center"
                      style={{ minHeight: 32, minWidth: 32, padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
