'use client';

import { useState, useCallback } from 'react';
import { FileDown, Image } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import {
  addTextToPdf,
  addDrawingToPdf,
  addHighlightToPdf,
  savePdfAsBlob,
  downloadBlob,
} from '@/lib/pdf-editor';
import SlidePanel from './slide-panel';
import type { TextStyle, DrawStyle, HighlightStyle } from '@/types/pdf';

function showDqToast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'dq-toast';
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:100;background:linear-gradient(180deg,#3d2a1e,#2a1c12);border:3px solid #7a5540;outline:3px solid #2a1c12;border-radius:4px;color:#d4a017;padding:12px 24px;font-family:DotGothic16,monospace;font-weight:bold;text-shadow:2px 2px 0 rgba(0,0,0,0.8);box-shadow:0 4px 20px rgba(0,0,0,0.7);animation:ynk-dig-appear 0.3s ease;image-rendering:pixelated;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

export default function SavePanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [filename, setFilename] = useState('');
  const [saving, setSaving] = useState(false);

  const getFilename = () => {
    const base = filename.trim() || state.file?.name?.replace('.pdf', '') || 'document';
    return `${base}_edited.pdf`;
  };

  const applyAnnotations = useCallback(async (): Promise<Uint8Array> => {
    if (!state.pdfData) throw new Error('PDFデータがありません');
    let currentData: ArrayBuffer = state.pdfData.slice(0);

    for (const ann of state.annotations) {
      const pageIndex = ann.page - 1;
      switch (ann.type) {
        case 'text': {
          const style = ann.style as TextStyle;
          const result = await addTextToPdf(
            currentData,
            pageIndex,
            ann.content,
            ann.position,
            style.fontSize,
            style.color
          );
          currentData = result.buffer as ArrayBuffer;
          break;
        }
        case 'draw': {
          const style = ann.style as DrawStyle;
          const result = await addDrawingToPdf(
            currentData,
            pageIndex,
            ann.content,
            style.strokeColor,
            style.strokeWidth
          );
          currentData = result.buffer as ArrayBuffer;
          break;
        }
        case 'highlight': {
          const style = ann.style as HighlightStyle;
          const result = await addHighlightToPdf(
            currentData,
            pageIndex,
            ann.position,
            { width: style.width, height: style.height },
            style.color,
            style.opacity
          );
          currentData = result.buffer as ArrayBuffer;
          break;
        }
      }
    }
    return new Uint8Array(currentData);
  }, [state.pdfData, state.annotations]);

  const handleSavePDF = async () => {
    setSaving(true);
    try {
      const pdfBytes = await applyAnnotations();
      const blob = savePdfAsBlob(pdfBytes);
      downloadBlob(blob, getFilename());
      dispatch({ type: 'SET_MODIFIED', payload: false });
      showDqToast('きろく石に きざみました！');
      onClose();
    } catch (err) {
      alert('保存に失敗しました: ' + (err instanceof Error ? err.message : '不明なエラー'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImage = async () => {
    const canvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
    if (!canvas) return;
    setSaving(true);
    try {
      const dataURL = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `${filename.trim() || 'page'}_${state.currentPage}.png`;
      a.click();
      showDqToast('ダンジョンの ちずを つくりました！');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="きろく石に きざむ">
      <div className="space-y-4">
        {state.isModified && (
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--ynk-gold)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>はかいしんさま、まだ きざんで おりませぬぞ！</p>
          </div>
        )}
        <div>
          <label className="dq-text text-sm block mb-1" style={{ color: 'var(--ynk-gold)' }}>きろく石の なまえ</label>
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder={state.file?.name?.replace('.pdf', '') || 'document'}
            className="dq-input w-full"
          />
        </div>
        {saving && (
          <div>
            <p className="dq-text text-xs mb-1" style={{ color: 'var(--ynk-gold)' }}>きろくちゅう...</p>
            <div className="dq-progress" style={{ height: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 4, border: '1px solid rgba(136,136,204,0.3)', overflow: 'hidden' }}>
              <div className="dq-progress-bar dq-progress-hp" style={{ width: '100%', animation: 'dq-hp-pulse 1s ease-in-out infinite alternate' }} />
            </div>
          </div>
        )}
        <button
          onClick={handleSavePDF}
          disabled={saving}
          className="dq-btn w-full flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileDown size={20} />
          )}
          きろく石に きざめ！
        </button>
        <button
          onClick={handleSaveImage}
          disabled={saving}
          className="dq-btn w-full flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)', boxShadow: '0 3px 0 #2a1c12, 0 4px 8px rgba(0,0,0,0.3)' }}
        >
          <Image size={20} />
          ダンジョンの ちずを つくる
        </button>
      </div>
    </SlidePanel>
  );
}
