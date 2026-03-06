"use client";

import React from "react";

interface CharacterProps {
  size?: number;
  bounce?: boolean;
}

// ============================================================
// 勇者 (Hero) - Golden hair, blue outfit, sword & shield
// ============================================================
export function YuunamaHero({ size = 64, bounce = true }: CharacterProps) {
  return (
    <div className={bounce ? "dq-bounce" : ""}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Sword (right hand, sticking up) */}
        <rect x="24" y="2" width="2" height="2" fill="#e0e0e0" />
        <rect x="24" y="4" width="2" height="2" fill="#c0c0c0" />
        <rect x="24" y="6" width="2" height="2" fill="#c0c0c0" />
        <rect x="22" y="8" width="2" height="2" fill="#d4a017" />
        <rect x="24" y="8" width="2" height="2" fill="#d4a017" />
        <rect x="26" y="8" width="2" height="2" fill="#d4a017" />
        {/* Sword glow */}
        <rect x="24" y="2" width="2" height="2" fill="#ffffff" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
        </rect>

        {/* Hair (golden) */}
        <rect x="10" y="2" width="2" height="2" fill="#e8b830" />
        <rect x="12" y="2" width="2" height="2" fill="#d4a017" />
        <rect x="14" y="2" width="2" height="2" fill="#e8b830" />
        <rect x="16" y="2" width="2" height="2" fill="#d4a017" />
        <rect x="8" y="4" width="2" height="2" fill="#d4a017" />
        <rect x="10" y="4" width="2" height="2" fill="#e8b830" />
        <rect x="12" y="4" width="2" height="2" fill="#f0c840" />
        <rect x="14" y="4" width="2" height="2" fill="#f0c840" />
        <rect x="16" y="4" width="2" height="2" fill="#e8b830" />
        <rect x="18" y="4" width="2" height="2" fill="#d4a017" />

        {/* Face (skin) */}
        <rect x="8" y="6" width="2" height="2" fill="#d4a017" />
        <rect x="10" y="6" width="2" height="2" fill="#f0c8a0" />
        <rect x="12" y="6" width="2" height="2" fill="#f0c8a0" />
        <rect x="14" y="6" width="2" height="2" fill="#f0c8a0" />
        <rect x="16" y="6" width="2" height="2" fill="#f0c8a0" />
        <rect x="18" y="6" width="2" height="2" fill="#d4a017" />

        {/* Eyes */}
        <rect x="8" y="8" width="2" height="2" fill="#f0c8a0" />
        <rect x="10" y="8" width="2" height="2" fill="#1a1a2e" />
        <rect x="12" y="8" width="2" height="2" fill="#f0c8a0" />
        <rect x="14" y="8" width="2" height="2" fill="#f0c8a0" />
        <rect x="16" y="8" width="2" height="2" fill="#1a1a2e" />
        <rect x="18" y="8" width="2" height="2" fill="#f0c8a0" />
        {/* Eye glint */}
        <rect x="10" y="8" width="1" height="1" fill="#ffffff" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="16" y="8" width="1" height="1" fill="#ffffff" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
        </rect>

        {/* Mouth */}
        <rect x="8" y="10" width="2" height="2" fill="#f0c8a0" />
        <rect x="10" y="10" width="2" height="2" fill="#f0c8a0" />
        <rect x="12" y="10" width="2" height="2" fill="#c07060" />
        <rect x="14" y="10" width="2" height="2" fill="#c07060" />
        <rect x="16" y="10" width="2" height="2" fill="#f0c8a0" />
        <rect x="18" y="10" width="2" height="2" fill="#f0c8a0" />

        {/* Blue tunic - upper */}
        <rect x="8" y="12" width="2" height="2" fill="#2060b0" />
        <rect x="10" y="12" width="2" height="2" fill="#2878d0" />
        <rect x="12" y="12" width="2" height="2" fill="#3090e0" />
        <rect x="14" y="12" width="2" height="2" fill="#3090e0" />
        <rect x="16" y="12" width="2" height="2" fill="#2878d0" />
        <rect x="18" y="12" width="2" height="2" fill="#2060b0" />

        {/* Belt */}
        <rect x="8" y="14" width="2" height="2" fill="#2060b0" />
        <rect x="10" y="14" width="2" height="2" fill="#8b6914" />
        <rect x="12" y="14" width="2" height="2" fill="#d4a017" />
        <rect x="14" y="14" width="2" height="2" fill="#d4a017" />
        <rect x="16" y="14" width="2" height="2" fill="#8b6914" />
        <rect x="18" y="14" width="2" height="2" fill="#2060b0" />

        {/* Shield (left arm) */}
        <rect x="4" y="12" width="2" height="2" fill="#6b6b6b" />
        <rect x="4" y="14" width="2" height="2" fill="#8090a0" />
        <rect x="6" y="12" width="2" height="2" fill="#8090a0" />
        <rect x="6" y="14" width="2" height="2" fill="#a0b0c0" />
        <rect x="4" y="16" width="2" height="2" fill="#6b6b6b" />
        <rect x="6" y="16" width="2" height="2" fill="#8090a0" />
        {/* Shield emblem glow */}
        <rect x="4" y="14" width="2" height="2" fill="#60c0ff" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
        </rect>

        {/* Sword arm (right) */}
        <rect x="20" y="12" width="2" height="2" fill="#f0c8a0" />
        <rect x="22" y="12" width="2" height="2" fill="#f0c8a0" />
        <rect x="24" y="10" width="2" height="2" fill="#8b6914" />

        {/* Blue tunic - lower */}
        <rect x="8" y="16" width="2" height="2" fill="#1a4a8a" />
        <rect x="10" y="16" width="2" height="2" fill="#2060b0" />
        <rect x="12" y="16" width="2" height="2" fill="#2060b0" />
        <rect x="14" y="16" width="2" height="2" fill="#2060b0" />
        <rect x="16" y="16" width="2" height="2" fill="#2060b0" />
        <rect x="18" y="16" width="2" height="2" fill="#1a4a8a" />

        {/* Legs */}
        <rect x="8" y="18" width="2" height="2" fill="#1a4a8a" />
        <rect x="10" y="18" width="2" height="2" fill="#2060b0" />
        <rect x="12" y="18" width="2" height="2" fill="#1a3a6a" />
        <rect x="14" y="18" width="2" height="2" fill="#1a3a6a" />
        <rect x="16" y="18" width="2" height="2" fill="#2060b0" />
        <rect x="18" y="18" width="2" height="2" fill="#1a4a8a" />

        {/* Boots */}
        <rect x="8" y="20" width="2" height="2" fill="#5c3d2e" />
        <rect x="10" y="20" width="2" height="2" fill="#7a5038" />
        <rect x="12" y="20" width="2" height="2" fill="#3a2a1a" />
        <rect x="14" y="20" width="2" height="2" fill="#3a2a1a" />
        <rect x="16" y="20" width="2" height="2" fill="#7a5038" />
        <rect x="18" y="20" width="2" height="2" fill="#5c3d2e" />

        {/* Feet */}
        <rect x="6" y="22" width="2" height="2" fill="#5c3d2e" />
        <rect x="8" y="22" width="2" height="2" fill="#7a5038" />
        <rect x="10" y="22" width="2" height="2" fill="#7a5038" />
        <rect x="16" y="22" width="2" height="2" fill="#7a5038" />
        <rect x="18" y="22" width="2" height="2" fill="#7a5038" />
        <rect x="20" y="22" width="2" height="2" fill="#5c3d2e" />

        {/* Shadow */}
        <rect x="6" y="24" width="18" height="2" fill="#0d0804" opacity="0.3" />
      </svg>
    </div>
  );
}

