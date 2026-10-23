export interface EditorFile {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  fileHandle?: FileSystemFileHandle | null;
  path?: string;
  lastModified?: number;
}

export type SplitDirection = 'none' | 'vertical' | 'horizontal';

export interface EditorGroup {
  id: string;
  fileIds: string[];
  activeFileId: string | null;
}

export interface EditorSettings {
  theme: 'vs-dark' | 'vs-light';
  fontSize: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  lineNumbers: 'on' | 'off';
  // Prettier options
  semi: boolean;
  singleQuote: boolean;
  bracketSpacing: boolean;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

