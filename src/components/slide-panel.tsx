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
        style={{ opacity: translateY === 0 ? 1 : 0.5, background: 'rgba(10, 8, 4, 0.8)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-h-[70vh] dq-window rounded-t-md rounded-b-none transition-transform duration-300 ease-out"
        style={{ transform: `translateY(${translateY}%)`, background: 'linear-gradient(180deg, #3b2a1a 0%, #2a1e12 50%, #1e1508 100%)', borderColor: '#5c4a2e' }}
      >
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="dq-drag-handle" style={{ width: 60, height: 6, borderRadius: 3, background: 'linear-gradient(90deg, transparent 0%, #5c4a2e 20%, #8b6914 50%, #5c4a2e 80%, transparent 100%)' }} />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between">
          <h3 className="dq-title text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="dq-close-btn"
            style={{ background: 'linear-gradient(180deg, #5c4a2e 0%, #3b2a1a 100%)', border: '2px solid #8b6914', borderRadius: '50%', color: '#c8a060', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
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
