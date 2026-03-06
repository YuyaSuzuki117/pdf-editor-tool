'use client';

import { useState, useCallback, useEffect } from 'react';
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

  // パネルを開いた時に既存ファイル名を自動入力
  useEffect(() => {
    if (isOpen && state.file?.name) {
      const baseName = state.file.name.replace(/\.pdf$/i, '');
      setFilename(baseName);
    }
  }, [isOpen, state.file?.name]);

  const getFilename = () => {
    const base = filename.trim() || state.file?.name?.replace('.pdf', '') || 'document';
    return `${base}_edited.pdf`;
  };

  const applyAnnotations = useCallback(async (): Promise<Uint8Array> => {
    if (!state.pdfData) throw new Error('PDFデータがありません');
    let currentData: ArrayBuffer = state.pdfData.slice(0);

    for (const ann of state.annotations) {
      const pageIndex = ann.page - 1;
      const scale = ann.renderScale || 1;
      switch (ann.type) {
        case 'text': {
          const style = ann.style as TextStyle;
          const pdfPos = {
            x: ann.position.x / scale,
            y: ann.position.y / scale,
          };
          const result = await addTextToPdf(
            currentData,
            pageIndex,
            ann.content,
            pdfPos,
            style.fontSize,
            style.color,
            style.fontFamily || 'Noto Sans JP'
          );
          currentData = result.buffer as ArrayBuffer;
          break;
        }
        case 'draw': {
          const style = ann.style as DrawStyle;
          // SVGパス内の座標もスケール変換する
          const scaledSvgPath = ann.content.replace(
            /([ML])([\d.]+),([\d.]+)/g,
            (_match, cmd, xStr, yStr) => {
              const sx = parseFloat(xStr) / scale;
              const sy = parseFloat(yStr) / scale;
              return `${cmd}${sx},${sy}`;
            }
          );
          const result = await addDrawingToPdf(
            currentData,
            pageIndex,
            scaledSvgPath,
            style.strokeColor,
            style.strokeWidth / scale
          );
          currentData = result.buffer as ArrayBuffer;
          break;
        }
        case 'highlight': {
          const style = ann.style as HighlightStyle;
          const pdfPos = {
            x: ann.position.x / scale,
            y: ann.position.y / scale,
          };
          const pdfSize = {
            width: style.width / scale,
            height: style.height / scale,
          };
          const result = await addHighlightToPdf(
            currentData,
            pageIndex,
            pdfPos,
            pdfSize,
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
      showDqToast('PDFを保存しました！');
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
      // 新しいcanvasを作成し、PDFキャンバスの上にアノテーションを合成する
      const outCanvas = document.createElement('canvas');
      outCanvas.width = canvas.width;
      outCanvas.height = canvas.height;
      const ctx = outCanvas.getContext('2d')!;

      // 元のPDFキャンバスを描画
      ctx.drawImage(canvas, 0, 0);

      // 現在のページのアノテーションを描画
      const pageAnnotations = state.annotations.filter(
        (a) => a.page === state.currentPage
      );

      for (const ann of pageAnnotations) {
        if (ann.type === 'highlight') {
          const style = ann.style as HighlightStyle;
          ctx.save();
          ctx.globalAlpha = style.opacity;
          ctx.fillStyle = style.color;
          ctx.fillRect(ann.position.x, ann.position.y, style.width, style.height);
          ctx.restore();
        } else if (ann.type === 'draw') {
          const style = ann.style as DrawStyle;
          const points = ann.content
            .split(/[ML]/)
            .filter(Boolean)
            .map((p) => {
              const [x, y] = p.trim().split(',').map(Number);
              return { x, y };
            });
          if (points.length >= 2) {
            ctx.save();
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
            ctx.restore();
          }
        } else if (ann.type === 'text') {
          const style = ann.style as TextStyle;
          const renderScale = canvas.dataset.renderScale
            ? parseFloat(canvas.dataset.renderScale)
            : 1;
          ctx.save();
          ctx.fillStyle = style.color;
          const scaledSize = style.fontSize * renderScale;
          const family = style.fontFamily || 'Helvetica, Arial, sans-serif';
          ctx.font = `${scaledSize}px ${family}`;
          ctx.textBaseline = 'top';
          // canvasの描画座標はdisplay座標 * devicePixelRatio相当のスケール
          const scaleRatio = canvas.width / canvas.offsetWidth;
          const x = ann.position.x * scaleRatio;
          const y = ann.position.y * scaleRatio;
          // 改行対応
          const lines = ann.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, y + i * scaledSize * scaleRatio * 1.2);
          }
          ctx.restore();
        }
      }

      const dataURL = outCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `${filename.trim() || 'page'}_${state.currentPage}.png`;
      a.click();
      showDqToast('画像を保存しました！');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // アノテーション内訳を計算
  const annotationSummary = (() => {
    const counts: Record<string, number> = {};
    for (const ann of state.annotations) {
      const label = ann.type === 'text' ? 'テキスト' : ann.type === 'draw' ? '描画' : ann.type === 'highlight' ? 'マーカー' : '画像';
      counts[label] = (counts[label] || 0) + 1;
    }
    return Object.entries(counts).map(([label, count]) => `${label}${count}件`).join('、');
  })();

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="保存・書き出し">
      <div className="space-y-4">
        {/* アノテーション内訳 or 編集なし表示 */}
        {state.annotations.length > 0 ? (
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--ynk-gold)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
              編集内容: {annotationSummary}
            </p>
          </div>
        ) : (
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(92,74,46,0.5)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm opacity-60">編集内容がありません</p>
          </div>
        )}
        {state.isModified && (
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--ynk-gold)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>未保存の変更があります</p>
          </div>
        )}
        <div>
          <label className="dq-text text-sm block mb-1" style={{ color: 'var(--ynk-gold)' }}>ファイル名</label>
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder={state.file?.name?.replace('.pdf', '') || 'document'}
            className="dq-input w-full"
          />
        </div>
        {saving && (
          <div>
            <p className="dq-text text-xs mb-1" style={{ color: 'var(--ynk-gold)' }}>保存中...</p>
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
          PDFを保存
        </button>
        <button
          onClick={handleSaveImage}
          disabled={saving}
          className="dq-btn w-full flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)', boxShadow: '0 3px 0 #2a1c12, 0 4px 8px rgba(0,0,0,0.3)' }}
        >
          <Image size={20} />
          画像として保存（現在のページ）
        </button>
      </div>
    </SlidePanel>
  );
}
