/**
 * ユーザー設定をlocalStorageに保存・読み込み
 * テキストのフォントサイズ・色、描画の色・太さなどを記憶
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
}

const defaults: UserSettings = {
  textFontSize: 16,
  textColor: '#000000',
  textFontFamily: 'Noto Sans JP',
  drawColor: '#000000',
  drawWidth: 2,
  highlightColor: '#fde047',
  stampSizeIdx: 1,
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