// ============================================================
// リリス / 魔王 (Lilith / Dark Lord) - Purple/dark, horns, crown
// ============================================================
export function YuunamaLilith({ size = 64, bounce = true }: CharacterProps) {
  return (
    <div className={bounce ? "dq-bounce" : ""}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Horns */}
        <rect x="6" y="0" width="2" height="2" fill="#4a1040" />
        <rect x="8" y="2" width="2" height="2" fill="#6a1860" />
        <rect x="20" y="0" width="2" height="2" fill="#4a1040" />
        <rect x="18" y="2" width="2" height="2" fill="#6a1860" />
        {/* Horn glow */}
        <rect x="6" y="0" width="2" height="2" fill="#ff44ff" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur="3s" repeatCount="indefinite" />
        </rect>
        <rect x="20" y="0" width="2" height="2" fill="#ff44ff" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur="3s" repeatCount="indefinite" />
        </rect>

        {/* Crown */}
        <rect x="10" y="2" width="2" height="2" fill="#d4a017" />
        <rect x="12" y="2" width="2" height="2" fill="#e8b830" />
        <rect x="14" y="2" width="2" height="2" fill="#d4a017" />
        <rect x="16" y="2" width="2" height="2" fill="#e8b830" />
        <rect x="10" y="4" width="2" height="2" fill="#e8b830" />
        <rect x="12" y="4" width="2" height="2" fill="#f0c840" />
        <rect x="14" y="4" width="2" height="2" fill="#f0c840" />
        <rect x="16" y="4" width="2" height="2" fill="#e8b830" />
        {/* Crown jewel */}
        <rect x="12" y="2" width="2" height="2" fill="#ff2020" opacity="0.8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </rect>

        {/* Hair (dark purple) */}
        <rect x="8" y="4" width="2" height="2" fill="#3a0a40" />
        <rect x="18" y="4" width="2" height="2" fill="#3a0a40" />
        <rect x="8" y="6" width="2" height="2" fill="#3a0a40" />
        <rect x="18" y="6" width="2" height="2" fill="#3a0a40" />

        {/* Face (pale skin) */}
        <rect x="10" y="6" width="2" height="2" fill="#e0d0e0" />
        <rect x="12" y="6" width="2" height="2" fill="#e8d8e8" />
        <rect x="14" y="6" width="2" height="2" fill="#e8d8e8" />
        <rect x="16" y="6" width="2" height="2" fill="#e0d0e0" />

        {/* Eyes (glowing red) */}
        <rect x="8" y="8" width="2" height="2" fill="#e0d0e0" />
        <rect x="10" y="8" width="2" height="2" fill="#cc0000" />
        <rect x="12" y="8" width="2" height="2" fill="#e0d0e0" />
        <rect x="14" y="8" width="2" height="2" fill="#e0d0e0" />
        <rect x="16" y="8" width="2" height="2" fill="#cc0000" />
        <rect x="18" y="8" width="2" height="2" fill="#e0d0e0" />
        {/* Eye glow */}
        <rect x="10" y="8" width="2" height="2" fill="#ff3333" opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite" />
        </rect>
        <rect x="16" y="8" width="2" height="2" fill="#ff3333" opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite" />
        </rect>

        {/* Smirk */}
        <rect x="10" y="10" width="2" height="2" fill="#e0d0e0" />
        <rect x="12" y="10" width="2" height="2" fill="#8a3050" />
        <rect x="14" y="10" width="2" height="2" fill="#8a3050" />
        <rect x="16" y="10" width="2" height="2" fill="#e0d0e0" />

        {/* Cape / Cloak top */}
        <rect x="4" y="10" width="2" height="2" fill="#2a0830" />
        <rect x="6" y="10" width="2" height="2" fill="#3a1040" />
        <rect x="20" y="10" width="2" height="2" fill="#3a1040" />
        <rect x="22" y="10" width="2" height="2" fill="#2a0830" />

        {/* Robe upper */}
        <rect x="4" y="12" width="2" height="2" fill="#2a0830" />
        <rect x="6" y="12" width="2" height="2" fill="#4a1860" />
        <rect x="8" y="12" width="2" height="2" fill="#5a2070" />
        <rect x="10" y="12" width="2" height="2" fill="#6a2880" />
        <rect x="12" y="12" width="2" height="2" fill="#7a3090" />
        <rect x="14" y="12" width="2" height="2" fill="#7a3090" />
        <rect x="16" y="12" width="2" height="2" fill="#6a2880" />
        <rect x="18" y="12" width="2" height="2" fill="#5a2070" />
        <rect x="20" y="12" width="2" height="2" fill="#4a1860" />
        <rect x="22" y="12" width="2" height="2" fill="#2a0830" />

        {/* Robe middle with dark emblem */}
        <rect x="4" y="14" width="2" height="2" fill="#2a0830" />
        <rect x="6" y="14" width="2" height="2" fill="#4a1860" />
        <rect x="8" y="14" width="2" height="2" fill="#5a2070" />
        <rect x="10" y="14" width="2" height="2" fill="#6a2880" />
        <rect x="12" y="14" width="2" height="2" fill="#d4a017" />
        <rect x="14" y="14" width="2" height="2" fill="#d4a017" />
        <rect x="16" y="14" width="2" height="2" fill="#6a2880" />
        <rect x="18" y="14" width="2" height="2" fill="#5a2070" />
        <rect x="20" y="14" width="2" height="2" fill="#4a1860" />
        <rect x="22" y="14" width="2" height="2" fill="#2a0830" />

        {/* Robe lower */}
        <rect x="4" y="16" width="2" height="2" fill="#1a0420" />
        <rect x="6" y="16" width="2" height="2" fill="#3a1040" />
        <rect x="8" y="16" width="2" height="2" fill="#4a1860" />
        <rect x="10" y="16" width="2" height="2" fill="#5a2070" />
        <rect x="12" y="16" width="2" height="2" fill="#5a2070" />
        <rect x="14" y="16" width="2" height="2" fill="#5a2070" />
        <rect x="16" y="16" width="2" height="2" fill="#5a2070" />
        <rect x="18" y="16" width="2" height="2" fill="#4a1860" />
        <rect x="20" y="16" width="2" height="2" fill="#3a1040" />
        <rect x="22" y="16" width="2" height="2" fill="#1a0420" />

        {/* Robe hem */}
        <rect x="4" y="18" width="2" height="2" fill="#1a0420" />
        <rect x="6" y="18" width="2" height="2" fill="#2a0830" />
        <rect x="8" y="18" width="2" height="2" fill="#3a1040" />
        <rect x="10" y="18" width="2" height="2" fill="#4a1860" />
        <rect x="12" y="18" width="2" height="2" fill="#4a1860" />
        <rect x="14" y="18" width="2" height="2" fill="#4a1860" />
        <rect x="16" y="18" width="2" height="2" fill="#4a1860" />
        <rect x="18" y="18" width="2" height="2" fill="#3a1040" />
        <rect x="20" y="18" width="2" height="2" fill="#2a0830" />
        <rect x="22" y="18" width="2" height="2" fill="#1a0420" />

        {/* Dark aura effect */}
        <rect x="2" y="14" width="2" height="2" fill="#8000ff" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <rect x="24" y="14" width="2" height="2" fill="#8000ff" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2.5s" repeatCount="indefinite" />
        </rect>

        {/* Feet */}
        <rect x="8" y="20" width="2" height="2" fill="#2a0830" />
        <rect x="10" y="20" width="2" height="2" fill="#3a1040" />
        <rect x="16" y="20" width="2" height="2" fill="#3a1040" />
        <rect x="18" y="20" width="2" height="2" fill="#2a0830" />

        {/* Shadow */}
        <rect x="4" y="22" width="20" height="2" fill="#0d0804" opacity="0.4" />
      </svg>
    </div>
  );
}

