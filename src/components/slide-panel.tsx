'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** trueならオーバーレイをクリック透過にしてPDFとのインタラクションを許可 */
  allowInteraction?: boolean;
}

type PanelSize = 'minimized' | 'compact' | 'expanded';

export default function SlidePanel({ isOpen, onClose, title, children, allowInteraction = false }: SlidePanelProps) {
  const [visible, setVisible] = useState(false);
  const [translateY, setTranslateY] = useState(100);
  const [panelSize, setPanelSize] = useState<PanelSize>(allowInteraction ? 'compact' : 'expanded');
  const dragStartY = useRef(0);
  const currentY = useRef(0);

  // isOpen変化を前回値と比較して処理
  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setVisible(true); // eslint-disable-line react-hooks/set-state-in-effect -- slide animation requires visibility toggle
      setPanelSize(allowInteraction ? 'compact' : 'expanded');
      requestAnimationFrame(() => setTranslateY(0));
    } else if (!isOpen && prevOpenRef.current) {
      setTranslateY(100);
      const timer = setTimeout(() => setVisible(false), 300);
      prevOpenRef.current = isOpen;
      return () => clearTimeout(timer);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, allowInteraction]);

  // Escapeキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap for modal mode
  useEffect(() => {
    if (!isOpen || allowInteraction) return;
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    if (!dialog) return;

    const focusableEls = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableEls.length === 0) return;

    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];
    firstEl.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [isOpen, allowInteraction]);

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

  // ハンドルタップでサイズ切り替え
  const handleToggleSize = useCallback(() => {
    setPanelSize((prev) => {
      if (prev === 'minimized') return 'compact';
      if (prev === 'compact') return 'expanded';
      return 'compact';
    });
  }, []);

  const maxHeight = panelSize === 'minimized' ? '56px' : panelSize === 'compact' ? '40vh' : '70vh';
  const contentMaxHeight = panelSize === 'minimized' ? '0px' : panelSize === 'compact' ? '28vh' : '55vh';

  if (!visible) return null;

  return (
    <div
      className={allowInteraction ? "fixed left-0 right-0 z-[55] flex items-end" : "fixed inset-0 z-[55] flex items-end"}
      style={{ pointerEvents: allowInteraction ? 'none' : 'auto', bottom: allowInteraction ? '56px' : 0 }}
    >
      {!allowInteraction && (
        <div
          className="absolute inset-0 dq-overlay transition-opacity duration-300"
          style={{
            opacity: translateY === 0 ? 1 : 0.5,
            background: 'rgba(5, 4, 2, 0.85)',
          }}
          onClick={onClose}
        />
      )}
      <div
        role="dialog"
        aria-modal={!allowInteraction}
        aria-label={title}
        className="relative w-full dq-window rounded-t-md rounded-b-none dq-panel-smooth ynk-dungeon-wall"
        style={{
          maxHeight,
          transform: `translateY(${translateY}%)`,
          background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)',
          borderColor: '#5c4a2e',
          pointerEvents: 'auto',
          transition: 'max-height 0.25s ease',
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

        {/* ドラッグハンドル + サイズ切り替え */}
        <div
          className="flex justify-center items-center pt-3 pb-1 cursor-grab"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onClick={handleToggleSize}
        >
          <div className="flex flex-col items-center gap-0.5">
            <div
              style={{
                width: 60,
                height: 6,
                borderRadius: 3,
                background: 'linear-gradient(180deg, #8b8b8b 0%, #5a5a5a 40%, #3a3a3a 100%)',
                border: '1px solid #6b6b6b',
                boxShadow: '0 1px 0 #1a1a1a, inset 0 1px 0 rgba(180,180,180,0.3)',
              }}
            />
            {/* サイズインジケーター */}
            <span style={{ fontSize: 8, color: '#8b6914', lineHeight: 1 }}>
              {panelSize === 'minimized' ? '▲' : panelSize === 'compact' ? '▲▼' : '▼'}
            </span>
          </div>
        </div>

        <div className="px-3 pb-1 flex items-center justify-between">
          <h3 className="dq-title text-sm">{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 100%)',
              border: '2px solid #8b6914',
              borderRadius: '0',
              color: '#c8a060',
              width: 32,
              height: 32,
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
        <div
          className="px-3 overflow-y-auto"
          style={{
            maxHeight: contentMaxHeight,
            paddingBottom: panelSize === 'minimized' ? 0 : 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            transition: 'max-height 0.25s ease',
            overflow: panelSize === 'minimized' ? 'hidden' : 'auto',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
