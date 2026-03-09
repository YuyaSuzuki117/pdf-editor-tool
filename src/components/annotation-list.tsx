'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, Type, Pencil, Highlighter, Trash2, Copy, Diamond, StickyNote, Image, MapPin, Edit3 } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import type { AnnotationType } from '@/types/pdf';
import { dqConfirm } from '@/components/dq-confirm';

const typeIcons: Record<AnnotationType, React.ReactNode> = {
  text: <Type size={14} />,
  draw: <Pencil size={14} />,
  highlight: <Highlighter size={14} />,
  image: <Image size={14} />,
  shape: <Diamond size={14} />,
  note: <StickyNote size={14} />,
};

const typeLabels: Record<AnnotationType, string> = {
  text: 'テキスト',
  draw: '描画',
  highlight: 'マーカー',
  image: '画像',
  shape: '図形',
  note: 'メモ',
};

type FilterType = 'all' | AnnotationType;

export default function AnnotationList() {
  const { state, dispatch } = usePDF();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = useMemo(() => {
    const anns = filter === 'all' ? state.annotations : state.annotations.filter(a => a.type === filter);
    // ページ順→作成順でソート
    return [...anns].sort((a, b) => a.page !== b.page ? a.page - b.page : a.createdAt - b.createdAt);
  }, [state.annotations, filter]);

  // 使用されているタイプのみフィルタボタンに表示
  const usedTypes = useMemo(() => {
    const types = new Set(state.annotations.map(a => a.type));
    return Array.from(types) as AnnotationType[];
  }, [state.annotations]);

  const jumpToAnnotation = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, [dispatch]);

  if (state.annotations.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-16 right-3 z-50 flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] cursor-pointer select-none active:scale-90 transition-transform"
        style={{
          background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 50%, #2a1e12 100%)',
          border: '2px solid #8b6914',
          boxShadow: '0 3px 0 #1a1008, 0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(139,105,20,0.3)',
        }}
        title="アノテーション一覧"
        aria-label="アノテーション一覧を開く"
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center text-[9px] min-w-[16px] h-[16px] px-1 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #d4a017 0%, #8b6914 100%)',
            color: '#1a1008',
            fontWeight: 700,
          }}
        >
          {state.annotations.length}
        </span>
      </button>

      {isOpen && (
        <div role="dialog" aria-label="アノテーション一覧" className="fixed top-28 right-3 z-50 w-80 max-h-[65vh] flex flex-col"
          style={{
            background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)',
            border: '3px solid #5c4a2e',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(92,74,46,0.2)',
          }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '2px solid #5c4a2e' }}>
            <span className="dq-title text-sm">アノテーション ({state.annotations.length}件)</span>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] cursor-pointer"
              style={{ color: '#c8a060' }}
              aria-label="閉じる"
            >
              <X size={16} />
            </button>
          </div>

          {/* フィルタ */}
          {usedTypes.length > 1 && (
            <div className="flex gap-1 px-2 py-1.5 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(92,74,46,0.3)' }}>
              <button
                onClick={() => setFilter('all')}
                className="dq-text text-[10px] px-2 py-0.5 rounded-sm whitespace-nowrap"
                style={{
                  background: filter === 'all' ? 'rgba(212,160,23,0.2)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${filter === 'all' ? '#d4a017' : 'rgba(92,74,46,0.3)'}`,
                  color: filter === 'all' ? '#e8b820' : undefined,
                }}
              >
                全て
              </button>
              {usedTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className="dq-text text-[10px] px-2 py-0.5 rounded-sm whitespace-nowrap flex items-center gap-1"
                  style={{
                    background: filter === type ? 'rgba(212,160,23,0.2)' : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${filter === type ? '#d4a017' : 'rgba(92,74,46,0.3)'}`,
                    color: filter === type ? '#e8b820' : undefined,
                  }}
                >
                  {typeIcons[type]} {typeLabels[type]}
                </button>
              ))}
            </div>
          )}

          {/* 一覧 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map((ann) => (
              <div
                key={ann.id}
                className="flex items-center gap-2 px-2 py-1.5 group cursor-pointer"
                style={{
                  background: ann.page === state.currentPage ? 'rgba(212,160,23,0.1)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${ann.page === state.currentPage ? 'rgba(212,160,23,0.3)' : 'rgba(92,74,46,0.3)'}`,
                  borderRadius: 2,
                }}
                onClick={() => jumpToAnnotation(ann.page)}
                title={`ページ${ann.page}に移動`}
              >
                <span style={{ color: 'var(--ynk-gold)', flexShrink: 0 }}>
                  {typeIcons[ann.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="dq-text text-[10px]" style={{ color: 'var(--ynk-gold)' }}>
                      {typeLabels[ann.type]}
                    </span>
                    <span className="dq-text text-[10px] opacity-50 flex items-center gap-0.5">
                      <MapPin size={8} />P.{ann.page}
                    </span>
                  </div>
                  {ann.type === 'text' && ann.content && (
                    <p className="dq-text text-[10px] truncate opacity-70" style={{ maxWidth: 180 }}>
                      {ann.content}
                    </p>
                  )}
                </div>
                {ann.type === 'text' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToAnnotation(ann.page);
                      window.dispatchEvent(new CustomEvent('edit-annotation', { detail: { annotation: ann } }));
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ color: '#3b82f6', flexShrink: 0 }}
                    title="編集"
                    aria-label={`${typeLabels[ann.type]}を編集`}
                  >
                    <Edit3 size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const dup = {
                      ...ann,
                      id: crypto.randomUUID(),
                      position: { x: ann.position.x + 10, y: ann.position.y + 10 },
                      createdAt: Date.now(),
                    };
                    dispatch({ type: 'ADD_ANNOTATION', payload: dup });
                  }}
                  className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: 'var(--ynk-gold)', flexShrink: 0 }}
                  title="複製"
                  aria-label={`${typeLabels[ann.type]}を複製`}
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_ANNOTATION', payload: ann.id });
                  }}
                  className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: '#ef4444', flexShrink: 0 }}
                  title="削除"
                  aria-label={`${typeLabels[ann.type]}を削除`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="dq-text text-xs text-center py-4 opacity-50">該当なし</p>
            )}
          </div>

          {/* フッター */}
          <div className="px-3 py-2 shrink-0" style={{ borderTop: '2px solid #5c4a2e' }}>
            <button
              onClick={async () => {
                if (await dqConfirm('全てのアノテーションを\n削除しますか？')) {
                  dispatch({ type: 'CLEAR_ANNOTATIONS' });
                  setIsOpen(false);
                }
              }}
              className="dq-btn-danger w-full flex items-center justify-center gap-1 text-xs py-1.5 min-h-[36px]"
            >
              <Trash2 size={14} /> 全て削除
            </button>
          </div>
        </div>
      )}
    </>
  );
}