// ============================================================
// ドラゴン (Dragon) - Red/orange, wings, fire breath
// ============================================================
export function YuunamaDragon({ size = 64, bounce = true }: CharacterProps) {
  return (
    <div className={bounce ? "dq-bounce" : ""}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Horns */}
        <rect x="10" y="2" width="2" height="2" fill="#c04020" />
        <rect x="18" y="2" width="2" height="2" fill="#c04020" />
        <rect x="12" y="4" width="2" height="2" fill="#b03818" />
        <rect x="16" y="4" width="2" height="2" fill="#b03818" />

        {/* Head */}
        <rect x="10" y="4" width="2" height="2" fill="#d05030" />
        <rect x="12" y="6" width="2" height="2" fill="#e06038" />
        <rect x="14" y="6" width="2" height="2" fill="#e06038" />
        <rect x="16" y="6" width="2" height="2" fill="#e06038" />
        <rect x="18" y="4" width="2" height="2" fill="#d05030" />
        <rect x="10" y="6" width="2" height="2" fill="#d05030" />
        <rect x="18" y="6" width="2" height="2" fill="#d05030" />

        {/* Eyes (yellow, fierce) */}
        <rect x="10" y="8" width="2" height="2" fill="#d05030" />
        <rect x="12" y="8" width="2" height="2" fill="#ffdd00" />
        <rect x="14" y="8" width="2" height="2" fill="#d05030" />
        <rect x="16" y="8" width="2" height="2" fill="#ffdd00" />
        <rect x="18" y="8" width="2" height="2" fill="#d05030" />
        {/* Eye glow */}
        <rect x="12" y="8" width="2" height="2" fill="#ffff44" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <rect x="16" y="8" width="2" height="2" fill="#ffff44" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
        </rect>

        {/* Mouth / snout with teeth */}
        <rect x="8" y="10" width="2" height="2" fill="#d05030" />
        <rect x="10" y="10" width="2" height="2" fill="#e06038" />
        <rect x="12" y="10" width="2" height="1" fill="#e8dcc8" />
        <rect x="12" y="11" width="2" height="1" fill="#400808" />
        <rect x="14" y="10" width="2" height="1" fill="#400808" />
        <rect x="14" y="11" width="2" height="1" fill="#e8dcc8" />
        <rect x="16" y="10" width="2" height="1" fill="#e8dcc8" />
        <rect x="16" y="11" width="2" height="1" fill="#400808" />
        <rect x="18" y="10" width="2" height="2" fill="#e06038" />
        <rect x="20" y="10" width="2" height="2" fill="#d05030" />

        {/* Fire breath (right side) */}
        <rect x="22" y="8" width="2" height="2" fill="#ff6600" opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="0.8s" repeatCount="indefinite" />
        </rect>
        <rect x="24" y="8" width="2" height="2" fill="#ffaa00" opacity="0.6">
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.6s" repeatCount="indefinite" />
        </rect>
        <rect x="24" y="10" width="2" height="2" fill="#ff4400" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="0.7s" repeatCount="indefinite" />
        </rect>
        <rect x="26" y="6" width="2" height="2" fill="#ffcc00" opacity="0.4">
          <animate attributeName="opacity" values="0.1;0.6;0.1" dur="0.5s" repeatCount="indefinite" />
        </rect>

        {/* Wings (left) */}
        <rect x="2" y="8" width="2" height="2" fill="#b03818" />
        <rect x="4" y="6" width="2" height="2" fill="#c04020" />
        <rect x="4" y="8" width="2" height="2" fill="#d05030" />
        <rect x="6" y="8" width="2" height="2" fill="#c04020" />
        <rect x="2" y="10" width="2" height="2" fill="#a03010" />
        <rect x="4" y="10" width="2" height="2" fill="#c04020" />
        <rect x="6" y="10" width="2" height="2" fill="#b03818" />
        {/* Wing membrane */}
        <rect x="2" y="12" width="2" height="2" fill="#d06040" opacity="0.6" />
        <rect x="4" y="12" width="2" height="2" fill="#c05535" opacity="0.5" />

        {/* Body */}
        <rect x="8" y="12" width="2" height="2" fill="#c04020" />
        <rect x="10" y="12" width="2" height="2" fill="#d05030" />
        <rect x="12" y="12" width="2" height="2" fill="#e06038" />
        <rect x="14" y="12" width="2" height="2" fill="#e06038" />
        <rect x="16" y="12" width="2" height="2" fill="#d05030" />
        <rect x="18" y="12" width="2" height="2" fill="#c04020" />

        {/* Belly (lighter) */}
        <rect x="8" y="14" width="2" height="2" fill="#c04020" />
        <rect x="10" y="14" width="2" height="2" fill="#e0a060" />
        <rect x="12" y="14" width="2" height="2" fill="#e8b070" />
        <rect x="14" y="14" width="2" height="2" fill="#e8b070" />
        <rect x="16" y="14" width="2" height="2" fill="#e0a060" />
        <rect x="18" y="14" width="2" height="2" fill="#c04020" />

        {/* Lower body */}
        <rect x="8" y="16" width="2" height="2" fill="#b03818" />
        <rect x="10" y="16" width="2" height="2" fill="#d05030" />
        <rect x="12" y="16" width="2" height="2" fill="#d05030" />
        <rect x="14" y="16" width="2" height="2" fill="#d05030" />
        <rect x="16" y="16" width="2" height="2" fill="#d05030" />
        <rect x="18" y="16" width="2" height="2" fill="#b03818" />

        {/* Legs */}
        <rect x="8" y="18" width="2" height="2" fill="#a03010" />
        <rect x="10" y="18" width="2" height="2" fill="#b03818" />
        <rect x="16" y="18" width="2" height="2" fill="#b03818" />
        <rect x="18" y="18" width="2" height="2" fill="#a03010" />

        {/* Claws */}
        <rect x="6" y="20" width="2" height="2" fill="#e8dcc8" />
        <rect x="8" y="20" width="2" height="2" fill="#a03010" />
        <rect x="10" y="20" width="2" height="2" fill="#e8dcc8" />
        <rect x="16" y="20" width="2" height="2" fill="#e8dcc8" />
        <rect x="18" y="20" width="2" height="2" fill="#a03010" />
        <rect x="20" y="20" width="2" height="2" fill="#e8dcc8" />

        {/* Tail */}
        <rect x="20" y="16" width="2" height="2" fill="#b03818" />
        <rect x="22" y="16" width="2" height="2" fill="#a03010" />
        <rect x="24" y="18" width="2" height="2" fill="#a03010" />
        <rect x="26" y="18" width="2" height="2" fill="#c04020" />
        {/* Tail tip */}
        <rect x="26" y="18" width="2" height="2" fill="#ff6600" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite" />
        </rect>

        {/* Shadow */}
        <rect x="6" y="22" width="18" height="2" fill="#0d0804" opacity="0.3" />
      </svg>
    </div>
  );
}

