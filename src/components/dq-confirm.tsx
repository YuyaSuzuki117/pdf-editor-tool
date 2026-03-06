'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

let showConfirmGlobal: ((message: string) => Promise<boolean>) | null = null;

/** DQテーマの確認ダイアログを表示。confirm() の代替。 */
export function dqConfirm(message: string): Promise<boolean> {
  if (showConfirmGlobal) return showConfirmGlobal(message);
  // フォールバック
  return Promise.resolve(window.confirm(message));
}

export default function DqConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ConfirmState | null>(null);
  const yesRef = useRef<HTMLButtonElement>(null);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, resolve });
    });
  }, []);

  useEffect(() => {
    showConfirmGlobal = showConfirm;
    return () => { showConfirmGlobal = null; };
  }, [showConfirm]);

  // フォーカスをYesボタンに
  useEffect(() => {
    if (pending && yesRef.current) {
      yesRef.current.focus();
    }
  }, [pending]);

  const handleResult = useCallback((result: boolean) => {
    if (pending) {
      pending.resolve(result);
      setPending(null);
    }
  }, [pending]);

  // ESCキーでキャンセル
  useEffect(() => {
    if (!pending) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleResult(false);
      if (e.key === 'Enter') handleResult(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pending, handleResult]);

  return (
    <>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{
            background: 'rgba(13,8,4,0.8)',
            backdropFilter: 'blur(2px)',
            animation: 'onboarding-fade-in 0.15s ease',
          }}
          onClick={() => handleResult(false)}
        >
          <div
            className="dq-window p-5 max-w-[320px] w-[85vw]"
            style={{ animation: 'onboarding-card-in 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="dq-text text-sm text-center mb-5"
              style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}
            >
              {pending.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleResult(false)}
                className="dq-btn-small flex-1"
                style={{
                  background: 'linear-gradient(180deg, #4a4a4a 0%, #333 100%)',
                  color: 'var(--ynk-bone)',
                  minHeight: 40,
                }}
              >
                いいえ
              </button>
              <button
                ref={yesRef}
                onClick={() => handleResult(true)}
                className="dq-btn flex-1"
                style={{ minHeight: 40 }}
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
