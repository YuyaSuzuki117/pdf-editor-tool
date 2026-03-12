'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileDown, Image as ImageIcon, ChevronDown, ChevronUp, FileJson, Upload } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { showDqToast } from '@/lib/toast';
import {
  applyAllAnnotations,
  addWatermark,
  setMetadata,
  savePdfAsBlob,
  downloadBlob,
} from '@/lib/pdf-editor';
import type { BatchAnnotation } from '@/lib/pdf-editor';
import SlidePanel from './slide-panel';
import { YuunamaMushroomMan } from '@/components/dq-characters';
import type { TextStyle, DrawStyle, HighlightStyle, ShapeStyle, Annotation } from '@/types/pdf';

type SavePreset = 'pdf' | 'pdf-json' | 'image';

export default function SavePanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [filename, setFilename] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastPreset, setLastPreset] = useState<SavePreset>('pdf');

  // ウォーターマーク設定
  const [showWatermark, setShowWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.2);
  const [watermarkSize, setWatermarkSize] = useState(48);

  // メタデータ
  const [showMeta, setShowMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');

  useEffect(() => {
    if (isOpen && state.file?.name) {
      const baseName = state.file.name.replace(/\.pdf$/i, '');
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      setFilename(`${baseName}_${dateStr}`);
      setShowAdvanced(false);
      setShowWatermark(false);
      setShowMeta(false);
    }
  }, [isOpen, state.file?.name]);

  const getBaseFilename = useCallback(() => filename.trim() || 'document', [filename]);

  const getFilename = useCallback(() => `${getBaseFilename()}.pdf`, [getBaseFilename]);

  const exportAnnotationsJson = useCallback(() => {
    const data = {
      fileName: state.file?.name || 'unknown',
      exportedAt: new Date().toISOString(),
      annotations: state.annotations.map(ann => ({
        type: ann.type,
        page: ann.page,
        position: ann.position,
        content: ann.type === 'image' ? '[画像データ]' : ann.content,
        style: ann.style,
        renderScale: ann.renderScale,
        createdAt: new Date(ann.createdAt).toISOString(),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${getBaseFilename()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getBaseFilename, state.annotations, state.file?.name]);

  const applyAnnotations = useCallback(async (): Promise<Uint8Array> => {
    if (!state.pdfData) throw new Error('PDFデータがありません');

    const batch: BatchAnnotation[] = state.annotations.map((ann) => {
      const scale = ann.renderScale || 1;
      const pageIndex = ann.page - 1;

      switch (ann.type) {
        case 'text': {
          const style = ann.style as TextStyle;
          return {
            type: 'text' as const,
            pageIndex,
            position: { x: ann.position.x / scale, y: ann.position.y / scale },
            content: ann.content,
            fontSize: style.fontSize,
            color: style.color,
            fontFamily: style.fontFamily || 'Noto Sans JP',
            bold: style.bold,
            italic: style.italic,
          };
        }
        case 'draw': {
          const style = ann.style as DrawStyle;
          const scaledSvgPath = ann.content.replace(
            /([ML])([\d.]+),([\d.]+)/g,
            (_match, cmd, xStr, yStr) => {
              const sx = parseFloat(xStr) / scale;
              const sy = parseFloat(yStr) / scale;
              return `${cmd}${sx},${sy}`;
            }
          );
          return {
            type: 'draw' as const,
            pageIndex,
            position: { x: 0, y: 0 },
            content: scaledSvgPath,
            strokeColor: style.strokeColor,
            strokeWidth: style.strokeWidth / scale,
          };
        }
        case 'highlight': {
          const style = ann.style as HighlightStyle;
          return {
            type: 'highlight' as const,
            pageIndex,
            position: { x: ann.position.x / scale, y: ann.position.y / scale },
            content: '',
            color: style.color,
            opacity: style.opacity,
            size: { width: style.width / scale, height: style.height / scale },
            markupMode: style.markupMode || 'highlight',
          };
        }
        case 'image': {
          const imgStyle = ann.style as Record<string, string | number>;
          const base64 = ann.content.split(',')[1];
          const binaryStr = atob(base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          return {
            type: 'image' as const,
            pageIndex,
            position: { x: ann.position.x / scale, y: ann.position.y / scale },
            content: '',
            imageBytes: bytes,
            size: {
              width: ((imgStyle.width as number) || 150) / scale,
              height: ((imgStyle.height as number) || 150) / scale,
            },
          };
        }
        case 'shape': {
          const style = ann.style as ShapeStyle;
          let shapeData;
          try { shapeData = JSON.parse(ann.content); } catch { shapeData = null; }
          return {
            type: 'shape' as const,
            pageIndex,
            position: { x: ann.position.x / scale, y: ann.position.y / scale },
            content: '',
            strokeColor: style.strokeColor,
            strokeWidth: style.strokeWidth / scale,
            shapeData: shapeData ? {
              shapeType: shapeData.shapeType,
              x1: shapeData.x1 / scale,
              y1: shapeData.y1 / scale,
              x2: shapeData.x2 / scale,
              y2: shapeData.y2 / scale,
              filled: shapeData.filled,
              fillColor: shapeData.fillColor,
            } : undefined,
          };
        }
        case 'note':
          return {
            type: 'note' as const,
            pageIndex,
            position: { x: ann.position.x / scale, y: ann.position.y / scale },
            content: ann.content,
          };
      }
    });

    return applyAllAnnotations(state.pdfData, batch, setSaveProgress);
  }, [state.pdfData, state.annotations]);

  const handleSavePDF = async (options?: { exportJsonAfter?: boolean; keepOpen?: boolean; preset?: SavePreset; successMessage?: string }) => {
    setSaving(true);
    setSaveProgress(0);
    try {
      let pdfBytes = await applyAnnotations();

      // ウォーターマーク
      if (watermarkText.trim()) {
        pdfBytes = await addWatermark(
          pdfBytes.slice().buffer,
          watermarkText.trim(),
          { opacity: watermarkOpacity, fontSize: watermarkSize }
        );
      }

      // メタデータ
      if (metaTitle.trim() || metaAuthor.trim()) {
        pdfBytes = await setMetadata(pdfBytes, { title: metaTitle.trim() || undefined, author: metaAuthor.trim() || undefined });
      }

      const blob = savePdfAsBlob(pdfBytes);
      downloadBlob(blob, getFilename());
      if (options?.exportJsonAfter && state.annotations.length > 0) {
        exportAnnotationsJson();
      }
      dispatch({ type: 'SET_MODIFIED', payload: false });
      setLastPreset(options?.preset || 'pdf');
      showDqToast(options?.successMessage || 'PDFを保存しました！', 'success');
      if (!options?.keepOpen) {
        onClose();
      }
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
      const outCanvas = document.createElement('canvas');
      outCanvas.width = canvas.width;
      outCanvas.height = canvas.height;
      const ctx = outCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0);

      const pageAnnotations = state.annotations.filter((a) => a.page === state.currentPage);
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
          const points = ann.content.split(/[ML]/).filter(Boolean).map((p) => {
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
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();
            ctx.restore();
          }
        } else if (ann.type === 'text') {
          const style = ann.style as TextStyle;
          const scaleRatio = canvas.width / canvas.offsetWidth;
          ctx.save();
          ctx.fillStyle = style.color;
          // fitScaleでCSS上のサイズ→scaleRatioでcanvas内部解像度に変換
          const canvasFontSize = style.fontSize * scaleRatio;
          const family = style.fontFamily || 'Helvetica, Arial, sans-serif';
          ctx.font = `${style.bold ? 'bold ' : ''}${style.italic ? 'italic ' : ''}${canvasFontSize}px ${family}`;
          ctx.textBaseline = 'top';
          const x = ann.position.x * scaleRatio;
          const y = ann.position.y * scaleRatio;
          const lines = ann.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, y + i * canvasFontSize * 1.2);
          }
          ctx.restore();
        } else if (ann.type === 'shape') {
          const style = ann.style as ShapeStyle;
          let shapeData: { shapeType: string; x1: number; y1: number; x2: number; y2: number; filled?: boolean; fillColor?: string };
          try { shapeData = JSON.parse(ann.content); } catch { continue; }
          const scaleRatio = canvas.width / canvas.offsetWidth;
          const sx1 = shapeData.x1 * scaleRatio;
          const sy1 = shapeData.y1 * scaleRatio;
          const sx2 = shapeData.x2 * scaleRatio;
          const sy2 = shapeData.y2 * scaleRatio;
          const sw = style.strokeWidth * scaleRatio;
          ctx.save();
          ctx.strokeStyle = style.strokeColor;
          ctx.lineWidth = sw;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const x = Math.min(sx1, sx2);
          const y = Math.min(sy1, sy2);
          const w = Math.abs(sx2 - sx1);
          const h = Math.abs(sy2 - sy1);
          switch (shapeData.shapeType) {
            case 'rectangle':
              if (shapeData.filled && shapeData.fillColor) {
                ctx.fillStyle = shapeData.fillColor;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, y, w, h);
                ctx.globalAlpha = 1;
              }
              ctx.strokeRect(x, y, w, h);
              break;
            case 'circle': {
              const cx = (sx1 + sx2) / 2;
              const cy = (sy1 + sy2) / 2;
              ctx.beginPath();
              ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
              if (shapeData.filled && shapeData.fillColor) {
                ctx.fillStyle = shapeData.fillColor;
                ctx.globalAlpha = 0.3;
                ctx.fill();
                ctx.globalAlpha = 1;
              }
              ctx.stroke();
              break;
            }
            case 'line':
              ctx.beginPath();
              ctx.moveTo(sx1, sy1);
              ctx.lineTo(sx2, sy2);
              ctx.stroke();
              break;
            case 'arrow': {
              ctx.beginPath();
              ctx.moveTo(sx1, sy1);
              ctx.lineTo(sx2, sy2);
              ctx.stroke();
              const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
              const headLen = Math.max(12 * scaleRatio, sw * 4);
              ctx.beginPath();
              ctx.moveTo(sx2, sy2);
              ctx.lineTo(sx2 - headLen * Math.cos(angle - Math.PI / 6), sy2 - headLen * Math.sin(angle - Math.PI / 6));
              ctx.moveTo(sx2, sy2);
              ctx.lineTo(sx2 - headLen * Math.cos(angle + Math.PI / 6), sy2 - headLen * Math.sin(angle + Math.PI / 6));
              ctx.stroke();
              break;
            }
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
              ctx.drawImage(img, ann.position.x * scaleRatio, ann.position.y * scaleRatio, imgWidth * scaleRatio, imgHeight * scaleRatio);
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
      a.download = `${getBaseFilename()}_${state.currentPage}.png`;
      a.click();
      setLastPreset('image');
      showDqToast('画像を保存しました！', 'success');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.annotations || !Array.isArray(data.annotations)) {
          showDqToast('無効なJSONファイルです', 'error');
          return;
        }
        let imported = 0;
        for (const ann of data.annotations) {
          if (!ann.type || !ann.page || !ann.position) continue;
          // Skip image annotations from JSON (they contain placeholder text)
          if (ann.type === 'image' && (!ann.content || ann.content === '[画像データ]')) continue;
          const newAnn: Annotation = {
            id: crypto.randomUUID(),
            type: ann.type,
            page: ann.page,
            position: { x: ann.position.x || 0, y: ann.position.y || 0 },
            content: ann.content || '',
            style: ann.style || {},
            renderScale: ann.renderScale,
            createdAt: Date.now(),
          };
          dispatch({ type: 'ADD_ANNOTATION', payload: newAnn });
          imported++;
        }
        if (imported > 0) {
          showDqToast(`${imported}件のアノテーションを読み込みました`, 'success');
        } else {
          showDqToast('読み込めるアノテーションがありませんでした', 'info');
        }
      } catch {
        showDqToast('JSONファイルの読み込みに失敗しました', 'error');
      }
    };
    input.click();
  }, [dispatch]);

  const annotationSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ann of state.annotations) {
      const label = ann.type === 'text' ? 'テキスト' : ann.type === 'draw' ? '描画' : ann.type === 'highlight' ? 'マーカー' : ann.type === 'shape' ? '図形' : ann.type === 'note' ? '付箋' : '画像';
      counts[label] = (counts[label] || 0) + 1;
    }
    return Object.entries(counts).map(([label, count]) => `${label}${count}件`).join('、');
  }, [state.annotations]);

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="保存・書き出し"
      allowInteraction
      desktopDock
      desktopCompactWidth="min(24rem, calc(100vw - 2rem))"
      desktopExpandedWidth="min(30rem, calc(100vw - 2rem))"
      description="保存形式を見比べながら、そのまま書き出せます"
    >
      <div className="space-y-4">
        {state.annotations.length > 0 ? (
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--ynk-gold)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
              編集内容: {annotationSummary}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-3 gap-2" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(92,74,46,0.5)', borderRadius: 4, padding: '16px' }}>
            <YuunamaMushroomMan size={48} bounce />
            <p className="dq-text text-xs text-center" style={{ color: 'var(--ynk-bone)', opacity: 0.7 }}>
              まだなにも ほりだしていないぞ
            </p>
          </div>
        )}

        {state.pdfData && (
          <div className="dq-text text-xs" style={{ color: 'var(--ynk-bone)', opacity: 0.7 }}>
            ファイルサイズ: {(state.pdfData.byteLength / 1024).toFixed(0)} KB ({state.numPages}ページ)
          </div>
        )}

        {state.isModified && (
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--ynk-gold)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>未保存の変更があります</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>おすすめ保存</p>
            <p className="dq-text text-[11px]" style={{ color: 'var(--ynk-bone)', opacity: 0.66 }}>
              迷ったら左から使えば十分です
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={() => handleSavePDF({ preset: 'pdf' })}
              disabled={saving}
              className="text-left px-3 py-3 transition-all"
              style={{
                background: lastPreset === 'pdf' ? 'linear-gradient(180deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.08) 100%)' : 'rgba(0,0,0,0.22)',
                border: lastPreset === 'pdf' ? '2px solid rgba(212,160,23,0.8)' : '2px solid rgba(92,74,46,0.35)',
              }}
            >
              <div className="flex items-center gap-2">
                <FileDown size={16} style={{ color: 'var(--ynk-gold)' }} />
                <span className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>通常PDF</span>
              </div>
              <p className="dq-text text-xs mt-2" style={{ color: 'var(--ynk-bone)', opacity: 0.76 }}>
                編集内容を反映して、そのまま配布できます
              </p>
            </button>
            <button
              onClick={() => handleSavePDF({ exportJsonAfter: true, preset: 'pdf-json', successMessage: 'PDFとJSONを保存しました！' })}
              disabled={saving}
              className="text-left px-3 py-3 transition-all"
              style={{
                background: lastPreset === 'pdf-json' ? 'linear-gradient(180deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.08) 100%)' : 'rgba(0,0,0,0.22)',
                border: lastPreset === 'pdf-json' ? '2px solid rgba(212,160,23,0.8)' : '2px solid rgba(92,74,46,0.35)',
              }}
            >
              <div className="flex items-center gap-2">
                <FileJson size={16} style={{ color: 'var(--ynk-gold)' }} />
                <span className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>PDF + JSON</span>
              </div>
              <p className="dq-text text-xs mt-2" style={{ color: 'var(--ynk-bone)', opacity: 0.76 }}>
                証跡や引き継ぎ用に、注釈の控えも一緒に残します
              </p>
            </button>
            <button
              onClick={handleSaveImage}
              disabled={saving}
              className="text-left px-3 py-3 transition-all"
              style={{
                background: lastPreset === 'image' ? 'linear-gradient(180deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.08) 100%)' : 'rgba(0,0,0,0.22)',
                border: lastPreset === 'image' ? '2px solid rgba(212,160,23,0.8)' : '2px solid rgba(92,74,46,0.35)',
              }}
            >
              <div className="flex items-center gap-2">
                <ImageIcon size={16} style={{ color: 'var(--ynk-gold)' }} />
                <span className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>現在ページPNG</span>
              </div>
              <p className="dq-text text-xs mt-2" style={{ color: 'var(--ynk-bone)', opacity: 0.76 }}>
                チャット共有や報告用に、今見ているページを画像化します
              </p>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="save-filename" className="dq-text text-sm block mb-1" style={{ color: 'var(--ynk-gold)' }}>ファイル名</label>
          <input id="save-filename" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder={state.file?.name?.replace('.pdf', '') || 'document'} className="dq-input w-full" />
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

        <div className="space-y-2">
          <button
            onClick={() => handleSavePDF()}
            disabled={saving}
            className="dq-btn w-full flex items-center justify-center gap-2"
          >
            {saving ? <div className="dq-spinner-sm" /> : <FileDown size={20} />}
            PDFを保存
          </button>
          <button
            onClick={handleSaveImage}
            disabled={saving}
            className="dq-btn w-full flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)', boxShadow: '0 3px 0 #2a1c12, 0 4px 8px rgba(0,0,0,0.3)' }}
          >
            <ImageIcon size={20} />
            画像として保存（現在のページ）
          </button>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-3 py-2"
          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--window-border)', borderRadius: 4, color: 'var(--ynk-gold)' }}
          aria-expanded={showAdvanced}
        >
          <span className="dq-text text-sm">くわしい設定・JSON</span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div className="space-y-4">
            <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(92,74,46,0.45)', borderRadius: 4, padding: '10px 12px' }}>
              <p className="dq-text text-xs" style={{ color: 'var(--ynk-bone)', opacity: 0.8 }}>
                ウォーターマークやメタデータ、JSON入出力が必要なときだけ開いてください
              </p>
            </div>

            <button
              onClick={() => setShowWatermark(!showWatermark)}
              className="w-full flex items-center justify-between px-3 py-2"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--window-border)', borderRadius: 4, color: 'var(--ynk-gold)' }}
              aria-expanded={showWatermark}
            >
              <span className="dq-text text-sm">ウォーターマーク</span>
              {showWatermark ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showWatermark && (
              <div className="space-y-2 pl-2" style={{ borderLeft: '2px solid var(--window-border)' }}>
                <input
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="例: CONFIDENTIAL, 社外秘, DRAFT"
                  className="dq-input w-full text-sm"
                  style={{ padding: '6px 10px' }}
                />
                <div className="flex items-center gap-2">
                  <span className="dq-text text-xs" style={{ color: 'var(--ynk-bone)' }}>透明度:</span>
                  <input type="range" min={5} max={50} value={watermarkOpacity * 100} onChange={(e) => setWatermarkOpacity(Number(e.target.value) / 100)} style={{ accentColor: '#d4a017', flex: 1 }} />
                  <span className="dq-text text-xs" style={{ color: 'var(--ynk-bone)', minWidth: 32 }}>{Math.round(watermarkOpacity * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="dq-text text-xs" style={{ color: 'var(--ynk-bone)' }}>サイズ:</span>
                  <input type="range" min={20} max={100} value={watermarkSize} onChange={(e) => setWatermarkSize(Number(e.target.value))} style={{ accentColor: '#d4a017', flex: 1 }} />
                  <span className="dq-text text-xs" style={{ color: 'var(--ynk-bone)', minWidth: 32 }}>{watermarkSize}pt</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowMeta(!showMeta)}
              className="w-full flex items-center justify-between px-3 py-2"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--window-border)', borderRadius: 4, color: 'var(--ynk-gold)' }}
              aria-expanded={showMeta}
            >
              <span className="dq-text text-sm">メタデータ</span>
              {showMeta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showMeta && (
              <div className="space-y-2 pl-2" style={{ borderLeft: '2px solid var(--window-border)' }}>
                <div>
                  <label className="dq-text text-xs block mb-1" style={{ color: 'var(--ynk-bone)' }}>タイトル</label>
                  <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="PDF タイトル" className="dq-input w-full text-sm" style={{ padding: '6px 10px' }} />
                </div>
                <div>
                  <label className="dq-text text-xs block mb-1" style={{ color: 'var(--ynk-bone)' }}>作成者</label>
                  <input value={metaAuthor} onChange={(e) => setMetaAuthor(e.target.value)} placeholder="作成者名" className="dq-input w-full text-sm" style={{ padding: '6px 10px' }} />
                </div>
              </div>
            )}

            {state.annotations.length > 0 && (
              <button
                onClick={() => {
                  const data = {
                    fileName: state.file?.name || 'unknown',
                    exportedAt: new Date().toISOString(),
                    annotations: state.annotations.map(ann => ({
                      type: ann.type,
                      page: ann.page,
                      position: ann.position,
                      content: ann.type === 'image' ? '[画像データ]' : ann.content,
                      style: ann.style,
                      renderScale: ann.renderScale,
                      createdAt: new Date(ann.createdAt).toISOString(),
                    })),
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `annotations_${getBaseFilename()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showDqToast('アノテーションをJSONで保存しました', 'success');
                }}
                disabled={saving}
                className="dq-btn w-full flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)', boxShadow: '0 3px 0 #2a1c12, 0 4px 8px rgba(0,0,0,0.3)' }}
              >
                <FileJson size={20} />
                アノテーションをJSON出力
              </button>
            )}
            <button
              onClick={handleImportJSON}
              disabled={saving}
              className="dq-btn w-full flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)', boxShadow: '0 3px 0 #2a1c12, 0 4px 8px rgba(0,0,0,0.3)' }}
            >
              <Upload size={20} />
              アノテーションJSON読込
            </button>
          </div>
        )}
      </div>
    </SlidePanel>
  );
}
