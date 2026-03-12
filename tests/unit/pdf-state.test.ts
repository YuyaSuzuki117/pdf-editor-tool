import { describe, expect, it } from 'vitest';
import { combinedReducer, initialReducerState } from '@/lib/pdf-state';
import type { Annotation } from '@/types/pdf';

function makeAnnotation(id: string, overrides: Partial<Annotation> = {}): Annotation {
  return {
    id,
    type: 'text',
    page: 1,
    position: { x: 10, y: 20 },
    content: `text-${id}`,
    style: { fontSize: 16, color: '#000000' },
    createdAt: 1,
    ...overrides,
  };
}

function loadPdfState() {
  const pdfData = new ArrayBuffer(8);
  const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });

  return combinedReducer(initialReducerState, {
    type: 'LOAD_PDF',
    payload: { file, pdfData, numPages: 3 },
  });
}

describe('pdf state dirty tracking', () => {
  it('returns to clean after undoing the only added annotation', () => {
    const loaded = loadPdfState();
    const added = combinedReducer(loaded, { type: 'ADD_ANNOTATION', payload: makeAnnotation('a') });
    const undone = combinedReducer(added, { type: 'UNDO_ANNOTATION' });

    expect(added.pdfState.isModified).toBe(true);
    expect(undone.pdfState.annotations).toEqual([]);
    expect(undone.pdfState.isModified).toBe(false);
  });

  it('treats the current state as clean after save and marks later changes dirty again', () => {
    const loaded = loadPdfState();
    const withAnnotation = combinedReducer(loaded, { type: 'ADD_ANNOTATION', payload: makeAnnotation('a') });
    const saved = combinedReducer(withAnnotation, { type: 'SET_MODIFIED', payload: false });
    const updated = combinedReducer(saved, {
      type: 'UPDATE_ANNOTATION',
      payload: { id: 'a', updates: { content: 'changed' } },
    });

    expect(saved.pdfState.isModified).toBe(false);
    expect(updated.pdfState.isModified).toBe(true);
  });

  it('restores a clean state after reverting an edit back to the saved baseline', () => {
    const loaded = loadPdfState();
    const withAnnotation = combinedReducer(loaded, { type: 'ADD_ANNOTATION', payload: makeAnnotation('a') });
    const saved = combinedReducer(withAnnotation, { type: 'SET_MODIFIED', payload: false });
    const updated = combinedReducer(saved, {
      type: 'UPDATE_ANNOTATION',
      payload: { id: 'a', updates: { content: 'changed' } },
    });
    const reverted = combinedReducer(updated, { type: 'UNDO_ANNOTATION' });

    expect(reverted.pdfState.annotations[0].content).toBe('text-a');
    expect(reverted.pdfState.isModified).toBe(false);
  });

  it('keeps restored drafts dirty until the user saves them', () => {
    const loaded = loadPdfState();
    const restored = combinedReducer(loaded, { type: 'RESTORE_DRAFT', payload: [makeAnnotation('draft')] });

    expect(restored.pdfState.isModified).toBe(true);
    expect(restored.undoStack).toHaveLength(0);
  });

  it('recomputes dirty state for page operations against the saved baseline', () => {
    const loaded = loadPdfState();
    const saved = combinedReducer(loaded, { type: 'SET_MODIFIED', payload: false });
    const nextPdf = new ArrayBuffer(16);
    const changed = combinedReducer(saved, {
      type: 'UPDATE_PDF_DATA',
      payload: { pdfData: nextPdf, numPages: 4, currentPage: 2 },
    });

    expect(changed.pdfState.currentPage).toBe(2);
    expect(changed.pdfState.isModified).toBe(true);
  });

  it('clearing annotations from a clean empty document stays clean', () => {
    const loaded = loadPdfState();
    const cleared = combinedReducer(loaded, { type: 'CLEAR_ANNOTATIONS' });

    expect(cleared.pdfState.annotations).toEqual([]);
    expect(cleared.pdfState.isModified).toBe(false);
  });
});
