'use client';

import React, { useCallback, useRef, useState } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import type { ToolMode } from '@/types/pdf';

interface ToolDef {
  mode: ToolMode;
  label: string;
  icon: React.ReactNode;
  title: string;
}

const tools: ToolDef[] = [
  {
    mode: 'view',
    label: 'みる',
    title: '表示モード',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    mode: 'text',
    label: '文字',
    title: 'テキスト追加',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    mode: 'draw',
    label: '描く',
    title: 'フリーハンド描画',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    mode: 'shape',
    label: '図形',
    title: '図形描画（矩形・円・矢印・直線）',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="10" height="10" rx="1" />
        <circle cx="17" cy="17" r="5" />
      </svg>
    ),
  },
  {
    mode: 'highlight',
    label: 'マーカー',
    title: 'マーカー・下線・取消線・墨消し',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 11l-6 6v3h9l3-3" />
        <path d="M22 12l-4.6 4.6a2 2 0 01-2.8 0l-5.2-5.2a2 2 0 010-2.8L14 4" />
      </svg>
    ),
  },
  {
    mode: 'image',
    label: 'スタンプ',
    title: 'スタンプ・署名',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="4" y="2" width="16" height="16" rx="2" />
        <path d="M8 22h8" />
        <path d="M12 18v4" />
        <path d="M8 6h8M8 10h8M8 14h4" />
      </svg>
    ),
  },
  {
    mode: 'pages',
    label: 'ページ',
    title: 'ページ管理・結合・分割',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="2" width="20" height="8" rx="1" />
        <rect x="2" y="14" width="20" height="8" rx="1" />
      </svg>
    ),
  },
  {
    mode: 'save',
    label: '保存',
    title: '保存・書き出し',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
    ),
  },
];

const DqToolbar = React.memo(function DqToolbar() {
  const { state, dispatch, undoStackSize, redoStackSize } = usePDF();
  const prevToolRef = useRef(state.toolMode);
  const [expanded, setExpanded] = useState(false);

  const handleToolChange = useCallback((mode: ToolMode) => {
    if (mode !== prevToolRef.current) {
      const flash = document.createElement('div');
      flash.className = 'dq-tool-flash-overlay';
      document.body.appendChild(flash);
      flash.addEventListener('animationend', () => flash.remove());
      prevToolRef.current = mode;
      // ハプティックフィードバック（対応デバイスのみ）
      try { navigator.vibrate?.(10); } catch { /* ignore */ }
    }
    dispatch({ type: 'SET_TOOL', payload: mode });
  }, [dispatch]);

  const activeTool = tools.find(({ mode }) => mode === state.toolMode) ?? tools[0];
  const controlLabelVisible = (mode: ToolMode) => expanded || state.toolMode === mode;
  const metaLabelVisible = expanded;

  return (
    <div
      className="z-50 shrink-0 px-2 pt-2"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
      }}
    >
      <div
        className="dq-window mx-auto flex w-full max-w-max items-center gap-1 overflow-x-auto rounded-[20px] px-2 py-1.5 ynk-stone-floor"
        role="toolbar"
        aria-label="PDF編集ツール"
        style={{
          background: 'linear-gradient(180deg, rgba(58,50,40,0.96) 0%, rgba(42,34,24,0.96) 58%, rgba(30,24,16,0.98) 100%)',
          border: '2px solid #5c4a2e',
          boxShadow: '0 8px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(92,74,46,0.18)',
        }}
      >
        <button
          onClick={() => setExpanded((current) => !current)}
          className="flex items-center gap-2 min-h-[44px] px-3 rounded-2xl cursor-pointer select-none active:scale-95 transition-transform"
          title={expanded ? 'ツール名をたたむ' : `現在: ${activeTool.label}`}
          aria-label={expanded ? 'ツール名をたたむ' : `現在のツール: ${activeTool.label}`}
          aria-pressed={expanded}
          style={{
            background: 'linear-gradient(180deg, rgba(92,74,46,0.34) 0%, rgba(42,30,18,0.9) 100%)',
            border: '1px solid rgba(139,105,20,0.45)',
            color: 'var(--ynk-bone)',
            flexShrink: 0,
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
          <span className="dq-text text-[10px] whitespace-nowrap" style={{ color: 'var(--ynk-gold)' }}>
            {expanded ? '道具をたたむ' : activeTool.label}
          </span>
        </button>
        {undoStackSize > 0 && (
          <button
            onClick={() => dispatch({ type: 'UNDO_ANNOTATION' })}
            className="relative flex items-center justify-center min-h-[44px] min-w-[44px] gap-2 px-3 rounded-2xl transition-all cursor-pointer select-none active:scale-95 text-[var(--ynk-bone)] opacity-80 hover:opacity-100"
            title="元に戻す (Ctrl+Z)"
            aria-label="元に戻す"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {metaLabelVisible && <span className="dq-text text-[10px] leading-tight whitespace-nowrap">戻す</span>}
          </button>
        )}
        {redoStackSize > 0 && (
          <button
            onClick={() => dispatch({ type: 'REDO_ANNOTATION' })}
            className="relative flex items-center justify-center min-h-[44px] min-w-[44px] gap-2 px-3 rounded-2xl transition-all cursor-pointer select-none active:scale-95 text-[var(--ynk-bone)] opacity-80 hover:opacity-100"
            title="やり直し (Ctrl+Shift+Z)"
            aria-label="やり直し"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
            </svg>
            {metaLabelVisible && <span className="dq-text text-[10px] leading-tight whitespace-nowrap">進む</span>}
          </button>
        )}
        {tools.map(({ mode, label, icon, title }) => {
          const active = state.toolMode === mode;
          return (
            <button
              key={mode}
              onClick={() => handleToolChange(mode)}
              title={title}
              aria-label={label}
              aria-pressed={active}
              className={`relative flex items-center justify-center min-h-[44px] min-w-[44px] gap-2 px-3 rounded-2xl transition-all cursor-pointer select-none active:scale-95 ${
                active ? 'text-[var(--ynk-gold)]' : 'text-[var(--ynk-bone)] opacity-60 hover:opacity-100'
              }`}
              style={active ? {
                background: 'linear-gradient(180deg, rgba(212,160,23,0.15) 0%, rgba(212,160,23,0.05) 100%)',
                boxShadow: '0 0 12px rgba(212,160,23,0.3), 0 0 24px rgba(212,160,23,0.15), inset 0 -2px 8px rgba(212,160,23,0.2)',
                border: '1px solid rgba(212,160,23,0.5)',
              } : {}}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-[var(--ynk-gold)]"
                  style={{ animation: 'ynk-dig 0.4s infinite' }}
                >
                  ⛏
                </span>
              )}
              {active && (
                <>
                  <span className="absolute top-1 right-0.5 text-[7px]" style={{ animation: 'ynk-sparkle 2s ease-in-out infinite' }}>✦</span>
                  <span className="absolute bottom-2 left-0.5 text-[5px]" style={{ animation: 'ynk-sparkle 2s ease-in-out infinite 0.7s', color: '#7ec8e3' }}>✦</span>
                </>
              )}
              <span className={active ? 'ynk-active-sparkle' : ''}>{icon}</span>
              {controlLabelVisible(mode) && (
                <span className="dq-text text-[10px] leading-tight whitespace-nowrap">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default DqToolbar;