// ============================================================
// ゴブリン (Goblin) - Green/brown, primitive
// ============================================================
export function YuunamaGoblin({ size = 64, bounce = true }: CharacterProps) {
  return (
    <div className={bounce ? "dq-bounce" : ""}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Ears (pointy) */}
        <rect x="4" y="6" width="2" height="2" fill="#4a8030" />
        <rect x="6" y="4" width="2" height="2" fill="#5a9038" />
        <rect x="22" y="4" width="2" height="2" fill="#5a9038" />
        <rect x="24" y="6" width="2" height="2" fill="#4a8030" />

        {/* Head top */}
        <rect x="10" y="2" width="2" height="2" fill="#5a9038" />
        <rect x="12" y="2" width="2" height="2" fill="#6aa040" />
        <rect x="14" y="2" width="2" height="2" fill="#6aa040" />
        <rect x="16" y="2" width="2" height="2" fill="#5a9038" />

        {/* Head */}
        <rect x="8" y="4" width="2" height="2" fill="#4a8030" />
        <rect x="10" y="4" width="2" height="2" fill="#6aa040" />
        <rect x="12" y="4" width="2" height="2" fill="#78b048" />
        <rect x="14" y="4" width="2" height="2" fill="#78b048" />
        <rect x="16" y="4" width="2" height="2" fill="#6aa040" />
        <rect x="18" y="4" width="2" height="2" fill="#4a8030" />

        {/* Face row with ears */}
        <rect x="6" y="6" width="2" height="2" fill="#5a9038" />
        <rect x="8" y="6" width="2" height="2" fill="#6aa040" />
        <rect x="10" y="6" width="2" height="2" fill="#78b048" />
        <rect x="12" y="6" width="2" height="2" fill="#78b048" />
        <rect x="14" y="6" width="2" height="2" fill="#78b048" />
        <rect x="16" y="6" width="2" height="2" fill="#78b048" />
        <rect x="18" y="6" width="2" height="2" fill="#6aa040" />
        <rect x="20" y="6" width="2" height="2" fill="#5a9038" />

        {/* Eyes (beady, yellow) */}
        <rect x="8" y="8" width="2" height="2" fill="#6aa040" />
        <rect x="10" y="8" width="2" height="2" fill="#eecc00" />
        <rect x="12" y="8" width="2" height="2" fill="#78b048" />
        <rect x="14" y="8" width="2" height="2" fill="#78b048" />
        <rect x="16" y="8" width="2" height="2" fill="#eecc00" />
        <rect x="18" y="8" width="2" height="2" fill="#6aa040" />
        {/* Pupils */}
        <rect x="11" y="9" width="1" height="1" fill="#1a1a1a" />
        <rect x="17" y="9" width="1" height="1" fill="#1a1a1a" />
        {/* Eye glow */}
        <rect x="10" y="8" width="2" height="2" fill="#ffee44" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="16" y="8" width="2" height="2" fill="#ffee44" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />
        </rect>

        {/* Nose */}
        <rect x="12" y="10" width="2" height="2" fill="#5a9038" />
        <rect x="14" y="10" width="2" height="2" fill="#5a9038" />

        {/* Mouth (big grin with fangs) */}
        <rect x="8" y="12" width="2" height="2" fill="#5a9038" />
        <rect x="10" y="12" width="2" height="1" fill="#e8dcc8" />
        <rect x="10" y="13" width="2" height="1" fill="#401010" />
        <rect x="12" y="12" width="2" height="2" fill="#401010" />
        <rect x="14" y="12" width="2" height="2" fill="#401010" />
        <rect x="16" y="12" width="2" height="1" fill="#e8dcc8" />
        <rect x="16" y="13" width="2" height="1" fill="#401010" />
        <rect x="18" y="12" width="2" height="2" fill="#5a9038" />

        {/* Club weapon (held up right) */}
        <rect x="22" y="4" width="2" height="2" fill="#6b4a2a" />
        <rect x="22" y="6" width="2" height="2" fill="#5c3d2e" />
        <rect x="22" y="8" width="2" height="2" fill="#5c3d2e" />
        <rect x="24" y="4" width="2" height="2" fill="#7a5a3a" />
        <rect x="24" y="6" width="2" height="2" fill="#6b4a2a" />
        <rect x="22" y="10" width="2" height="2" fill="#4a3020" />

        {/* Body (ragged tunic, brown) */}
        <rect x="8" y="14" width="2" height="2" fill="#6b4a2a" />
        <rect x="10" y="14" width="2" height="2" fill="#7a5a3a" />
        <rect x="12" y="14" width="2" height="2" fill="#8a6a4a" />
        <rect x="14" y="14" width="2" height="2" fill="#8a6a4a" />
        <rect x="16" y="14" width="2" height="2" fill="#7a5a3a" />
        <rect x="18" y="14" width="2" height="2" fill="#6b4a2a" />

        {/* Arms */}
        <rect x="6" y="14" width="2" height="2" fill="#5a9038" />
        <rect x="6" y="16" width="2" height="2" fill="#4a8030" />
        <rect x="20" y="12" width="2" height="2" fill="#5a9038" />
        <rect x="20" y="14" width="2" height="2" fill="#4a8030" />

        {/* Belly / lower tunic */}
        <rect x="8" y="16" width="2" height="2" fill="#5c3d2e" />
        <rect x="10" y="16" width="2" height="2" fill="#7a5a3a" />
        <rect x="12" y="16" width="2" height="2" fill="#7a5a3a" />
        <rect x="14" y="16" width="2" height="2" fill="#7a5a3a" />
        <rect x="16" y="16" width="2" height="2" fill="#7a5a3a" />
        <rect x="18" y="16" width="2" height="2" fill="#5c3d2e" />

        {/* Legs (green skin) */}
        <rect x="8" y="18" width="2" height="2" fill="#4a8030" />
        <rect x="10" y="18" width="2" height="2" fill="#5a9038" />
        <rect x="14" y="18" width="2" height="2" fill="#5a9038" />
        <rect x="16" y="18" width="2" height="2" fill="#4a8030" />
        <rect x="12" y="18" width="2" height="2" fill="#5c3d2e" />

        {/* Feet (bare, green) */}
        <rect x="6" y="20" width="2" height="2" fill="#4a8030" />
        <rect x="8" y="20" width="2" height="2" fill="#5a9038" />
        <rect x="10" y="20" width="2" height="2" fill="#5a9038" />
        <rect x="16" y="20" width="2" height="2" fill="#5a9038" />
        <rect x="18" y="20" width="2" height="2" fill="#5a9038" />
        <rect x="20" y="20" width="2" height="2" fill="#4a8030" />

        {/* Shadow */}
        <rect x="6" y="22" width="18" height="2" fill="#0d0804" opacity="0.3" />
      </svg>
    </div>
  );
}

