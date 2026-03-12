'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, FolderOpen, Search, StickyNote, Wrench } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import ZoomControls from '@/components/zoom-controls';
import { emitUiEvent, uiEvents } from '@/lib/ui-events';

type DockAction = {
  id: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string | null;
};

export default function UtilityDock() {
  const { state } = usePDF();
  const [isOpen, setIsOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const zoomPct = Math.round(state.scale * 100);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (dockRef.current && target && !dockRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const actions = useMemo<DockAction[]>(() => [
    {
      id: 'search',
      label: '検索',
      detail: 'Ctrl+F',
      icon: <Search size={16} />,
      onClick: () => emitUiEvent(uiEvents.toggleSearchPanel),
    },
    {
      id: 'annotations',
      label: '注釈一覧',
      detail: '絞り込み',
      icon: <StickyNote size={16} />,
      badge: state.annotations.length > 0 ? String(state.annotations.length) : null,
      onClick: () => emitUiEvent(uiEvents.toggleAnnotationList),
    },
    {
      id: 'pages',
      label: 'ページ一覧',
      detail: `${state.currentPage}/${state.numPages}`,
      icon: <FolderOpen size={16} />,
      onClick: () => emitUiEvent(uiEvents.toggleThumbnailStrip),
    },
    {
      id: 'quick-actions',
      label: 'クイック操作',
      detail: 'Ctrl+K',
      icon: <Command size={16} />,
      onClick: () => emitUiEvent(uiEvents.toggleQuickActions),
    },
  ], [state.annotations.length, state.currentPage, state.numPages]);

  if (!state.pdfData) return null;

  return (
    <div
      ref={dockRef}
      className="fixed right-3 z-[46] flex flex-col items-end gap-2"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.25rem)' }}
    >
      {isOpen && (
        <div
          className="dq-window w-[min(22rem,calc(100vw-1.5rem))] rounded-[18px] p-3"
          style={{
            background: 'linear-gradient(180deg, rgba(59,42,26,0.96) 0%, rgba(42,30,18,0.96) 58%, rgba(30,21,8,0.98) 100%)',
            border: '2px solid #5c4a2e',
            boxShadow: '0 16px 28px rgba(0,0,0,0.42), inset 0 1px 0 rgba(92,74,46,0.2)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dq-title text-sm" style={{ color: 'var(--ynk-gold)' }}>
                補助ドック
              </p>
              <p className="dq-text text-[10px] opacity-70">
                画面をふさがない補助操作だけをまとめています
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="dq-btn-small px-2 py-1"
              aria-label="補助ドックを閉じる"
            >
              閉じる
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className="relative flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-2 text-left cursor-pointer select-none active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.32) 100%)',
                  border: '1px solid rgba(92,74,46,0.48)',
                  color: 'var(--ynk-bone)',
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(180deg, rgba(92,74,46,0.85) 0%, rgba(42,30,18,0.92) 100%)',
                    border: '1px solid rgba(139,105,20,0.45)',
                    color: 'var(--ynk-gold)',
                  }}
                >
                  {action.icon}
                </span>
                <span className="min-w-0">
                  <span className="dq-text block text-xs whitespace-nowrap">{action.label}</span>
                  <span className="dq-text block text-[10px] opacity-60 whitespace-nowrap">{action.detail}</span>
                </span>
                {action.badge && (
                  <span
                    className="absolute right-2 top-2 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[9px]"
                    style={{
                      background: 'linear-gradient(180deg, #d4a017 0%, #8b6914 100%)',
                      color: '#1a1008',
                      fontWeight: 700,
                    }}
                  >
                    {action.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div
            className="mt-3 rounded-[16px] p-3"
            style={{
              background: 'rgba(0,0,0,0.18)',
              border: '1px solid rgba(92,74,46,0.35)',
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="dq-text text-xs" style={{ color: 'var(--ynk-gold)' }}>
                  表示操作
                </p>
                <p className="dq-text text-[10px] opacity-60">
                  拡大・回転・文字コピー
                </p>
              </div>
              <span
                className="dq-text rounded-full px-2 py-1 text-[10px]"
                style={{
                  background: 'rgba(212,160,23,0.12)',
                  border: '1px solid rgba(212,160,23,0.32)',
                  color: 'var(--ynk-gold)',
                }}
              >
                {zoomPct}%
              </span>
            </div>
            <ZoomControls embedded />
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-[44px] items-center gap-2 rounded-full px-3 py-2 cursor-pointer select-none active:scale-[0.98] transition-transform"
        aria-label={isOpen ? '補助ドックを閉じる' : '補助ドックを開く'}
        aria-expanded={isOpen}
        style={{
          background: 'linear-gradient(180deg, rgba(59,42,26,0.96) 0%, rgba(42,30,18,0.96) 100%)',
          border: '2px solid #8b6914',
          color: 'var(--ynk-bone)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.4), inset 0 1px 0 rgba(139,105,20,0.18)',
        }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(212,160,23,0.22) 0%, rgba(92,74,46,0.18) 100%)',
            color: 'var(--ynk-gold)',
          }}
        >
          <Wrench size={16} />
        </span>
        <span className="hidden sm:flex sm:flex-col sm:items-start sm:leading-tight">
          <span className="dq-text text-[11px]" style={{ color: 'var(--ynk-gold)' }}>
            補助操作
          </span>
          <span className="dq-text text-[10px] opacity-65">
            検索・注釈・表示
          </span>
        </span>
        <span
          className="dq-text rounded-full px-2 py-1 text-[10px]"
          style={{
            background: 'rgba(0,0,0,0.22)',
            border: '1px solid rgba(92,74,46,0.35)',
            color: 'var(--ynk-gold)',
          }}
        >
          {zoomPct}%
        </span>
      </button>
    </div>
  );
}
