'use client';

import { useCallback, useRef, useState } from 'react';
import { usePDF } from '@/contexts/pdf-context';

export default function PageNav() {
  const { state, dispatch } = usePDF();
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
    if (!isNaN(num)) goTo(num);
    setIsEditing(false);
  }, [inputValue, goTo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') setIsEditing(false);
    },
    [commitEdit],
  );

  return (
    <div className="flex items-center gap-1">
      {/* 左矢印 */}
      <button
        onClick={prev}
        disabled={state.currentPage <= 1}
        className="dq-window flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] rounded-lg cursor-pointer select-none active:scale-90 transition-transform disabled:opacity-40"
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
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-10 h-7 bg-transparent text-center dq-text text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="dq-window rounded-lg px-2 py-0.5 cursor-pointer select-none active:scale-95 transition-transform min-h-[44px] flex items-center"
          aria-label="ページ番号を入力"
        >
          <span className="dq-text text-sm whitespace-nowrap">
            {state.currentPage} / {state.numPages}
          </span>
        </button>
      )}

      {/* 右矢印 */}
      <button
        onClick={next}
        disabled={state.currentPage >= state.numPages}
        className="dq-window flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] rounded-lg cursor-pointer select-none active:scale-90 transition-transform disabled:opacity-40"
        aria-label="次のページ"
      >
        <span className="dq-title text-sm leading-none">&gt;</span>
      </button>
    </div>
  );
}
