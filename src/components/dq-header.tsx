'use client';

import { useCallback, useRef } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes } from '@/lib/pdf-engine';
import { DqSlime } from '@/components/dq-slime';
import { YuunamaGoblin } from '@/components/dq-characters';
import PageNav from '@/components/page-nav';

export default function DqHeader() {
  const { state, dispatch } = usePDF();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPdf = !!state.pdfData;

  const handleNewFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') return;
      // 未保存変更がある場合は確認
      if (state.isModified) {
        if (!confirm('未保存の変更があります。新しいPDFを開きますか？')) return;
      }
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
    [dispatch, state.isModified],
  );

  const annotationCount = state.annotations.length;

  return (
    <header
      className="dq-window h-14 flex items-center justify-between px-3 rounded-none border-x-0 border-t-0 z-50 shrink-0"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'linear-gradient(180deg, #4a3a28 0%, #3b2a1a 30%, #2a1e12 60%, #1e1508 100%)',
        borderBottom: '3px solid #5c4a2e',
        /* 石の梁のような天井テクスチャ */
        backgroundImage: `
          linear-gradient(180deg, #4a3a28 0%, #3b2a1a 30%, #2a1e12 60%, #1e1508 100%),
          repeating-linear-gradient(90deg, transparent 0px, transparent 50px, rgba(74,58,40,0.15) 50px, rgba(74,58,40,0.15) 52px, transparent 52px, transparent 100px),
          repeating-linear-gradient(90deg, transparent 0px, transparent 25px, rgba(42,30,18,0.1) 25px, rgba(42,30,18,0.1) 26px, transparent 26px, transparent 50px)
        `,
        boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(122,85,64,0.2)',
      }}
    >
      {/* 左: 魔物アイコン + タイトル */}
      <div className="flex items-center gap-2 min-w-0">
{hasPdf ? <YuunamaGoblin size={28} bounce={false} /> : <DqSlime size={28} bounce={false} />}
        <div className="flex flex-col min-w-0">
          <h1 className="dq-title text-base truncate leading-tight">
            ⛏ はかいしんの PDF工房
            {annotationCount > 0 && (
              <span
                className="inline-flex items-center justify-center ml-1 text-[9px] min-w-[16px] h-[16px] px-1 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, #d4a017 0%, #8b6914 100%)',
                  color: '#1a1008',
                  fontWeight: 700,
                  verticalAlign: 'middle',
                }}
              >
                {annotationCount}
              </span>
            )}
          </h1>
          {hasPdf && state.file && (
            <span className="dq-text text-[9px] truncate opacity-60 leading-tight" style={{ maxWidth: 160 }}>
              {state.file.name}
            </span>
          )}
        </div>
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
