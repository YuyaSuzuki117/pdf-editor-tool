'use client';

import React, { useCallback, useRef, useState, useMemo } from 'react';
import { usePDF } from '@/contexts/pdf-context';

const PageNav = React.memo(function PageNav() {
  const { state, dispatch } = usePDF();
  const pageAnnotationCount = useMemo(
    () => state.annotations.filter(a => a.page === state.currentPage).length,
    [state.annotations, state.currentPage]
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showGrid, setShowGrid] = useState(false);

  // ページごとのアノテーション数
  const pageAnnotations = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of state.annotations) {
      map.set(a.page, (map.get(a.page) || 0) + 1);
    }
    return map;
  }, [state.annotations]);

  const goTo = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, state.numPages));
      dispatch({ type: 'SET_PAGE', payload: clamped });
    },
    [dispatch, state.numPages],
  );

  const prev = useCallback(() => goTo(state.currentPage - 1), [goTo, state.currentPage]);
  const next = useCallback(() => goTo(state.currentPage + 1), [goTo, state.currentPage]);

  const startEdit = useCallback(() => {
    setInputValue(String(state.currentPage));
    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  }, [state.currentPage]);

  const commitEdit = useCallback(() => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= state.numPages) {
      goTo(num);
    }
    // 無効な値（範囲外・NaN）の場合はページを変えずに閉じる
    setIsEditing(false);
  }, [inputValue, goTo, state.numPages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') setIsEditing(false);
    },
    [commitEdit],
  );

  const isFirstPage = state.currentPage <= 1;
  const isLastPage = state.currentPage >= state.numPages;

  return (
    <div className="flex items-center gap-1">
      {/* 左矢印 */}
      <button
        onClick={prev}
        disabled={isFirstPage}
        className="dq-window flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] rounded-lg select-none active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
        style={isFirstPage ? { filter: 'grayscale(0.8)', pointerEvents: 'none' } : { cursor: 'pointer' }}
        aria-label="前のページ"
      >
        <span className="dq-title text-sm leading-none">&lt;</span>
      </button>

      {/* ページ番号 */}
      {isEditing ? (
        <div className="dq-window rounded-lg px-1 flex items-center">
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={state.numPages}
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              // 空文字は許可（入力途中）、数値なら範囲内のみ許可
              if (v === '' || v === '-') {
                setInputValue(v);
                return;
              }
              const num = parseInt(v, 10);
              if (!isNaN(num) && num >= 0 && num <= state.numPages + 1) {
                setInputValue(v);
              }
            }}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-10 h-7 bg-transparent text-center dq-text text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="dq-window rounded-lg px-2 py-0.5 cursor-pointer select-none active:scale-95 transition-transform min-h-[44px] flex items-center gap-1"
          aria-label="ページ番号を入力"
        >
          <span className="dq-text text-sm whitespace-nowrap">
            {state.currentPage} / {state.numPages}
          </span>
          {pageAnnotationCount > 0 && (
            <span
              className="inline-flex items-center justify-center text-[8px] min-w-[14px] h-[14px] px-0.5 rounded-full"
              style={{
                background: 'rgba(212,160,23,0.3)',
                color: '#d4a017',
                fontWeight: 700,
                border: '1px solid rgba(212,160,23,0.5)',
              }}
              title={`このページに${pageAnnotationCount}件のアノテーション`}
            >
              {pageAnnotationCount}
            </span>
          )}
        </button>
      )}

      {/* 右矢印 */}
      <button
        onClick={next}
        disabled={isLastPage}
        className="dq-window flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] rounded-lg select-none active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
        style={isLastPage ? { filter: 'grayscale(0.8)', pointerEvents: 'none' } : { cursor: 'pointer' }}
        aria-label="次のページ"
      >
        <span className="dq-title text-sm leading-none">&gt;</span>
      </button>

      {/* ページグリッドボタン（3ページ以上で表示） */}
      {state.numPages > 2 && (
        <button
          onClick={() => setShowGrid(!showGrid)}
          className="dq-window flex items-center justify-center w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg select-none active:scale-90 transition-all ml-1"
          style={{ cursor: 'pointer', border: showGrid ? '2px solid #d4a017' : undefined }}
          aria-label="ページ一覧"
          title="ページ一覧"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="var(--ynk-gold)" strokeWidth="1.5">
            <rect x="1" y="1" width="5" height="5" rx="0.5" />
            <rect x="10" y="1" width="5" height="5" rx="0.5" />
            <rect x="1" y="10" width="5" height="5" rx="0.5" />
            <rect x="10" y="10" width="5" height="5" rx="0.5" />
          </svg>
        </button>
      )}

      {/* ページグリッドオーバーレイ */}
      {showGrid && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(13,8,4,0.85)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowGrid(false)}
        >
          <div
            className="dq-window p-4 max-w-[400px] w-[90vw] max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="dq-title text-sm text-center mb-3">ページ一覧 ({state.numPages}ページ)</h3>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: state.numPages }, (_, i) => i + 1).map((p) => {
                const annCount = pageAnnotations.get(p) || 0;
                const isCurrent = p === state.currentPage;
                return (
                  <button
                    key={p}
                    onClick={() => { goTo(p); setShowGrid(false); }}
                    className="relative flex flex-col items-center justify-center min-h-[48px] transition-all active:scale-95"
                    style={{
                      background: isCurrent ? 'rgba(212,160,23,0.2)' : 'rgba(0,0,0,0.3)',
                      border: isCurrent ? '2px solid #d4a017' : '2px solid #5c4a2e',
                      borderRadius: 4,
                      boxShadow: isCurrent ? '0 0 8px rgba(212,160,23,0.4)' : 'none',
                    }}
                    aria-label={`ページ${p}に移動`}
                  >
                    <span className="dq-text text-sm" style={{ color: isCurrent ? '#d4a017' : 'var(--ynk-bone)' }}>{p}</span>
                    {annCount > 0 && (
                      <span className="absolute -top-1 -right-1 text-[8px] min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center"
                        style={{ background: '#d4a017', color: '#1a1008', fontWeight: 700 }}
                      >{annCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowGrid(false)}
              className="dq-btn-small w-full mt-3"
              style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default PageNav;
