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
        className={`dq-window w-full max-w-sm p-8 flex flex-col items-center gap-6 transition-all ${
          isDragging ? 'scale-105 border-[var(--ynk-gold)]' : ''
        }`}
        style={{ background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)', borderColor: '#5c4a2e' }}
      >
        {/* ----- IDLE: ダンジョンを掘り出す ----- */}
        {phase === 'idle' && (
          <>
            <DqSlime size={80} bounce>
              はかいしんさま、あたらしい PDFを ほりだしますか？
            </DqSlime>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="dq-btn text-lg px-8"
            >
              はい
            </button>
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
                <span className="dq-text text-xs">くっさく</span>
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
      </div>
    </div>
  );
}
