'use client';

import { useEffect, useRef, useCallback } from 'react';
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
import { ErrorBoundary } from '@/components/error-boundary';
import DqConfirmProvider from '@/components/dq-confirm';
import ShortcutHelp from '@/components/shortcut-help';
import { showDqToast } from '@/lib/toast';
import { saveDraft, loadDraft, clearDraft } from '@/lib/auto-draft';
import type { ToolMode } from '@/types/pdf';

function PDFApp() {
  const { state, dispatch, undoStackSize, redoStackSize } = usePDF();
  const isModifiedRef = useRef(state.isModified);
  isModifiedRef.current = state.isModified;
  const stateRef = useRef(state);
  stateRef.current = state;
  const undoStackSizeRef = useRef(undoStackSize);
  undoStackSizeRef.current = undoStackSize;
  const redoStackSizeRef = useRef(redoStackSize);
  redoStackSizeRef.current = redoStackSize;

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
    if (!state.isModified && state.pdfData) {
      clearDraft();
    }
  }, [state.isModified, state.pdfData]);

  useEffect(() => {
    if (!state.file) return;
    const draft = loadDraft();
    if (draft && draft.fileName === state.file.name && draft.annotations.length > 0 && state.annotations.length === 0) {
      setTimeout(() => {
        showDqToast(`前回の下書き(${draft.annotations.length}件)があります`, 'info');
        for (const ann of draft.annotations) {
          dispatch({ type: 'ADD_ANNOTATION', payload: ann });
        }
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.file?.name]);

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

    // 矢印キーでページ移動
    if (!e.ctrlKey && !e.metaKey && !e.altKey && s.toolMode === 'view' && s.pdfData) {
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
    <div className="h-[100dvh] flex flex-col">
      <DqHeader />
      <SearchPanel />
      <PDFViewer />
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
