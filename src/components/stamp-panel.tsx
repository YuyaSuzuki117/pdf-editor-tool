'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Undo2 } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { showDqToast } from '@/lib/toast';
import SlidePanel from './slide-panel';
import type { Annotation } from '@/types/pdf';

// --- スタンプ定義 ---
interface StampDef {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const stamps: StampDef[] = [
  { label: '承認済', color: '#166534', bgColor: 'rgba(22,101,52,0.12)', borderColor: '#22c55e' },
  { label: '確認済', color: '#1e40af', bgColor: 'rgba(30,64,175,0.12)', borderColor: '#3b82f6' },
  { label: '却下', color: '#991b1b', bgColor: 'rgba(153,27,27,0.12)', borderColor: '#ef4444' },
  { label: '要修正', color: '#92400e', bgColor: 'rgba(146,64,14,0.12)', borderColor: '#f59e0b' },
  { label: 'DRAFT', color: '#6b7280', bgColor: 'rgba(107,114,128,0.12)', borderColor: '#9ca3af' },
  { label: 'CONFIDENTIAL', color: '#7c2d12', bgColor: 'rgba(124,45,18,0.12)', borderColor: '#dc2626' },
];

const stampSizes: { label: string; fontSize: number; width: number; height: number }[] = [
  { label: '小', fontSize: 14, width: 80, height: 40 },
  { label: '中', fontSize: 20, width: 120, height: 56 },
  { label: '大', fontSize: 28, width: 180, height: 76 },
];

type TabMode = 'stamp' | 'signature' | 'image';

// --- スタンプをDataURL画像に変換 ---
function stampToDataURL(stamp: StampDef, size: typeof stampSizes[number]): string {
  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = size.width * dpr;
  canvas.height = size.height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // 背景
  ctx.fillStyle = stamp.bgColor;
  ctx.fillRect(0, 0, size.width, size.height);

  // 枠線（角印風・二重線）
  ctx.strokeStyle = stamp.borderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, size.width - 6, size.height - 6);
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, size.width - 12, size.height - 12);

  // テキスト
  ctx.fillStyle = stamp.color;
  ctx.font = `bold ${size.fontSize}px "DotGothic16", "Noto Sans JP", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stamp.label, size.width / 2, size.height / 2);

  return canvas.toDataURL('image/png');
}

export default function StampPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [tab, setTab] = useState<TabMode>('stamp');

  // --- スタンプ ---
  const [selectedStamp, setSelectedStamp] = useState<StampDef | null>(null);
  const [stampSizeIdx, setStampSizeIdx] = useState(1);
  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
  const [tapRenderScale, setTapRenderScale] = useState(1);

  // --- 署名 ---
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);
  const sigLastPos = useRef<{ x: number; y: number } | null>(null);
  const [sigHasContent, setSigHasContent] = useState(false);
  const [sigDataURL, setSigDataURL] = useState<string | null>(null);
  const [sigWidth, setSigWidth] = useState(150);
  const sigUndoStack = useRef<ImageData[]>([]);

  // --- 画像 ---
  const [imageDataURL, setImageDataURL] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(200);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ w: number; h: number }>({ w: 200, h: 200 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // pdf-tapイベント
  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y, renderScale } = (e as CustomEvent).detail;
      setTapPos({ x, y });
      if (renderScale) setTapRenderScale(renderScale);
    };
    window.addEventListener('pdf-tap', handler);
    return () => window.removeEventListener('pdf-tap', handler);
  }, []);

  // パネルを閉じたらリセット
  useEffect(() => {
    if (!isOpen) {
      setTapPos(null);
    }
  }, [isOpen]);

  // --- スタンプ配置 ---
  const handlePlaceStamp = useCallback(() => {
    if (!selectedStamp || !tapPos) return;
    const size = stampSizes[stampSizeIdx];
    const dataURL = stampToDataURL(selectedStamp, size);

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'image',
      page: state.currentPage,
      position: tapPos,
      content: dataURL,
      style: { width: size.width, height: size.height },
      renderScale: tapRenderScale,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    showDqToast('スタンプを配置しました！', 'success');
    setTapPos(null);
  }, [selectedStamp, tapPos, stampSizeIdx, state.currentPage, tapRenderScale, dispatch]);

  // tapPos変更時に自動配置
  useEffect(() => {
    if (tab === 'stamp' && selectedStamp && tapPos) {
      handlePlaceStamp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapPos]);

  // --- 署名Canvas ---
  const initSigCanvas = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 300;
    canvas.height = 120;
    ctx.clearRect(0, 0, 300, 120);
    setSigHasContent(false);
    setSigDataURL(null);
  }, []);

  useEffect(() => {
    if (isOpen && tab === 'signature') {
      setTimeout(initSigCanvas, 100);
    }
  }, [isOpen, tab, initSigCanvas]);

  const getSigPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = sigCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const sigStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    // Save canvas state for undo before starting new stroke
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        sigUndoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
    }
    sigDrawing.current = true;
    sigLastPos.current = getSigPos(e);
  };

  const sigMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!sigDrawing.current || !sigLastPos.current) return;
    e.preventDefault();
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getSigPos(e);
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    sigLastPos.current = pos;
    setSigHasContent(true);
  };

  const sigEnd = () => {
    sigDrawing.current = false;
    sigLastPos.current = null;
    // DataURL化
    const canvas = sigCanvasRef.current;
    if (canvas) {
      setSigDataURL(canvas.toDataURL('image/png'));
    }
  };

  const handleUndoSig = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas || sigUndoStack.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = sigUndoStack.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    // Check if canvas is now empty
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasPixels = data.some((v, i) => i % 4 === 3 && v > 0);
    setSigHasContent(hasPixels);
    setSigDataURL(hasPixels ? canvas.toDataURL('image/png') : null);
  }, []);

  const handleClearSig = () => {
    sigUndoStack.current = [];
    initSigCanvas();
  };

  // 署名配置（tapPos変更時に自動配置）
  useEffect(() => {
    if (tab === 'signature' && sigDataURL && tapPos) {
      const aspectRatio = 120 / 300;
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'image',
        page: state.currentPage,
        position: tapPos,
        content: sigDataURL,
        style: { width: sigWidth, height: Math.round(sigWidth * aspectRatio) },
        renderScale: tapRenderScale,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
      showDqToast('署名を配置しました！', 'success');
      setTapPos(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapPos]);

  // --- 画像挿入 ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showDqToast('画像ファイルを選択してください', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURL = ev.target?.result as string;
      setImageDataURL(dataURL);
      // 画像の元サイズを取得
      const img = new window.Image();
      img.onload = () => {
        setImageNaturalSize({ w: img.width, h: img.height });
        setImageWidth(Math.min(200, img.width));
      };
      img.src = dataURL;
    };
    reader.readAsDataURL(file);
  };

  // 画像配置（tapPos変更時に自動配置）
  useEffect(() => {
    if (tab === 'image' && imageDataURL && tapPos) {
      const aspectRatio = imageNaturalSize.h / imageNaturalSize.w;
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'image',
        page: state.currentPage,
        position: tapPos,
        content: imageDataURL,
        style: { width: imageWidth, height: Math.round(imageWidth * aspectRatio) },
        renderScale: tapRenderScale,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
      showDqToast('画像を配置しました！', 'success');
      setTapPos(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapPos]);

  // --- タブUI ---
  const tabs: { key: TabMode; label: string }[] = [
    { key: 'stamp', label: 'スタンプ' },
    { key: 'signature', label: '署名' },
    { key: 'image', label: '画像' },
  ];

  const isReady = (() => {
    if (tab === 'stamp') return !!selectedStamp;
    if (tab === 'signature') return !!sigDataURL;
    if (tab === 'image') return !!imageDataURL;
    return false;
  })();

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="スタンプ・署名" allowInteraction>
      <div className="space-y-4">
        {/* タブ切り替え */}
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="dq-btn-small flex-1 text-center min-h-[40px]"
              style={tab === t.key
                ? { borderColor: '#d4a017', boxShadow: '0 0 8px rgba(212,160,23,0.5), inset 0 0 4px rgba(212,160,23,0.2)' }
                : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* --- スタンプタブ --- */}
        {tab === 'stamp' && (
          <div className="space-y-3">
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>スタンプを選択</p>
            <div className="grid grid-cols-3 gap-2">
              {stamps.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSelectedStamp(s)}
                  className="flex items-center justify-center p-2 min-h-[48px] transition-all"
                  style={{
                    background: s.bgColor,
                    border: `3px solid ${selectedStamp?.label === s.label ? '#d4a017' : s.borderColor}`,
                    borderRadius: 2,
                    color: s.color,
                    fontWeight: 'bold',
                    fontSize: 13,
                    fontFamily: '"DotGothic16", monospace',
                    boxShadow: selectedStamp?.label === s.label ? '0 0 12px rgba(212,160,23,0.5)' : 'none',
                    transform: selectedStamp?.label === s.label ? 'rotate(-3deg)' : 'none',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div>
              <p className="dq-text text-sm mb-2" style={{ color: 'var(--ynk-gold)' }}>サイズ</p>
              <div className="flex gap-2">
                {stampSizes.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setStampSizeIdx(i)}
                    className="dq-btn-small flex items-center justify-center min-h-[44px] min-w-[60px]"
                    style={stampSizeIdx === i
                      ? { borderColor: '#d4a017', boxShadow: '0 0 8px rgba(212,160,23,0.5)' }
                      : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedStamp ? (
              !tapPos ? (
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
                    PDFをタップしてスタンプを配置
                  </p>
                </div>
              ) : null
            ) : (
              <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(92,74,46,0.5)', borderRadius: 4, padding: '12px 16px' }}>
                <p className="dq-text text-sm opacity-60">上からスタンプを選んでください</p>
              </div>
            )}
          </div>
        )}

        {/* --- 署名タブ --- */}
        {tab === 'signature' && (
          <div className="space-y-3">
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>署名を描いてください</p>
            <div
              style={{
                border: '2px solid #5c4a2e',
                borderRadius: 4,
                overflow: 'hidden',
                background: 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 16px 16px',
                touchAction: 'none',
              }}
            >
              <canvas
                ref={sigCanvasRef}
                width={300}
                height={120}
                style={{ width: '100%', height: 120, cursor: 'crosshair', display: 'block' }}
                onMouseDown={sigStart}
                onMouseMove={sigMove}
                onMouseUp={sigEnd}
                onMouseLeave={sigEnd}
                onTouchStart={sigStart}
                onTouchMove={sigMove}
                onTouchEnd={sigEnd}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUndoSig}
                className="dq-btn-small flex items-center justify-center gap-1 min-h-[40px] px-4"
                style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
              >
                <Undo2 size={16} /> 戻す
              </button>
              <button
                onClick={handleClearSig}
                className="dq-btn-small flex items-center justify-center gap-1 min-h-[40px] px-4"
                style={{ background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
              >
                <Trash2 size={16} /> クリア
              </button>
            </div>

            <div>
              <p className="dq-text text-sm mb-1" style={{ color: 'var(--ynk-gold)' }}>署名サイズ: {sigWidth}px</p>
              <input
                type="range"
                min={50}
                max={400}
                value={sigWidth}
                onChange={(e) => setSigWidth(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: '#d4a017' }}
              />
            </div>

            {sigHasContent ? (
              !tapPos ? (
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
                    PDFをタップして署名を配置
                  </p>
                </div>
              ) : null
            ) : (
              <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(92,74,46,0.5)', borderRadius: 4, padding: '12px 16px' }}>
                <p className="dq-text text-sm opacity-60">上のキャンバスに署名を描いてください</p>
              </div>
            )}
          </div>
        )}

        {/* --- 画像タブ --- */}
        {tab === 'image' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="dq-btn w-full flex items-center justify-center gap-2"
            >
              画像ファイルを選択 (PNG/JPG/WebP/GIF)
            </button>

            {imageDataURL && (
              <div className="space-y-3">
                <div
                  style={{
                    border: '2px solid #5c4a2e',
                    borderRadius: 4,
                    padding: 8,
                    background: 'rgba(0,0,0,0.3)',
                    textAlign: 'center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageDataURL}
                    alt="preview"
                    style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain', margin: '0 auto' }}
                  />
                </div>

                <div>
                  <p className="dq-text text-sm mb-1" style={{ color: 'var(--ynk-gold)' }}>
                    画像サイズ: {imageWidth}px
                  </p>
                  <input
                    type="range"
                    min={50}
                    max={500}
                    value={imageWidth}
                    onChange={(e) => setImageWidth(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: '#d4a017' }}
                  />
                </div>

                {!tapPos ? (
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
                      PDFをタップして画像を配置
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {!imageDataURL && (
              <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(92,74,46,0.5)', borderRadius: 4, padding: '12px 16px' }}>
                <p className="dq-text text-sm opacity-60">画像ファイルを選択してください</p>
              </div>
            )}
          </div>
        )}

        {/* 準備状況表示 */}
        {isReady && (
          <div className="dq-message-box" style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e', borderRadius: 4, padding: '8px 12px' }}>
            <p className="dq-text text-sm" style={{ color: '#86efac' }}>
              準備完了 - PDFをタップして配置（連続配置可能）
            </p>
          </div>
        )}

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
