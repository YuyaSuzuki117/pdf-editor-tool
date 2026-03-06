/**
 * showDqToast - DQテーマのトースト通知ユーティリティ
 * success / error / info の3タイプに対応
 */

export type ToastType = 'success' | 'error' | 'info';

const toastIcons: Record<ToastType, string> = {
  success: '\u2692', // ハンマー
  error: '\u2620',   // ドクロ
  info: '\u26CF',    // ツルハシ
};

const toastBorderColors: Record<ToastType, string> = {
  success: '#5a8a3c',
  error: '#cc4422',
  info: '#7a5540',
};

export function showDqToast(message: string, type: ToastType = 'info') {
  const icon = toastIcons[type];
  const borderColor = toastBorderColors[type];

  const toast = document.createElement('div');
  toast.className = `dq-toast dq-toast-${type}`;
  toast.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:100;animation:ynk-dig-appear 0.3s ease;image-rendering:pixelated;`;

  toast.innerHTML = `
    <div style="
      display:flex;align-items:center;gap:12px;min-width:280px;
      background:linear-gradient(180deg,#3d2a1e,#2a1c12);
      border:3px solid ${borderColor};
      outline:3px solid #2a1c12;
      border-radius:4px;
      color:#d4a017;
      padding:12px 20px;
      font-family:DotGothic16,monospace;
      font-weight:bold;
      text-shadow:2px 2px 0 rgba(0,0,0,0.8);
      box-shadow:0 4px 20px rgba(0,0,0,0.7),inset 0 1px 0 rgba(122,85,64,0.3),inset 0 -2px 0 rgba(0,0,0,0.3);
    ">
      <span style="font-size:20px;line-height:1;filter:drop-shadow(0 0 4px ${borderColor});">${icon}</span>
      <span style="flex:1;">${message}</span>
    </div>
  `;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
