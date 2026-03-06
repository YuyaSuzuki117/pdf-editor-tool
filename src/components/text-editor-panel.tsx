'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import SlidePanel from './slide-panel';
import type { Annotation } from '@/types/pdf';

const fontSizes = [12, 16, 20, 24, 32];
const fontFamilies = [
  { label: 'Noto Sans JP', value: 'Noto Sans JP' },
  { label: 'Helvetica', value: 'Helvetica' },
];
const colors = [
  { label: '黒', value: '#000000' },
  { label: '赤', value: '#ef4444' },
  { label: '青', value: '#3b82f6' },
  { label: '緑', value: '#22c55e' },
  { label: '白', value: '#ffffff' },
];

function showDqToast(message: string) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:100;background:linear-gradient(180deg,#3d2a1e,#2a1c12);border:3px solid #7a5540;outline:3px solid #2a1c12;border-radius:4px;color:#d4a017;padding:12px 24px;font-family:DotGothic16,monospace;font-weight:bold;text-shadow:2px 2px 0 rgba(0,0,0,0.8);box-shadow:0 4px 20px rgba(0,0,0,0.7);animation:ynk-dig-appear 0.3s ease;image-rendering:pixelated;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

export default function TextEditorPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Noto Sans JP');
  const [color, setColor] = useState('#000000');
  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
  const [tapRenderScale, setTapRenderScale] = useState(1);

  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y, renderScale } = (e as CustomEvent).detail;
      setTapPos({ x, y });
      if (renderScale) setTapRenderScale(renderScale);
    };
    window.addEventListener('pdf-tap', handler);
    return () => window.removeEventListener('pdf-tap', handler);
  }, []);

  // パネルを閉じたらタップ位置をリセット
  useEffect(() => {
    if (!isOpen) {
      setTapPos(null);
    }
  }, [isOpen]);

  const handleAdd = useCallback(() => {
    if (!text.trim() || !tapPos) return;
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'text',
      page: state.currentPage,
      position: tapPos,
      content: text,
      style: { fontSize, color, fontFamily },
      renderScale: tapRenderScale,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    showDqToast('テキストを追加しました！');
    // パネルを閉じず、テキストだけリセットして連続追加可能に
    setText('');
    setTapPos(null);
  }, [text, tapPos, fontSize, fontFamily, color, tapRenderScale, state.currentPage, dispatch]);

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="テキスト追加">
      <div className="space-y-4">
        {!tapPos && (
          <div
            className="dq-message-box"
            style={{
              background: 'rgba(59,130,246,0.15)',
              border: '2px solid #3b82f6',
              borderRadius: 4,
              padding: '12px 16px',
              animation: 'dq-placement-blink 1.5s ease-in-out infinite',
            }}
          >
            <p className="dq-text text-sm font-bold" style={{ color: '#93c5fd' }}>
              PDFをタップして配置場所を選んでください
            </p>
          </div>
        )}
        {tapPos && (
          <div className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
            配置位置: ({Math.round(tapPos.x)}, {Math.round(tapPos.y)})
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="テキストを入力..."
          className="dq-input w-full resize-none min-h-[80px]"
          autoFocus
        />
        <div>
          <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>文字サイズ</p>
          <div className="flex gap-2">
            {fontSizes.map((s) => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`dq-btn-small flex items-center justify-center min-h-[44px] min-w-[44px] ${
                  fontSize === s
                    ? ''
                    : 'dq-btn-secondary'
                }`}
                style={
                  fontSize === s
                    ? { borderColor: '#d4a017', boxShadow: '0 0 8px rgba(212,160,23,0.5), inset 0 0 4px rgba(212,160,23,0.2)' }
                    : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>フォント</p>
          <div className="flex gap-2">
            {fontFamilies.map((f) => (
              <button
                key={f.value}
                onClick={() => setFontFamily(f.value)}
                className={`dq-btn-small flex items-center justify-center min-h-[44px] px-3 text-xs ${
                  fontFamily === f.value
                    ? ''
                    : 'dq-btn-secondary'
                }`}
                style={
                  fontFamily === f.value
                    ? { borderColor: '#d4a017', boxShadow: '0 0 8px rgba(212,160,23,0.5), inset 0 0 4px rgba(212,160,23,0.2)' }
                    : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>文字の色</p>
          <div className="flex gap-3">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`dq-color-btn w-10 h-10 ${
                  color === c.value ? 'active' : ''
                }`}
                style={{ backgroundColor: c.value, borderColor: color === c.value ? '#d4a017' : '#5c3d2e', borderWidth: 3, borderStyle: 'solid', borderRadius: 4 }}
                title={c.label}
              />
            ))}
          </div>
        </div>
        {text.trim() && (
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--window-border)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-xs mb-1" style={{ color: 'var(--ynk-gold)' }}>プレビュー</p>
            <p className="dq-text" style={{ fontSize: `${fontSize}px`, color }}>{text}</p>
          </div>
        )}
        <button
          onClick={handleAdd}
          disabled={!text.trim() || !tapPos}
          className="dq-btn w-full"
        >
          追加する（続けて追加可能）
        </button>
        <button
          onClick={onClose}
          className="dq-btn w-full"
          style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)', boxShadow: '0 3px 0 #2a1c12, 0 4px 8px rgba(0,0,0,0.3)' }}
        >
          閉じる
        </button>
      </div>
    </SlidePanel>
  );
}
