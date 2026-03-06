/**
 * Auto-draft save: アノテーションをlocalStorageに自動保存して
 * ブラウザクラッシュ・誤閉じ時のデータ損失を防ぐ
 */
import type { Annotation } from '@/types/pdf';

const DRAFT_KEY = 'pdf-editor-draft';

interface DraftData {
  fileName: string;
  annotations: Annotation[];
  savedAt: number;
}

export function saveDraft(fileName: string, annotations: Annotation[]): void {
  if (annotations.length === 0) {
    clearDraft();
    return;
  }
  try {
    const draft: DraftData = { fileName, annotations, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as DraftData;
    // 24時間以上前の下書きは破棄
    if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
      clearDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
