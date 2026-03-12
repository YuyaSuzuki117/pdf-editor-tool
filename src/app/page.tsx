'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { PDFProvider, usePDF } from '@/contexts/pdf-context';
import DqDropZone from '@/components/dq-drop-zone';
import DqHeader from '@/components/dq-header';
import DqToolbar from '@/components/dq-toolbar';
import PDFViewer from '@/components/pdf-viewer';
import ZoomControls from '@/components/zoom-controls';
import TextEditorPanel from '@/components/text-editor-panel';
import DrawPanel from '@/components/draw-panel';
import ShapePanel from '@/components/shape-panel';
import HighlightPanel from '@/components/highlight-panel';
import PageManager from '@/components/page-manager';
import SavePanel from '@/components/save-panel';
import StampPanel from '@/components/stamp-panel';
import AnnotationList from '@/components/annotation-list';
import Onboarding from '@/components/onboarding';
import SearchPanel from '@/components/search-panel';
import QuickActions from '@/components/quick-actions';
import { ErrorBoundary } from '@/components/error-boundary';
import DqConfirmProvider from '@/components/dq-confirm';
import ShortcutHelp from '@/components/shortcut-help';
import PageThumbnails from '@/components/page-thumbnails';
import { showDqToast } from '@/lib/toast';
import { saveDraft, loadDraft, clearDraft } from '@/lib/auto-draft';
import { mergePdfs } from '@/lib/pdf-editor';
import { loadDocumentFromBytes } from '@/lib/pdf-engine';
import type { ToolMode } from '@/types/pdf';

type DraftSnapshot = NonNullable<ReturnType<typeof loadDraft>>;

