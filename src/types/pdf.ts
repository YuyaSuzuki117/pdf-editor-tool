export type ToolMode = 'view' | 'text' | 'draw' | 'shape' | 'highlight' | 'image' | 'pages' | 'save';

export type AnnotationType = 'text' | 'draw' | 'highlight' | 'image' | 'shape' | 'note';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TextStyle {
  fontSize: number;
  color: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface DrawStyle {
  strokeColor: string;
  strokeWidth: number;
  isEraser?: boolean;
}

export interface HighlightStyle {
  color: string;
  opacity: number;
  width: number;
  height: number;
  markupMode?: 'highlight' | 'underline' | 'strikethrough' | 'redact';
}

export interface ShapeStyle {
  shapeType: 'rectangle' | 'circle' | 'arrow' | 'line';
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  filled?: boolean;
}

export interface NoteStyle {
  noteColor: string;
  expanded?: boolean;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  page: number;
  position: Position;
  content: string;
  style: TextStyle | DrawStyle | HighlightStyle | ShapeStyle | NoteStyle | Record<string, string | number | boolean | undefined>;
  renderScale?: number;
  createdAt: number;
}

export interface PDFState {
  file: File | null;
  pdfData: ArrayBuffer | null;
  numPages: number;
  currentPage: number;
  scale: number;
  toolMode: ToolMode;
  annotations: Annotation[];
  isModified: boolean;
  isLoading: boolean;
  error: string | null;
}

export type PDFAction =
  | { type: 'LOAD_PDF'; payload: { file: File; pdfData: ArrayBuffer; numPages: number } }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SCALE'; payload: number }
  | { type: 'SET_TOOL'; payload: ToolMode }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'REMOVE_ANNOTATION'; payload: string }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Annotation> } }
  | { type: 'SET_MODIFIED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_PDF_DATA'; payload: { pdfData: ArrayBuffer; numPages: number } }
  | { type: 'UNDO_ANNOTATION' }
  | { type: 'REDO_ANNOTATION' }
  | { type: 'CLEAR_ANNOTATIONS' }
  | { type: 'RESET' };
