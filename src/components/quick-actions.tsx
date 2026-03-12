'use client';

import {
  Eye,
  FilePlus2,
  FileSearch,
  FileText,
  Highlighter,
  Keyboard,
  Layers3,
  List,
  PencilLine,
  Printer,
  Redo2,
  RotateCw,
  Save,
  Search,
  SquarePen,
  Stamp,
  Undo2,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import type { ToolMode } from '@/types/pdf';
import { emitUiEvent, uiEvents } from '@/lib/ui-events';
import { showDqToast } from '@/lib/toast';

const RECENT_ACTIONS_KEY = 'pdf-editor.recent-quick-actions';
const RECENT_ACTION_LIMIT = 6;

interface ActionItem {
  available: boolean;
  detail: string;
  group: string;
  icon: ReactNode;
  id: string;
  keywords: string;
  label: string;
  run: () => void;
  shortcut?: string;
}

const toolActions: Array<{
  detail: string;
  keywords: string;
  label: string;
  mode: ToolMode;
  shortcut: string;
}> = [
  { mode: 'view', label: '表示モード', detail: '読むだけの安全モード', keywords: 'view read display 表示 みる', shortcut: '1' },
  { mode: 'text', label: 'テキスト追加', detail: '文字を置く', keywords: 'text type note 文字 テキスト 入力', shortcut: '2' },
  { mode: 'draw', label: 'フリーハンド描画', detail: '手書きする', keywords: 'draw pen 描画 手書き', shortcut: '3' },
  { mode: 'shape', label: '図形を描く', detail: '矩形 円 線 矢印', keywords: 'shape rectangle circle arrow line 図形', shortcut: '4' },
  { mode: 'highlight', label: 'マーカー', detail: '強調する', keywords: 'highlight marker underline redact マーカー 強調', shortcut: '5' },
  { mode: 'image', label: 'スタンプ・署名', detail: '画像や署名を置く', keywords: 'image stamp sign スタンプ 画像 署名', shortcut: '6' },
  { mode: 'pages', label: 'ページ管理', detail: '回転 並び替え 分割 結合', keywords: 'pages reorder split merge rotate ページ 管理', shortcut: '7' },
  { mode: 'save', label: '保存・書き出し', detail: 'PDF画像JSONを保存', keywords: 'save export 保存 書き出し', shortcut: '8' },
];

export default function QuickActions() {
  const { state, dispatch, undoStackSize, redoStackSize } = usePDF();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentActionIds, setRecentActionIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(RECENT_ACTIONS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
    } catch {
      return [];
    }
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const inputRef = useRef<HTMLInputElement>(null);

  const openPalette = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);
  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (isOpen) closePalette();
        else openPalette();
        return;
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closePalette();
        return;
      }

      if (isEditable) return;
    };

    const openHandler = () => openPalette();
    const toggleHandler = () => {
      if (isOpen) closePalette();
      else openPalette();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(uiEvents.openQuickActions, openHandler);
    window.addEventListener(uiEvents.toggleQuickActions, toggleHandler);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(uiEvents.openQuickActions, openHandler);
      window.removeEventListener(uiEvents.toggleQuickActions, toggleHandler);
    };
  }, [closePalette, isOpen, openPalette]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const actions = useMemo<ActionItem[]>(() => {
    const hasPdf = !!state.pdfData;
    const currentPage = state.currentPage;
    const numPages = state.numPages;

    return [
      {
        id: 'open-pdf',
        label: 'PDFを開く',
        detail: '新しいファイルを選ぶ',
        group: 'ファイル',
        keywords: 'open import file pdf 開く 読み込み 新規',
        shortcut: 'Ctrl+O',
        available: true,
        icon: <FilePlus2 size={16} />,
        run: () => emitUiEvent(uiEvents.openPdfPicker),
      },
      {
        id: 'save-panel',
        label: '保存・書き出し',
        detail: 'PDF 画像 JSON を出力',
        group: 'ファイル',
        keywords: 'save export download 保存 書き出し ダウンロード',
        shortcut: 'Ctrl+S',
        available: hasPdf,
        icon: <Save size={16} />,
        run: () => dispatch({ type: 'SET_TOOL', payload: 'save' }),
      },
      {
        id: 'undo',
        label: '元に戻す',
        detail: '直前の変更を取り消す',
        group: '編集',
        keywords: 'undo revert 戻す 取り消し',
        shortcut: 'Ctrl+Z',
        available: undoStackSize > 0,
        icon: <Undo2 size={16} />,
        run: () => {
          dispatch({ type: 'UNDO_ANNOTATION' });
          showDqToast('ひとつ もどした！', 'info');
        },
      },
      {
        id: 'redo',
        label: 'やり直す',
        detail: '取り消した変更を戻す',
        group: '編集',
        keywords: 'redo やり直し 戻す',
        shortcut: 'Ctrl+Shift+Z',
        available: redoStackSize > 0,
        icon: <Redo2 size={16} />,
        run: () => {
          dispatch({ type: 'REDO_ANNOTATION' });
          showDqToast('やりなおした！', 'info');
        },
      },
      {
        id: 'search',
        label: 'テキスト検索',
        detail: '本文を探す',
        group: 'ナビ',
        keywords: 'search find ctrl+f 検索 探す',
        shortcut: 'Ctrl+F',
        available: hasPdf,
        icon: <Search size={16} />,
        run: () => emitUiEvent(uiEvents.openSearchPanel),
      },
      {
        id: 'toggle-thumbnails',
        label: 'サムネイルを開く',
        detail: 'ページ一覧を左に表示',
        group: 'ナビ',
        keywords: 'thumbnail pages strip サムネイル ページ 一覧',
        available: hasPdf && numPages > 1,
        icon: <Layers3 size={16} />,
        run: () => emitUiEvent(uiEvents.toggleThumbnailStrip),
      },
      {
        id: 'page-manager',
        label: 'ページ管理',
        detail: '回転 並び替え 分割 結合',
        group: 'ナビ',
        keywords: 'page manager reorder rotate split merge ページ 管理',
        available: hasPdf,
        icon: <FileText size={16} />,
        run: () => dispatch({ type: 'SET_TOOL', payload: 'pages' }),
      },
      {
        id: 'annotation-list',
        label: 'アノテーション一覧',
        detail: '注釈をまとめて確認する',
        group: 'ナビ',
        keywords: 'annotation list notes 注釈 一覧 管理',
        available: state.annotations.length > 0,
        icon: <List size={16} />,
        run: () => emitUiEvent(uiEvents.toggleAnnotationList),
      },
      {
        id: 'previous-page',
        label: '前のページへ',
        detail: `現在 ${currentPage}/${numPages || 1}`,
        group: 'ナビ',
        keywords: 'previous prev back 前 ページ',
        shortcut: '←',
        available: hasPdf && currentPage > 1,
        icon: <FileSearch size={16} />,
        run: () => dispatch({ type: 'SET_PAGE', payload: currentPage - 1 }),
      },
      {
        id: 'next-page',
        label: '次のページへ',
        detail: `現在 ${currentPage}/${numPages || 1}`,
        group: 'ナビ',
        keywords: 'next forward 次 ページ',
        shortcut: '→',
        available: hasPdf && currentPage < numPages,
        icon: <FileSearch size={16} />,
        run: () => dispatch({ type: 'SET_PAGE', payload: currentPage + 1 }),
      },
      ...toolActions.map((tool) => ({
        id: `tool-${tool.mode}`,
        label: tool.label,
        detail: tool.detail,
        group: '編集',
        keywords: tool.keywords,
        shortcut: tool.shortcut,
        available: hasPdf,
        icon:
          tool.mode === 'text' ? <SquarePen size={16} /> :
          tool.mode === 'draw' ? <PencilLine size={16} /> :
          tool.mode === 'shape' ? <WandSparkles size={16} /> :
          tool.mode === 'highlight' ? <Highlighter size={16} /> :
          tool.mode === 'image' ? <Stamp size={16} /> :
          tool.mode === 'pages' ? <FileText size={16} /> :
          tool.mode === 'save' ? <Save size={16} /> :
          <FileSearch size={16} />,
        run: () => dispatch({ type: 'SET_TOOL', payload: tool.mode }),
      })),
      {
        id: 'zoom-in',
        label: 'ズームイン',
        detail: '見やすく拡大する',
        group: '表示',
        keywords: 'zoom in plus 拡大 ズーム',
        shortcut: 'Ctrl++',
        available: hasPdf,
        icon: <ZoomIn size={16} />,
        run: () => dispatch({ type: 'SET_SCALE', payload: state.scale + 0.25 }),
      },
      {
        id: 'zoom-out',
        label: 'ズームアウト',
        detail: '全体を見やすくする',
        group: '表示',
        keywords: 'zoom out minus 縮小 ズーム',
        shortcut: 'Ctrl+-',
        available: hasPdf,
        icon: <ZoomOut size={16} />,
        run: () => dispatch({ type: 'SET_SCALE', payload: state.scale - 0.25 }),
      },
      {
        id: 'zoom-reset',
        label: 'ズームを100%に戻す',
        detail: '表示倍率を初期化',
        group: '表示',
        keywords: 'zoom reset 100% fit reset ズーム リセット',
        shortcut: 'Ctrl+0',
        available: hasPdf,
        icon: <ZoomIn size={16} />,
        run: () => dispatch({ type: 'SET_SCALE', payload: 1 }),
      },
      {
        id: 'print',
        label: '印刷',
        detail: '現在のPDFを印刷',
        group: '便利',
        keywords: 'print 印刷',
        shortcut: 'Ctrl+P',
        available: hasPdf,
        icon: <Printer size={16} />,
        run: () => window.dispatchEvent(new CustomEvent('quick-print')),
      },
      {
        id: 'rotate',
        label: '現在ページを回転',
        detail: '90°ずつ回す',
        group: '便利',
        keywords: 'rotate page 回転 ページ r',
        shortcut: 'R',
        available: hasPdf,
        icon: <RotateCw size={16} />,
        run: () => window.dispatchEvent(new CustomEvent('quick-rotate')),
      },
      {
        id: 'copy-page-text',
        label: 'このページのテキストをコピー',
        detail: 'OCR不要で本文を複写',
        group: '便利',
        keywords: 'copy text page コピー テキスト ページ',
        available: hasPdf,
        icon: <FileSearch size={16} />,
        run: () => emitUiEvent(uiEvents.copyPageText),
      },
      {
        id: 'annotation-visibility',
        label: '注釈一覧を開く',
        detail: '追加した注釈を見失わない',
        group: '便利',
        keywords: 'annotation notes show list 注釈 表示 一覧',
        available: state.annotations.length > 0,
        icon: <Eye size={16} />,
        run: () => emitUiEvent(uiEvents.openAnnotationList),
      },
      {
        id: 'shortcut-help',
        label: 'ショートカット一覧',
        detail: 'キーボード操作を確認',
        group: '便利',
        keywords: 'shortcut help keyboard ショートカット ヘルプ',
        shortcut: '?',
        available: true,
        icon: <Keyboard size={16} />,
        run: () => emitUiEvent(uiEvents.toggleShortcutHelp),
      },
    ].filter((action) => action.available);
  }, [dispatch, redoStackSize, state.annotations.length, state.currentPage, state.numPages, state.pdfData, state.scale, undoStackSize]);

  const filteredActions = useMemo(() => {
    const filtered = !deferredQuery
      ? actions
      : actions.filter((action) => {
      const haystack = `${action.label} ${action.detail} ${action.group} ${action.keywords}`.toLowerCase();
      return haystack.includes(deferredQuery);
    });
    const recentIndex = new Map(recentActionIds.map((id, index) => [id, index]));

    return filtered
      .map((action, index) => ({ action, index, recentRank: recentIndex.get(action.id) ?? Number.POSITIVE_INFINITY }))
      .sort((left, right) => {
        if (left.recentRank !== right.recentRank) return left.recentRank - right.recentRank;
        return left.index - right.index;
      })
      .map(({ action }) => action);
  }, [actions, deferredQuery, recentActionIds]);

  const activeIndex = filteredActions.length === 0 ? -1 : Math.min(selectedIndex, filteredActions.length - 1);

  const recordRecentAction = useCallback((actionId: string) => {
    setRecentActionIds((current) => {
      const next = [actionId, ...current.filter((id) => id !== actionId)].slice(0, RECENT_ACTION_LIMIT);
      window.localStorage.setItem(RECENT_ACTIONS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const runAction = useCallback((action: ActionItem) => {
    closePalette();
    recordRecentAction(action.id);
    window.setTimeout(() => action.run(), 20);
  }, [closePalette, recordRecentAction]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => {
        if (filteredActions.length === 0) return 0;
        return Math.min(current + 1, filteredActions.length - 1);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const action = activeIndex >= 0 ? filteredActions[activeIndex] : undefined;
      if (action) runAction(action);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[260] flex items-start justify-center px-4 pt-[max(12vh,72px)] pb-6"
      style={{ background: 'rgba(8, 5, 2, 0.84)', backdropFilter: 'blur(6px)' }}
      onClick={closePalette}
    >
      <div
        role="dialog"
        aria-label="クイック操作"
        className="w-full max-w-[720px] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(59,42,26,0.98) 0%, rgba(32,22,12,0.98) 100%)',
          border: '3px solid #7a5540',
          boxShadow: '0 30px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(212,160,23,0.18) inset',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="px-5 pt-4 pb-3"
          style={{
            background: 'linear-gradient(180deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.04) 100%)',
            borderBottom: '1px solid rgba(122,85,64,0.45)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dq-title text-lg">クイック操作</p>
              <p className="dq-text text-xs mt-1" style={{ color: 'var(--ynk-bone)', opacity: 0.78 }}>
                よく使う操作ほど上に寄るので、毎日の作業が速くなります
              </p>
            </div>
            <span
              className="dq-text text-xs px-2.5 py-1"
              style={{
                color: 'var(--ynk-gold)',
                border: '1px solid rgba(212,160,23,0.35)',
                background: 'rgba(0,0,0,0.28)',
              }}
            >
              Ctrl+K
            </span>
          </div>
          <div
            className="mt-4 flex items-center gap-3 px-3 py-3"
            style={{
              background: 'rgba(0,0,0,0.28)',
              border: '2px solid rgba(92,74,46,0.72)',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.28)',
            }}
          >
            <Search size={18} style={{ color: 'var(--ynk-gold)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="例: 保存, ページ管理, 検索, 印刷, スタンプ"
              className="w-full bg-transparent outline-none dq-text"
              style={{ color: 'var(--ynk-bone)', fontSize: 15 }}
            />
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-3 py-3">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="dq-title text-base">該当する操作がありません</p>
              <p className="dq-text text-xs mt-2" style={{ color: 'var(--ynk-bone)', opacity: 0.72 }}>
                別の言い方でも検索できます。例: 保存 / 開く / マーカー / 印刷
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => runAction(action)}
                  className="w-full text-left px-4 py-3 transition-all"
                  style={{
                    background: index === activeIndex ? 'linear-gradient(180deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.08) 100%)' : 'rgba(0,0,0,0.22)',
                    border: index === activeIndex ? '2px solid rgba(212,160,23,0.8)' : '2px solid rgba(92,74,46,0.35)',
                    boxShadow: index === activeIndex ? '0 0 20px rgba(212,160,23,0.14)' : 'none',
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(212,160,23,0.2)',
                        color: 'var(--ynk-gold)',
                      }}
                    >
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="dq-text text-sm" style={{ color: index === activeIndex ? 'var(--ynk-gold)' : 'var(--ynk-bone)' }}>
                          {action.label}
                        </span>
                        <span
                          className="dq-text text-[10px] px-1.5 py-0.5"
                          style={{
                            color: 'var(--ynk-gold)',
                            background: 'rgba(212,160,23,0.12)',
                            border: '1px solid rgba(212,160,23,0.25)',
                          }}
                        >
                          {action.group}
                        </span>
                      </div>
                      <p className="dq-text text-xs mt-1" style={{ color: 'var(--ynk-bone)', opacity: 0.72 }}>
                        {action.detail}
                      </p>
                    </div>
                    {action.shortcut && (
                      <kbd
                        className="dq-text text-[10px] whitespace-nowrap"
                        style={{
                          color: 'var(--ynk-gold)',
                          background: 'rgba(0,0,0,0.36)',
                          border: '1px solid rgba(92,74,46,0.7)',
                          padding: '4px 6px',
                        }}
                      >
                        {action.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-4 px-4 py-3"
          style={{
            borderTop: '1px solid rgba(122,85,64,0.45)',
            background: 'rgba(0,0,0,0.24)',
          }}
        >
          <p className="dq-text text-[11px]" style={{ color: 'var(--ynk-bone)', opacity: 0.7 }}>
            Enter で実行 / ↑↓ で移動 / Esc で閉じる
          </p>
          <button
            onClick={closePalette}
            className="dq-btn-small"
            style={{ minHeight: 34, minWidth: 84 }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
