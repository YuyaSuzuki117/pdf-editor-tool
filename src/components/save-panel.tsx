'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDown, Image } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { showDqToast } from '@/lib/toast';
import {
  addTextToPdf,
  addDrawingToPdf,
  addHighlightToPdf,
  addImageToPdf,
  savePdfAsBlob,
  downloadBlob,
} from '@/lib/pdf-editor';
import SlidePanel from './slide-panel';
import { DqSlime } from '@/components/dq-slime';
import type { TextStyle, DrawStyle, HighlightStyle } from '@/types/pdf';

export default function SavePanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [filename, setFilename] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

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
    const total = state.annotations.length;

    for (let idx = 0; idx < total; idx++) {
      const ann = state.annotations[idx];
      const pageIndex = ann.page - 1;
      const scale = ann.renderScale || 1;

      // チャンク分割: 5件ごとにUIスレッドに制御を返す（フリーズ防止）
      if (idx > 0 && idx % 5 === 0) {
        await new Promise<void>((r) => setTimeout(r, 0));
      }

      // 実際の処理数に基づくプログレス計算
      setSaveProgress(Math.round(((idx + 1) / total) * 90));

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
        case 'image': {
          const imgStyle = ann.style as Record<string, string | number>;
          const pdfPos = {
            x: ann.position.x / scale,
            y: ann.position.y / scale,
          };
          const pdfSize = {
            width: ((imgStyle.width as number) || 150) / scale,
            height: ((imgStyle.height as number) || 150) / scale,
          };
          // DataURLからバイナリに変換
          const dataUrl = ann.content;
          const base64 = dataUrl.split(',')[1];
          const binaryStr = atob(base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const result = await addImageToPdf(
            currentData,
            pageIndex,
            bytes,
            pdfPos,
            pdfSize
          );
          currentData = result.buffer as ArrayBuffer;
          break;
        }
      }
    }
    setSaveProgress(100);
    return new Uint8Array(currentData);
  }, [state.pdfData, state.annotations]);

  const handleSavePDF = async () => {
    setSaving(true);
    setSaveProgress(0);
    try {
      const pdfBytes = await applyAnnotations();
      const blob = savePdfAsBlob(pdfBytes);
      downloadBlob(blob, getFilename());
      dispatch({ type: 'SET_MODIFIED', payload: false });
      showDqToast('PDFを保存しました！', 'success');
      onClose();
    } catch (err) {
      showDqToast('保存に失敗しました: ' + (err instanceof Error ? err.message : '不明なエラー'), 'error');
    } finally {
      setSaving(false);
      setSaveProgress(0);
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
        } else if (ann.type === 'image') {
          const imgStyle = ann.style as Record<string, string | number>;
          const imgWidth = (imgStyle.width as number) || 150;
          const imgHeight = (imgStyle.height as number) || 150;
          const scaleRatio = canvas.width / canvas.offsetWidth;
          await new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              ctx.drawImage(
                img,
                ann.position.x * scaleRatio,
                ann.position.y * scaleRatio,
                imgWidth * scaleRatio,
                imgHeight * scaleRatio
              );
              resolve();
            };
            img.onerror = () => resolve();
            img.src = ann.content;
          });
        }
      }

      const dataURL = outCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `${filename.trim() || 'page'}_${state.currentPage}.png`;
      a.click();
      showDqToast('画像を保存しました！', 'success');
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
          <div className="flex flex-col items-center py-3" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(92,74,46,0.5)', borderRadius: 4, padding: '16px' }}>
            <DqSlime size={48} bounce={true}>
              <span style={{ fontSize: 12 }}>{'\u307E\u3060\u306A\u306B\u3082 \u307B\u308A\u3060\u3057\u3066\u3044\u306A\u3044\u305E'}</span>
            </DqSlime>
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
            <div className="flex justify-between mb-1">
              <p className="dq-text text-xs" style={{ color: 'var(--ynk-gold)' }}>保存中...</p>
              {state.annotations.length > 0 && (
                <p className="dq-text text-xs" style={{ color: 'var(--ynk-gold)' }}>{saveProgress}%</p>
              )}
            </div>
            <div className="dq-progress" style={{ height: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 4, border: '1px solid rgba(136,136,204,0.3)', overflow: 'hidden' }}>
              <div className="dq-progress-bar dq-progress-hp" style={{
                width: state.annotations.length > 0 ? `${saveProgress}%` : '100%',
                transition: 'width 0.2s ease',
                animation: saveProgress >= 100 || state.annotations.length === 0 ? 'dq-hp-pulse 1s ease-in-out infinite alternate' : 'none',
              }} />
            </div>
          </div>
        )}
        <button
          onClick={handleSavePDF}
          disabled={saving}
          className="dq-btn w-full flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="dq-spinner-sm" />
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
