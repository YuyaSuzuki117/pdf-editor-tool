export const uiEvents = {
  copyPageText: 'copy-page-text',
  openAnnotationList: 'open-annotation-list',
  openPdfPicker: 'open-pdf-picker',
  openQuickActions: 'open-quick-actions',
  openSearchPanel: 'open-search-panel',
  openThumbnailStrip: 'open-thumbnail-strip',
  toggleAnnotationList: 'toggle-annotation-list',
  toggleQuickActions: 'toggle-quick-actions',
  toggleSearchPanel: 'toggle-search-panel',
  toggleShortcutHelp: 'toggle-shortcut-help',
  toggleThumbnailStrip: 'toggle-thumbnail-strip',
} as const;

export type UiEventName = (typeof uiEvents)[keyof typeof uiEvents];

export function emitUiEvent(eventName: UiEventName) {
  window.dispatchEvent(new CustomEvent(eventName));
}
