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
import HighlightPanel from '@/components/highlight-panel';
import PageManager from '@/components/page-manager';
import SavePanel from '@/components/save-panel';
import StampPanel from '@/components/stamp-panel';
import AnnotationList from '@/components/annotation-list';
import Onboarding from '@/components/onboarding';
import { ErrorBoundary } from '@/components/error-boundary';
import DqConfirmProvider from '@/components/dq-confirm';
import { showDqToast } from '@/lib/toast';

function PDFApp() {
  const { state, dispatch, undoStackSize } = usePDF();
  const isModifiedRef = useRef(state.isModified);
  isModifiedRef.current = state.isModified;
  const stateRef = useRef(state);
  stateRef.current = state;
  const undoStackSizeRef = useRef(undoStackSize);
  undoStackSizeRef.current = undoStackSize;

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

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const s = stateRef.current;
    // テキスト入力中はスキップ
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

    // Ctrl+Z / Cmd+Z: 元に戻す
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (undoStackSizeRef.current > 0) {
        dispatch({ type: 'UNDO_ANNOTATION' });
        showDqToast('ひとつ もどした！', 'info');
      }
      return;
    }
    // Ctrl+S / Cmd+S: 保存パネルを開く
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (s.pdfData) {
        dispatch({ type: 'SET_TOOL', payload: 'save' });
      }
      return;
    }
    // 矢印キーでページ移動（viewモードのみ）
    if (!e.ctrlKey && !e.metaKey && !e.altKey && s.toolMode === 'view' && s.pdfData) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (s.currentPage > 1) dispatch({ type: 'SET_PAGE', payload: s.currentPage - 1 });
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (s.currentPage < s.numPages) dispatch({ type: 'SET_PAGE', payload: s.currentPage + 1 });
      }
      // Escapeでツール解除
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
      <PDFViewer />
      <ZoomControls />
      <DqToolbar />
      <TextEditorPanel isOpen={state.toolMode === 'text'} onClose={closePanel} />
      <DrawPanel isOpen={state.toolMode === 'draw'} onClose={closePanel} />
      <HighlightPanel isOpen={state.toolMode === 'highlight'} onClose={closePanel} />
      <StampPanel isOpen={state.toolMode === 'image'} onClose={closePanel} />
      <PageManager isOpen={state.toolMode === 'pages'} onClose={closePanel} />
      <SavePanel isOpen={state.toolMode === 'save'} onClose={closePanel} />
      <AnnotationList />
      <Onboarding />
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
