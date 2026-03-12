'use client';

import { useEffect, useState } from 'react';
import { usePDF } from '@/contexts/pdf-context';
import { DqSlime } from './dq-slime';
import { YuunamaHero, YuunamaLilith, YuunamaGoblin, YuunamaMushroomMan, YuunamaSlime, YuunamaSkeleton } from './dq-characters';

const STORAGE_KEY = 'pdf-editor-onboarding-done';

const stepCharacters = [
  <YuunamaHero key="hero" size={56} bounce />,
  <YuunamaGoblin key="goblin" size={56} bounce />,
  <YuunamaSlime key="slime" size={56} bounce />,
  <YuunamaSkeleton key="skeleton" size={56} bounce />,
  <YuunamaMushroomMan key="mushroom" size={56} bounce />,
  <YuunamaLilith key="lilith" size={56} bounce />,
];

const steps = [
  { title: 'みるモード', description: 'みるモードでPDFを閲覧。\nスワイプでページ移動\nピンチでズーム' },
  { title: '文字モード', description: 'テキスト入力 → PDFタップで配置\n文字サイズ・色・フォント選択可能' },
  { title: '描くモード', description: '描くでフリーハンド描画\nペンと消しゴム切替可能' },
  { title: 'スタンプ・署名', description: '承認印や署名をPDFに直接配置\n全ページ一括配置も可能' },
  { title: 'ページ管理', description: 'ページの回転・削除・\n並び替え・追加' },
  { title: '便利機能', description: 'Ctrl+Z: 元に戻す\nCtrl+S: 保存\n?: ショートカット一覧' },
];

export default function Onboarding() {
  const { state } = usePDF();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!state.pdfData) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const timer = window.setTimeout(() => {
          setExiting(false);
          setVisible(true);
          setStep(0);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [state.pdfData]);

  const finish = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
    }, 300);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'rgba(13,8,4,0.85)',
        backdropFilter: 'blur(4px)',
        animation: exiting ? 'onboarding-fade-out 0.3s ease forwards' : 'onboarding-fade-in 0.4s ease',
      }}
    >
      <div
        className="dq-window p-6 max-w-[340px] w-[90vw]"
        style={{
          animation: exiting ? 'onboarding-card-out 0.3s ease forwards' : 'onboarding-card-in 0.4s ease',
        }}
      >
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                background: i === step
                  ? 'var(--ynk-gold)'
                  : i < step
                    ? 'var(--ynk-moss-light)'
                    : 'var(--ynk-stone)',
                border: '2px solid var(--ynk-dirt)',
                transition: 'background 0.3s',
                imageRendering: 'pixelated',
              }}
            />
          ))}
        </div>

        {/* Character */}
        <div className="flex justify-center mb-3">
          {stepCharacters[step]}
        </div>

        {/* Title */}
        <h3
          className="dq-title text-xl text-center mb-2"
          style={{ letterSpacing: '0.15em' }}
        >
          {current.title}
        </h3>

        {/* Description */}
        <p
          className="dq-text text-sm text-center mb-6"
          style={{ whiteSpace: 'pre-line', lineHeight: 2 }}
        >
          {current.description}
        </p>

        {/* Slime */}
        <div className="flex justify-center mb-4">
          <DqSlime size={40} bounce={true} />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={finish}
            className="dq-btn-small flex-1"
            style={{
              background: 'linear-gradient(180deg, #4a4a4a 0%, #333 100%)',
              color: 'var(--ynk-bone)',
            }}
          >
            {'\u30B9\u30AD\u30C3\u30D7'}
          </button>
          <button
            onClick={handleNext}
            className="dq-btn flex-1"
            style={{ fontSize: 14, padding: '8px 16px', minHeight: 40 }}
          >
            {step < steps.length - 1 ? '\u6B21\u3078' : '\u59CB\u3081\u308B\uFF01'}
          </button>
        </div>

        {/* Step count */}
        <p
          className="dq-text text-xs text-center mt-3"
          style={{ color: 'var(--ynk-stone-light)', opacity: 0.7 }}
        >
          {step + 1} / {steps.length}
        </p>
      </div>

      <style jsx>{`
        @keyframes onboarding-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes onboarding-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes onboarding-card-in {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes onboarding-card-out {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.8) translateY(20px); }
        }
      `}</style>
    </div>
  );
}
