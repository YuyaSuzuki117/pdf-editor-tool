'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { RotateCw, Trash2, ChevronUp, ChevronDown, X, FilePlus, Copy, FileText, Scissors, Merge, GripVertical } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { showDqToast } from '@/lib/toast';
import { YuunamaLilith } from '@/components/dq-characters';
import { loadDocumentFromBytes, renderPageToDataURL } from '@/lib/pdf-engine';
import {
  getPageNumberAfterReorder,
  rebaseAnnotationsAfterDelete,
  rebaseAnnotationsAfterDuplicate,
  rebaseAnnotationsAfterInsertBlank,
  rebaseAnnotationsAfterReorder,
} from '@/lib/annotation-page-ops';
import { parsePageRange } from '@/lib/page-range';
import { deletePage, mergePdfs, reorderPages, splitPdf, insertBlankPage, duplicatePage, savePdfAsBlob, downloadBlob } from '@/lib/pdf-editor';
import { rotatePageWithAnnotations } from '@/lib/page-rotation';
import { dqConfirm } from '@/components/dq-confirm';
import SlidePanel from '@/components/slide-panel';
import { uiEvents } from '@/lib/ui-events';

interface PageThumb {
  id: string;
  dataURL: string;
  width: number;
  height: number;
}

type TabMode = 'pages' | 'merge' | 'split';

