"use client";

import React from "react";

interface DqSlimeProps {
  size?: number;
  bounce?: boolean;
  children?: React.ReactNode;
}

export function DqSlime({ size = 64, bounce = true, children }: DqSlimeProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className={bounce ? "dq-bounce" : ""}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ imageRendering: "pixelated" }}
        >
          {/* ダンジョンスライム本体 (苔色ベース、ピクセル風) */}
          {/* 頭頂部 */}
          <rect x="12" y="4" width="8" height="2" fill="#4a7a3a" />
          <rect x="10" y="6" width="12" height="2" fill="#3a5a2c" />
          <rect x="8" y="8" width="16" height="2" fill="#3a5a2c" />
          {/* 上半身 */}
          <rect x="6" y="10" width="20" height="2" fill="#3a5a2c" />
          <rect x="6" y="12" width="20" height="2" fill="#3a5a2c" />
          {/* 目の列 */}
          <rect x="6" y="14" width="4" height="2" fill="#3a5a2c" />
          <rect x="10" y="14" width="2" height="2" fill="#e8dcc8" />
          <rect x="12" y="14" width="2" height="2" fill="#1a1008" />
          <rect x="14" y="14" width="4" height="2" fill="#3a5a2c" />
          <rect x="18" y="14" width="2" height="2" fill="#e8dcc8" />
          <rect x="20" y="14" width="2" height="2" fill="#1a1008" />
          <rect x="22" y="14" width="4" height="2" fill="#3a5a2c" />
          {/* 口の列 */}
          <rect x="6" y="16" width="6" height="2" fill="#3a5a2c" />
          <rect x="12" y="16" width="2" height="2" fill="#2a3a1c" />
          <rect x="14" y="16" width="4" height="2" fill="#1a1008" />
          <rect x="18" y="16" width="2" height="2" fill="#2a3a1c" />
          <rect x="20" y="16" width="6" height="2" fill="#3a5a2c" />
          {/* 下半身 */}
          <rect x="6" y="18" width="20" height="2" fill="#2d4a20" />
          <rect x="6" y="20" width="20" height="2" fill="#2d4a20" />
          {/* 土/岩模様 */}
          <rect x="8" y="20" width="2" height="2" fill="#5c3d2e" />
          <rect x="18" y="18" width="2" height="2" fill="#5c3d2e" />
          <rect x="12" y="20" width="2" height="2" fill="#4a4a4a" />
          {/* 足元 */}
          <rect x="8" y="22" width="16" height="2" fill="#2d4a20" />
          <rect x="10" y="24" width="4" height="2" fill="#2d4a20" />
          <rect x="18" y="24" width="4" height="2" fill="#2d4a20" />
          {/* ハイライト (苔の光沢) */}
          <rect x="10" y="8" width="2" height="2" fill="#5a8a3c" opacity="0.7" />
          <rect x="12" y="6" width="2" height="2" fill="#5a8a3c" opacity="0.5" />
          {/* 影 */}
          <rect x="8" y="26" width="16" height="2" fill="#1a1008" opacity="0.3" />
        </svg>
      </div>

      {/* 吹き出し: ダンジョン石板風 */}
      {children && (
        <div
          className="px-4 py-2 max-w-[240px] relative"
          style={{
            background: "linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)",
            border: "3px solid #6b6b6b",
            borderRadius: "4px",
            boxShadow:
              "inset 0 1px 0 rgba(107,107,107,0.4), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {/* 石板のひび模様 */}
          <div
            style={{
              position: "absolute",
              inset: "3px",
              border: "1px solid rgba(107,107,107,0.2)",
              borderRadius: "2px",
              pointerEvents: "none",
            }}
          />
          <div className="dq-text text-sm text-center relative z-10">{children}</div>
          {/* 吹き出し三角 (石風) */}
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: "8px solid #6b6b6b",
            }}
          />
        </div>
      )}
    </div>
  );
}
