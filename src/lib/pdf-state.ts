import type { Annotation, PDFAction, PDFState } from '@/types/pdf';

export type UndoEntry =
  | { kind: 'removed'; annotation: Annotation }
  | { kind: 'added'; annotation: Annotation }
  | { kind: 'updated'; id: string; before: Partial<Annotation>; after: Partial<Annotation> };

interface CleanSnapshot {
  annotations: string;
  pdfData: ArrayBuffer | null;
}

export interface ReducerState {
  cleanSnapshot: CleanSnapshot;
  pdfState: PDFState;
  redoStack: UndoEntry[];
  undoStack: UndoEntry[];
}

export const initialPdfState: PDFState = {
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

const initialCleanSnapshot: CleanSnapshot = {
  annotations: '[]',
  pdfData: null,
};

export const initialReducerState: ReducerState = {
  cleanSnapshot: initialCleanSnapshot,
  pdfState: initialPdfState,
  undoStack: [],
  redoStack: [],
};

function serializeAnnotations(annotations: Annotation[]): string {
  return JSON.stringify(annotations);
}

function deriveIsModified(cleanSnapshot: CleanSnapshot, pdfData: ArrayBuffer | null, annotations: Annotation[]): boolean {
  return cleanSnapshot.pdfData !== pdfData || cleanSnapshot.annotations !== serializeAnnotations(annotations);
}

function createCleanSnapshot(pdfData: ArrayBuffer | null, annotations: Annotation[]): CleanSnapshot {
  return {
    annotations: serializeAnnotations(annotations),
    pdfData,
  };
}

function withDerivedModified(
  state: ReducerState,
  pdfState: PDFState,
  overrides: Partial<Omit<ReducerState, 'pdfState'>> = {},
): ReducerState {
  return {
    ...state,
    ...overrides,
    pdfState: {
      ...pdfState,
      isModified: deriveIsModified(state.cleanSnapshot, pdfState.pdfData, pdfState.annotations),
    },
  };
}

export function combinedReducer(state: ReducerState, action: PDFAction): ReducerState {
  const s = state.pdfState;

  switch (action.type) {
    case 'LOAD_PDF': {
      const pdfState: PDFState = {
        ...initialPdfState,
        file: action.payload.file,
        pdfData: action.payload.pdfData,
        numPages: action.payload.numPages,
        currentPage: 1,
        scale: 1,
      };
      return {
        cleanSnapshot: createCleanSnapshot(action.payload.pdfData, []),
        pdfState,
        undoStack: [],
        redoStack: [],
      };
    }
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
    case 'ADD_ANNOTATION': {
      const annotations = [...s.annotations, action.payload];
      return withDerivedModified(
        state,
        {
          ...s,
          annotations,
          isModified: true,
        },
        {
          undoStack: [...state.undoStack, { kind: 'added', annotation: action.payload }],
          redoStack: [],
        },
      );
    }
    case 'RESTORE_DRAFT': {
      const annotations = action.payload;
      return withDerivedModified(
        state,
        {
          ...s,
          annotations,
          isModified: annotations.length > 0,
        },
        {
          undoStack: [],
          redoStack: [],
        },
      );
    }
    case 'REMOVE_ANNOTATION': {
      const removed = s.annotations.find((annotation) => annotation.id === action.payload);
      const annotations = s.annotations.filter((annotation) => annotation.id !== action.payload);

      return withDerivedModified(
        state,
        {
          ...s,
          annotations,
          isModified: true,
        },
        {
          undoStack: removed ? [...state.undoStack, { kind: 'removed', annotation: removed }] : state.undoStack,
          redoStack: [],
        },
      );
    }
    case 'UPDATE_ANNOTATION': {
      const target = s.annotations.find((annotation) => annotation.id === action.payload.id);
      if (!target) return state;

      const before: Partial<Annotation> = {};
      for (const key of Object.keys(action.payload.updates)) {
        const typedKey = key as keyof Annotation;
        if (typedKey in target) {
          Object.assign(before, { [typedKey]: target[typedKey] });
        }
      }

      const annotations = s.annotations.map((annotation) =>
        annotation.id === action.payload.id ? { ...annotation, ...action.payload.updates } : annotation
      );

      return withDerivedModified(
        state,
        {
          ...s,
          annotations,
          isModified: true,
        },
        {
          undoStack: [...state.undoStack, { kind: 'updated', id: action.payload.id, before, after: action.payload.updates }],
          redoStack: [],
        },
      );
    }
    case 'SET_MODIFIED':
      if (!action.payload) {
        return {
          ...state,
          cleanSnapshot: createCleanSnapshot(s.pdfData, s.annotations),
          pdfState: {
            ...s,
            isModified: false,
          },
        };
      }
      return { ...state, pdfState: { ...s, isModified: true } };
    case 'SET_LOADING':
      return { ...state, pdfState: { ...s, isLoading: action.payload } };
    case 'SET_ERROR':
      return { ...state, pdfState: { ...s, error: action.payload, isLoading: false } };
    case 'UPDATE_PDF_DATA': {
      const annotations = action.payload.annotations ?? s.annotations;
      const pdfState: PDFState = {
        ...s,
        pdfData: action.payload.pdfData,
        numPages: action.payload.numPages,
        currentPage: Math.max(1, Math.min(action.payload.currentPage ?? s.currentPage, action.payload.numPages)),
        annotations,
        isModified: true,
      };
      return withDerivedModified(state, pdfState);
    }
    case 'UNDO_ANNOTATION': {
      if (state.undoStack.length === 0) return state;
      const entry = state.undoStack[state.undoStack.length - 1];

      if (entry.kind === 'removed') {
        return withDerivedModified(
          state,
          {
            ...s,
            annotations: [...s.annotations, entry.annotation],
            isModified: true,
          },
          {
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, entry],
          },
        );
      }

      if (entry.kind === 'updated') {
        return withDerivedModified(
          state,
          {
            ...s,
            annotations: s.annotations.map((annotation) =>
              annotation.id === entry.id ? { ...annotation, ...entry.before } : annotation
            ),
            isModified: true,
          },
          {
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, entry],
          },
        );
      }

      return withDerivedModified(
        state,
        {
          ...s,
          annotations: s.annotations.filter((annotation) => annotation.id !== entry.annotation.id),
          isModified: false,
        },
        {
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, entry],
        },
      );
    }
    case 'REDO_ANNOTATION': {
      if (state.redoStack.length === 0) return state;
      const redoEntry = state.redoStack[state.redoStack.length - 1];

      if (redoEntry.kind === 'removed') {
        return withDerivedModified(
          state,
          {
            ...s,
            annotations: s.annotations.filter((annotation) => annotation.id !== redoEntry.annotation.id),
            isModified: true,
          },
          {
            undoStack: [...state.undoStack, redoEntry],
            redoStack: state.redoStack.slice(0, -1),
          },
        );
      }

      if (redoEntry.kind === 'updated') {
        return withDerivedModified(
          state,
          {
            ...s,
            annotations: s.annotations.map((annotation) =>
              annotation.id === redoEntry.id ? { ...annotation, ...redoEntry.after } : annotation
            ),
            isModified: true,
          },
          {
            undoStack: [...state.undoStack, redoEntry],
            redoStack: state.redoStack.slice(0, -1),
          },
        );
      }

      return withDerivedModified(
        state,
        {
          ...s,
          annotations: [...s.annotations, redoEntry.annotation],
          isModified: true,
        },
        {
          undoStack: [...state.undoStack, redoEntry],
          redoStack: state.redoStack.slice(0, -1),
        },
      );
    }
    case 'CLEAR_ANNOTATIONS':
      return withDerivedModified(
        state,
        {
          ...s,
          annotations: [],
          isModified: s.annotations.length > 0,
        },
        {
          undoStack: [],
          redoStack: [],
        },
      );
    case 'RESET':
      return initialReducerState;
    default:
      return state;
  }
}
