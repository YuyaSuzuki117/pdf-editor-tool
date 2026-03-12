'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Type, Pencil, Highlighter, Trash2, Copy, Diamond, StickyNote, Image as ImageIcon, MapPin, Edit3, Eye, EyeOff, Download, CopyPlus, Lock, Unlock, Search } from 'lucide-react';
import { showDqToast } from '@/lib/toast';
import { usePDF } from '@/contexts/pdf-context';
import type { AnnotationType } from '@/types/pdf';
import { dqConfirm } from '@/components/dq-confirm';
import { uiEvents } from '@/lib/ui-events';

const typeIcons: Record<AnnotationType, React.ReactNode> = {
  text: <Type size={14} />,
  draw: <Pencil size={14} />,
  highlight: <Highlighter size={14} />,
  image: <ImageIcon size={14} />,
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
type PageScope = 'all' | 'current';

type AnnotationListProps = {
  showTrigger?: boolean;
};

export default function AnnotationList({ showTrigger = true }: AnnotationListProps) {
  const { state, dispatch } = usePDF();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [pageScope, setPageScope] = useState<PageScope>('all');
  const [query, setQuery] = useState('');
  const [annotationsVisible, setAnnotationsVisible] = useState(true);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const anns = filter === 'all' ? state.annotations : state.annotations.filter(a => a.type === filter);
    const scoped = pageScope === 'current' ? anns.filter((annotation) => annotation.page === state.currentPage) : anns;
    // ページ順→作成順でソート
    return [...scoped]
      .filter((annotation) => {
        if (!normalizedQuery) return true;
        const haystack = [
          annotation.content,
          typeLabels[annotation.type],
          `page ${annotation.page}`,
          `p.${annotation.page}`,
          `ページ ${annotation.page}`,
        ].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => a.page !== b.page ? a.page - b.page : a.createdAt - b.createdAt);
  }, [filter, pageScope, query, state.annotations, state.currentPage]);

  // 使用されているタイプのみフィルタボタンに表示
  const usedTypes = useMemo(() => {
    const types = new Set(state.annotations.map(a => a.type));
    return Array.from(types) as AnnotationType[];
  }, [state.annotations]);

  const jumpToAnnotation = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, [dispatch]);

  // アノテーション表示/非表示をCSS classで制御
  useEffect(() => {
    const overlay = document.querySelector('.annotation-overlay');
    if (overlay) {
      (overlay as HTMLElement).style.opacity = annotationsVisible ? '1' : '0';
      (overlay as HTMLElement).style.pointerEvents = annotationsVisible ? 'auto' : 'none';
    }
  }, [annotationsVisible, state.annotations]);

  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    const toggleHandler = () => setIsOpen((current) => !current);
    window.addEventListener(uiEvents.openAnnotationList, openHandler);
    window.addEventListener(uiEvents.toggleAnnotationList, toggleHandler);
    return () => {
      window.removeEventListener(uiEvents.openAnnotationList, openHandler);
      window.removeEventListener(uiEvents.toggleAnnotationList, toggleHandler);
    };
  }, []);

  const handleExportJSON = useCallback(() => {
    const data = {
      fileName: state.file?.name || 'unknown',
      exportedAt: new Date().toISOString(),
      annotationCount: state.annotations.length,
      annotations: state.annotations.map(ann => ({
        id: ann.id,
        type: ann.type,
        page: ann.page,
        position: ann.position,
        content: ann.type === 'image' ? '[画像データ]' : ann.content,
        style: ann.style,
        createdAt: new Date(ann.createdAt).toISOString(),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${state.file?.name?.replace('.pdf', '') || 'doc'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.annotations, state.file]);

  if (state.annotations.length === 0) return null;

  return (
    <>
      {showTrigger && (
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
      )}

      {isOpen && (
        <div role="dialog" aria-label="アノテーション一覧" className="fixed right-3 left-3 sm:left-auto z-50 sm:w-80 flex flex-col"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
            background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)',
            border: '3px solid #5c4a2e',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(92,74,46,0.2)',
          }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '2px solid #5c4a2e' }}>
            <span className="dq-title text-sm">アノテーション ({state.annotations.length}件)</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAnnotationsVisible(!annotationsVisible)}
                className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] cursor-pointer"
                style={{ color: annotationsVisible ? 'var(--ynk-gold)' : '#666' }}
                title={annotationsVisible ? 'アノテーションを非表示' : 'アノテーションを表示'}
                aria-label={annotationsVisible ? 'アノテーションを非表示' : 'アノテーションを表示'}
              >
                {annotationsVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] cursor-pointer"
                style={{ color: 'var(--ynk-gold)' }}
                title="アノテーションをJSON出力"
                aria-label="アノテーションをJSON出力"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] cursor-pointer"
                style={{ color: '#c8a060' }}
                aria-label="閉じる"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* フィルタ */}
          <div className="px-2 py-2 shrink-0 space-y-2" style={{ borderBottom: '1px solid rgba(92,74,46,0.3)' }}>
            <div
              className="flex items-center gap-2 px-2 py-1.5"
              style={{
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(92,74,46,0.35)',
                borderRadius: 2,
              }}
            >
              <Search size={14} style={{ color: 'var(--ynk-gold)', flexShrink: 0 }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="文字・ページ番号で絞り込み"
                className="dq-text w-full bg-transparent outline-none"
                style={{ fontSize: 12, color: 'var(--ynk-bone)' }}
                aria-label="アノテーションを検索"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setPageScope('all')}
                className="dq-text text-[10px] px-2 py-0.5 rounded-sm whitespace-nowrap"
                style={{
                  background: pageScope === 'all' ? 'rgba(212,160,23,0.2)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${pageScope === 'all' ? '#d4a017' : 'rgba(92,74,46,0.3)'}`,
                  color: pageScope === 'all' ? '#e8b820' : undefined,
                }}
              >
                全ページ
              </button>
              <button
                onClick={() => setPageScope('current')}
                className="dq-text text-[10px] px-2 py-0.5 rounded-sm whitespace-nowrap"
                style={{
                  background: pageScope === 'current' ? 'rgba(212,160,23,0.2)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${pageScope === 'current' ? '#d4a017' : 'rgba(92,74,46,0.3)'}`,
                  color: pageScope === 'current' ? '#e8b820' : undefined,
                }}
              >
                現在ページのみ
              </button>
              {usedTypes.length > 1 && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* 一覧 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map((ann) => (
              <div
                key={ann.id}
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 px-2 py-1.5 group cursor-pointer"
                style={{
                  background: ann.page === state.currentPage ? 'rgba(212,160,23,0.1)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${ann.page === state.currentPage ? 'rgba(212,160,23,0.3)' : 'rgba(92,74,46,0.3)'}`,
                  borderRadius: 2,
                }}
                onClick={() => jumpToAnnotation(ann.page)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpToAnnotation(ann.page); } }}
                title={`ページ${ann.page}に移動`}
                aria-label={`${typeLabels[ann.type]} ページ${ann.page}に移動`}
              >
                <span style={{ color: 'var(--ynk-gold)', flexShrink: 0 }}>
                  {typeIcons[ann.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="dq-text text-[10px] flex items-center gap-0.5" style={{ color: 'var(--ynk-gold)' }}>
                      {typeLabels[ann.type]}
                      {ann.locked && <Lock size={8} />}
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
                {state.numPages > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      let count = 0;
                      for (let p = 1; p <= state.numPages; p++) {
                        if (p === ann.page) continue;
                        dispatch({
                          type: 'ADD_ANNOTATION',
                          payload: {
                            ...ann,
                            id: crypto.randomUUID(),
                            page: p,
                            createdAt: Date.now() + p,
                          },
                        });
                        count++;
                      }
                      showDqToast(`${count}ページにコピーしました`, 'success');
                    }}
                    className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ color: '#22c55e', flexShrink: 0 }}
                    title="全ページにコピー"
                    aria-label={`${typeLabels[ann.type]}を全ページにコピー`}
                  >
                    <CopyPlus size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'UPDATE_ANNOTATION', payload: { id: ann.id, updates: { locked: !ann.locked } } });
                    showDqToast(ann.locked ? 'ロック解除しました' : 'ロックしました', 'info');
                  }}
                  className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: ann.locked ? '#f59e0b' : '#6b7280', flexShrink: 0 }}
                  title={ann.locked ? 'ロック解除' : 'ロック (移動・削除防止)'}
                  aria-label={ann.locked ? `${typeLabels[ann.type]}のロック解除` : `${typeLabels[ann.type]}をロック`}
                >
                  {ann.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (ann.locked) { showDqToast('ロック中は削除できません', 'error'); return; }
                    if (await dqConfirm(`この${typeLabels[ann.type]}を\n削除しますか？`)) {
                      dispatch({ type: 'REMOVE_ANNOTATION', payload: ann.id });
                    }
                  }}
                  className="flex items-center justify-center w-7 h-7 min-w-[28px] min-h-[28px] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: ann.locked ? '#6b728066' : '#ef4444', flexShrink: 0 }}
                  title={ann.locked ? 'ロック中は削除不可' : '削除'}
                  aria-label={`${typeLabels[ann.type]}を削除`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="dq-text text-xs text-center py-4 opacity-50">条件に合うアノテーションがありません</p>
            )}
          </div>

          {/* フッター */}
          <div className="px-3 py-2 shrink-0 space-y-1.5" style={{ borderTop: '2px solid #5c4a2e' }}>
            {filter !== 'all' && (
              <button
                onClick={async () => {
                  const count = state.annotations.filter(a => a.type === filter).length;
                  if (await dqConfirm(`${typeLabels[filter as AnnotationType]}を全て(${count}件)\n削除しますか？`)) {
                    const toRemove = state.annotations.filter(a => a.type === filter).map(a => a.id);
                    for (const id of toRemove) dispatch({ type: 'REMOVE_ANNOTATION', payload: id });
                    showDqToast(`${typeLabels[filter as AnnotationType]}${count}件を削除しました`, 'success');
                    setFilter('all');
                  }
                }}
                className="dq-btn-small w-full flex items-center justify-center gap-1 text-xs py-1.5 min-h-[36px]"
                style={{ background: 'linear-gradient(180deg, #92400e 0%, #78350f 100%)', borderColor: '#f59e0b', color: '#fde047' }}
              >
                <Trash2 size={14} /> {typeLabels[filter as AnnotationType]}を全て削除 ({state.annotations.filter(a => a.type === filter).length}件)
              </button>
            )}
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
