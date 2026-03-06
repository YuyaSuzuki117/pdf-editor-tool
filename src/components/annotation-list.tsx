'use client';

import { useState } from 'react';
import { X, Type, Pencil, Highlighter, Trash2 } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import type { AnnotationType } from '@/types/pdf';

const typeIcons: Record<AnnotationType, React.ReactNode> = {
  text: <Type size={14} />,
  draw: <Pencil size={14} />,
  highlight: <Highlighter size={14} />,
  image: <Type size={14} />,
};

const typeLabels: Record<AnnotationType, string> = {
  text: 'テキスト',
  draw: '描画',
  highlight: 'マーカー',
  image: '画像',
};

export default function AnnotationList() {
  const { state, dispatch } = usePDF();
  const [isOpen, setIsOpen] = useState(false);

  if (state.annotations.length === 0) return null;

  return (
    <>
      {/* フローティングボタン（右上） */}
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
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--ynk-gold)" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        {/* バッジ */}
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

      {/* パネル */}
      {isOpen && (
        <div role="dialog" aria-label="アノテーション一覧" className="fixed top-28 right-3 z-50 w-72 max-h-[60vh] overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)',
            border: '3px solid #5c4a2e',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(92,74,46,0.2)',
          }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '2px solid #5c4a2e' }}>
            <span className="dq-title text-sm">アノテーション一覧</span>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center w-6 h-6 cursor-pointer"
              style={{ color: '#c8a060' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* 一覧 */}
          <div className="p-2 space-y-1">
            {state.annotations.map((ann) => (
              <div
                key={ann.id}
                className="flex items-center gap-2 px-2 py-1.5 group"
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(92,74,46,0.3)',
                  borderRadius: 2,
                }}
              >
                {/* タイプアイコン */}
                <span style={{ color: 'var(--ynk-gold)', flexShrink: 0 }}>
                  {typeIcons[ann.type]}
                </span>
                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="dq-text text-[10px]" style={{ color: 'var(--ynk-gold)' }}>
                      {typeLabels[ann.type]}
                    </span>
                    <span className="dq-text text-[10px] opacity-50">
                      P.{ann.page}
                    </span>
                  </div>
                  {ann.type === 'text' && ann.content && (
                    <p className="dq-text text-[10px] truncate opacity-70" style={{ maxWidth: 160 }}>
                      {ann.content}
                    </p>
                  )}
                </div>
                {/* 削除ボタン */}
                <button
                  onClick={() => dispatch({ type: 'REMOVE_ANNOTATION', payload: ann.id })}
                  className="flex items-center justify-center w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: '#ef4444', flexShrink: 0 }}
                  title="削除"
                  aria-label={`${typeLabels[ann.type]}を削除`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* フッター: 全削除 */}
          <div className="px-3 py-2" style={{ borderTop: '2px solid #5c4a2e' }}>
            <button
              onClick={() => {
                if (confirm('全てのアノテーションを削除しますか？')) {
                  dispatch({ type: 'CLEAR_ANNOTATIONS' });
                  setIsOpen(false);
                }
              }}
              className="dq-btn-danger w-full flex items-center justify-center gap-1 text-xs py-1"
            >
              <Trash2 size={12} /> 全て削除
            </button>
          </div>
        </div>
      )}
    </>
  );
}
