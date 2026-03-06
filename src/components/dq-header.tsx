'use client';

import { useCallback, useRef } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes } from '@/lib/pdf-engine';
import { DqSlime } from '@/components/dq-slime';
import PageNav from '@/components/page-nav';

export default function DqHeader() {
  const { state, dispatch } = usePDF();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPdf = !!state.pdfData;

  const handleNewFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') return;
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const arrayBuffer = await file.arrayBuffer();
        const doc = await loadDocumentFromBytes(arrayBuffer);
        dispatch({
          type: 'LOAD_PDF',
          payload: { file, pdfData: arrayBuffer, numPages: doc.numPages },
        });
      } catch {
        dispatch({ type: 'SET_ERROR', payload: 'PDFの読み込みに失敗しました' });
      }
    },
    [dispatch],
  );

  return (
    <header
      className="dq-window h-14 flex items-center justify-between px-3 rounded-none border-x-0 border-t-0 z-50 shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)', borderBottom: '3px solid #5c4a2e' }}
    >
      {/* 左: 魔物アイコン + タイトル */}
      <div className="flex items-center gap-2 min-w-0">
        <DqSlime size={28} bounce={false} />
        <h1 className="dq-title text-base truncate">はかいしんの PDF</h1>
      </div>

      {/* 中央: ページナビ */}
      {hasPdf && (
        <div className="flex-1 flex justify-center">
          <PageNav />
        </div>
      )}

      {/* 右: 新規ファイル選択 */}
      {hasPdf && (
        <div className="flex items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="dq-window flex items-center justify-center w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg cursor-pointer select-none active:scale-90 transition-transform"
            aria-label="新しいPDFを開く"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ynk-gold)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleNewFile(f);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </header>
  );
}
