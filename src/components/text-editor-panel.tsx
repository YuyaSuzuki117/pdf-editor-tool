'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import SlidePanel from './slide-panel';
import type { Annotation } from '@/types/pdf';

const fontSizes = [12, 16, 20, 24, 32];
const colors = [
  { label: '黒', value: '#000000' },
  { label: '赤', value: '#ef4444' },
  { label: '青', value: '#3b82f6' },
  { label: '緑', value: '#22c55e' },
  { label: '白', value: '#ffffff' },
];

export default function TextEditorPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState('#000000');
  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y } = (e as CustomEvent).detail;
      setTapPos({ x, y });
    };
    window.addEventListener('pdf-tap', handler);
    return () => window.removeEventListener('pdf-tap', handler);
  }, []);

  const handleAdd = useCallback(() => {
    if (!text.trim() || !tapPos) return;
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'text',
      page: state.currentPage,
      position: tapPos,
      content: text,
      style: { fontSize, color, fontFamily: 'Helvetica' },
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    setText('');
    setTapPos(null);
    onClose();
  }, [text, tapPos, fontSize, color, state.currentPage, dispatch, onClose]);

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="もじを ほりこむ">
      <div className="space-y-4">
        {!tapPos && (
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--window-border)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm">ダンジョンの かべを タップして ほりこむ ばしょを きめろ！</p>
          </div>
        )}
        {tapPos && (
          <div className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
            ばしょ: ({Math.round(tapPos.x)}, {Math.round(tapPos.y)})
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ほりこむ もじを にゅうりょく..."
          className="dq-input w-full resize-none min-h-[80px]"
          autoFocus
        />
        <div>
          <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>ほりの ふかさ</p>
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
                style={fontSize !== s ? { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' } : {}}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>がんせきの いろ</p>
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
          ほりこめ！
        </button>
      </div>
    </SlidePanel>
  );
}
