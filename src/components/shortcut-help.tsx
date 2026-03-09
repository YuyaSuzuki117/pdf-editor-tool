'use client';

import { useState, useEffect } from 'react';

const shortcuts = [
  { keys: 'Ctrl+Z', desc: '元に戻す (Undo)' },
  { keys: 'Ctrl+Shift+Z', desc: 'やり直し (Redo)' },
  { keys: 'Ctrl+S', desc: '保存パネルを開く' },
  { keys: 'Ctrl+F', desc: 'テキスト検索' },
  { keys: 'Escape', desc: 'ツールモード解除 / パネル閉じる' },
  { keys: '1-8', desc: 'ツール切替 (表示/テキスト/描画/図形/マーカー/画像/ページ/保存)' },
  { keys: '\u2190 \u2192', desc: 'ページ移動' },
  { keys: 'Ctrl+Wheel', desc: 'ズーム' },
  { keys: 'Ctrl + / -', desc: 'ズームイン/アウト' },
  { keys: 'Ctrl+0', desc: 'ズームリセット (幅に合わせる)' },
  { keys: 'ページ番号タップ', desc: '直接ページジャンプ' },
  { keys: 'テキストをダブルクリック', desc: 'テキスト再編集' },
  { keys: 'ダブルタップ (表示モード)', desc: 'ズームリセット' },
  { keys: 'R', desc: '現在ページを90°回転' },
  { keys: 'PDFをドロップ', desc: '結合 (PDF表示中)' },
  { keys: '?', desc: 'このヘルプを表示' },
];

export default function ShortcutHelp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setVisible((v) => !v);
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ background: 'rgba(13,8,4,0.8)', backdropFilter: 'blur(2px)' }}
      onClick={() => setVisible(false)}
    >
      <div
        className="dq-window p-5 max-w-[360px] w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dq-title text-lg text-center mb-4">
          ショートカット一覧
        </h2>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between gap-3 px-2 py-1.5"
              style={{ borderBottom: '1px solid rgba(92,74,46,0.3)' }}
            >
              <kbd
                className="dq-text text-xs px-2 py-0.5"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--ynk-dirt)',
                  color: 'var(--ynk-gold)',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.keys}
              </kbd>
              <span className="dq-text text-xs text-right">{s.desc}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setVisible(false)}
          className="dq-btn w-full mt-4"
          style={{ fontSize: 14 }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
