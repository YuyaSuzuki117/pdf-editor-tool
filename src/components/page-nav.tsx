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
    </div>
  );
});

export default PageNav;
