'use client';

import { useEffect, useRef, useState } from 'react';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function SlidePanel({ isOpen, onClose, title, children }: SlidePanelProps) {
  const [visible, setVisible] = useState(false);
  const [translateY, setTranslateY] = useState(100);
  const dragStartY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => setTranslateY(0));
    } else {
      setTranslateY(100);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleDragMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY - dragStartY.current;
    if (currentY.current > 0) {
      setTranslateY((currentY.current / window.innerHeight) * 100);
    }
  };

  const handleDragEnd = () => {
    if (currentY.current > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
    currentY.current = 0;
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 dq-overlay transition-opacity duration-300"
        style={{ opacity: translateY === 0 ? 1 : 0.5, background: 'rgba(5, 4, 2, 0.85)' }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-h-[70vh] dq-window rounded-t-md rounded-b-none dq-panel-smooth ynk-dungeon-wall"
        style={{
          transform: `translateY(${translateY}%)`,
          background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)',
          borderColor: '#5c4a2e',
        }}
      >
        {/* 石のアーチ装飾 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            background: `
              repeating-linear-gradient(90deg,
                #4a4a4a 0px, #4a4a4a 18px,
                #3a3a3a 18px, #3a3a3a 20px,
                #5a5a5a 20px, #5a5a5a 36px,
                #3a3a3a 36px, #3a3a3a 38px
              )
            `,
            borderBottom: '2px solid #2a2a2a',
            borderRadius: '4px 4px 0 0',
            pointerEvents: 'none',
            boxShadow: 'inset 0 1px 0 rgba(107,107,107,0.3), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        />

        {/* 鉄の取っ手風ドラッグハンドル */}
        <div
          className="flex justify-center pt-4 pb-2 cursor-grab"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div
            style={{
              width: 60,
              height: 8,
              borderRadius: 0,
              background: 'linear-gradient(180deg, #8b8b8b 0%, #5a5a5a 40%, #3a3a3a 100%)',
              border: '1px solid #6b6b6b',
              boxShadow: '0 2px 0 #1a1a1a, inset 0 1px 0 rgba(180,180,180,0.3), 0 -1px 0 #2a2a2a',
              /* リベット風の点 */
              backgroundImage: 'radial-gradient(circle at 8px 4px, rgba(180,180,180,0.4) 1.5px, transparent 1.5px), radial-gradient(circle at 52px 4px, rgba(180,180,180,0.4) 1.5px, transparent 1.5px)',
            }}
          />
        </div>

        <div className="px-4 pb-2 flex items-center justify-between">
          <h3 className="dq-title text-lg">{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 100%)',
              border: '2px solid #8b6914',
              borderRadius: '0',
              color: '#c8a060',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              boxShadow: '2px 0 0 0 #2a1c12, 0 2px 0 0 #2a1c12, 2px 2px 0 0 #2a1c12, -1px 0 0 0 #7a5540, 0 -1px 0 0 #7a5540',
              cursor: 'pointer',
            }}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        <div className="px-4 pb-6 overflow-y-auto max-h-[55vh]" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
