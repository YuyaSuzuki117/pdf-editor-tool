'use client';

import { createContext, useContext, useReducer, useRef, useCallback, ReactNode } from 'react';
import { PDFState, PDFAction, Annotation } from '@/types/pdf';

const initialState: PDFState = {
  file: null,
  pdfData: null,
  numPages: 0,
  currentPage: 1,
  scale: 1,
  toolMode: 'view',
  annotations: [],
  isModified: false,
  isLoading: false,
  error: null,
};

type UndoEntry =
  | { kind: 'removed'; annotation: Annotation }
  | { kind: 'added'; annotation: Annotation };

interface ReducerState {
  pdfState: PDFState;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
}

const initialReducerState: ReducerState = {
  pdfState: initialState,
  undoStack: [],
  redoStack: [],
};

function combinedReducer(state: ReducerState, action: PDFAction): ReducerState {
  const s = state.pdfState;
  switch (action.type) {
    case 'LOAD_PDF':
      return {
        pdfState: {
          ...initialState,
          file: action.payload.file,
          pdfData: action.payload.pdfData,
          numPages: action.payload.numPages,
          currentPage: 1,
          scale: 1,
        },
        undoStack: [],
        redoStack: [],
      };
    case 'SET_PAGE':
      return {
        ...state,
        pdfState: {
          ...s,
          currentPage: Math.max(1, Math.min(action.payload, s.numPages)),
        },
      };
    case 'SET_SCALE':
      return {
        ...state,
        pdfState: {
          ...s,
          scale: Math.max(0.25, Math.min(5, action.payload)),
        },
      };
    case 'SET_TOOL':
      return { ...state, pdfState: { ...s, toolMode: action.payload } };
    case 'ADD_ANNOTATION':
      return {
        pdfState: {
          ...s,
          annotations: [...s.annotations, action.payload],
          isModified: true,
        },
        undoStack: [...state.undoStack, { kind: 'added', annotation: action.payload }],
        redoStack: [],
      };
    case 'REMOVE_ANNOTATION': {
      const removed = s.annotations.find((a) => a.id === action.payload);
      return {
        pdfState: {
          ...s,
          annotations: s.annotations.filter((a) => a.id !== action.payload),
          isModified: true,
        },
        undoStack: removed ? [...state.undoStack, { kind: 'removed', annotation: removed }] : state.undoStack,
        redoStack: [],
      };
    }
    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        pdfState: {
          ...s,
          annotations: s.annotations.map((a) =>
            a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
          ),
          isModified: true,
        },
      };
    case 'SET_MODIFIED':
      return { ...state, pdfState: { ...s, isModified: action.payload } };
    case 'SET_LOADING':
      return { ...state, pdfState: { ...s, isLoading: action.payload } };
    case 'SET_ERROR':
      return { ...state, pdfState: { ...s, error: action.payload, isLoading: false } };
    case 'UPDATE_PDF_DATA':
      return {
        ...state,
        pdfState: {
          ...s,
          pdfData: action.payload.pdfData,
          numPages: action.payload.numPages,
          isModified: true,
        },
      };
    case 'UNDO_ANNOTATION': {
      if (state.undoStack.length === 0) return state;
      const entry = state.undoStack[state.undoStack.length - 1];
      if (entry.kind === 'removed') {
        return {
          pdfState: { ...s, annotations: [...s.annotations, entry.annotation], isModified: true },
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, entry],
        };
      } else {
        return {
          pdfState: {
            ...s,
            annotations: s.annotations.filter((a) => a.id !== entry.annotation.id),
            isModified: s.annotations.length > 1 || s.isModified,
          },
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, entry],
        };
      }
    }
    case 'REDO_ANNOTATION': {
      if (state.redoStack.length === 0) return state;
      const redoEntry = state.redoStack[state.redoStack.length - 1];
      if (redoEntry.kind === 'removed') {
        // redo a removal → remove again
        return {
          pdfState: {
            ...s,
            annotations: s.annotations.filter((a) => a.id !== redoEntry.annotation.id),
            isModified: true,
          },
          undoStack: [...state.undoStack, redoEntry],
          redoStack: state.redoStack.slice(0, -1),
        };
      } else {
        // redo an addition → add again
        return {
          pdfState: { ...s, annotations: [...s.annotations, redoEntry.annotation], isModified: true },
          undoStack: [...state.undoStack, redoEntry],
          redoStack: state.redoStack.slice(0, -1),
        };
      }
    }
    case 'CLEAR_ANNOTATIONS':
      return {
        pdfState: {
          ...s,
          annotations: [],
          isModified: s.annotations.length > 0 ? true : s.isModified,
        },
        undoStack: [],
        redoStack: [],
      };
    case 'RESET':
      return initialReducerState;
    default:
      return state;
  }
}

const PDFContext = createContext<{
  state: PDFState;
  dispatch: React.Dispatch<PDFAction>;
  undoStackSize: number;
  redoStackSize: number;
} | null>(null);

export function PDFProvider({ children }: { children: ReactNode }) {
  const [reducerState, rawDispatch] = useReducer(combinedReducer, initialReducerState);
  const undoStackSizeRef = useRef(0);
  undoStackSizeRef.current = reducerState.undoStack.length;

  const dispatch = useCallback((action: PDFAction) => {
    rawDispatch(action);
  }, []);

  return (
    <PDFContext.Provider value={{ state: reducerState.pdfState, dispatch, undoStackSize: reducerState.undoStack.length, redoStackSize: reducerState.redoStack.length }}>
      {children}
    </PDFContext.Provider>
  );
}

export function usePDF() {
  const context = useContext(PDFContext);
  if (!context) throw new Error('usePDF must be used within PDFProvider');
  return context;
}
