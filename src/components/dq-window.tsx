"use client";

import React from "react";

interface DqWindowProps {
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function DqWindow({ title, children, onClose, className = "" }: DqWindowProps) {
  return (
    <div className={`dq-window p-4 ${className}`}>
      {/* 石レンガ風コーナー装飾 */}
      <StoneCorner position="top-left" />
      <StoneCorner position="top-right" />
      <StoneCorner position="bottom-left" />
      <StoneCorner position="bottom-right" />

      {/* ヘッダー: タイトル + 閉じるボタン */}
      {(title || onClose) && (
        <div className="flex items-center justify-between mb-3 relative z-10">
          {title && (
            <h2 className="dq-title text-lg">{title}</h2>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center"
              style={{
                background: "linear-gradient(180deg, #4a4a4a 0%, #333 100%)",
                border: "3px solid #6b6b6b",
                borderRadius: "4px",
                color: "#e8dcc8",
                fontFamily: "'DotGothic16', monospace",
                fontSize: "12px",
                padding: "4px 12px",
                minHeight: "32px",
                boxShadow: "0 2px 0 #222, inset 0 1px 0 rgba(107,107,107,0.3)",
                imageRendering: "pixelated" as const,
                cursor: "pointer",
              }}
              aria-label="閉じる"
            >
              <span style={{ letterSpacing: "0.1em" }}>x とじる</span>
            </button>
          )}
        </div>
      )}

      {/* コンテンツ */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* 石レンガ/岩のコーナー装飾SVG (ピクセル風) */
function StoneCorner({ position }: { position: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const positionStyles: React.CSSProperties = {
    position: "absolute",
    width: 18,
    height: 18,
    zIndex: 5,
    pointerEvents: "none",
  };

  switch (position) {
    case "top-left":
      positionStyles.top = -3;
      positionStyles.left = -3;
      break;
    case "top-right":
      positionStyles.top = -3;
      positionStyles.right = -3;
      break;
    case "bottom-left":
      positionStyles.bottom = -3;
      positionStyles.left = -3;
      break;
    case "bottom-right":
      positionStyles.bottom = -3;
      positionStyles.right = -3;
      break;
  }

  const rotate = {
    "top-left": "0",
    "top-right": "90",
    "bottom-left": "270",
    "bottom-right": "180",
  }[position];

  return (
    <svg
      style={{ ...positionStyles, imageRendering: "pixelated" } as React.CSSProperties}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={`rotate(${rotate} 9 9)`}>
        {/* 石レンガ風コーナー (ピクセルブロック) */}
        <rect x="0" y="0" width="6" height="6" fill="#6b6b6b" />
        <rect x="6" y="0" width="6" height="3" fill="#5c3d2e" />
        <rect x="0" y="6" width="3" height="6" fill="#5c3d2e" />
        {/* 岩のハイライト */}
        <rect x="0" y="0" width="3" height="3" fill="#7a7a7a" />
        {/* 暗い部分 */}
        <rect x="3" y="3" width="3" height="3" fill="#4a4a4a" />
      </g>
    </svg>
  );
}
