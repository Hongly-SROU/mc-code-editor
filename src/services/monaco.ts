import * as monaco from 'monaco-editor';
import { registerLanguageSuggestions } from './suggestions';
import { reviewCodeSyntax, type SyntaxIssue } from './syntaxValidator';
export * from './languages';
export * from './syntaxValidator';

// Model registry: fileId -> monaco.editor.ITextModel
const modelsMap = new Map<string, monaco.editor.ITextModel>();

export function getOrCreateMonacoModel(
  fileId: string,
  fileName: string,
  content: string,
  language: string
): monaco.editor.ITextModel {
  let model = modelsMap.get(fileId);

  if (model && !model.isDisposed()) {
    // If language changed, update it
    if (model.getLanguageId() !== language) {
      monaco.editor.setModelLanguage(model, language);
    }
    return model;
  }

  // Create unique URI for this file model
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uri = monaco.Uri.parse(`file:///${fileId}/${sanitizedName}`);

  // Check if monaco already knows this URI
  const existingMonacoModel = monaco.editor.getModel(uri);
  if (existingMonacoModel && !existingMonacoModel.isDisposed()) {
    model = existingMonacoModel;
  } else {
    model = monaco.editor.createModel(content, language, uri);
  }

  modelsMap.set(fileId, model);
  return model;
}

export function disposeMonacoModel(fileId: string): void {
  const model = modelsMap.get(fileId);
  if (model && !model.isDisposed()) {
    model.dispose();
  }
  modelsMap.delete(fileId);
}

/**
 * Reviews code syntax and sets squiggly error/warning markers on the Monaco model.
 */
export function updateSyntaxMarkers(
  fileId: string,
  fileName: string,
  content: string,
  language: string
): SyntaxIssue[] {
  const model = modelsMap.get(fileId);
  if (!model || model.isDisposed()) return [];

  const review = reviewCodeSyntax(content, language, fileName);

  const markers: monaco.editor.IMarkerData[] = review.issues.map((issue) => ({
    severity:
      issue.severity === 'error'
        ? monaco.MarkerSeverity.Error
        : monaco.MarkerSeverity.Warning,
    message: issue.message,
    startLineNumber: issue.line,
    startColumn: issue.column,
    endLineNumber: issue.endLine || issue.line,
    endColumn: issue.endColumn || issue.column + 5,
    source: 'syntax-checker',
  }));

  monaco.editor.setModelMarkers(model, 'syntax-checker', markers);
  return review.issues;
}

export function clearSyntaxMarkers(fileId: string): void {
  const model = modelsMap.get(fileId);
  if (model && !model.isDisposed()) {
    monaco.editor.setModelMarkers(model, 'syntax-checker', []);
  }
}

// Define custom VS Code dark and light themes for seamless aesthetic
export function defineCustomThemes(): void {
  monaco.editor.defineTheme('vscode-dark-custom', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editorCursor.foreground': '#aeafad',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
    },
  });

  monaco.editor.defineTheme('vscode-light-custom', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'AF00DB' },
      { token: 'identifier', foreground: '001080' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'type', foreground: '267F99' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      'editorCursor.foreground': '#000000',
      'editor.lineHighlightBackground': '#f7f7f7',
      'editorLineNumber.foreground': '#a0a0a0',
      'editorLineNumber.activeForeground': '#000000',
      'editor.selectionBackground': '#add6ff',
      'editor.inactiveSelectionBackground': '#e5ebf1',
    },
  });
}

// Call once
defineCustomThemes();
registerLanguageSuggestions(monaco);

export { monaco };

