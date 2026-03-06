'use client';

import { useCallback, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes } from '@/lib/pdf-engine';

export default function DropZone() {
  const { dispatch } = usePDF();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('100MB以下のファイルを選択してください');
      return;
    }
    setError(null);
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await loadDocumentFromBytes(arrayBuffer);
      dispatch({
        type: 'LOAD_PDF',
        payload: { file, pdfData: arrayBuffer, numPages: doc.numPages },
      });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'PDFの読み込みに失敗しました' });
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div
        className={`w-full max-w-sm aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.98] cursor-pointer ${
          isDragging
            ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30'
            : 'border-[var(--border)] hover:border-[var(--primary)]'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <FileUp className="w-10 h-10 text-[var(--primary)]" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">PDFファイルを選択</p>
          <p className="text-sm text-gray-500 mt-1">タップまたはドラッグ＆ドロップ</p>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