// ============================================================
// ニジリゴケ / MushroomMan - Fungi/slime creature, orange/brown
// ============================================================
export function YuunamaMushroomMan({ size = 64, bounce = true }: CharacterProps) {
  return (
    <div className={bounce ? "dq-bounce" : ""}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Mushroom cap top */}
        <rect x="12" y="2" width="2" height="2" fill="#c06020" />
        <rect x="14" y="2" width="2" height="2" fill="#d07030" />
        <rect x="10" y="4" width="2" height="2" fill="#b05818" />
        <rect x="12" y="4" width="2" height="2" fill="#d07030" />
        <rect x="14" y="4" width="2" height="2" fill="#e08040" />
        <rect x="16" y="4" width="2" height="2" fill="#d07030" />
        <rect x="18" y="4" width="2" height="2" fill="#b05818" />

        {/* Mushroom cap wide */}
        <rect x="6" y="6" width="2" height="2" fill="#a04810" />
        <rect x="8" y="6" width="2" height="2" fill="#c06020" />
        <rect x="10" y="6" width="2" height="2" fill="#d07030" />
        <rect x="12" y="6" width="2" height="2" fill="#e08040" />
        <rect x="14" y="6" width="2" height="2" fill="#e89050" />
        <rect x="16" y="6" width="2" height="2" fill="#e08040" />
        <rect x="18" y="6" width="2" height="2" fill="#d07030" />
        <rect x="20" y="6" width="2" height="2" fill="#c06020" />
        <rect x="22" y="6" width="2" height="2" fill="#a04810" />

        {/* Cap spots (lighter) */}
        <rect x="10" y="6" width="2" height="2" fill="#f0a060" opacity="0.7" />
        <rect x="16" y="4" width="2" height="2" fill="#f0a060" opacity="0.6" />
        <rect x="20" y="6" width="2" height="2" fill="#f0a060" opacity="0.5" />
        {/* Spot glow */}
        <rect x="14" y="6" width="2" height="2" fill="#ffcc88" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur="3s" repeatCount="indefinite" />
        </rect>

        {/* Cap underside */}
        <rect x="4" y="8" width="2" height="2" fill="#8a3808" />
        <rect x="6" y="8" width="2" height="2" fill="#b05818" />
        <rect x="8" y="8" width="2" height="2" fill="#c06020" />
        <rect x="10" y="8" width="2" height="2" fill="#d07030" />
        <rect x="12" y="8" width="2" height="2" fill="#d07030" />
        <rect x="14" y="8" width="2" height="2" fill="#d07030" />
        <rect x="16" y="8" width="2" height="2" fill="#d07030" />
        <rect x="18" y="8" width="2" height="2" fill="#c06020" />
        <rect x="20" y="8" width="2" height="2" fill="#b05818" />
        <rect x="22" y="8" width="2" height="2" fill="#8a3808" />

        {/* Cap rim / gills */}
        <rect x="6" y="10" width="2" height="2" fill="#8a3808" />
        <rect x="8" y="10" width="2" height="2" fill="#a04810" />
        <rect x="10" y="10" width="2" height="2" fill="#b05818" />
        <rect x="12" y="10" width="2" height="2" fill="#b05818" />
        <rect x="14" y="10" width="2" height="2" fill="#b05818" />
        <rect x="16" y="10" width="2" height="2" fill="#b05818" />
        <rect x="18" y="10" width="2" height="2" fill="#a04810" />
        <rect x="20" y="10" width="2" height="2" fill="#8a3808" />

        {/* Face / stem upper */}
        <rect x="8" y="12" width="2" height="2" fill="#d8c8a0" />
        <rect x="10" y="12" width="2" height="2" fill="#e8d8b0" />
        <rect x="12" y="12" width="2" height="2" fill="#e8d8b0" />
        <rect x="14" y="12" width="2" height="2" fill="#e8d8b0" />
        <rect x="16" y="12" width="2" height="2" fill="#e8d8b0" />
        <rect x="18" y="12" width="2" height="2" fill="#d8c8a0" />

        {/* Eyes (small, dark, beady) */}
        <rect x="10" y="14" width="2" height="2" fill="#1a1008" />
        <rect x="16" y="14" width="2" height="2" fill="#1a1008" />
        {/* Eye glow (eerie) */}
        <rect x="10" y="14" width="2" height="2" fill="#ff6600" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <rect x="16" y="14" width="2" height="2" fill="#ff6600" opacity="0.4">
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <rect x="8" y="14" width="2" height="2" fill="#d8c8a0" />
        <rect x="12" y="14" width="2" height="2" fill="#e8d8b0" />
        <rect x="14" y="14" width="2" height="2" fill="#e8d8b0" />
        <rect x="18" y="14" width="2" height="2" fill="#d8c8a0" />

        {/* Mouth (wavy, creepy) */}
        <rect x="8" y="16" width="2" height="2" fill="#d8c8a0" />
        <rect x="10" y="16" width="2" height="2" fill="#d8c8a0" />
        <rect x="12" y="16" width="2" height="1" fill="#d8c8a0" />
        <rect x="12" y="17" width="2" height="1" fill="#6a3020" />
        <rect x="14" y="16" width="2" height="1" fill="#6a3020" />
        <rect x="14" y="17" width="2" height="1" fill="#d8c8a0" />
        <rect x="16" y="16" width="2" height="2" fill="#d8c8a0" />
        <rect x="18" y="16" width="2" height="2" fill="#d8c8a0" />

        {/* Stem / body lower */}
        <rect x="10" y="18" width="2" height="2" fill="#c8b890" />
        <rect x="12" y="18" width="2" height="2" fill="#d8c8a0" />
        <rect x="14" y="18" width="2" height="2" fill="#d8c8a0" />
        <rect x="16" y="18" width="2" height="2" fill="#c8b890" />

        {/* Slimy base / pseudopods */}
        <rect x="6" y="20" width="2" height="2" fill="#a08060" />
        <rect x="8" y="20" width="2" height="2" fill="#b89870" />
        <rect x="10" y="20" width="2" height="2" fill="#c8a880" />
        <rect x="12" y="20" width="2" height="2" fill="#c8a880" />
        <rect x="14" y="20" width="2" height="2" fill="#c8a880" />
        <rect x="16" y="20" width="2" height="2" fill="#c8a880" />
        <rect x="18" y="20" width="2" height="2" fill="#b89870" />
        <rect x="20" y="20" width="2" height="2" fill="#a08060" />

        {/* Slime drip */}
        <rect x="8" y="22" width="2" height="2" fill="#a09070" opacity="0.6" />
        <rect x="18" y="22" width="2" height="2" fill="#a09070" opacity="0.6" />
        {/* Slime glow */}
        <rect x="8" y="22" width="2" height="2" fill="#d0a050" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite" />
        </rect>

        {/* Spore particles */}
        <rect x="4" y="4" width="2" height="2" fill="#f0a060" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur="4s" repeatCount="indefinite" />
        </rect>
        <rect x="24" y="2" width="2" height="2" fill="#f0a060" opacity="0.2">
          <animate attributeName="opacity" values="0.0;0.4;0.0" dur="3.5s" repeatCount="indefinite" />
        </rect>
        <rect x="26" y="10" width="2" height="2" fill="#d08040" opacity="0.2">
          <animate attributeName="opacity" values="0.1;0.3;0.1" dur="5s" repeatCount="indefinite" />
        </rect>

        {/* Shadow */}
        <rect x="6" y="24" width="18" height="2" fill="#0d0804" opacity="0.3" />
      </svg>
    </div>
  );
}
