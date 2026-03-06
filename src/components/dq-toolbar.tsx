'use client';

import { usePDF } from '@/contexts/pdf-context';
import type { ToolMode } from '@/types/pdf';

interface ToolDef {
  mode: ToolMode;
  label: string;
  icon: React.ReactNode;
}

const tools: ToolDef[] = [
  {
    mode: 'view',
    label: 'ちょうさ',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    mode: 'text',
    label: 'ほりこむ',
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
    label: 'ほりえ',
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
    mode: 'highlight',
    label: 'ようがん',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 11l-6 6v3h9l3-3" />
        <path d="M22 12l-4.6 4.6a2 2 0 01-2.8 0l-5.2-5.2a2 2 0 010-2.8L14 4" />
      </svg>
    ),
  },
  {
    mode: 'pages',
    label: 'ダンジョン',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="2" width="20" height="8" rx="1" />
        <rect x="2" y="14" width="20" height="8" rx="1" />
      </svg>
    ),
  },
  {
    mode: 'save',
    label: 'きろく石',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
    ),
  },
];

export default function DqToolbar() {
  const { state, dispatch } = usePDF();

  return (
    <div
      className="dq-window rounded-none border-x-0 border-b-0 z-40 shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around">
        {tools.map(({ mode, label, icon }) => {
          const active = state.toolMode === mode;
          return (
            <button
              key={mode}
              onClick={() => dispatch({ type: 'SET_TOOL', payload: mode })}
              className={`relative flex flex-col items-center justify-center min-h-[56px] min-w-[48px] gap-0.5 px-2 transition-all cursor-pointer select-none active:scale-95 ${
                active ? 'text-[var(--ynk-gold)]' : 'text-[var(--ynk-bone)] opacity-60 hover:opacity-100'
              }`}
            >
              {/* つるはしカーソル: 選択中の左に点滅 */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-[var(--ynk-gold)]"
                  style={{ animation: 'ynk-dig 0.4s infinite' }}
                >
                  ⛏
                </span>
              )}
              {icon}
              <span className="dq-text text-[10px] leading-tight whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
