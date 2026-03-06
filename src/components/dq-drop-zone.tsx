'use client';

import { useCallback, useRef, useState } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes } from '@/lib/pdf-engine';
import { DqSlime } from '@/components/dq-slime';

type Phase = 'idle' | 'loading' | 'error';

export default function DqDropZone() {
  const { dispatch } = usePDF();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setPhase('error');
        setErrorMsg('くっ...！ それは ダンジョンの ちずでは ないようだ...');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setPhase('error');
        setErrorMsg('ダンジョンが ふかすぎる！ (100MB以下)');
        return;
      }

      setPhase('loading');
      setProgress(0);

      // 疑似プログレス
      const timer = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 15, 90));
      }, 200);

      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const arrayBuffer = await file.arrayBuffer();
        setProgress(70);
        const doc = await loadDocumentFromBytes(arrayBuffer);
        setProgress(100);
        clearInterval(timer);

        // 少し待ってから表示（演出）
        await new Promise((r) => setTimeout(r, 400));

        dispatch({
          type: 'LOAD_PDF',
          payload: { file, pdfData: arrayBuffer, numPages: doc.numPages },
        });
      } catch {
        clearInterval(timer);
        setPhase('error');
        setErrorMsg('くっ...！ ゆうしゃに ファイルを うばわれた！');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [dispatch],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const retry = useCallback(() => {
    setPhase('idle');
    setErrorMsg('');
    setProgress(0);
  }, []);

  return (
    <div
      className="flex-1 flex items-center justify-center p-6"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div
        className={`dq-window w-full max-w-sm p-8 flex flex-col items-center gap-6 transition-all relative overflow-hidden ${
          isDragging ? 'scale-105' : ''
        }`}
        style={{
          background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)',
          borderColor: isDragging ? '#d4a017' : '#5c4a2e',
          boxShadow: isDragging
            ? '0 0 20px rgba(212,160,23,0.4), 0 0 40px rgba(212,160,23,0.2), inset 0 0 30px rgba(212,160,23,0.1)'
            : '0 4px 20px rgba(0,0,0,0.7)',
        }}
      >
        {/* ダンジョン入口の装飾アーチ */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'repeating-linear-gradient(90deg, #4a4a4a 0px, #4a4a4a 20px, #3a3a3a 20px, #3a3a3a 22px, #5a5a5a 22px, #5a5a5a 40px)',
            borderBottom: '2px solid #2a2a2a',
            pointerEvents: 'none',
          }}
        />

        {/* 鉱石飛び散りエフェクト（ドラッグ中） */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span style={{ position: 'absolute', top: '40%', left: '30%', fontSize: 16, animation: 'ynk-ore-burst-1 0.8s ease-out infinite' }}>💎</span>
            <span style={{ position: 'absolute', top: '45%', left: '55%', fontSize: 14, animation: 'ynk-ore-burst-2 0.9s ease-out infinite 0.1s' }}>✨</span>
            <span style={{ position: 'absolute', top: '50%', left: '40%', fontSize: 12, animation: 'ynk-ore-burst-3 0.7s ease-out infinite 0.2s' }}>🪨</span>
            <span style={{ position: 'absolute', top: '42%', left: '65%', fontSize: 15, animation: 'ynk-ore-burst-4 0.85s ease-out infinite 0.15s' }}>⛏</span>
          </div>
        )}

        {/* ----- IDLE: ダンジョンを掘り出す ----- */}
        {phase === 'idle' && (
          <>
            {isDragging ? (
              <div className="flex flex-col items-center gap-4">
                <div className="dq-title text-lg ynk-active-sparkle" style={{ fontSize: 20 }}>
                  ⚠ 勇者がちかづいてきた！
                </div>
                <div className="dq-text text-sm text-center">
                  いまだ！ ファイルを おとせ！
                </div>
              </div>
            ) : (
              <>
                <DqSlime size={80} bounce>
                  はかいしんさま、あたらしい PDFを ほりだしますか？
                </DqSlime>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="dq-btn text-lg px-8"
                >
                  ⛏ ほりだす！
                </button>
              </>
            )}
          </>
        )}

        {/* ----- LOADING: 掘削中 ----- */}
        {phase === 'loading' && (
          <>
            <DqSlime size={80} bounce>
              ダンジョンを くっさく ちゅう...
            </DqSlime>

            {/* 掘削ゲージ */}
            <div className="w-full max-w-[240px]">
              <div className="flex justify-between mb-1">
                <span className="dq-text text-xs">⛏ くっさく</span>
                <span className="dq-text text-xs">{Math.round(progress)}%</span>
              </div>
              <div className="dq-progress">
                <div
                  className="dq-progress-bar dq-progress-hp"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </>
        )}

        {/* ----- ERROR: 掘削失敗 ----- */}
        {phase === 'error' && (
          <>
            <DqSlime size={80} bounce={false}>
              {errorMsg}
            </DqSlime>

            <button onClick={retry} className="dq-btn text-base px-6">
              もういちど
            </button>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />

        {/* ダンジョン入口の底部装飾 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'repeating-linear-gradient(90deg, #3a3a3a 0px, #3a3a3a 15px, #2a2a2a 15px, #2a2a2a 17px, #4a4a4a 17px, #4a4a4a 30px)',
            borderTop: '1px solid #5a5a5a',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
