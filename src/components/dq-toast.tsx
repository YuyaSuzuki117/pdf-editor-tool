"use client";

import React, { useEffect, useState, useCallback } from "react";

type ToastType = "success" | "info" | "error" | "levelup";

interface DqToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const toastConfig: Record<ToastType, { icon: string; sound: string; borderColor: string }> = {
  success: {
    icon: "\u2692",
    sound: "\u266A ...を てにいれた!",
    borderColor: "var(--ynk-moss-light, #5a8a3c)",
  },
  info: {
    icon: "\u26CF",
    sound: "\u266A ダンジョンの おくから おとが...",
    borderColor: "var(--window-border, #7a5540)",
  },
  error: {
    icon: "\u2620",
    sound: "\u266A ゆうしゃに やられた!",
    borderColor: "var(--ynk-magma, #cc4422)",
  },
  levelup: {
    icon: "\u2B06",
    sound: "\u266A\u266A\u266A はかいしんの ちからが あがった!",
    borderColor: "var(--ynk-gold, #d4a017)",
  },
};

export function DqToast({ message, type = "info", duration = 3000, onClose }: DqToastProps) {
  const [visible, setVisible] = useState(true);
  const config = toastConfig[type];

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose?.(), 300);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(handleClose, duration);
    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  if (!visible) return null;

  return (
    <div className="dq-toast">
      <div
        className="flex items-center gap-3 min-w-[280px]"
        style={{
          background: "linear-gradient(180deg, #3d2a1e 0%, #2a1c12 100%)",
          border: `3px solid ${config.borderColor}`,
          outline: "3px solid #2a1c12",
          borderRadius: "4px",
          padding: "12px 20px",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(122,85,64,0.3), inset 0 -2px 0 rgba(0,0,0,0.3)",
          imageRendering: "pixelated" as const,
        }}
      >
        {/* アイコン (ピクセル風) */}
        <span
          className={`text-2xl ${type === "levelup" ? "dq-levelup" : ""}`}
          style={{
            fontFamily: "var(--font-dot-gothic), var(--font-noto-sans-jp), monospace",
            textShadow: "2px 2px 0 rgba(0,0,0,0.8)",
            color:
              type === "success"
                ? "#5a8a3c"
                : type === "error"
                  ? "#cc4422"
                  : type === "levelup"
                    ? "#d4a017"
                    : "#7a5540",
          }}
          role="img"
          aria-hidden
        >
          {config.icon}
        </span>

        {/* メッセージ */}
        <div className="flex-1">
          <p className="dq-text text-sm font-bold">{message}</p>
          <p className="dq-text text-xs opacity-60 mt-0.5">{config.sound}</p>
        </div>

        {/* 閉じるボタン (岩風) */}
        <button
          onClick={handleClose}
          style={{
            color: "#e8dcc8",
            fontFamily: "var(--font-dot-gothic), var(--font-noto-sans-jp), monospace",
            fontSize: "12px",
            opacity: 0.6,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 4px",
          }}
          aria-label="閉じる"
        >
          x
        </button>
      </div>
    </div>
  );
}

/* ===== トースト管理フック ===== */
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastIdCounter = 0;

export function useDqToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(() => {
    return (
      <>
        {toasts.map((toast, index) => (
          <div key={toast.id} style={{ top: `${20 + index * 70}px`, position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 100 + index }}>
            <DqToast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </>
    );
  }, [toasts, removeToast]);

  return { showToast, ToastContainer };
}
