'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes } from '@/lib/pdf-engine';
import { DqSlime } from '@/components/dq-slime';
import { YuunamaGoblin } from '@/components/dq-characters';
import PageNav from '@/components/page-nav';
import { dqConfirm } from '@/components/dq-confirm';
import { emitUiEvent, uiEvents } from '@/lib/ui-events';

export default function DqHeader() {
  const { state, dispatch } = usePDF();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPdf = !!state.pdfData;

  const handleNewFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') return;
      // 未保存変更がある場合は確認
      if (state.isModified) {
        if (!(await dqConfirm('未保存の変更があります。\n新しいPDFを開きますか？'))) return;
      }
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const arrayBuffer = await file.arrayBuffer();
        const doc = await loadDocumentFromBytes(arrayBuffer);
        const numPages = doc.numPages;
        doc.destroy(); // メモリ解放（PDFViewerで再度ロードされる）
        dispatch({
          type: 'LOAD_PDF',
          payload: { file, pdfData: arrayBuffer, numPages },
        });
      } catch {
        dispatch({ type: 'SET_ERROR', payload: 'PDFの読み込みに失敗しました' });
      }
    },
    [dispatch, state.isModified],
  );

  const [printing, setPrinting] = useState(false);

  const handlePrint = useCallback(async () => {
    if (!state.pdfData || printing) return;
    setPrinting(true);
    try {
      const blob = new Blob([state.pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
          setPrinting(false);
        }, 1000);
      };
    } catch {
      setPrinting(false);
    }
  }, [state.pdfData, printing]);

  // Ctrl+P イベントリスナー
  useEffect(() => {
    const handler = () => { handlePrint(); };
    window.addEventListener('quick-print', handler);
    return () => window.removeEventListener('quick-print', handler);
  }, [handlePrint]);

  useEffect(() => {
    const handler = () => fileInputRef.current?.click();
    window.addEventListener(uiEvents.openPdfPicker, handler);
    return () => window.removeEventListener(uiEvents.openPdfPicker, handler);
  }, []);

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
            <span className="dq-text text-[9px] truncate opacity-60 leading-tight flex items-center gap-1" style={{ maxWidth: 180 }}>
              {state.isModified && (
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: '#d4a017', boxShadow: '0 0 6px rgba(212,160,23,0.6)', animation: 'dq-placement-blink 2s ease-in-out infinite' }} title="未保存の変更があります" />
              )}
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

      {/* 右: クイック操作 + 保存 + 印刷 + 新規ファイル選択 */}
      <div className="flex items-center gap-1">
          <button
            onClick={() => emitUiEvent(uiEvents.toggleQuickActions)}
            className="dq-window flex items-center justify-center w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg cursor-pointer select-none active:scale-90 transition-transform"
            aria-label="クイック操作"
            title="クイック操作 (Ctrl+K)"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16" />
              <path d="M4 12h10" />
              <path d="M4 18h16" />
              <path d="m15 9 3 3-3 3" />
            </svg>
          </button>
        {hasPdf && (
          <>
          {state.isModified && (
            <button
              onClick={() => dispatch({ type: 'SET_TOOL', payload: 'save' })}
              className="dq-window flex items-center justify-center w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg cursor-pointer select-none active:scale-90 transition-transform"
              aria-label="保存"
              title="保存 (Ctrl+S)"
              style={{ borderColor: '#d4a017', boxShadow: '0 0 8px rgba(212,160,23,0.4)' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2" strokeLinecap="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
          )}
          <button
            onClick={handlePrint}
            disabled={printing}
            className="dq-window flex items-center justify-center w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg cursor-pointer select-none active:scale-90 transition-transform"
            aria-label="印刷"
            title="印刷 (Ctrl+P)"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
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
          </>
        )}
      </div>
    </header>
  );
}
