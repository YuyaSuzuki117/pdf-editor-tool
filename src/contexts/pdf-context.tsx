'use client';

import { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from 'react';
import type { PDFAction, PDFState } from '@/types/pdf';
import { combinedReducer, initialReducerState } from '@/lib/pdf-state';

const PDFContext = createContext<{
  state: PDFState;
  dispatch: React.Dispatch<PDFAction>;
  undoStackSize: number;
  redoStackSize: number;
} | null>(null);

export function PDFProvider({ children }: { children: ReactNode }) {
  const [reducerState, rawDispatch] = useReducer(combinedReducer, initialReducerState);

  const dispatch = useCallback((action: PDFAction) => {
    rawDispatch(action);
  }, []);

  const value = useMemo(() => ({
    state: reducerState.pdfState,
    dispatch,
    undoStackSize: reducerState.undoStack.length,
    redoStackSize: reducerState.redoStack.length,
  }), [reducerState.pdfState, dispatch, reducerState.undoStack.length, reducerState.redoStack.length]);

  return (
    <PDFContext.Provider value={value}>
      {children}
    </PDFContext.Provider>
  );
}

export function usePDF() {
  const context = useContext(PDFContext);
  if (!context) throw new Error('usePDF must be used within PDFProvider');
  return context;
}
