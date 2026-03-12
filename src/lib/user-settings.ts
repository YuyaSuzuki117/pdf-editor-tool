/**
 * ユーザー設定をlocalStorageに保存・読み込み
 */

const SETTINGS_KEY = 'pdf-editor-settings';

export interface UserSettings {
  textFontSize?: number;
  textColor?: string;
  textFontFamily?: string;
  drawColor?: string;
  drawWidth?: number;
  highlightColor?: string;
  stampSizeIdx?: number;
  shapeType?: string;
  shapeStrokeColor?: string;
  shapeStrokeWidth?: number;
  shapeFilled?: boolean;
  highlightMode?: string;
  lastStampLabel?: string;
  lastStampSizeIdx?: number;
  lastStampCustomText?: string;
  lastStampCustomColor?: string;
  lastStampWasCustom?: boolean;
  lastSavePreset?: 'pdf' | 'pdf-json' | 'image';
  recentColors?: string[];
  savedSignatures?: string[]; // DataURL array
}

const defaults: UserSettings = {
  textFontSize: 16,
  textColor: '#000000',
  textFontFamily: 'Noto Sans JP',
  drawColor: '#000000',
  drawWidth: 2,
  highlightColor: '#fde047',
  stampSizeIdx: 1,
  shapeType: 'rectangle',
  shapeStrokeColor: '#ef4444',
  shapeStrokeWidth: 2,
  shapeFilled: false,
  highlightMode: 'highlight',
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(partial: Partial<UserSettings>): void {
  try {
    const current = loadSettings();
    const merged = { ...current, ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

/** 最近使った色を追加 (最大8色、重複除去) */
export function addRecentColor(color: string): void {
  const settings = loadSettings();
  const recent = settings.recentColors || [];
  const updated = [color, ...recent.filter(c => c !== color)].slice(0, 8);
  saveSettings({ recentColors: updated });
}

/** 署名を保存 (最大5個) */
export function saveSignature(dataURL: string): void {
  const settings = loadSettings();
  const sigs = settings.savedSignatures || [];
  // 重複チェック（先頭100文字で比較）
  if (sigs.some(s => s.slice(0, 100) === dataURL.slice(0, 100))) return;
  const updated = [dataURL, ...sigs].slice(0, 5);
  saveSettings({ savedSignatures: updated });
}

/** 保存済み署名を取得 */
export function getSavedSignatures(): string[] {
  return loadSettings().savedSignatures || [];
}

/** 署名を削除 */
export function removeSignature(index: number): void {
  const settings = loadSettings();
  const sigs = [...(settings.savedSignatures || [])];
  sigs.splice(index, 1);
  saveSettings({ savedSignatures: sigs });
}
