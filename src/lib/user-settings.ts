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
