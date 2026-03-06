'use client';

import { Hand, Type, Pencil, Highlighter, Layers, Download } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import type { ToolMode } from '@/types/pdf';

const tools: { mode: ToolMode; icon: typeof Hand; label: string }[] = [
  { mode: 'view', icon: Hand, label: '表示' },
  { mode: 'text', icon: Type, label: 'テキスト' },
  { mode: 'draw', icon: Pencil, label: '描画' },
  { mode: 'highlight', icon: Highlighter, label: 'ハイライト' },
  { mode: 'pages', icon: Layers, label: 'ページ' },
  { mode: 'save', icon: Download, label: '保存' },
];

export default function BottomToolbar() {
  const { state, dispatch } = usePDF();

  return (
    <div
      className="border-t border-[var(--border)] flex items-center justify-around"
      style={{ background: 'linear-gradient(180deg, #3d2a1e 0%, #2a1c12 100%)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tools.map(({ mode, icon: Icon, label }) => {
        const active = state.toolMode === mode;
        return (
          <button
            key={mode}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: mode })}
            className={`flex flex-col items-center justify-center min-h-[56px] min-w-[56px] gap-0.5 transition-all ${
              active
                ? 'text-[var(--primary)] scale-110'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px]">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
