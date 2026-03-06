'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { PDFState, PDFAction } from '@/types/pdf';

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

function pdfReducer(state: PDFState, action: PDFAction): PDFState {
  switch (action.type) {
    case 'LOAD_PDF':
      return {
        ...initialState,
        file: action.payload.file,
        pdfData: action.payload.pdfData,
        numPages: action.payload.numPages,
        currentPage: 1,
        scale: 1,
      };
    case 'SET_PAGE':
      return {
        ...state,
        currentPage: Math.max(1, Math.min(action.payload, state.numPages)),
      };
    case 'SET_SCALE':
      return {
        ...state,
        scale: Math.max(0.25, Math.min(5, action.payload)),
      };
    case 'SET_TOOL':
      return { ...state, toolMode: action.payload };
    case 'ADD_ANNOTATION':
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
        isModified: true,
      };
    case 'REMOVE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.payload),
        isModified: true,
      };
    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        ),
        isModified: true,
      };
    case 'SET_MODIFIED':
      return { ...state, isModified: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'UPDATE_PDF_DATA':
      return {
        ...state,
        pdfData: action.payload.pdfData,
        numPages: action.payload.numPages,
        isModified: true,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const PDFContext = createContext<{
  state: PDFState;
  dispatch: React.Dispatch<PDFAction>;
} | null>(null);

export function PDFProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pdfReducer, initialState);
  return (
    <PDFContext.Provider value={{ state, dispatch }}>
      {children}
    </PDFContext.Provider>
  );
}

export function usePDF() {
  const context = useContext(PDFContext);
  if (!context) throw new Error('usePDF must be used within PDFProvider');
  return context;
}