function PDFApp() {
  const { state, dispatch, undoStackSize, redoStackSize } = usePDF();
  const isModifiedRef = useRef(state.isModified);
  const stateRef = useRef(state);
  const undoStackSizeRef = useRef(undoStackSize);
  const redoStackSizeRef = useRef(redoStackSize);
  const prevModifiedRef = useRef(state.isModified);
  const [pendingDraft, setPendingDraft] = useState<DraftSnapshot | null>(null);

  useEffect(() => {
    isModifiedRef.current = state.isModified;
    stateRef.current = state;
    undoStackSizeRef.current = undoStackSize;
    redoStackSizeRef.current = redoStackSize;
  }, [state, undoStackSize, redoStackSize]);

  // 未保存警告: beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isModifiedRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // 自動下書き保存
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!state.file || !state.pdfData) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft(state.file!.name, state.annotations);
    }, 2000);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [state.annotations, state.file, state.pdfData]);

  useEffect(() => {
    const wasModified = prevModifiedRef.current;
    if (wasModified && !state.isModified && state.pdfData) {
      clearDraft();
    }
    prevModifiedRef.current = state.isModified;
  }, [state.isModified, state.pdfData]);

  useEffect(() => {
    if (!state.file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pending draft comes from client-only localStorage after file load
      setPendingDraft(null);
      return;
    }
    const draft = loadDraft();
    if (draft && draft.fileName === state.file.name && draft.annotations.length > 0 && state.annotations.length === 0) {
      setPendingDraft(draft);
      setTimeout(() => {
        showDqToast(`前回の下書きが見つかりました (${draft.annotations.length}件)`, 'info');
      }, 300);
    } else {
      setPendingDraft(null);
    }
  }, [state.file, state.annotations.length]);

  const handleRestoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    dispatch({ type: 'RESTORE_DRAFT', payload: pendingDraft.annotations });
    showDqToast(`下書きを復元しました (${pendingDraft.annotations.length}件)`, 'success');
    setPendingDraft(null);
  }, [dispatch, pendingDraft]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setPendingDraft(null);
    showDqToast('保存済みの下書きを破棄しました', 'info');
  }, []);

  // Ctrl+V: クリップボードから画像を貼り付け
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!stateRef.current.pdfData) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataURL = ev.target?.result as string;
            if (!dataURL) return;
            const img = new window.Image();
            img.onload = () => {
              const pdfCanvas = document.querySelector('.pdf-canvas-container canvas') as HTMLCanvasElement;
              if (!pdfCanvas) return;
              const rect = pdfCanvas.getBoundingClientRect();
              const imgWidth = Math.min(200, img.width);
              const aspectRatio = img.height / img.width;
              const scaleAttr = pdfCanvas.getAttribute('data-render-scale');
              const renderScale = scaleAttr ? parseFloat(scaleAttr) : 1;
              const annotation = {
                id: crypto.randomUUID(),
                type: 'image' as const,
                page: stateRef.current.currentPage,
                position: { x: rect.width / 2 - imgWidth / 2, y: rect.height / 3 },
                content: dataURL,
                style: { width: imgWidth, height: Math.round(imgWidth * aspectRatio) },
                renderScale,
                createdAt: Date.now(),
              };
              dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
              showDqToast('クリップボードから画像を貼り付けました！', 'success');
            };
            img.src = dataURL;
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [dispatch]);

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const s = stateRef.current;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

    // Ctrl+Shift+Z: Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      if (redoStackSizeRef.current > 0) {
        dispatch({ type: 'REDO_ANNOTATION' });
        showDqToast('やりなおした！', 'info');
      }
      return;
    }
    // Ctrl+Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (undoStackSizeRef.current > 0) {
        dispatch({ type: 'UNDO_ANNOTATION' });
        showDqToast('ひとつ もどした！', 'info');
      }
      return;
    }
    // Ctrl+Y: Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      if (redoStackSizeRef.current > 0) {
        dispatch({ type: 'REDO_ANNOTATION' });
        showDqToast('やりなおした！', 'info');
      }
      return;
    }
    // Ctrl+S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (s.pdfData) dispatch({ type: 'SET_TOOL', payload: 'save' });
      return;
    }
    // Ctrl+P: Print
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('quick-print'));
      return;
    }
    // Ctrl+Plus/Minus: Zoom
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      dispatch({ type: 'SET_SCALE', payload: s.scale + 0.25 });
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      dispatch({ type: 'SET_SCALE', payload: s.scale - 0.25 });
      return;
    }
    // Ctrl+0: Reset zoom
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      dispatch({ type: 'SET_SCALE', payload: 1 });
      return;
    }

    // 数字キーでツール切替 (1-8)
    if (!e.ctrlKey && !e.metaKey && !e.altKey && s.pdfData) {
      const toolMap: Record<string, ToolMode> = {
        '1': 'view', '2': 'text', '3': 'draw', '4': 'shape',
        '5': 'highlight', '6': 'image', '7': 'pages', '8': 'save',
      };
      if (toolMap[e.key]) {
        e.preventDefault();
        dispatch({ type: 'SET_TOOL', payload: toolMap[e.key] });
        return;
      }
    }

    // R: Quick rotate current page
    if (!e.ctrlKey && !e.metaKey && !e.altKey && s.pdfData && e.key === 'r') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('quick-rotate'));
      return;
    }

    // Ctrl+F: Search (already handled in search-panel, prevent default here too)
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      // Let search-panel handle it
      return;
    }

    // 矢印キーでページ移動（どのモードでも使用可能）
    if (!e.ctrlKey && !e.metaKey && !e.altKey && s.pdfData && s.toolMode !== 'pages') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (s.currentPage > 1) dispatch({ type: 'SET_PAGE', payload: s.currentPage - 1 });
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (s.currentPage < s.numPages) dispatch({ type: 'SET_PAGE', payload: s.currentPage + 1 });
      }
    } else if (e.key === 'Escape' && s.toolMode !== 'view') {
      dispatch({ type: 'SET_TOOL', payload: 'view' });
    }
  }, [dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // PDF表示中にドロップされたPDFを結合
  const handleDropMerge = useCallback(async (e: React.DragEvent) => {
    if (!state.pdfData) return;
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return;
    try {
      const newBuffer = await file.arrayBuffer();
      const merged = await mergePdfs([state.pdfData, newBuffer]);
      const doc = await loadDocumentFromBytes(merged.buffer as ArrayBuffer);
      const numPages = doc.numPages;
      doc.destroy();
      dispatch({
        type: 'UPDATE_PDF_DATA',
        payload: { pdfData: merged.buffer as ArrayBuffer, numPages },
      });
      showDqToast(`${file.name}を結合しました (${numPages}ページ)`, 'success');
    } catch {
      showDqToast('PDFの結合に失敗しました', 'error');
    }
  }, [state.pdfData, dispatch]);

  const closePanel = () => dispatch({ type: 'SET_TOOL', payload: 'view' });

  if (!state.pdfData) {
    return (
      <div className="h-[100dvh] flex flex-col">
        <DqHeader />
        <DqDropZone />
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] flex flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropMerge}
    >
      <DqHeader />
      {pendingDraft && (
        <div className="px-3 py-2" style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '2px solid rgba(92,74,46,0.45)' }}>
          <div
            className="dq-message-box flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{
              background: 'rgba(212,160,23,0.12)',
              border: '2px solid var(--ynk-gold)',
              borderRadius: 4,
              padding: '12px 16px',
            }}
          >
            <div className="min-w-0">
              <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
                前回の下書きが残っています
              </p>
              <p className="dq-text text-xs mt-1" style={{ color: 'var(--ynk-bone)', opacity: 0.8 }}>
                {pendingDraft.annotations.length}件の編集を復元するか、破棄するか選べます
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleRestoreDraft} className="dq-btn px-4 py-2">
                復元する
              </button>
              <button
                onClick={handleDiscardDraft}
                className="dq-btn px-4 py-2"
                style={{
                  background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)',
                  color: 'var(--ynk-bone)',
                  borderColor: 'var(--window-border)',
                  boxShadow: '0 3px 0 #2a1c12, 0 4px 8px rgba(0,0,0,0.3)',
                }}
              >
                破棄する
              </button>
            </div>
          </div>
        </div>
      )}
      <SearchPanel />
      <QuickActions />
      <PDFViewer />
      <PageThumbnails />
      <ZoomControls />
      <DqToolbar />
      <TextEditorPanel isOpen={state.toolMode === 'text'} onClose={closePanel} />
      <DrawPanel isOpen={state.toolMode === 'draw'} onClose={closePanel} />
      <ShapePanel isOpen={state.toolMode === 'shape'} onClose={closePanel} />
      <HighlightPanel isOpen={state.toolMode === 'highlight'} onClose={closePanel} />
      <StampPanel isOpen={state.toolMode === 'image'} onClose={closePanel} />
      <PageManager isOpen={state.toolMode === 'pages'} onClose={closePanel} />
      <SavePanel isOpen={state.toolMode === 'save'} onClose={closePanel} />
      <AnnotationList />
      <Onboarding />
      <ShortcutHelp />
    </div>
  );
}

export default function Home() {
  return (
    <PDFProvider>
      <ErrorBoundary>
        <DqConfirmProvider>
          <PDFApp />
        </DqConfirmProvider>
      </ErrorBoundary>
    </PDFProvider>
  );
}
