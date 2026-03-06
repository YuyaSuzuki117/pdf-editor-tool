'use client';

import { useCallback, useRef, useState } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes } from '@/lib/pdf-engine';
import { DqSlime } from '@/components/dq-slime';
import { YuunamaHero, YuunamaGoblin, YuunamaDragon, YuunamaSlime, YuunamaSkeleton } from '@/components/dq-characters';

type Phase = 'idle' | 'loading' | 'error';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DqDropZone() {
  const { dispatch } = usePDF();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileSize, setFileSize] = useState('');
  const [largeFileWarning, setLargeFileWarning] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setPhase('error');
        setErrorMsg(`くっ...！ それは ダンジョンの ちずでは ないようだ...\n（${file.type || '不明な形式'}は非対応。PDFのみ対応）`);
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setPhase('error');
        setErrorMsg(`ダンジョンが ふかすぎる！\n（${formatFileSize(file.size)} → 100MB以下にしてください）`);
        return;
      }
      if (file.size === 0) {
        setPhase('error');
        setErrorMsg('ファイルが からっぽだ！\n（0バイトのファイルは開けません）');
        return;
      }

      // 50MB以上は警告表示（読み込みは続行）
      setLargeFileWarning(file.size > 50 * 1024 * 1024);

      setFileSize(formatFileSize(file.size));
      setPhase('loading');
      setProgress(0);

      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // FileReaderのprogressイベントで正確な読み込み進捗を表示
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              // 読み込みフェーズ: 0-60%
              setProgress(Math.round((e.loaded / e.total) * 60));
            }
          };
          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(reader.result);
            } else {
              reject(new Error('FileReader result is not ArrayBuffer'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(file);
        });

        setProgress(65);
        const doc = await loadDocumentFromBytes(arrayBuffer);
        setProgress(100);

        // 少し待ってから表示（演出）
        await new Promise((r) => setTimeout(r, 400));

        dispatch({
          type: 'LOAD_PDF',
          payload: { file, pdfData: arrayBuffer, numPages: doc.numPages },
        });
        setLargeFileWarning(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        let userMsg = 'くっ...！ PDFが こわれているようだ！';
        if (message.includes('password') || message.includes('encrypt')) {
          userMsg = 'このPDFは パスワードで まもられている！\n（暗号化されたPDFは開けません）';
        } else if (message.includes('Invalid') || message.includes('corrupt')) {
          userMsg = 'くっ...！ PDFが こわれているようだ！\n（ファイルが破損している可能性があります）';
        } else {
          userMsg = `くっ...！ PDFの よみこみに しっぱいした！\n（${message || '不明なエラー'}）`;
        }
        setPhase('error');
        setErrorMsg(userMsg);
        setLargeFileWarning(false);
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
                <YuunamaHero size={72} bounce />
                <div className="dq-title text-lg ynk-active-sparkle" style={{ fontSize: 20 }}>
                  勇者がちかづいてきた！
                </div>
                <div className="dq-text text-sm text-center">
                  いまだ！ ファイルを おとせ！
                </div>
              </div>
            ) : (
              <>
                {/* キャラクター集合 */}
                <div className="flex items-end gap-1 justify-center">
                  <YuunamaSlime size={32} bounce />
                  <YuunamaGoblin size={36} bounce />
                  <DqSlime size={72} bounce>
                    はかいしんさま、あたらしい PDFを ほりだしますか？
                  </DqSlime>
                  <YuunamaSkeleton size={36} bounce />
                  <YuunamaHero size={32} bounce />
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="dq-btn text-lg px-8"
                >
                  ほりだす！
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

            {/* 50MB超え警告 */}
            {largeFileWarning && (
              <div className="w-full max-w-[240px] text-center" style={{ color: '#e8a000' }}>
                <p className="dq-text text-xs">
                  おおきな ダンジョンだ！ ({fileSize})
                </p>
                <p className="dq-text text-xs opacity-70">
                  よみこみに じかんが かかるかもしれません
                </p>
              </div>
            )}

            {/* 掘削ゲージ */}
            <div className="w-full max-w-[240px]">
              <div className="flex justify-between mb-1">
                <span className="dq-text text-xs">⛏ くっさく {fileSize && `(${fileSize})`}</span>
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
            <YuunamaDragon size={64} bounce={false} />
            <DqSlime size={60} bounce={false}>
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