function reorderByMove<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function PageManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePDF();
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [tab, setTab] = useState<TabMode>('pages');
  const [mergeFiles, setMergeFiles] = useState<{ name: string; data: ArrayBuffer; pages: number }[]>([]);
  const [splitRange, setSplitRange] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const generateThumbnails = useCallback(async () => {
    if (!state.pdfData) return;
    setLoading(true);
    setThumbnails([]);
    const doc = await loadDocumentFromBytes(state.pdfData);
    // プレースホルダーを先に設定
    const placeholders: PageThumb[] = [];
    for (let i = 0; i < doc.numPages; i++) {
      placeholders.push({ id: `page-${Date.now()}-${i}`, dataURL: '', width: 3, height: 4 });
    }
    setThumbnails(placeholders);
    setLoading(false);

    // 1枚ずつ非ブロッキングで生成（setTimeoutで分割）
    for (let i = 1; i <= doc.numPages; i++) {
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            const rendered = await renderPageToDataURL(doc, i, 0.3);
            setThumbnails((prev) =>
              prev.map((t, index) => (index === i - 1 ? { ...t, ...rendered } : t))
            );
          } catch {
            // サムネイル生成失敗は無視（プレースホルダーのまま）
          }
          resolve();
        }, 0);
      });
    }

    // サムネイル生成完了後にPDFドキュメントを解放
    doc.destroy();
  }, [state.pdfData]);

  useEffect(() => {
    if (isOpen) generateThumbnails();
  }, [isOpen, generateThumbnails]);

  useEffect(() => {
    const openPages = () => setTab('pages');
    const openMerge = () => setTab('merge');
    const openSplit = () => setTab('split');

    window.addEventListener(uiEvents.openPageManager, openPages);
    window.addEventListener(uiEvents.openPageManagerMerge, openMerge);
    window.addEventListener(uiEvents.openPageManagerSplit, openSplit);

    return () => {
      window.removeEventListener(uiEvents.openPageManager, openPages);
      window.removeEventListener(uiEvents.openPageManagerMerge, openMerge);
      window.removeEventListener(uiEvents.openPageManagerSplit, openSplit);
    };
  }, []);

  const commitReorder = useCallback(async (from: number, to: number) => {
    if (!state.pdfData || from === to) return;
    const newOrder = reorderByMove(Array.from({ length: state.numPages }, (_, index) => index), from, to);
    setIsReordering(true);
    try {
      const newBytes = await reorderPages(state.pdfData, newOrder);
      dispatch({
        type: 'UPDATE_PDF_DATA',
        payload: {
          pdfData: newBytes.buffer as ArrayBuffer,
          numPages: state.numPages,
          annotations: rebaseAnnotationsAfterReorder(state.annotations, newOrder),
          currentPage: getPageNumberAfterReorder(state.currentPage, newOrder),
        },
      });
      setThumbnails((prev) => reorderByMove(prev, from, to));
    } finally {
      setIsReordering(false);
    }
  }, [dispatch, state.annotations, state.currentPage, state.numPages, state.pdfData]);

  const displayThumbnails = useMemo(() => {
    if (draggedIndex === null || dropIndex === null || draggedIndex === dropIndex) {
      return thumbnails;
    }
    return reorderByMove(thumbnails, draggedIndex, dropIndex);
  }, [draggedIndex, dropIndex, thumbnails]);

  const handleRotate = async (pageIndex: number) => {
    if (!state.pdfData) return;
    const { annotations, pdfData } = await rotatePageWithAnnotations(state.pdfData, pageIndex, state.annotations);
    dispatch({
      type: 'UPDATE_PDF_DATA',
      payload: {
        pdfData,
        numPages: state.numPages,
        annotations,
      },
    });
    showDqToast(
      state.annotations.some((annotation) => annotation.page === pageIndex + 1)
        ? 'ページとアノテーションを一緒に回転しました'
        : 'ページを回転しました',
      'success',
    );
    generateThumbnails();
  };

  const handleDelete = async (pageIndex: number) => {
    if (!state.pdfData || state.numPages <= 1) return;
    if (!(await dqConfirm(`ページ${pageIndex + 1}を\n削除しますか？`))) return;
    const newBytes = await deletePage(state.pdfData, pageIndex);
    const newNumPages = state.numPages - 1;
    const deletedPage = pageIndex + 1;
    const nextCurrentPage =
      state.currentPage > deletedPage
        ? state.currentPage - 1
        : Math.min(state.currentPage, newNumPages);
    dispatch({
      type: 'UPDATE_PDF_DATA',
      payload: {
        pdfData: newBytes.buffer as ArrayBuffer,
        numPages: newNumPages,
        annotations: rebaseAnnotationsAfterDelete(state.annotations, deletedPage),
        currentPage: nextCurrentPage,
      },
    });
    generateThumbnails();
  };

  const handleMove = async (pageIndex: number, direction: 'up' | 'down') => {
    if (!state.pdfData) return;
    const total = state.numPages;
    if (direction === 'up' && pageIndex === 0) return;
    if (direction === 'down' && pageIndex >= total - 1) return;
    const targetIndex = direction === 'up' ? pageIndex - 1 : pageIndex + 1;
    await commitReorder(pageIndex, targetIndex);
  };

  const handleInsertBlank = async (afterIndex: number) => {
    if (!state.pdfData) return;
    const newBytes = await insertBlankPage(state.pdfData, afterIndex);
    const doc = await loadDocumentFromBytes(newBytes.buffer as ArrayBuffer);
    const numPages = doc.numPages;
    doc.destroy();
    const insertedPage = afterIndex + 2;
    const nextCurrentPage = state.currentPage >= insertedPage ? state.currentPage + 1 : state.currentPage;
    dispatch({
      type: 'UPDATE_PDF_DATA',
      payload: {
        pdfData: newBytes.buffer as ArrayBuffer,
        numPages,
        annotations: rebaseAnnotationsAfterInsertBlank(state.annotations, insertedPage),
        currentPage: nextCurrentPage,
      },
    });
    showDqToast('空白ページを挿入しました', 'success');
    generateThumbnails();
  };

  const handleDuplicate = async (pageIndex: number) => {
    if (!state.pdfData) return;
    const newBytes = await duplicatePage(state.pdfData, pageIndex);
    const doc = await loadDocumentFromBytes(newBytes.buffer as ArrayBuffer);
    const numPages = doc.numPages;
    doc.destroy();
    const duplicatedPage = pageIndex + 1;
    const nextCurrentPage = state.currentPage > duplicatedPage ? state.currentPage + 1 : state.currentPage;
    dispatch({
      type: 'UPDATE_PDF_DATA',
      payload: {
        pdfData: newBytes.buffer as ArrayBuffer,
        numPages,
        annotations: rebaseAnnotationsAfterDuplicate(state.annotations, duplicatedPage),
        currentPage: nextCurrentPage,
      },
    });
    showDqToast('ページを複製しました', 'success');
    generateThumbnails();
  };

  const handleAddMergeFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      const newFiles: typeof mergeFiles = [];
      for (const file of Array.from(files)) {
        const data = await file.arrayBuffer();
        const doc = await loadDocumentFromBytes(data);
        newFiles.push({ name: file.name, data, pages: doc.numPages });
        doc.destroy();
      }
      setMergeFiles(prev => [...prev, ...newFiles]);
    };
    input.click();
  };

  const handleMerge = async () => {
    if (mergeFiles.length === 0) return;
    const allPdfs = state.pdfData ? [state.pdfData, ...mergeFiles.map(f => f.data)] : mergeFiles.map(f => f.data);
    const merged = await mergePdfs(allPdfs);
    const blob = savePdfAsBlob(merged);
    downloadBlob(blob, 'merged.pdf');
    showDqToast('結合PDFを保存しました', 'success');
    setMergeFiles([]);
  };

  const handleSplit = async () => {
    if (!state.pdfData || !splitRange.trim()) return;
    const indices = parsePageRange(splitRange, state.numPages);
    if (indices.length === 0) {
      showDqToast('有効なページ番号を入力してください', 'error');
      return;
    }
    indices.sort((a, b) => a - b);
    const result = await splitPdf(state.pdfData, indices);
    const blob = savePdfAsBlob(result);
    downloadBlob(blob, `split_p${indices.map(i => i + 1).join('-')}.pdf`);
    showDqToast(`${indices.length}ページを抽出しました`, 'success');
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    setDraggedIndex(index);
    setDropIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropIndex(null);
  };

  const handleDropReorder = async (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      handleDragEnd();
      return;
    }
    const sourceIndex = draggedIndex;
    handleDragEnd();
    await commitReorder(sourceIndex, targetIndex);
    showDqToast(`ページ${sourceIndex + 1}を${targetIndex + 1}番目へ移動しました`, 'success');
  };

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="ページ管理"
      allowInteraction
      desktopDock
      desktopCompactWidth="min(25rem, calc(100vw - 2rem))"
      desktopExpandedWidth="min(34rem, calc(100vw - 2rem))"
      description="並べ替え、結合、分割をPDFを見ながら進められます"
    >
      <div className="space-y-4">
        <div
          className="rounded-md border px-3 py-3"
          style={{
            background: 'rgba(0,0,0,0.18)',
            borderColor: 'rgba(92,74,46,0.45)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
                {state.file?.name || '現在のPDF'}
              </p>
              <p className="dq-text text-xs mt-1" style={{ color: 'var(--ynk-bone)', opacity: 0.72 }}>
                {state.numPages}ページ / 現在ページ {state.currentPage}
              </p>
            </div>
            <span
              className="dq-text rounded-full px-2 py-1 text-[10px]"
              style={{
                background: 'rgba(212,160,23,0.12)',
                border: '1px solid rgba(212,160,23,0.3)',
                color: 'var(--ynk-gold)',
              }}
            >
              管理モード
            </span>
          </div>
        </div>

        <div
          className="sticky top-0 z-10 flex gap-1 rounded-md px-2 py-2 backdrop-blur-sm"
          style={{
            background: 'linear-gradient(180deg, rgba(42,30,18,0.96) 0%, rgba(30,21,8,0.9) 100%)',
            border: '1px solid rgba(92,74,46,0.45)',
          }}
        >
          {([['pages', 'ページ'], ['merge', '結合'], ['split', '分割']] as [TabMode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="dq-btn-small flex-1 text-center min-h-[36px]"
              style={tab === key
                ? { borderColor: '#d4a017', boxShadow: '0 0 8px rgba(212,160,23,0.5)' }
                : { background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'merge' && (
          <div className="space-y-4">
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--window-border)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm">複数のPDFファイルを1つに結合します</p>
          </div>
          <button onClick={handleAddMergeFiles} className="dq-btn w-full flex items-center justify-center gap-2">
            <FilePlus size={18} /> PDFファイルを追加
          </button>
          {mergeFiles.length > 0 && (
            <div className="space-y-2">
              {state.pdfData && (
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid var(--ynk-gold)', borderRadius: 4 }}>
                  <FileText size={16} style={{ color: 'var(--ynk-gold)' }} />
                  <span className="dq-text text-sm flex-1">{state.file?.name || '現在のPDF'} ({state.numPages}p)</span>
                </div>
              )}
              {mergeFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--window-border)', borderRadius: 4 }}>
                  <FileText size={16} style={{ color: 'var(--ynk-bone)' }} />
                  <span className="dq-text text-sm flex-1">{f.name} ({f.pages}p)</span>
                  <button onClick={() => setMergeFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ color: '#ef4444' }} aria-label={`${f.name}を削除`}><X size={16} /></button>
                </div>
              ))}
              <button onClick={handleMerge} className="dq-btn w-full flex items-center justify-center gap-2">
                <Merge size={18} /> 結合して保存
              </button>
            </div>
          )}
          </div>
        )}

        {tab === 'split' && (
          <div className="space-y-4">
          <div className="dq-message-box" style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid var(--window-border)', borderRadius: 4, padding: '12px 16px' }}>
            <p className="dq-text text-sm">ページ番号を指定してPDFを分割・抽出します</p>
            <p className="dq-text text-xs mt-1" style={{ opacity: 0.7 }}>例: 1-3, 5, 7-10</p>
          </div>
          <input
            value={splitRange}
            onChange={(e) => setSplitRange(e.target.value)}
            placeholder="ページ番号 (例: 1-3, 5, 7-10)"
            className="dq-input w-full"
            aria-label="分割するページ番号"
          />
          <p className="dq-text text-xs" style={{ color: 'var(--ynk-bone)', opacity: 0.7 }}>
            総ページ数: {state.numPages}
          </p>
          <button onClick={handleSplit} disabled={!splitRange.trim()} className="dq-btn w-full flex items-center justify-center gap-2">
            <Scissors size={18} /> 抽出して保存
          </button>
          </div>
        )}

        {tab === 'pages' && <div className="space-y-4">
        <div
          className="flex flex-col gap-2 rounded-md border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          style={{
            background: 'rgba(0,0,0,0.18)',
            borderColor: isReordering ? 'rgba(212,160,23,0.55)' : 'rgba(92,74,46,0.4)',
          }}
        >
          <div>
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>
              サムネイルをドラッグして、直感的に並べ替え
            </p>
            <p className="dq-text text-xs mt-1" style={{ color: 'var(--ynk-bone)', opacity: 0.72 }}>
              順番変更後はサムネイルを描き直さず、そのまま軽く更新します
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="dq-text rounded-full px-2 py-1 text-[10px]"
              style={{
                background: 'rgba(212,160,23,0.1)',
                border: '1px solid rgba(212,160,23,0.3)',
                color: 'var(--ynk-gold)',
              }}
            >
              現在ページ {state.currentPage}/{state.numPages}
            </span>
            {isReordering && (
              <span className="dq-text text-[10px]" style={{ color: 'var(--ynk-bone)', opacity: 0.7 }}>
                並べ替え中...
              </span>
            )}
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <YuunamaLilith size={56} bounce />
            <p className="dq-text text-sm" style={{ color: 'var(--ynk-gold)' }}>ページを よみこみちゅう...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {displayThumbnails.map((thumb, displayIndex) => {
              const isActive = state.currentPage === displayIndex + 1;
              const isFirst = displayIndex === 0;
              const isLast = displayIndex === displayThumbnails.length - 1;
              const isDropTarget = draggedIndex !== null && dropIndex === displayIndex && draggedIndex !== displayIndex;
              const isDraggingCard = draggedIndex === displayIndex;

              return (
                <div
                  key={thumb.id}
                  className="relative group flex flex-col items-center"
                  draggable={!isReordering}
                  onDragStart={(event) => handleDragStart(event, displayIndex)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedIndex !== null && dropIndex !== displayIndex) {
                      setDropIndex(displayIndex);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDropReorder(displayIndex);
                  }}
                  style={{
                    opacity: isDraggingCard ? 0.72 : 1,
                    transform: isDropTarget ? 'translateY(-4px) scale(1.01)' : undefined,
                    transition: 'transform 0.15s ease, opacity 0.15s ease',
                  }}
                >
                  {/* サムネイル */}
                  <div
                    className="dq-thumbnail-frame cursor-pointer w-full transition-shadow"
                    style={{
                      border: `3px solid ${isDropTarget ? '#facc15' : isActive ? '#d4a017' : '#7a5540'}`,
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: '#1a1008',
                      boxShadow: isDropTarget
                        ? '0 0 0 2px rgba(250,204,21,0.22), 0 10px 20px rgba(0,0,0,0.3)'
                        : isActive
                        ? '0 0 14px rgba(245, 214, 123, 0.5)'
                        : '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                    onClick={() => {
                      if (draggedIndex !== null) return;
                      dispatch({ type: 'SET_PAGE', payload: displayIndex + 1 });
                      onClose();
                    }}
                  >
                    {thumb.dataURL ? (
                      <Image
                        src={thumb.dataURL}
                        alt={`ページ ${displayIndex + 1}`}
                        width={thumb.width}
                        height={thumb.height}
                        className="w-full h-auto"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] flex items-center justify-center" style={{ background: '#2a1e12' }}>
                        <div className="dq-spinner-sm" />
                      </div>
                    )}
                  </div>

                  {/* ページ番号 */}
                  <p className="dq-text text-center text-xs mt-1" style={{ color: isActive ? '#d4a017' : 'var(--ynk-bone)', fontWeight: isActive ? 700 : 400 }}>
                    {displayIndex + 1}
                  </p>

                  <div
                    className="absolute bottom-6 right-1 inline-flex items-center gap-1 rounded-full px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: 'rgba(0,0,0,0.66)',
                      border: '1px solid rgba(92,74,46,0.5)',
                      color: 'var(--ynk-gold)',
                    }}
                    aria-hidden="true"
                  >
                    <GripVertical size={12} />
                    <span className="dq-text text-[9px]">ドラッグ</span>
                  </div>

                  {/* 操作ボタン群（右上） */}
                  <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRotate(displayIndex); }}
                      className="dq-btn-small flex items-center justify-center"
                      title="回転"
                      aria-label={`ページ${displayIndex + 1}を回転`}
                      style={{ minHeight: 28, minWidth: 28, padding: 3 }}
                    >
                      <RotateCw size={13} />
                    </button>
                    {state.numPages > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(displayIndex); }}
                        className="dq-btn-danger flex items-center justify-center"
                        title="削除"
                        aria-label={`ページ${displayIndex + 1}を削除`}
                        style={{ minHeight: 28, minWidth: 28, padding: 3 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* 移動ボタン群（左側） */}
                  {state.numPages > 1 && (
                    <div className="absolute top-1 left-1 flex flex-col gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleMove(displayIndex, 'up'); }}
                        className="dq-btn-small flex items-center justify-center"
                        title="前へ移動"
                        aria-label={`ページ${displayIndex + 1}を前へ移動`}
                        disabled={isFirst}
                        style={{ minHeight: 28, minWidth: 28, padding: 3, opacity: isFirst ? 0.3 : 1, cursor: isFirst ? 'not-allowed' : 'pointer' }}
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleMove(displayIndex, 'down'); }}
                        className="dq-btn-small flex items-center justify-center"
                        title="後へ移動"
                        aria-label={`ページ${displayIndex + 1}を後へ移動`}
                        disabled={isLast}
                        style={{ minHeight: 28, minWidth: 28, padding: 3, opacity: isLast ? 0.3 : 1, cursor: isLast ? 'not-allowed' : 'pointer' }}
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(displayIndex); }}
                        className="dq-btn-small flex items-center justify-center"
                        title="複製"
                        aria-label={`ページ${displayIndex + 1}を複製`}
                        style={{ minHeight: 28, minWidth: 28, padding: 3 }}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInsertBlank(displayIndex); }}
                        className="dq-btn-small flex items-center justify-center"
                        title="空白ページ挿入"
                        aria-label={`ページ${displayIndex + 1}の後に空白ページ挿入`}
                        style={{ minHeight: 28, minWidth: 28, padding: 3, background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', color: 'var(--ynk-bone)', borderColor: 'var(--window-border)' }}
                      >
                        <FilePlus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>}
      </div>
    </SlidePanel>
  );
}
